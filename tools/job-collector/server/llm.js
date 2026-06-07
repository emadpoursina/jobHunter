import { getSetting } from './db.js';

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

// Build an error tagged for pipeline and route handlers
function llmError(message) {
  const err = new Error(message);
  err.code = 'LLM_ERROR';
  return err;
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

// Route a prompt to the configured LLM provider
export async function callLlm({ system, user, maxTokens = 1000 }) {
  const provider = getSetting('llm_provider') ?? 'ollama';
  const inputLen = (system?.length ?? 0) + (user?.length ?? 0);
  console.log(`[INFO] [llm] Calling ${provider}, input ~${inputLen} chars`);

  if (provider === 'ollama') {
    return callOllama({ system, user, maxTokens });
  }
  if (provider === 'anthropic') {
    return callAnthropic({ system, user, maxTokens });
  }

  throw llmError(`Unknown LLM provider: ${provider}`);
}

// Send a chat request to the local Ollama server
async function callOllama({ system, user, maxTokens }) {
  const baseUrl = (getSetting('ollama_base_url') ?? 'http://localhost:11434').replace(/\/$/, '');
  const model = getSetting('ollama_model') ?? '';

  if (!model) {
    throw llmError('No Ollama model configured. Go to Settings to select a model.');
  }

  console.log(`[INFO] [llm] Ollama model=${model}`);

  const doFetch = async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        options: {
          num_predict: maxTokens,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[ERROR] [llm] Ollama returned ${res.status}: ${body}`);
      throw llmError(`Ollama returned ${res.status}: ${body}`);
    }

    const data = await res.json();
    return data.message.content;
  };

  try {
    return await withRetry(doFetch);
  } catch (err) {
    if (err.code === 'LLM_ERROR') throw err;
    throw llmError(`Cannot reach Ollama at ${baseUrl}. Make sure Ollama is running.`);
  }
}

// Send a messages request to the Anthropic API
async function callAnthropic({ system, user, maxTokens }) {
  const apiKey = getSetting('anthropic_api_key') ?? '';

  if (!apiKey) {
    throw llmError('No Anthropic API key configured.');
  }

  console.log(`[INFO] [llm] Anthropic model=${ANTHROPIC_MODEL}`);

  const doFetch = async () => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[ERROR] [llm] Anthropic returned ${res.status}:`, data);
      throw llmError(data?.error?.message ?? `Anthropic returned ${res.status}`);
    }

    return data.content.map((block) => block.text || '').join('');
  };

  try {
    return await withRetry(doFetch);
  } catch (err) {
    if (err.code === 'LLM_ERROR') throw err;
    throw llmError(`Cannot reach Anthropic API: ${err.message}`);
  }
}

// List model names exposed by the configured Ollama instance
export async function getOllamaModels() {
  const baseUrl = (getSetting('ollama_base_url') ?? 'http://localhost:11434').replace(/\/$/, '');

  try {
    const res = await fetch(`${baseUrl}/api/tags`);

    if (!res.ok) {
      throw llmError(`Cannot reach Ollama at ${baseUrl}`);
    }

    const data = await res.json();
    return (data.models ?? []).map((model) => model.name);
  } catch (err) {
    if (err.code === 'LLM_ERROR') throw err;
    throw llmError(`Cannot reach Ollama at ${baseUrl}. Make sure Ollama is running.`);
  }
}
