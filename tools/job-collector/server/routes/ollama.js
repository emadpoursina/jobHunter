import { Router } from 'express';
import { getSetting } from '../db.js';
import { asyncHandler } from '../errors.js';

const router = Router();

// Proxy Ollama /api/tags and return available model names
router.get('/models', asyncHandler(async (_req, res) => {
  const baseUrl = getSetting('ollama_base_url') ?? 'http://localhost:11434';

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`);

    if (!response.ok) {
      console.error(`[ERROR] [ollama] GET /api/tags returned ${response.status}`);
      return res.status(503).json({
        error: `Cannot reach Ollama at ${baseUrl}`,
        code: 'OLLAMA_UNAVAILABLE',
      });
    }

    const data = await response.json();
    const models = (data.models ?? []).map((model) => model.name);

    res.json({ models });
  } catch (err) {
    console.error(`[ERROR] [ollama] Cannot reach Ollama at ${baseUrl}:`, err.message);
    res.status(503).json({
      error: `Cannot reach Ollama at ${baseUrl}`,
      code: 'OLLAMA_UNAVAILABLE',
    });
  }
}));

export default router;
