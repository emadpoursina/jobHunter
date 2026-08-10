import { Router } from 'express';
import {
  APPLICATION_STAGES,
  deleteJob,
  getJobById,
  getJobs,
  inferPipelineStatus,
  markApplied,
  updateJob,
} from '../db.js';

const router = Router();

// Parse and validate a numeric job id from route params
function parseJobId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// Normalize applyUrl: empty → null; non-empty must be http(s)
export function normalizeApplyUrl(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') {
    return { error: 'applyUrl must be a string' };
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: 'applyUrl must use http or https' };
    }
    return parsed.href;
  } catch {
    return { error: 'applyUrl must be a valid URL' };
  }
}

// Return all jobs, optionally filtered by status, source, country, or application_stage
router.get('/', (req, res) => {
  const {
    status,
    source,
    country_code: countryCode,
    application_stage: applicationStage,
  } = req.query;
  const filters = {};

  if (status) filters.status = status;
  if (source) filters.source = source;
  if (countryCode) filters.country_code = countryCode;
  if (applicationStage) filters.application_stage = applicationStage;

  res.json({ jobs: getJobs(filters) });
});

// Return one job with all fields
router.get('/:id', (req, res) => {
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

  res.json({ job });
});

// Partially update a job's mutable fields
router.patch('/:id', (req, res) => {
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

  const existing = getJobById(id);
  if (!existing) {
    return res.status(404).json({
      error: 'Job not found',
      code: 'NOT_FOUND',
    });
  }

  const updates = { ...body };
  if (updates.status === 'neutral') {
    updates.status = inferPipelineStatus(existing);
  }

  // Accept camelCase or snake_case for stage; validate before write
  if ('application_stage' in updates && !('applicationStage' in updates)) {
    updates.applicationStage = updates.application_stage;
    delete updates.application_stage;
  }
  if ('applicationStage' in updates) {
    const stage = updates.applicationStage;
    if (!APPLICATION_STAGES.includes(stage)) {
      return res.status(400).json({
        error: `Invalid application_stage "${stage}". Allowed: ${APPLICATION_STAGES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }
  }

  if ('applyUrl' in updates) {
    const normalized = normalizeApplyUrl(updates.applyUrl);
    if (normalized && typeof normalized === 'object' && 'error' in normalized) {
      return res.status(400).json({
        error: normalized.error,
        code: 'VALIDATION_ERROR',
      });
    }
    updates.applyUrl = normalized;
  }

  try {
    const job = updateJob(id, updates);
    res.json({ job });
  } catch (err) {
    if (err?.code === 'VALIDATION_ERROR') {
      return res.status(400).json({
        error: err.message,
        code: 'VALIDATION_ERROR',
      });
    }
    throw err;
  }
});

// Mark a job as applied (first application wins; idempotent)
router.post('/:id/applied', (req, res) => {
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

  const appliedUrl = typeof body.appliedUrl === 'string' ? body.appliedUrl : null;

  const job = markApplied(id, { appliedUrl });
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      code: 'NOT_FOUND',
    });
  }

  res.json({ job });
});

// Hard-delete a job record (does not remove associated .md files)
router.delete('/:id', (req, res) => {
  const id = parseJobId(req.params.id);
  if (id === null) {
    return res.status(400).json({
      error: 'Invalid job id',
      code: 'VALIDATION_ERROR',
    });
  }

  const deleted = deleteJob(id);
  if (!deleted) {
    return res.status(404).json({
      error: 'Job not found',
      code: 'NOT_FOUND',
    });
  }

  res.json({ deleted: true });
});

export default router;
