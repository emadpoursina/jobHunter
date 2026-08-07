# job-collector

Local tool for collecting job offers, parsing them with an LLM, saving structured records to SQLite, and generating tailored CV markdown files in the jobHunter repo.

**Runtime:** [Bun](https://bun.sh) — package manager, server runtime, and built-in SQLite (`bun:sqlite`).

---

## Prerequisites

- **Bun** 1.x
- An **LLM API key** (OpenAI, Anthropic, or OpenRouter — configure in Settings)
- **Playwright Chromium** (LinkedIn / Indeed scrapers only):

```bash
cd tools/job-collector
bunx playwright install chromium
```

---

## Quick start

```bash
cd tools/job-collector
cp .env.example .env
bun install
bun run dev
```

This starts:

- API server on `http://localhost:3001`
- Vite frontend on `http://localhost:5173` (proxies `/api` to the server)

Verify the server:

```bash
curl http://localhost:3001/api/health
# → {"ok":true}
```

---

## Docker

Requires Docker and an LLM API key (set in `.env` or Settings).

```bash
cd tools/job-collector
cp -n .env.example .env   # optional; compose overrides REPO_ROOT
bun run stack:up          # builds image + starts (rebuilds UI on each up)
```

`stack:up` runs `docker compose up --build`, so frontend changes are baked into the image. Use `bun run dev` for live Vite reload during UI work; use Docker when you want the single-port stack on `:3061`.

Then open `http://localhost:3061` (API + UI in one process).

```bash
curl http://localhost:3061/api/health
# → {"ok":true}
```

| Volume | Purpose |
|--------|---------|
| `./data` → `/app/data` | SQLite (`jobs.db`) |
| `../..` → `/repo` | jobHunter repo root (profile, agents, offers, generated CVs) |

Stop: `bun run stack:down`.

---

## Environment variables

Copy `.env.example` to `.env` and adjust as needed.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express API port |
| `REPO_ROOT` | `../..` | Path to jobHunter repo root (relative to `tools/job-collector/`) |
| `LLM_PROVIDER` | `openai` | `anthropic`, `openai`, or `openrouter` (also configurable in Settings UI) |
| `ANTHROPIC_API_KEY` | — | Required when using Anthropic |
| `OPENAI_API_KEY` | — | Required when using OpenAI-compatible API |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible chat completions base URL |
| `OPENAI_MODEL` | — | Model name for OpenAI-compatible API |
| `OPENROUTER_API_KEY` | — | Required when using OpenRouter |
| `OPENROUTER_MODEL` | — | OpenRouter model slug (e.g. `anthropic/claude-sonnet-4`) |
| `OPENROUTER_PROVIDER_ORDER` | — | Optional comma-separated provider slugs for OpenRouter routing |
| `PROFILE_PATH` | `phase2/profile/master-profile.md` | Candidate profile (relative to `REPO_ROOT`) |
| `AGENTS_DIR` | `docs/agents` | Agent prompt files directory |
| `OFFERS_DIR` | `phase2/offers/by-country` | Where parsed offer `.md` files are written |
| `CV_OUTPUT_DIR` | `phase2/documents/generated` | Where generated CV `.md` files are written |

Settings saved via the UI are persisted in SQLite and override env defaults for LLM and collector configuration.

---

## LLM setup

### OpenAI (default)

1. Set `OPENAI_API_KEY` in `.env` or paste the key in Settings
2. Set **API base URL** (default `https://api.openai.com/v1`; any OpenAI-compatible endpoint works)
3. Set the **model** name and save

### Anthropic

1. Set `ANTHROPIC_API_KEY` in `.env` or paste the key in Settings
2. Set provider to **Anthropic** and save

### OpenRouter

1. Set `OPENROUTER_API_KEY` in `.env` or paste the key in Settings
2. Set provider to **OpenRouter** and enter a model slug (e.g. `anthropic/claude-sonnet-4`)
3. Optionally set **Provider order** — comma-separated OpenRouter provider slugs (e.g. `anthropic, deepinfra`) to control which upstream hosts the request
4. Save and use **Test provider** to verify

### Per-task models

In **Settings → Task models**, override provider/model for **Parse offer** and **Generate CV**. Leave as Default to use the global provider. Credentials and base URLs remain shared.

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | API + frontend (watch mode) |
| `bun run dev:server` | API only |
| `bun run dev:frontend` | Vite frontend only |
| `bun run build` | Production frontend build |
| `bun run start` | Production API server |
| `bun run test:e2e` | E2E checklist (auto-detects `:3001` dev or `:3061` Docker) |
| `bun run test:e2e:docker` | E2E against Docker explicitly (`:3061`) |

---

## Features

- **Manual input** — paste job text or a URL on the Dashboard; parse, review, save
- **Browser extraction** — run a console script in your own browser (LinkedIn, Indeed, or any site), paste JSON, import — bypasses headless 403/CAPTCHA blocks
- **LinkedIn / Indeed scrapers** — Playwright-based collectors with run controls on the Dashboard
- **Jobs list** — filter by status, source, country
- **Job detail** — view parsed fields, generate CV, mark applied / rejected / neutral
- **CV viewer** — rendered markdown with copy / download
- **Deduplication** — jobs with the same `source_url` are skipped on insert (DB unique index + application check)

---

## Browser extraction (manual scrape)

When automated Playwright scraping is blocked (Indeed 403, LinkedIn CAPTCHA), use the **Browser extraction** section on the Dashboard:

1. Open the target site in your normal browser (logged in if needed).
2. Go to a **search results** page or a **single job posting**.
3. Expand the collector panel (LinkedIn, Indeed, or Any site).
4. Click **Copy script**, open DevTools (F12) → **Console**, paste, press Enter.
5. The script copies JSON to your clipboard: `{ "source": "...", "offers": [...] }`.
6. Paste the JSON into the panel and click **Import offers**.

Imported offers go through the same pipeline as automated runs: LLM parse → dedup → SQLite → offer `.md` file.

API equivalent:

```bash
curl -s -X POST http://localhost:3001/api/collect/import \
  -H "Content-Type: application/json" \
  -d '{"source":"indeed","offers":[{"sourceUrl":"https://...","rawText":"Title: ...\n..."}]}'
```

Scripts live in `collectors/browserScripts.js`. Fetch metadata via `GET /api/browser-scripts`.

---

## API errors

All error responses use a consistent shape:

```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

Common codes:

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Invalid request body or params |
| `NOT_FOUND` | 404 | Job, run, or file not found |
| `PARSE_ERROR` | 422 | LLM returned invalid JSON during parse |
| `LLM_ERROR` | 503 | LLM call failed (check API key / model) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Project layout

```
tools/job-collector/
├── collectors/       # manual, linkedin, indeed scrapers
├── frontend/         # React + Vite UI
├── pipeline/         # parser, CV generator, repo file writer
├── server/           # Express API, SQLite, LLM router, queue
├── data/             # SQLite database (gitignored)
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Data storage

- **SQLite** — `data/jobs.db` (jobs, collection runs, settings)
- **Markdown files** — offer and CV files under `REPO_ROOT` paths configured in `.env`

Offer files are append-only (same slug is not overwritten). CV files follow the same rule.

Generated offer and CV markdown under `REPO_ROOT` are gitignored at the repo root (see root `.gitignore`); only templates and README files in those folders are tracked.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Parse / CV fails with LLM error | Check Settings provider, model, and API key |
| Collect run saves some jobs but logs parse warnings | One listing failed LLM JSON extraction; others still saved. Parser strips markdown fences and preamble; try a different model if warnings persist |
| Scraper run fails immediately | Run `bunx playwright install chromium` |
| Duplicate jobs from scrapers | Expected — same URL is deduplicated; `runs.jobs_new` stays 0 |
| Indeed 403 / LinkedIn CAPTCHA | Use **Browser extraction** on the Dashboard instead of Run buttons |
| Port already in use | Change `PORT` in `.env` |

---

## Development notes

- Uses Express 5 — async route handlers propagate errors to the global handler via `asyncHandler`
- LLM and CV generation tasks run through a `p-queue` with concurrency 2
- On `SIGINT` / `SIGTERM`, the server closes the Playwright browser and SQLite connection
