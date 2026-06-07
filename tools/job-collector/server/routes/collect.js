import { Router } from 'express';
import { getCollector, registry } from '../../collectors/registry.js';
import { parseOffer } from '../../pipeline/parser.js';
import { writeOfferMd } from '../../pipeline/repoFiles.js';
import {
  getJobById,
  getRecentRuns,
  getRunById,
  getSetting,
  insertJob,
  insertRun,
  jobExistsByUrl,
  updateJob,
  updateRun,
} from '../db.js';
import { enqueueJob } from '../queue.js';

const router = Router();

// Parse and validate a numeric run id from route params
function parseRunId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// Resolve whether a collector is enabled from persisted settings
function isCollectorEnabled(name) {
  const collectors = getSetting('collectors') ?? {};
  const entry = collectors[name];

  if (entry && typeof entry.enabled === 'boolean') {
    return entry.enabled;
  }

  // Manual is always available; future scrapers default to enabled until configured
  return name === 'manual' || entry === undefined;
}

// Build the collectors list for GET /collectors
function listCollectors() {
  const collectors = [];

  for (const collector of registry.values()) {
    collectors.push({
      name: collector.name,
      label: collector.label,
      enabled: isCollectorEnabled(collector.name),
      configSchema: collector.configSchema,
    });
  }

  return collectors;
}

// Run collect → parse → dedup → insert → write offer files for one run
async function executeCollectRun(runId, source, config) {
  try {
    const collector = getCollector(source);
    const rawOffers = await collector.run(config);
    const jobsFound = rawOffers.length;
    let jobsNew = 0;

    for (const rawOffer of rawOffers) {
      if (rawOffer.sourceUrl && jobExistsByUrl(rawOffer.sourceUrl)) {
        continue;
      }

      const offer = await parseOffer(rawOffer);
      const jobId = insertJob({
        source: rawOffer.source ?? source,
        sourceUrl: rawOffer.sourceUrl ?? null,
        rawText: rawOffer.rawText,
        title: offer.title,
        company: offer.company,
        location: offer.location,
        countryCode: offer.countryCode,
        employmentType: offer.employmentType,
        salary: offer.salary,
        visaSponsorship: offer.visaSponsorship,
        requiredSkills: offer.requiredSkills,
        niceToHave: offer.niceToHave,
        responsibilities: offer.responsibilities,
        matchScore: offer.matchScore,
        status: 'parsed',
      });

      const job = getJobById(jobId);
      const offerMdPath = await writeOfferMd(job);
      updateJob(jobId, { offerMdPath });
      jobsNew += 1;
    }

    updateRun(runId, {
      status: 'done',
      jobsFound,
      jobsNew,
      finishedAt: new Date().toISOString(),
    });

    console.log(
      `[INFO] [collect] Run ${runId} finished: found=${jobsFound}, new=${jobsNew}`,
    );
  } catch (err) {
    updateRun(runId, {
      status: 'error',
      error: err.message,
      finishedAt: new Date().toISOString(),
    });
    console.error(`[ERROR] [collect] Run ${runId} failed:`, err.message);
  }
}

// Return all registered collectors with enabled state from settings
router.get('/collectors', (_req, res) => {
  res.json({ collectors: listCollectors() });
});

// Enqueue a full collect+parse+save pipeline and return the run id immediately
router.post('/collect', (req, res) => {
  const source = req.body?.source;
  const config = req.body?.config ?? {};

  if (!source || typeof source !== 'string') {
    return res.status(400).json({
      error: 'Request body must include source',
      code: 'VALIDATION_ERROR',
    });
  }

  if (config !== null && (typeof config !== 'object' || Array.isArray(config))) {
    return res.status(400).json({
      error: 'config must be an object when provided',
      code: 'VALIDATION_ERROR',
    });
  }

  if (!registry.has(source)) {
    return res.status(400).json({
      error: `Unknown collector: ${source}`,
      code: 'VALIDATION_ERROR',
    });
  }

  const runId = insertRun({ source, config, status: 'running' });

  enqueueJob(() => executeCollectRun(runId, source, config));

  res.status(202).json({ runId });
});

// Return recent collection runs
router.get('/runs', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  res.json({ runs: getRecentRuns(limit) });
});

// Return one collection run for progress polling
router.get('/runs/:id', (req, res) => {
  const id = parseRunId(req.params.id);
  if (id === null) {
    return res.status(400).json({
      error: 'Invalid run id',
      code: 'VALIDATION_ERROR',
    });
  }

  const run = getRunById(id);
  if (!run) {
    return res.status(404).json({
      error: 'Run not found',
      code: 'NOT_FOUND',
    });
  }

  res.json(run);
});

export default router;
