# 09 — Conventions

## Environment variables

All in `.env` at the repo root. Copy `.env.example` to `.env` to get started.

### `.env.example`
```bash
# Server
PORT=3001

# Repo root (relative to where `node server/index.js` is run)
# If running from repo root: REPO_ROOT=.
# If running from server/ folder: REPO_ROOT=..
REPO_ROOT=.

# LLM — set one provider. The other can be left blank.
LLM_PROVIDER=ollama

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Anthropic (only needed if LLM_PROVIDER=anthropic)
ANTHROPIC_API_KEY=
```

Load with `dotenv` in `server/index.js`:
```js
import 'dotenv/config'
```

---

## Naming conventions

### Files
- All server/collector/pipeline files: `camelCase.js`
- All React component files: `PascalCase.jsx`
- All spec/doc files: `kebab-case.md`

### Variables and functions
- JavaScript: `camelCase` for variables and functions
- Constants: `SCREAMING_SNAKE_CASE` for module-level constants
- Database fields: `snake_case` (SQLite convention)
- JSON API responses: `camelCase` (JavaScript convention)

The DB layer translates between `snake_case` (stored) and `camelCase`
(returned to routes). Add a small `toCamel(obj)` helper in `server/db.js` for
this. Example: `match_score` in DB → `matchScore` in API response.

---

## Error handling

### Server errors

Every route file wraps its handlers with Express 5's automatic async error
propagation. Add a global error handler in `server/index.js`:

```js
app.use((err, req, res, next) => {
  const status = err.status ?? 500
  const code   = err.code   ?? 'INTERNAL_ERROR'
  console.error(`[ERROR] ${err.message}`, err.stack)
  res.status(status).json({ error: err.message, code })
})
```

To throw a handled error from a route:
```js
const err = new Error('Job not found')
err.status = 404
err.code   = 'NOT_FOUND'
throw err
```

Create a small helper `server/errors.js`:
```js
export function httpError(message, status = 500, code = 'INTERNAL_ERROR') {
  const err = new Error(message)
  err.status = status
  err.code   = code
  return err
}
```

### Collector errors

Collectors must not throw when a single listing fails. They log a warning and
skip. Only throw when the entire run is unrecoverable (e.g. completely blocked).

### LLM errors

`callLlm()` throws with `code: 'LLM_ERROR'`. The pipeline catches this,
updates the run record with `status: 'failed'` and the error message, and
re-throws so the route returns a 500.

### Frontend errors

All errors from `api.js` are caught in the component that made the call.
Display inline with `<div class="alert-err">`. Never let uncaught promise
rejections reach the console without a user-visible message.

---

## Logging

Use `console` — no logging library needed for a personal tool.

Format: `[LEVEL] [module] message`

```js
console.log('[INFO] [linkedin] Starting collection for query: "backend engineer Berlin"')
console.warn('[WARN] [parser] Truncated rawText from 4200 to 3000 chars')
console.error('[ERROR] [llm] Ollama returned 500: ...')
```

Log at the start and end of every collection run with job counts.
Log every LLM call with the provider, model, and approximate input length.
Log every file write with the full path.

---

## `package.json` scripts

Root `package.json` uses npm workspaces and `concurrently`:

```json
{
  "scripts": {
    "dev":     "concurrently \"npm run dev:server\" \"npm run dev:frontend\"",
    "dev:server":   "node --watch server/index.js",
    "dev:frontend": "vite frontend",
    "build":   "vite build frontend",
    "start":   "node server/index.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.0.0",
    "cheerio": "^1.0.0",
    "concurrently": "^8.0.0",
    "dotenv": "^16.0.0",
    "express": "^5.0.0",
    "p-queue": "^8.0.0",
    "playwright": "^1.40.0",
    "playwright-extra": "^4.3.6",
    "puppeteer-extra-plugin-stealth": "^2.11.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
```

Frontend dependencies (`react`, `react-dom`, `react-router-dom`, `marked`) go
in `frontend/package.json` — or inline in the root if not using workspaces.

---

## Queue (`server/queue.js`)

Use `p-queue` with `concurrency: 2`. Export a singleton:

```js
import PQueue from 'p-queue'
export const queue = new PQueue({ concurrency: 2 })
```

All collection and CV generation tasks are added to this queue. The queue
prevents overloading the local LLM with parallel requests.

Log queue size on each task start: `[INFO] [queue] task started, ${queue.size} remaining`.

---

## Startup sequence (`server/index.js`)

1. Load `.env`
2. Initialise DB (`db.migrate()`)
3. Initialise Express, mount routes
4. Start listening on `PORT`
5. Log `[INFO] [server] Listening on http://localhost:${PORT}`

On `SIGINT` / `SIGTERM`:
1. Close Playwright browser if open (`closeBrowser()`)
2. Close SQLite (`db.close()`)
3. Exit 0
