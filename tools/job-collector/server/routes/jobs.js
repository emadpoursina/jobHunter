import { Router } from 'express';
import { deleteJob, getJobById, getJobs, updateJob } from '../db.js';

const router = Router();

// Resolve pipeline status when clearing applied/rejected decision
function inferPipelineStatus(job) {
  if (job.cvMdPath ?? job.cv_md_path) return 'cv_generated';
  if (job.title) return 'parsed';
  return 'raw';
}

// Parse and validate a numeric job id from route params
function parseJobId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

// Return all jobs, optionally filtered by status, source, or country
router.get('/', (req, res) => {
  const { status, source, country_code: countryCode } = req.query;
  const filters = {};

  if (status) filters.status = status;
  if (source) filters.source = source;
  if (countryCode) filters.country_code = countryCode;

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

  const job = updateJob(id, updates);
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
