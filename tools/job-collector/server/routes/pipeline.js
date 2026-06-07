import { Router } from 'express';
import { generateCv } from '../../pipeline/cv.js';
import { parseOffer } from '../../pipeline/parser.js';
import { readRepoFile, writeCvMd, writeOfferMd } from '../../pipeline/repoFiles.js';
import { getJobById, updateJob } from '../db.js';
import { asyncHandler } from '../errors.js';
import { enqueueJob } from '../queue.js';

const router = Router();

// Parse and validate a numeric job id from route params
function parseJobId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// Build DB update fields from a parsed offer and optional metadata
function buildSaveFields(existing, body) {
  const { offer, rawText, source, sourceUrl } = body;

  return {
    title: offer.title,
    company: offer.company,
    location: offer.location,
    countryCode: offer.countryCode ?? offer.country_code,
    employmentType: offer.employmentType ?? offer.employment_type,
    salary: offer.salary ?? null,
    visaSponsorship: offer.visaSponsorship ?? offer.visa_sponsorship,
    requiredSkills: offer.requiredSkills ?? offer.required_skills ?? [],
    niceToHave: offer.niceToHave ?? offer.nice_to_have ?? [],
    responsibilities: offer.responsibilities ?? [],
    matchScore: offer.matchScore ?? offer.match_score,
    rawText,
    source: source ?? existing.source,
    sourceUrl: sourceUrl ?? existing.sourceUrl ?? existing.source_url ?? null,
    status: 'parsed',
  };
}

// Parse raw job listing text into a structured offer preview (no DB write)
router.post('/parse', asyncHandler(async (req, res) => {
  const text = req.body?.text;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({
      error: 'Request body must include non-empty text',
      code: 'VALIDATION_ERROR',
    });
  }

  const offer = await parseOffer({ rawText: text.trim() });
  res.json({ offer });
}));

// Persist a reviewed offer to the DB and write the offer markdown file
router.post('/jobs/:id/save', asyncHandler(async (req, res) => {
  const id = parseJobId(req.params.id);
  if (id === null) {
    return res.status(400).json({
      error: 'Invalid job id',
      code: 'VALIDATION_ERROR',
    });
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      error: 'Request body must be a JSON object',
      code: 'VALIDATION_ERROR',
    });
  }

  const { offer, rawText } = body;

  if (!offer || typeof offer !== 'object' || Array.isArray(offer)) {
    return res.status(400).json({
      error: 'Request body must include offer object',
      code: 'VALIDATION_ERROR',
    });
  }

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({
      error: 'Request body must include non-empty rawText',
      code: 'VALIDATION_ERROR',
    });
  }

  const existing = getJobById(id);
  if (!existing) {
    return res.status(404).json({
      error: 'Job not found',
      code: 'NOT_FOUND',
    });
  }

  const fields = buildSaveFields(existing, body);
  const mergedJob = { ...existing, ...fields };
  const offerMdPath = await writeOfferMd(mergedJob);

  const job = updateJob(id, { ...fields, offerMdPath });
  res.status(201).json({ job });
}));

// Enqueue tailored CV generation for an existing job
router.post('/jobs/:id/cv', (req, res) => {
  const id = parseJobId(req.params.id);
  if (id === null) {
    return res.status(400).json({
      error: 'Invalid job id',
      code: 'VALIDATION_ERROR',
    });
  }

  const job = getJobById(id);
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      code: 'NOT_FOUND',
    });
  }

  enqueueJob(async () => {
    try {
      const cvMarkdown = await generateCv(job);
      const cvMdPath = await writeCvMd(job, cvMarkdown);
      updateJob(id, { cvMdPath, status: 'cv_generated' });
      console.log(`[INFO] [pipeline] CV generated for job ${id} at ${cvMdPath}`);
    } catch (err) {
      console.error(`[ERROR] [pipeline] CV generation failed for job ${id}:`, err.message);
    }
  });

  res.status(202).json({ message: 'CV generation started' });
});

// Return the generated CV markdown for a job
router.get('/jobs/:id/cv', asyncHandler(async (req, res) => {
  const id = parseJobId(req.params.id);
  if (id === null) {
    return res.status(400).json({
      error: 'Invalid job id',
      code: 'VALIDATION_ERROR',
    });
  }

  const job = getJobById(id);
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      code: 'NOT_FOUND',
    });
  }

  const cvPath = job.cvMdPath ?? job.cv_md_path;
  if (!cvPath) {
    return res.status(404).json({
      error: 'CV not generated for this job',
      code: 'NOT_FOUND',
    });
  }

  const markdown = await readRepoFile(cvPath);
  if (!markdown) {
    return res.status(404).json({
      error: 'CV file not found on disk',
      code: 'NOT_FOUND',
    });
  }

  res.json({ markdown });
}));

export default router;
