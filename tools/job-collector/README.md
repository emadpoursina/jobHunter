# job-collector

Local tool for collecting job offers, parsing them with an LLM, saving structured records to SQLite, and generating tailored CV markdown files in the jobHunter repo.

**Runtime:** [Bun](https://bun.sh) — package manager, server runtime, and built-in SQLite (`bun:sqlite`).

---

## Prerequisites

- **Bun** 1.x
- **Ollama** (default LLM provider) — or an **Anthropic API key**
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

## Environment variables

Copy `.env.example` to `.env` and adjust as needed.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express API port |
| `REPO_ROOT` | `../..` | Path to jobHunter repo root (relative to `tools/job-collector/`) |
| `LLM_PROVIDER` | `ollama` | `ollama` or `anthropic` (also configurable in Settings UI) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `OLLAMA_MODEL` | — | Default Ollama model name |
| `ANTHROPIC_API_KEY` | — | Required when using Anthropic |
| `PROFILE_PATH` | `phase2/profile/master-profile.md` | Candidate profile (relative to `REPO_ROOT`) |
| `AGENTS_DIR` | `docs/agents` | Agent prompt files directory |
| `OFFERS_DIR` | `phase2/offers/by-country` | Where parsed offer `.md` files are written |
| `CV_OUTPUT_DIR` | `phase2/documents/generated` | Where generated CV `.md` files are written |

Settings saved via the UI are persisted in SQLite and override env defaults for LLM and collector configuration.

---

## LLM setup

### Ollama (default)

1. Install and start Ollama: `ollama serve`
2. Pull a model: `ollama pull mistral`
3. Open **Settings** in the UI (`http://localhost:5173/settings`)
4. Set provider to **Ollama**, confirm base URL, pick a model from the dropdown, save

If Ollama is offline, API errors return code `OLLAMA_UNAVAILABLE` or `LLM_ERROR` with the message: *Start Ollama with `ollama serve`.*

### Anthropic

1. Set `ANTHROPIC_API_KEY` in `.env` or paste the key in Settings
2. Set provider to **Anthropic** and save

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | API + frontend (watch mode) |
| `bun run dev:server` | API only |
| `bun run dev:frontend` | Vite frontend only |
| `bun run build` | Production frontend build |
| `bun run start` | Production API server |

---

## Features

- **Manual input** — paste job text or a URL on the Dashboard; parse, review, save
- **LinkedIn / Indeed scrapers** — Playwright-based collectors with run controls on the Dashboard
- **Jobs list** — filter by status, source, country
- **Job detail** — view parsed fields, generate CV, update status
- **CV viewer** — rendered markdown with copy / download
- **Deduplication** — jobs with the same `source_url` are skipped on insert (DB unique index + application check)

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
| `LLM_ERROR` | 503 | LLM call failed (check Ollama / API key) |
| `OLLAMA_UNAVAILABLE` | 503 | Cannot reach Ollama `/api/tags` |
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
| Settings model dropdown empty | Start Ollama: `ollama serve` |
| Parse / CV fails with LLM error | Check Settings provider and model; confirm Ollama model is pulled |
| Scraper run fails immediately | Run `bunx playwright install chromium` |
| Duplicate jobs from scrapers | Expected — same URL is deduplicated; `runs.jobs_new` stays 0 |
| Port already in use | Change `PORT` in `.env` |

---

## Development notes

- Uses Express 5 — async route handlers propagate errors to the global handler via `asyncHandler`
- LLM and CV generation tasks run through a `p-queue` with concurrency 2
- On `SIGINT` / `SIGTERM`, the server closes the Playwright browser and SQLite connection
