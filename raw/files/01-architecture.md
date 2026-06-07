# 01 — Architecture

## Folder structure

```
jobHunter/                          ← existing repo root
│
├── .env                            ← NEW: secrets and config (git-ignored)
├── .env.example                    ← NEW: committed template
├── package.json                    ← NEW: root package (workspaces)
├── package-lock.json
│
├── frontend/                       ← NEW: React + Vite app
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js                  ← all fetch() calls to Express
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Jobs.jsx
│       │   ├── JobDetail.jsx
│       │   ├── CvViewer.jsx
│       │   └── Settings.jsx
│       └── components/
│           ├── JobCard.jsx
│           ├── StatusBadge.jsx
│           ├── RunButton.jsx
│           └── CvPreview.jsx
│
├── server/                         ← NEW: Express API
│   ├── index.js                    ← app entry point, mounts routes
│   ├── llm.js                      ← unified LLM router
│   ├── queue.js                    ← p-queue wrapper + run log
│   ├── db.js                       ← better-sqlite3 singleton + migrations
│   └── routes/
│       ├── jobs.js                 ← GET/POST /api/jobs
│       ├── collect.js              ← POST /api/collect
│       ├── pipeline.js             ← POST /api/parse, /api/cv
│       └── settings.js             ← GET/POST /api/settings
│
├── collectors/                     ← NEW: pluggable source adapters
│   ├── base.js                     ← interface / shared utilities
│   ├── registry.js                 ← registers and exports all collectors
│   ├── manual.js                   ← paste or URL input
│   ├── linkedin.js                 ← Playwright-based LinkedIn scraper
│   └── indeed.js                   ← Playwright-based Indeed scraper
│
├── pipeline/                       ← NEW: LLM processing stages
│   ├── parser.js                   ← raw text → structured offer JSON
│   └── cv.js                       ← offer + profile → CV Markdown
│
├── data/                           ← NEW: runtime data (git-ignored)
│   └── jobs.db                     ← SQLite database
│
│   ── existing repo folders below ──────────────────────────────────
├── profile/
│   └── master-profile.md           ← READ by pipeline/cv.js
├── agents/
│   ├── cv-generator.md             ← READ by pipeline/cv.js as system prompt
│   └── job-offer-research.md       ← READ by pipeline/parser.js
├── documents/
│   └── generated/                  ← WRITTEN by pipeline/cv.js
│       └── CV_<Company>_<Role>_<Date>.md
├── job-offers/
│   └── by-country/
│       └── <CC>/                   ← WRITTEN by pipeline/parser.js
│           └── <slug>.md
├── countries/
├── skills/
├── learning/
├── networking/
├── applications/
└── metrics/
```

## Layer responsibilities

### frontend/
- Single-page React app served by Vite dev server (port 5173)
- All data fetched from the Express API — no direct DB or file access
- Proxied to `localhost:3001` via Vite config so no CORS issues in dev
- Responsibilities: display jobs, trigger collection runs, view generated CVs,
  configure settings (LLM provider, search queries per source)

### server/
- Express 5 API on port 3001
- Mounts all route modules from `server/routes/`
- Owns the SQLite connection via `server/db.js` singleton
- Owns the job queue via `server/queue.js`
- Routes delegate to collectors and pipeline modules

### collectors/
- Each collector is a self-contained module
- They do NOT call the LLM — they only fetch raw text/HTML and return
  `RawOffer[]` objects (see `04-collectors.md` for the interface)
- Playwright browser instance is shared across collectors (lazy init)

### pipeline/
- `parser.js` takes a `RawOffer` and calls the LLM to produce a
  `StandardOffer` (the project's canonical offer schema)
- `cv.js` takes a `StandardOffer` + the master profile and calls the LLM to
  produce a CV string in Markdown
- Both modules read agent instruction files from `agents/` to use as LLM
  system prompts

### data/
- `jobs.db` is SQLite, managed by `server/db.js`
- The `data/` folder is git-ignored
- On first run, `db.js` creates the schema automatically (no migration tool
  needed)

## Data flow

```
User triggers collection
        │
        ▼
POST /api/collect  { source: "linkedin", config: { query, location } }
        │
        ▼
collectors/registry.js  →  collectors/linkedin.js
        │  returns RawOffer[]
        ▼
pipeline/parser.js  (LLM call)
        │  returns StandardOffer
        ▼
  ┌─────┴──────┐
  │            │
  ▼            ▼
jobs.db    job-offers/by-country/<CC>/<slug>.md
  │
  ▼  (user clicks "Generate CV" in frontend)
POST /api/cv  { jobId }
        │
        ▼
pipeline/cv.js  (LLM call, reads profile/master-profile.md)
        │  returns CV Markdown string
        ▼
  ┌─────┴──────┐
  │            │
  ▼            ▼
jobs.db    documents/generated/CV_<Company>_<Role>_<Date>.md
```

## Process model

- Single Node.js process for the server
- `p-queue` with concurrency=2 ensures at most two LLM calls run simultaneously
- Playwright browser is launched once, reused across collector runs, closed on
  SIGINT/SIGTERM
- No worker threads or child processes needed

## Environment variables

Defined in `.env` at repo root. Full list in `09-conventions.md`.

Key variables:
```
PORT=3001
REPO_ROOT=.                    # path to jobHunter repo root, relative to server/
LLM_PROVIDER=ollama            # "ollama" or "anthropic"
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
ANTHROPIC_API_KEY=             # only needed if LLM_PROVIDER=anthropic
```
