import { Router } from 'express';
import { getAllSettings, setSetting } from '../db.js';

const router = Router();

const SETTING_KEYS = [
  'llm_provider',
  'ollama_base_url',
  'ollama_model',
  'anthropic_api_key',
  'collectors',
];

// Shape settings for API responses, redacting sensitive values
function formatSettingsForResponse(settings) {
  const { anthropic_api_key: apiKey, ...rest } = settings;

  return {
    ...rest,
    anthropic_api_key_set: Boolean(apiKey),
  };
}

// Return all settings with API keys redacted
router.get('/', (_req, res) => {
  res.json({ settings: formatSettingsForResponse(getAllSettings()) });
});

// Replace all settings; empty anthropic_api_key preserves the stored key
router.put('/', (req, res) => {
  const body = req.body?.settings ?? req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      error: 'Request body must be a settings object',
      code: 'VALIDATION_ERROR',
    });
  }

  const current = getAllSettings();
  const anthropicKey = body.anthropic_api_key;

  const updated = {
    llm_provider: body.llm_provider ?? current.llm_provider ?? 'ollama',
    ollama_base_url: body.ollama_base_url ?? current.ollama_base_url ?? 'http://localhost:11434',
    ollama_model: body.ollama_model ?? '',
    anthropic_api_key: anthropicKey === ''
      ? (current.anthropic_api_key ?? '')
      : (anthropicKey ?? current.anthropic_api_key ?? ''),
    collectors: body.collectors ?? {},
  };

  for (const key of SETTING_KEYS) {
    setSetting(key, updated[key]);
  }

  res.json({ settings: formatSettingsForResponse(updated) });
});

export default router;
