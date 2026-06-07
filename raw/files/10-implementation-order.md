# 10 — Implementation Order

This document tells Cursor the exact order to implement the project. Each phase
produces something runnable so you can verify before continuing.

Read all spec files (00–09) before starting. Do not skip ahead.

---

## Phase 1 — Skeleton (no LLM, no scraping)

Goal: a running server with DB, one route, and the frontend shell.

### Step 1.1 — Repo setup
- Create `package.json` at repo root (see `09-conventions.md`)
- Create `.env` from `.env.example`
- Create `data/` folder
- Add `data/` and `.env` to `.gitignore`
- Run `npm install`
- Run `npx playwright install chromium` (downloads browser binary)

### Step 1.2 — Database (`server/db.js`)
- Implement the SQLite singleton
- Implement `migrate()` — creates all three tables and the trigger
- Implement all helper functions: `getJobs`, `getJobById`, `insertJob`,
  `updateJob`, `jobExistsByUrl`, `insertRun`, `updateRun`, `getRecentRuns`,
  `getSetting`, `setSetting`, `getAllSettings`
- Add `toCamel()` helper for snake_case → camelCase conversion
- Insert default settings on first run (check if `llm_provider` exists before
  inserting to keep it idempotent)
- **Verify:** `node -e "import('./server/db.js').then(m => console.log(m.db.getAllSettings()))"` prints defaults

### Step 1.3 — Express server shell (`server/index.js`)
- Create minimal Express 5 app
- Mount a placeholder route: `GET /api/health` returns `{ ok: true }`
- Add global error handler
- Add SIGINT/SIGTERM handler (stub — just exits for now)
- **Verify:** `npm run dev:server` starts, `curl localhost:3001/api/health` returns `{"ok":true}`

### Step 1.4 — Settings routes (`server/routes/settings.js`)
- Implement `GET /api/settings`
- Implement `PUT /api/settings`
- Implement `GET /api/ollama/models` (proxy to Ollama)
- **Verify:** GET returns default settings, PUT updates them, GET reflects changes

### Step 1.5 — Frontend shell (`frontend/`)
- Create Vite + React project in `frontend/`
- Install `react-router-dom`
- Create `App.jsx` with router, sidebar nav, and route placeholders
- Create `api.js` with all methods stubbed (they can just `console.log` for now)
- Create page stubs: `Dashboard.jsx`, `Jobs.jsx`, `JobDetail.jsx`, `Settings.jsx`
- Implement `Settings.jsx` fully — connects to the settings API
- **Verify:** `npm run dev` starts both servers, Settings page loads and saves LLM config

---

## Phase 2 — LLM integration

Goal: the manual collector + parser + CV generator work end-to-end.

### Step 2.1 — LLM router (`server/llm.js`)
- Implement `callLlm()` with Ollama and Anthropic backends
- Implement `getOllamaModels()`
- Implement retry logic
- **Verify:** With Ollama running, call `callLlm({ system: 'You are helpful', user: 'Say hi' })` from a test script

### Step 2.2 — Collector base (`collectors/base.js`)
- Implement `sleep()`, `cleanHtml()`, `makeSlug()`, `inferCountryCode()`

### Step 2.3 — Manual collector (`collectors/manual.js`)
- Implement text and URL modes
- **Verify:** `collector.run({ text: 'Job at Acme...' })` returns a `RawOffer`

### Step 2.4 — Collector registry (`collectors/registry.js`)
- Register manual collector only for now (LinkedIn and Indeed come in Phase 3)
- Implement `getCollector()`

### Step 2.5 — Parser (`pipeline/parser.js`)
- Implement `parseOffer(rawOffer)`
- Read agent file with fallback
- Call LLM, parse JSON, validate, post-process
- **Verify:** Pass a real job listing text, get back a valid `StandardOffer`

### Step 2.6 — Pipeline route (`server/routes/pipeline.js`)
- Implement `POST /api/parse` (calls parser, returns offer preview — no DB write)
- Implement `POST /api/jobs/save` (writes to DB + offer .md file)
- Implement `POST /api/jobs/:id/cv` (queues CV generation)
- Implement `GET /api/jobs/:id/cv` (reads CV file from disk)

### Step 2.7 — Jobs routes (`server/routes/jobs.js`)
- Implement all four CRUD routes

### Step 2.8 — File writer helpers
- Implement `repoPath()` in `pipeline/repoFiles.js`
- Implement offer `.md` file writer (format from `08-repo-integration.md`)
- Implement CV `.md` file writer

### Step 2.9 — CV Generator (`pipeline/cv.js`)
- Implement `generateCv(job)`
- Read profile and agent files
- Call LLM, return Markdown string
- **Verify:** Pass a saved job record, get back a CV Markdown string

### Step 2.10 — Frontend manual flow
- Implement `Dashboard.jsx` manual input section (paste text, call `/api/parse`,
  show preview, save)
- Implement `Jobs.jsx` list with filters
- Implement `JobDetail.jsx` with CV generation button + polling
- Implement `CvViewer.jsx`
- **End-to-end verify:** Paste a job listing → parse → save → generate CV → view CV

---

## Phase 3 — Automated collectors

Goal: LinkedIn and Indeed scraping works.

### Step 3.1 — LinkedIn collector (`collectors/linkedin.js`)
- Implement Playwright-based scraper with stealth plugin
- Add browser singleton
- Add SIGINT handler in `server/index.js` to close browser
- Register in `collectors/registry.js`
- **Verify:** Run manually with a test query, get back ≥1 `RawOffer`

### Step 3.2 — Collection route (`server/routes/collect.js`)
- Implement `GET /api/collectors`
- Implement `POST /api/collect` (enqueues full collect+parse+save pipeline)
- Implement `GET /api/runs` and `GET /api/runs/:id`
- **Verify:** POST /api/collect with source=manual triggers a run, run record updates to "done"

### Step 3.3 — Indeed collector (`collectors/indeed.js`)
- Implement Playwright-based scraper
- Register in registry
- **Verify:** Same as Step 3.1

### Step 3.4 — Dashboard run controls
- Implement "Run LinkedIn" / "Run Indeed" buttons
- Implement run status polling and display
- Show new jobs count after run completes

---

## Phase 4 — Polish

Goal: everything works reliably, errors are handled gracefully.

### Step 4.1 — Error handling
- Ensure every route returns proper error JSON (no unhandled promise rejections)
- Collector errors (rate limiting, bot detection) show clear messages in the UI
- LLM errors show clear messages with actionable text ("Start Ollama with `ollama serve`")

### Step 4.2 — Deduplication
- Verify `jobExistsByUrl` prevents duplicate jobs across multiple runs
- Add a "Last run" indicator on the Dashboard showing when each source was
  last collected

### Step 4.3 — Status workflow
- Verify status transitions work: raw → parsed → cv_generated → applied
- "Mark rejected" button on JobDetail
- Filter by status on Jobs list

### Step 4.4 — README update
- Add a `## Tools` section to the repo README explaining the new backend tool
- Document the `npm run dev` command and the Settings setup steps

---

## What NOT to build

To keep scope tight, explicitly skip:

- Authentication (single user, runs locally)
- Email notifications
- Scheduled/cron collection (run manually from the dashboard)
- Multiple candidate profiles
- Cover letter generation (can be added later as a fourth pipeline stage)
- Deployment configuration (Dockerfile, CI/CD)
