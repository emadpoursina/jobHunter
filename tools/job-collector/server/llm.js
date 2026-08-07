import { getSetting } from './db.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Build OpenRouter provider.order from a comma/space-separated slug list
export function buildOpenRouterProviderPrefs(orderRaw) {
  const order = String(orderRaw ?? '')
    .split(/[,;\s]+/)
    .map((slug) => slug.trim())
    .filter(Boolean);

  if (!order.length) return undefined;
  return { order };
}

// Build an error tagged for pipeline and route handlers
function llmError(message) {
  const err = new Error(message);
  err.code = 'LLM_ERROR';
  return err;
}

// Normalize chat message content (string or OpenAI-style content parts)
export function normalizeMessageContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text ?? ''))
      .join('');
  }
  return '';
}

// Reject blank model output so callers never persist empty artifacts
export function requireLlmText(content, label = 'LLM') {
  const text = normalizeMessageContent(content);
  if (!text.trim()) {
    throw llmError(`${label} returned an empty response`);
  }
  return text;
}

// Pause between retry attempts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Detect transient network failures eligible for one retry
function isNetworkError(err) {
  const code = err?.code ?? err?.cause?.code;
  return code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND';
}

// Retry once on network errors only
async function withRetry(fn, retries = 1) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0 && isNetworkError(err)) {
      await sleep(1000);
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}

// Route a prompt to the configured LLM provider (optional per-call overrides)
export async function callLlm({
  system,
  user,
  maxTokens = 1000,
  provider,
  model,
  providerOrder,
} = {}) {
  const resolvedProvider = provider || getSetting('llm_provider') || 'openai';
  const inputLen = (system?.length ?? 0) + (user?.length ?? 0);
  console.log(`[INFO] [llm] Calling ${resolvedProvider}, input ~${inputLen} chars`);

  if (resolvedProvider === 'openai') {
    return callOpenAI({ system, user, maxTokens, model });
  }
  if (resolvedProvider === 'openrouter') {
    return callOpenRouter({ system, user, maxTokens, model, providerOrder });
  }

  throw llmError(`Unknown LLM provider: ${resolvedProvider}`);
}

// Resolve llm_tasks.<task> overrides; empty fields fall back to global settings
export function resolveTaskLlm(task) {
  const tasks = getSetting('llm_tasks') ?? {};
  const cfg = tasks[task] && typeof tasks[task] === 'object' ? tasks[task] : {};
  return {
    provider: cfg.provider || undefined,
    model: cfg.model || undefined,
    providerOrder: cfg.provider_order || undefined,
  };
}

// Send a chat completions request to an OpenAI-compatible API
async function callOpenAI({ system, user, maxTokens, model: modelOverride }) {
  const apiKey = getSetting('openai_api_key') ?? '';
  const baseUrl = (getSetting('openai_base_url') ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = modelOverride || getSetting('openai_model') || '';

  if (!apiKey) {
    throw llmError('No OpenAI API key configured.');
  }
  if (!model) {
    throw llmError('No OpenAI model configured. Go to Settings to set a model.');
  }

  console.log(`[INFO] [llm] OpenAI model=${model} base=${baseUrl}`);

  return callChatCompletions({
    label: 'OpenAI',
    apiKey,
    baseUrl,
    model,
    system,
    user,
    maxTokens,
  });
}

// Send a chat completions request via OpenRouter
async function callOpenRouter({
  system,
  user,
  maxTokens,
  model: modelOverride,
  providerOrder: providerOrderOverride,
}) {
  const apiKey = getSetting('openrouter_api_key') ?? '';
  const model = modelOverride || getSetting('openrouter_model') || '';
  const providerOrder =
    providerOrderOverride || getSetting('openrouter_provider_order') || '';
  const provider = buildOpenRouterProviderPrefs(providerOrder);

  if (!apiKey) {
    throw llmError('No OpenRouter API key configured.');
  }
  if (!model) {
    throw llmError('No OpenRouter model configured. Go to Settings to set a model.');
  }

  console.log(
    `[INFO] [llm] OpenRouter model=${model}${provider ? ` providers=${provider.order.join(',')}` : ''}`,
  );

  return callChatCompletions({
    label: 'OpenRouter',
    apiKey,
    baseUrl: OPENROUTER_BASE_URL,
    model,
    system,
    user,
    maxTokens,
    bodyExtras: provider ? { provider } : {},
    extraHeaders: {
      'HTTP-Referer': 'https://github.com/jobHunter',
      'X-OpenRouter-Title': 'jobHunter job-collector',
    },
  });
}

// Shared OpenAI-compatible chat completions client
async function callChatCompletions({
  label,
  apiKey,
  baseUrl,
  model,
  system,
  user,
  maxTokens,
  bodyExtras = {},
  extraHeaders = {},
}) {
  const normalizedBase = baseUrl.replace(/\/$/, '');

  const doFetch = async () => {
    const res = await fetch(`${normalizedBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        ...bodyExtras,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[ERROR] [llm] ${label} returned ${res.status}:`, data);
      throw llmError(data?.error?.message ?? `${label} returned ${res.status}`);
    }

    const choice = data.choices?.[0];
    const text = normalizeMessageContent(choice?.message?.content);
    if (!text.trim()) {
      console.error(`[ERROR] [llm] ${label} empty content:`, {
        finish_reason: choice?.finish_reason,
        refusal: choice?.message?.refusal,
        error: data.error,
      });
      if (choice?.finish_reason === 'length') {
        throw llmError(
          `${label} hit max_tokens (${maxTokens}) before producing content (common with reasoning models). Try a higher max_tokens.`,
        );
      }
      throw llmError(`${label} returned an empty response`);
    }

    return text;
  };

  try {
    return await withRetry(doFetch);
  } catch (err) {
    if (err.code === 'LLM_ERROR') throw err;
    throw llmError(`Cannot reach ${label} API at ${normalizedBase}: ${err.message}`);
  }
}

