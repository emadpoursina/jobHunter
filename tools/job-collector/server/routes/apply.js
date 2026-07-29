import { Router } from 'express';
import { callLlm } from '../llm.js';
import { asyncHandler } from '../errors.js';
import { getJobById } from '../db.js';
import { getParsedProfile } from '../../pipeline/profile.js';
import { cvToPdf } from '../../pipeline/cvPdf.js';
import { readRepoFile } from '../../pipeline/repoFiles.js';

const router = Router();

const AGENT_PATH = 'docs/agents/apply-form.md';
const ANSWER_MAX_TOKENS = 600;

// Common LinkedIn Easy Apply free-text questions to pre-answer (best-effort)
const COMMON_QUESTIONS = [
  'why do you want to join',
  'why are you interested in this role',
  'cover letter',
];

// Parse and validate a numeric job id from the request body
function parseJobId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// Best-effort: generate short answers for common Easy Apply questions.
// Returns {} on any failure — the script highlights unknown questions red.
async function generateAnswers(job, profile) {
  const system = `You write concise, truthful, first-person answers to job application questions.
Use only facts from the candidate profile and the target job. Keep each answer to 2-3 sentences.
Return a JSON object mapping each question key to its answer string. No preamble, no code fences.`;

  const user = `CANDIDATE PROFILE:
${JSON.stringify(profile)}

TARGET JOB:
Title: ${job.title ?? 'Unknown'}
Company: ${job.company ?? 'Unknown'}

Answer these questions:
${COMMON_QUESTIONS.map((q) => `- "${q}"`).join('\n')}

Return JSON like: {"why do you want to join": "...", ...}`;

  let raw;
  try {
    raw = await callLlm({ system, user, maxTokens: ANSWER_MAX_TOKENS });
  } catch {
    return {};
  }

  if (!raw || !raw.trim()) return {};

  // Strip markdown fences / preamble if present
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Generate a LinkedIn Easy Apply userscript for a saved job
router.post('/script', asyncHandler(async (req, res) => {
  const jobId = parseJobId(req.body?.jobId);
  if (jobId === null) {
    return res.status(400).json({
      error: 'Invalid or missing jobId',
      code: 'VALIDATION_ERROR',
    });
  }

  const job = getJobById(jobId);
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      code: 'NOT_FOUND',
    });
  }

  let profile;
  try {
    profile = await getParsedProfile();
  } catch (err) {
    return res.status(424).json({
      error: err.message,
      code: err.code || 'PROFILE_INCOMPLETE',
    });
  }

  const cvMdPath = job.cvMdPath ?? job.cv_md_path;
  if (!cvMdPath) {
    return res.status(409).json({
      error: 'Generate a CV for this job before generating an apply script.',
      code: 'CV_NOT_GENERATED',
    });
  }

  let pdfPath;
  try {
    pdfPath = await cvToPdf(cvMdPath);
  } catch (err) {
    return res.status(503).json({
      error: err.message,
      code: 'CV_PDF_ERROR',
    });
  }

  const applyPrompt = await readRepoFile(AGENT_PATH);
  if (!applyPrompt) {
    return res.status(500).json({
      error: `Apply-form agent prompt not found at ${AGENT_PATH}`,
      code: 'INTERNAL_ERROR',
    });
  }

  let urlHost = 'linkedin.com';
  if (job.sourceUrl) {
    try {
      urlHost = new URL(job.sourceUrl).hostname;
    } catch {
      // keep default
    }
  }

  const answers = await generateAnswers(job, profile);

  const ctx = {
    profile,
    job: {
      title: job.title,
      company: job.company,
      sourceUrl: job.sourceUrl,
    },
    pdfPath,
    urlHost,
    answers,
  };

  const userMsg = `Produce the LinkedIn Easy Apply userscript for this context. Read all values from __APPLY_CTX__.

const __APPLY_CTX__ = ${JSON.stringify(ctx, null, 2)};

Emit the script only.`;

  let scriptBody;
  try {
    scriptBody = await callLlm({
      system: applyPrompt,
      user: userMsg,
      maxTokens: 2000,
    });
  } catch (err) {
    return res.status(503).json({
      error: err.message,
      code: 'LLM_ERROR',
    });
  }

  if (!scriptBody || !scriptBody.trim()) {
    return res.status(503).json({
      error: 'LLM returned an empty script',
      code: 'LLM_ERROR',
    });
  }

  const script = `const __APPLY_CTX__ = ${JSON.stringify(ctx)};\n${scriptBody.trim()}`;
  const warnings = [];

  console.log(`[INFO] [apply] Generated apply script for job ${jobId} (${script.length} chars)`);
  res.json({ script, warnings, pdfPath });
}));

export default router;
