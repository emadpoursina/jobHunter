import { Router } from 'express';
import { DEFAULT_LLM_TASKS, getAllSettings, getSetting, setSetting } from '../db.js';
import { asyncHandler } from '../errors.js';
import { callLlm } from '../llm.js';

const router = Router();

const SETTING_KEYS = [
  'llm_provider',
  'ollama_base_url',
  'ollama_model',
  'anthropic_api_key',
  'openai_api_key',
  'openai_base_url',
  'openai_model',
  'llm_tasks',
  'collectors',
];

// Keep stored key when the client sends '' or omits the field
function resolveApiKey(incoming, current) {
  if (incoming === '') return current ?? '';
  return incoming ?? current ?? '';
}

// Normalize per-task provider/model overrides
function normalizeLlmTasks(incoming, current) {
  const base = current && typeof current === 'object' ? current : {};
  const next = incoming && typeof incoming === 'object' ? incoming : base;

  const result = {};
  for (const task of Object.keys(DEFAULT_LLM_TASKS)) {
    const taskIn = next[task] && typeof next[task] === 'object' ? next[task] : {};
    const taskCur = base[task] && typeof base[task] === 'object' ? base[task] : {};
    result[task] = {
      provider: String(taskIn.provider ?? taskCur.provider ?? ''),
      model: String(taskIn.model ?? taskCur.model ?? ''),
    };
  }
  return result;
}

// Shape settings for API responses, redacting sensitive values
function formatSettingsForResponse(settings) {
  const {
    anthropic_api_key: anthropicKey,
    openai_api_key: openaiKey,
    ...rest
  } = settings;

  return {
    ...rest,
    anthropic_api_key_set: Boolean(anthropicKey),
    openai_api_key_set: Boolean(openaiKey),
  };
}

// Return all settings with API keys redacted
router.get('/', (_req, res) => {
  const settings = getAllSettings();
  if (!settings.llm_tasks) {
    settings.llm_tasks = {
      parse: { ...DEFAULT_LLM_TASKS.parse },
      cv: { ...DEFAULT_LLM_TASKS.cv },
    };
  }
  res.json({ settings: formatSettingsForResponse(settings) });
});

// Replace all settings; empty API key fields preserve stored keys
router.put('/', (req, res) => {
  const body = req.body?.settings ?? req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      error: 'Request body must be a settings object',
      code: 'VALIDATION_ERROR',
    });
  }

  const current = getAllSettings();

  const updated = {
    llm_provider: body.llm_provider ?? current.llm_provider ?? 'ollama',
    ollama_base_url: body.ollama_base_url ?? current.ollama_base_url ?? 'http://localhost:11434',
    ollama_model: body.ollama_model ?? '',
    anthropic_api_key: resolveApiKey(body.anthropic_api_key, current.anthropic_api_key),
    openai_api_key: resolveApiKey(body.openai_api_key, current.openai_api_key),
    openai_base_url: body.openai_base_url ?? current.openai_base_url ?? 'https://api.openai.com/v1',
    openai_model: body.openai_model ?? current.openai_model ?? '',
    llm_tasks: normalizeLlmTasks(body.llm_tasks, current.llm_tasks),
    collectors: body.collectors ?? {},
  };

  for (const key of SETTING_KEYS) {
    setSetting(key, updated[key]);
  }

  res.json({ settings: formatSettingsForResponse(updated) });
});

// Ping the configured LLM provider with a tiny prompt
router.post('/test', asyncHandler(async (_req, res) => {
  const provider = getSetting('llm_provider') ?? 'ollama';
  const reply = await callLlm({
    system: 'Reply with exactly one short word.',
    user: 'ping',
    maxTokens: 16,
  });

  res.json({
    ok: true,
    provider,
    reply: String(reply ?? '').trim(),
  });
}));

export default router;
