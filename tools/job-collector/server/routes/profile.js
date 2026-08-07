import { Router } from 'express';
import { applyProfileProposal, previewProfileUpdate } from '../../pipeline/profileEditor.js';
import { getProfileDocument, saveProfileMarkdown } from '../../pipeline/profile.js';
import { asyncHandler } from '../errors.js';

const router = Router();

// Return current master profile Markdown and revision fingerprint
router.get('/', asyncHandler(async (_req, res) => {
  const doc = await getProfileDocument();
  res.json(doc);
}));

// Save master profile Markdown after validation (optional baseRevision for optimistic lock)
router.put('/', asyncHandler(async (req, res) => {
  const markdown = req.body?.markdown ?? req.body?.content;
  const { baseRevision } = req.body ?? {};
  const result = await saveProfileMarkdown(markdown, { baseRevision });
  res.json(result);
}));

// AI preview — returns proposal without writing the profile file
router.post('/ai-preview', asyncHandler(async (req, res) => {
  const { prompt, baseRevision } = req.body ?? {};
  const result = await previewProfileUpdate({ prompt, baseRevision });
  res.json(result);
}));

// AI apply — validates and writes an approved proposal
router.post('/ai-apply', asyncHandler(async (req, res) => {
  const { proposal, baseRevision } = req.body ?? {};
  const result = await applyProfileProposal({ proposal, baseRevision });
  res.json(result);
}));

export default router;
