# 06 — LLM Router (`server/llm.js`)

The LLM router is a single module that all pipeline code calls. It reads the
current provider setting from the DB and dispatches to the correct backend.

---

## Exported function

```js
export async function callLlm({ system, user, maxTokens = 1000 }): Promise<string>
```

- `system` — system prompt string
- `user` — user message string
- `maxTokens` — max tokens for the response (passed to the provider)
- Returns the LLM's text response as a plain string

Throws an error with `code: 'LLM_ERROR'` if the call fails.

---

## Provider selection

On each call, reads `llm_provider` from the settings DB (via `db.getSetting`).
This means changing the provider in Settings takes effect immediately without
restarting the server.

```js
const provider = db.getSetting('llm_provider') ?? 'ollama'
if (provider === 'ollama') return callOllama(...)
if (provider === 'anthropic') return callAnthropic(...)
throw new Error(`Unknown LLM provider: ${provider}`)
```

---

## Ollama implementation

**Endpoint:** `POST <ollama_base_url>/api/chat`

Reads `ollama_base_url` and `ollama_model` from settings DB.

**Request body:**
```json
{
  "model": "<ollama_model>",
  "stream": false,
  "messages": [
    { "role": "system", "content": "<system>" },
    { "role": "user",   "content": "<user>"   }
  ],
  "options": {
    "num_predict": <maxTokens>
  }
}
```

**Response parsing:**
```js
const data = await res.json()
return data.message.content
```

**Error handling:**
- If `ollama_model` is empty string: throw `LLM_ERROR` with message
  "No Ollama model configured. Go to Settings to select a model."
- If fetch fails (Ollama not running): throw `LLM_ERROR` with message
  "Cannot reach Ollama at <url>. Make sure Ollama is running."
- If response is not OK: throw `LLM_ERROR` with the status and body

---

## Anthropic implementation

**Endpoint:** `POST https://api.anthropic.com/v1/messages`

Reads `anthropic_api_key` from settings DB.

**Request headers:**
```
Content-Type: application/json
x-api-key: <anthropic_api_key>
anthropic-version: 2023-06-01
```

**Request body:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": <maxTokens>,
  "system": "<system>",
  "messages": [
    { "role": "user", "content": "<user>" }
  ]
}
```

**Response parsing:**
```js
const data = await res.json()
return data.content.map(b => b.text || '').join('')
```

**Error handling:**
- If `anthropic_api_key` is empty: throw `LLM_ERROR` "No Anthropic API key configured."
- If response is not OK: parse the error body and throw `LLM_ERROR` with
  `data.error.message`

---

## Retry logic

Both providers get one retry on network errors (not on 4xx responses):

```js
async function withRetry(fn, retries = 1) {
  try {
    return await fn()
  } catch (err) {
    if (retries > 0 && isNetworkError(err)) {
      await sleep(1000)
      return withRetry(fn, retries - 1)
    }
    throw err
  }
}
```

`isNetworkError` returns true for `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`.

---

## Ollama model list helper

```js
export async function getOllamaModels(): Promise<string[]>
```

Calls `GET <ollama_base_url>/api/tags` and returns `data.models.map(m => m.name)`.
Used by `GET /api/ollama/models` route. Throws `LLM_ERROR` if unreachable.
