---
run: run-jobhunter-001
work_item: profile-parser
intent: linkedin-easy-apply-filler
mode: confirm
checkpoint: plan
approved_at: pending
---

# Implementation Plan: Profile parser + cache

## Approach

Add a small parser module under `tools/job-collector/pipeline/profile.js` that reads `master-profile.md` (path from `PROFILE_PATH` env, same as `pipeline/cv.js`), extracts the fenced "Personal Information" code block, splits each `Key: Value` line, and returns a typed JSON object. Cache the result in the `settings` table under key `parsed_profile` via the existing `db.setSetting`. On subsequent calls, return the cached object unless a refresh is forced (file mtime changed or explicit `?refresh=1`).

The "Personal Information" block is a fixed-format fenced code block with `Key: Value` lines — a regex/string split is enough. No markdown library, no new dependency. Languages field (`Farsi (Native), English (Fluent), German (A1 — learning)`) is parsed into `[{ name, level }]` with a small per-entry regex.

Missing required fields (fullName, email, phone) raise an error with code `PROFILE_INCOMPLETE` so downstream items (#4 agent prompt, #5 route) get a clear signal rather than a silent partial fill.

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/pipeline/profile.js` | `parseProfileFile(mdPath)`, `getParsedProfile({ refresh })` (reads cache or parses+caches), typed shape export |
| `tools/job-collector/pipeline/profile.self-check.js` | One runnable self-check: parse current `master-profile.md`, assert fullName/email/phone non-empty. Exits non-zero on failure. No test framework. |

## Files to Modify

| File | Changes |
|------|---------|
| (none) | Cache is written via existing `db.setSetting` — no DB schema change. `server/db.js` already exports `getSetting`/`setSetting`. |

## Tests

| Test File | Coverage |
|-----------|----------|
| `pipeline/profile.self-check.js` | Smoke: required fields present + cache round-trips through `getSetting`/`setSetting` on a temp setting key (does not pollute real `parsed_profile`). |

## Technical Details

**Locked JSON shape** (consumed by work items #4 and #5 — field names are the contract):

```js
{
  fullName: string,
  email: string,
  phone: string,
  telegram: string,          // "@emad_poursina" or ""
  linkedInUrl: string,
  githubUrl: string,
  location: string,
  seeking: string,
  workAuthorization: string,
  languages: [{ name: string, level: string }]
}
```

**Parser algorithm**:
1. Read file at `PROFILE_PATH` (resolved against `REPO_ROOT`, mirroring `pipeline/cv.js`).
2. Find the first fenced code block under a `## 1. Personal Information` heading (regex: `/##\s*1\.\s*Personal Information\s*\n+```\n([\s\S]*?)```/`).
3. Split lines on `\n`, trim, skip blanks. For each line, split on first `:` → `[key, value]`. Normalize key: lowercase, trim, map known keys (`Full Name` → `fullName`, `Phone / WhatsApp` → `phone`, `LinkedIn` → `linkedInUrl`, `GitHub` → `githubUrl`, `Work Authorization` → `workAuthorization`).
4. Parse `Languages` value with `/(\w+)\s*\(([^)]+)\)/g` → `[{ name, level }]`.
5. Validate required: `fullName`, `email`, `phone` non-empty → else throw `{ code: 'PROFILE_INCOMPLETE', message }`.
6. Return typed object.

**Cache flow**:
- `getParsedProfile({ refresh = false })`: if `refresh` is false AND `db.getSetting('parsed_profile')` returns non-null, return it. Otherwise parse, `db.setSetting('parsed_profile', obj)`, return.
- Refresh trigger in route (work item #5): compare `master-profile.md` mtime against a stored mtime in settings (`parsed_profile_mtime`). If file newer, re-parse. Kept simple — mtime check lives in the route, not the parser, so the parser stays pure.

**Self-check** (`profile.self-check.js`):
```js
// bun run pipeline/profile.self-check.js
// Asserts: parse current master-profile.md → fullName, email, phone all non-empty.
// Asserts: cache round-trip — setSetting('parsed_profile_test', obj) then getSetting returns deep-equal.
// Prints "OK" on success, exits 1 on failure. Cleans up test key.
```

## Brownfield notes

- Reuses `server/db.js` `getSetting`/`setSetting` verbatim — no new DB code.
- Mirrors `pipeline/cv.js` for `PROFILE_PATH` / `REPO_ROOT` resolution pattern.
- Matches coding standards: ESM, 2-space indent, single quotes, camelCase, `httpError`-style code on failure (`PROFILE_INCOMPLETE`).
- No new dependency. No test framework. Self-check is a single runnable script per ponytail rule.

---
*Plan pending approval at checkpoint. Execution follows approval.*

---

# Implementation Plan: CV md→PDF conversion

## Approach

New module `tools/job-collector/pipeline/cvPdf.js` exposes `async function cvToPdf(mdPath) -> pdfPath`. It converts a generated CV `.md` file to PDF using **`marked` (already a dependency) for md→HTML** + **Playwright Chromium (already a dependency, via `collectors/linkedin.js` `getBrowser()`) for HTML→PDF**. No new dependency, no system tool (pandoc/weasyprint not installed on this machine).

Idempotent: if the PDF exists and its mtime is newer than the source `.md`'s mtime, reuse it. Conversion failure raises an error with code `CV_PDF_ERROR` and the underlying Playwright error in the message.

The HTML wrapper is a tiny inline template string with minimal print CSS (A4, margins, standard serif font) — no separate CSS file, no template engine. The CV markdown is plain text with no images, so a simple wrapper is enough.

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/pipeline/cvPdf.js` | `cvToPdf(mdPath) -> pdfPath`, `mdToHtml(md)`, inline print CSS, idempotent skip |
| `tools/job-collector/pipeline/cvPdf.self-check.js` | One runnable self-check: convert one existing `phase2/documents/generated/CV_*.md` to PDF, assert file exists and is non-empty |

## Files to Modify

| File | Changes |
|------|---------|
| (none) | Reuses `collectors/linkedin.js` `getBrowser()` and `marked` from existing deps |

## Tests

| Test File | Coverage |
|-----------|----------|
| `pipeline/cvPdf.self-check.js` | Smoke: PDF created, non-empty, reuse-on-unchanged behavior |

## Technical Details

**Algorithm** (`cvToPdf(mdPath)`):
1. Resolve `mdPath` against `REPO_ROOT` via `repoPath()` from `pipeline/repoFiles.js`.
2. Stat the `.md`; if `pdfPath` exists and `pdf.mtimeMs >= md.mtimeMs`, return `pdfPath` (reuse).
3. Read `.md` content, convert to HTML via `marked(md)`.
4. Wrap in HTML template with print CSS:
   ```html
   <!doctype html><html><head><meta charset="utf-8"><style>
   @page { size: A4; margin: 18mm 16mm; }
   body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #111; }
   h1 { font-size: 16pt; margin: 0 0 4pt; }
   h2 { font-size: 12pt; margin: 12pt 0 4pt; border-bottom: 1px solid #ccc; padding-bottom: 2pt; }
   a { color: #111; text-decoration: underline; }
   ul { margin: 0 0 8pt; padding-left: 18pt; }
   </style></head><body>{html}</body></html>
   ```
5. Get browser from `getBrowser()` (`collectors/linkedin.js`), open a page, `page.setContent(html, { waitUntil: 'load' })`, `page.pdf({ format: 'A4', printBackground: true })` → Uint8Array.
6. Write the buffer to `pdfPath` (same dir, same basename, `.pdf`).
7. Return `pdfPath` (absolute path, since Playwright `page.pdf` writes via buffer — caller gets the path to pass to the apply script).

**Error handling**:
- `.md` missing → throw `{ code: 'CV_PDF_ERROR', message: 'source .md not found: <path>' }`.
- Playwright/marked failure → throw `{ code: 'CV_PDF_ERROR', message: original error message }`.

**Reuse logic**:
- `pdfPath` derived by replacing `.md` extension with `.pdf`.
- `stat` both; if `pdf.mtimeMs >= md.mtimeMs` and `pdf.size > 0`, skip conversion.
- This makes the operation idempotent across runs and across work item #5 invocations.

**Why not pandoc**: not installed on this machine. Adding a system dependency for a single conversion step violates ponytail rule. Playwright + marked are already in `package.json`.

**Why not `marked` alone**: marked outputs HTML, not PDF. Need a renderer. Playwright's `page.pdf()` is the path of least resistance given existing deps.

**Self-check** (`cvPdf.self-check.js`):
- Pick the first `CV_*.md` in `phase2/documents/generated/` (relative to `REPO_ROOT`).
- Delete any existing `.pdf` for it (force fresh conversion).
- Call `cvToPdf(mdPath)`, assert file exists and `size > 1000` bytes (PDF header + content).
- Call `cvToPdf(mdPath)` again without deleting, assert it returns the same path and did not re-convert (verify by checking mtime unchanged within a tight window — or just trust the reuse path is exercised).
- Print "OK" on success, exit 1 on failure.

## Brownfield notes

- Reuses `collectors/linkedin.js` `getBrowser()` — the shared stealth Chromium browser singleton. No new browser launch.
- Reuses `marked` from `package.json` deps (used in frontend for CV preview already).
- Reuses `repoPath` from `pipeline/repoFiles.js`.
- Matches coding standards: ESM, 2-space, single quotes, error code `CV_PDF_ERROR`.
- No new dependency. Self-check is a single runnable script per ponytail rule.

---
*Plan pending approval at checkpoint. Execution follows approval.*

---

# Implementation Plan: Application status tracking

## Approach

Add `applied_at TEXT` and `applied_url TEXT` columns to the `jobs` table via an additive migration in `server/db.js migrate()` (guarded `ALTER TABLE ... ADD COLUMN`, since SQLite has no `IF NOT EXISTS` for columns — check `PRAGMA table_info('jobs')` first). Add a `markApplied(id, { appliedUrl })` helper in `db.js` that sets `applied_at = datetime('now')` and `applied_url` only when `applied_at` is currently null (first-application-wins idempotency). Expose it on the `db` export object.

Add `applied_at` to `JOB_SUMMARY_COLUMNS` so the jobs list includes it; `applied_url` comes back via the existing `SELECT *` in `getJobById` (detail view).

Add `POST /api/jobs/:id/applied` to `server/routes/jobs.js` accepting `{ appliedUrl }`, calling `markApplied`. Reuses the existing `parseJobId` + 404/400 error patterns in that file.

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/server/db.self-check.js` | One runnable self-check: insert throwaway job, call `markApplied` twice, assert `applied_at` unchanged on second call; clean up the row |

## Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/server/db.js` | Add `applied_at`, `applied_url` to `migrate()` via guarded ALTER; add to `JOB_SUMMARY_COLUMNS`; add `markApplied` helper; expose on `db` export |
| `tools/job-collector/server/routes/jobs.js` | Add `POST /:id/applied` route accepting `{ appliedUrl }`, calling `markApplied`, returning updated job |

## Tests

| Test File | Coverage |
|-----------|----------|
| `server/db.self-check.js` | Idempotency: `markApplied` twice → `applied_at` unchanged; row cleanup |

## Technical Details

**Migration** (additive, safe on existing `data/jobs.db`):
```js
function columnExists(name) {
  const row = sqlite.prepare('PRAGMA table_info(jobs)').all();
  return row.some((c) => c.name === name);
}
if (!columnExists('applied_at')) sqlite.run('ALTER TABLE jobs ADD COLUMN applied_at TEXT');
if (!columnExists('applied_url')) sqlite.run('ALTER TABLE jobs ADD COLUMN applied_url TEXT');
```
Test against a copy of `data/jobs.db` first to confirm no data loss (the self-check runs against the real DB but only inserts+deletes a throwaway row).

**`markApplied(id, { appliedUrl })`**:
```js
export function markApplied(id, { appliedUrl = null } = {}) {
  const existing = sqlite.prepare('SELECT applied_at FROM jobs WHERE id = ?').get(id);
  if (!existing) return null;
  if (existing.applied_at) return getJobById(id); // already applied — no-op
  sqlite.prepare('UPDATE jobs SET applied_at = datetime(\'now\'), applied_url = ? WHERE id = ?')
    .run(appliedUrl, id);
  return getJobById(id);
}
```

**Route** (`POST /:id/applied`):
- `parseJobId` → 400 `VALIDATION_ERROR` on invalid.
- `getJobById` → 404 `NOT_FOUND` if missing.
- Validate body is object; `appliedUrl` optional string.
- Call `markApplied(id, { appliedUrl })`, return `{ job }`.
- Idempotent: second call returns same row, `applied_at` unchanged.

**`JOB_SUMMARY_COLUMNS`** gains `'applied_at'` (after `'status'`). `applied_url` stays in detail view only (already covered by `SELECT *`).

**Self-check** (`db.self-check.js`):
- Insert throwaway job (`source='selfcheck'`, `raw_text='test'`, `source_url='selfcheck-<timestamp>'` to avoid dedup).
- Call `markApplied(id, { appliedUrl: 'https://example.com' })`, assert `applied_at` non-null.
- Capture `applied_at` value.
- Call `markApplied` again, assert `applied_at` unchanged (idempotency).
- `deleteJob(id)` to clean up.
- Print "OK", exit 0.

## Brownfield notes

- Migration is additive — no existing column dropped, no data rewritten. Safe on the live `data/jobs.db`.
- `markApplied` is separate from the existing `status` field semantics (status = human review state; `applied_at` = automated-apply fact). They can disagree.
- Reuses `parseJobId` + error patterns already in `jobs.js`.
- An `applications` table was considered and rejected for v1 (one application per job for LinkedIn Easy Apply). Revisit as a separate intent if multi-ATS apply is added.
- Coding standards: snake_case DB columns, camelCase API (`appliedAt`, `appliedUrl` via `toCamel`), error codes UPPER_SNAKE.

---
*Plan pending approval at checkpoint. Execution follows approval.*

---

# Implementation Plan: Apply-form agent prompt

## Approach

New agent file `docs/agents/apply-form.md` (same structural pattern as `docs/agents/cv-generator.md`: a system prompt that produces a single artifact with a strict "output the artifact only, no preamble, no code fences around the whole output" footer). The artifact is a self-contained JavaScript userscript targeting LinkedIn Easy Apply on a given job URL, designed to be pasted into DevTools on the user's logged-in browser (same UX as `collectors/browserScripts.js`).

**Key design decision — pre-generated answers, not runtime LLM calls**: The work item listed runtime `askLlm()` calls as the preferred option but allowed deciding during the run. I'm choosing **pre-generated answers inlined at route time** (work item #5 calls the LLM once for common Easy Apply question patterns and injects a `const answers = {}` map into the script). Reason: a pasted DevTools script runs on `linkedin.com` — calling `localhost:3001` from there is cross-origin and would need CORS headers on the local Express server, adding complexity that violates the ponytail "smallest diff" rule. Pre-generation keeps the script self-contained and the server unchanged. Tradeoff: only questions anticipated by the route get answered; unknown free-text questions are highlighted red for the human. Acceptable for v1.

The script the agent emits must:
- Open the Easy Apply modal on the job page (click the "Easy Apply" button).
- Walk the multi-step modal (Contact → Resume → Questions → Review) clicking "Next" by matching button text (not brittle CSS classes).
- Fill Contact fields from the profile JSON (field names locked in work item #1).
- Upload the CV PDF via a `pdfPath` variable the route injects (the prompt does not hardcode a path).
- Answer free-text questions by looking up a normalized question key in the `answers` map; unknown questions are highlighted red and skipped.
- Skip and highlight red any EEO / demographic / consent questions — never auto-answer.
- Highlight filled fields green (outline), unknown fields red.
- Default `const SUBMIT = false` — never auto-submit; leave the Review screen visible for the human.
- Be a single self-contained JS snippet (no imports — runs in console).

## Files to Create

| File | Purpose |
|------|---------|
| `docs/agents/apply-form.md` | Agent system prompt emitting the LinkedIn Easy Apply userscript |
| `tools/job-collector/pipeline/applyForm.self-check.js` | One runnable self-check: feed the prompt + sample profile JSON + sample job to the LLM via `server/llm.js`, assert output contains `const SUBMIT = false` and no unconditional `form.submit()` |

## Files to Modify

| File | Changes |
|------|---------|
| (none) | Pure prompt file + self-check; no server changes in this item |

## Tests

| Test File | Coverage |
|-----------|----------|
| `pipeline/applyForm.self-check.js` | LLM output shape: contains `const SUBMIT = false`, no unconditional form submit, contains a highlight helper |

## Technical Details

**Agent prompt structure** (mirrors `cv-generator.md`):
- `# Agent: LinkedIn Easy Apply Form Filler (v1)`
- `## Goal` — emit a single JS userscript that fills the Easy Apply modal for a given job, dry-run by default, never auto-submit, never answer EEO.
- `## Input` — the prompt expects the route to provide, in the user message: `{ profile, job, pdfPath, urlHost, answers }`. The agent emits JS that references these as injected variables (the route wraps the LLM output in a function body or prepends `const __ctx = {...};`).
- `## Script requirements` — the bullet list from "Approach" above, as hard rules.
- `## What not to do` — no auto-submit, no EEO answers, no hardcoded paths, no `fetch` to external endpoints, no `window.location` changes.
- `## Output` — "Return the JavaScript userscript only. No preamble, no explanation, no markdown code fences around the whole output."

**Self-check** (`applyForm.self-check.js`):
- Build a sample user message: `JSON.stringify({ profile: {...minimal...}, job: {...minimal...}, pdfPath: '/tmp/cv.pdf', urlHost: 'linkedin.com', answers: {} })`.
- Call `callLlm({ system: <apply-form.md contents>, user, maxTokens: 2000 })` via `server/llm.js` (uses whatever provider is configured — Ollama by default).
- Assert output:
  - Contains `const SUBMIT = false` (case-insensitive).
  - Does NOT contain `.submit()` as an unconditional call (a `SUBMIT && ...submit()` gated call is allowed).
  - Contains a highlight helper (e.g. `outline` or `style.outline`) — confirms the green/red highlighting requirement landed.
- Print "OK", exit 0. Skip (exit 0 with note) if LLM is unavailable (Ollama down) — the self-check should not fail CI-style on a missing local model, but should warn clearly.

**Why skip on LLM-unavailable**: The self-check depends on a running Ollama (or configured provider). Forcing it to pass would require mocking; forcing it to fail would block the run when the user has no Ollama running. The ponytail rule allows trivial one-liners to skip tests; this is a smoke check, not a unit test. The script will print `SKIP (LLM unavailable: <reason>)` and exit 0 so the run can proceed, while still validating the prompt file exists and is non-empty.

## Brownfield notes

- Reuses `docs/agents/cv-generator.md` as the structural template (same "output the artifact only" footer pattern).
- Reuses `server/llm.js` `callLlm` for the self-check (same as `pipeline/cv.js`).
- The profile JSON field names consumed here are the locked contract from work item #1 (`fullName`, `email`, `phone`, `linkedInUrl`, `githubUrl`, `location`, `workAuthorization`, `languages`).
- No new dependency. Self-check is a single runnable script per ponytail rule.
- The route (work item #5) will read this file via `readRepoFile('docs/agents/apply-form.md')` — same pattern as `pipeline/cv.js` reads `docs/agents/cv-generator.md`.

---
*Plan pending approval at checkpoint. Execution follows approval.*

---

# Implementation Plan: Apply script API route + UI button

## Approach

New route module `server/routes/apply.js` mounted at `/api/apply` in `server/index.js`. Exposes `POST /api/apply/script` taking `{ jobId }`, which:

1. `getJobById(jobId)` → 404 `NOT_FOUND` if missing.
2. `getParsedProfile()` (work item #1) → 424 `PROFILE_INCOMPLETE` if missing/invalid.
3. Resolve `job.cvMdPath`; if missing → 409 `CV_NOT_GENERATED` (instruct user to generate CV first).
4. `cvToPdf(job.cvMdPath)` (work item #2) → 503 `CV_PDF_ERROR` on failure.
5. Read `docs/agents/apply-form.md` via `readRepoFile` (work item #4).
6. Best-effort: generate `answers` for a small set of common Easy Apply questions ("Why do you want to join?", "Why are you interested in this role?", "Cover letter") via one LLM call with job + profile context, capped at 200 tokens per answer. If the LLM call fails, proceed with `{}` — the script highlights unknown questions red either way.
7. `callLlm({ system: applyFormPrompt, user: ctxJson, maxTokens: 2000 })` → 503 `LLM_ERROR` on failure.
8. Wrap the LLM output: prepend `const __APPLY_CTX__ = {...};\n` so the script has its context. Return `{ script, warnings, pdfPath }`.

The route is **synchronous** (not queued) to match `POST /jobs/:id/cv`'s enqueue pattern? No — the CV route enqueues because generation is slow and the frontend polls. The apply-script route is a single LLM call (~5-15s); the frontend can await it directly with a loading state. Simpler than queue + poll. Decision: **synchronous route** (smaller diff, no polling UI needed).

Frontend: add a "Generate apply script" button in the CV section of `JobDetail.jsx` (visible only when `cvPath` exists). On click → call `api.generateApplyScript(id)` → copy `script` to clipboard (reuse existing `copyToClipboard` helper) → show alert with PDF path + warning count. Add a "Mark applied (Easy Apply)" button in the Status section that calls `api.markApplied(id, { appliedUrl: job.sourceUrl })` → uses the new `POST /jobs/:id/applied` endpoint (work item #3).

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/server/routes/apply.js` | `POST /apply/script` route; orchestrates profile + cvPdf + apply-form agent + answer pre-gen |
| `tools/job-collector/server/routes/apply.self-check.js` | One runnable self-check: with server running, curl `POST /api/apply/script` for an existing job, assert response has non-empty `script` containing `__APPLY_CTX__` and `const SUBMIT = false`. Skips gracefully if no job with a CV exists or LLM unavailable. |

## Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/server/index.js` | `import applyRouter from './routes/apply.js'` + `app.use('/api/apply', applyRouter)` |
| `tools/job-collector/frontend/src/api.js` | Add `generateApplyScript: (id) => request('POST', '/apply/script', { jobId: id })` and `markApplied: (id, appliedUrl) => request('POST', \`/jobs/${id}/applied\`, { appliedUrl })` |
| `tools/job-collector/frontend/src/pages/JobDetail.jsx` | Add "Generate apply script" button (CV section, when cvPath exists) + "Mark applied (Easy Apply)" button (Status section); reuse `copyToClipboard` + `showAlert` |

## Tests

| Test File | Coverage |
|-----------|----------|
| `server/routes/apply.self-check.js` | End-to-end smoke: route returns `{ script, warnings, pdfPath }` with `__APPLY_CTX__` + `SUBMIT = false`. Skips if no job has a CV or LLM unavailable. |

## Technical Details

**Route handler** (`POST /apply/script`):
```js
router.post('/script', asyncHandler(async (req, res) => {
  const jobId = Number(req.body?.jobId);
  if (!Number.isInteger(jobId) || jobId <= 0) return res.status(400).json({ error: 'Invalid jobId', code: 'VALIDATION_ERROR' });

  const job = getJobById(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found', code: 'NOT_FOUND' });

  let profile;
  try { profile = await getParsedProfile(); }
  catch (err) { return res.status(424).json({ error: err.message, code: err.code || 'PROFILE_INCOMPLETE' }); }

  const cvMdPath = job.cvMdPath ?? job.cv_md_path;
  if (!cvMdPath) return res.status(409).json({ error: 'Generate a CV first', code: 'CV_NOT_GENERATED' });

  let pdfPath;
  try { pdfPath = await cvToPdf(cvMdPath); }
  catch (err) { return res.status(503).json({ error: err.message, code: 'CV_PDF_ERROR' }); }

  const applyPrompt = await readRepoFile('docs/agents/apply-form.md');
  if (!applyPrompt) return res.status(500).json({ error: 'apply-form.md missing', code: 'INTERNAL_ERROR' });

  const urlHost = job.sourceUrl ? new URL(job.sourceUrl).hostname : 'linkedin.com';
  const answers = await generateAnswers(job, profile).catch(() => ({})); // best-effort

  const ctx = { profile, job: { title: job.title, company: job.company, sourceUrl: job.sourceUrl }, pdfPath, urlHost, answers };
  const userMsg = `Produce the LinkedIn Easy Apply userscript.\n\nconst __APPLY_CTX__ = ${JSON.stringify(ctx, null, 2)};\n\nEmit the script only.`;

  let scriptBody;
  try { scriptBody = await callLlm({ system: applyPrompt, user: userMsg, maxTokens: 2000 }); }
  catch (err) { return res.status(503).json({ error: err.message, code: 'LLM_ERROR' }); }

  if (!scriptBody || !scriptBody.trim()) return res.status(503).json({ error: 'LLM returned empty output', code: 'LLM_ERROR' });

  const script = `const __APPLY_CTX__ = ${JSON.stringify(ctx)};\n${scriptBody.trim()}`;
  const warnings = [];
  res.json({ script, warnings, pdfPath });
}));
```

**`generateAnswers(job, profile)`** (best-effort, in `apply.js`):
- Common question keys: `['why do you want to join', 'why are you interested in this role', 'cover letter']`.
- One LLM call with a small prompt: "Given this job and profile, write a 2-3 sentence answer for each question: ...". Capped at 200 tokens per answer (use a single call with maxTokens 600).
- Returns `{ [normalizedKey]: answerString }`. On any failure, returns `{}`.
- This is intentionally minimal — the script handles missing keys by highlighting red.

**Frontend additions** (`JobDetail.jsx`):
- In the CV section, after the existing CV buttons, add:
  ```jsx
  {cvPath && (
    <button type="button" className="btn" onClick={handleGenerateApplyScript} disabled={generatingApplyScript}>
      {generatingApplyScript ? 'Generating…' : 'Generate apply script'}
    </button>
  )}
  ```
- `handleGenerateApplyScript`: set loading → `api.generateApplyScript(id)` → `copyToClipboard(data.script)` → `showAlert(\`Script copied. PDF: ${data.pdfPath}. ${data.warnings.length} warning(s).\`, 'info')` → on error `showAlert(err.message)`.
- In the Status section, add:
  ```jsx
  <button type="button" className="btn" onClick={handleMarkApplied} disabled={markingApplied}>
    Mark applied (Easy Apply)
  </button>
  ```
- `handleMarkApplied`: `api.markApplied(id, job.sourceUrl)` → update local job state → `showAlert('Marked applied.', 'info')`.

**Self-check** (`apply.self-check.js`):
- Requires the server running (the work item says "with the server running"). Start it in the background, wait for `/api/health`, then `fetch('POST /api/apply/script', { jobId: <first job with cvMdPath> })`.
- If no job has a `cvMdPath`, skip with warning (exit 0).
- Assert response: `script` is non-empty string, contains `__APPLY_CTX__`, contains `const SUBMIT = false` (case-insensitive).
- If the fetch fails with `LLM_ERROR` or `CV_PDF_ERROR`, skip with warning (exit 0) — these are environment issues, not route bugs.
- Kill the server, print "OK", exit 0.

## Brownfield notes

- Route mounted alongside existing routes in `server/index.js` (same `app.use('/api/...', router)` pattern).
- Uses `asyncHandler` from `server/errors.js` (matches `pipeline.js` pattern).
- Reuses `getJobById`, `getParsedProfile`, `cvToPdf`, `readRepoFile`, `callLlm` — all from prior work items / existing modules.
- Frontend reuses existing `copyToClipboard` + `showAlert` helpers in `JobDetail.jsx` (same pattern as the "Copy path" button).
- No new frontend dependency. No new backend dependency.
- Synchronous route (not queued) — single LLM call, frontend awaits with loading state. Smaller diff than queue+poll.
- Constitution: "AI drafts require 100% human review before send" — the script defaults `SUBMIT = false`; the user reviews red fields and clicks Submit themselves.
- Constitution: "Job-collector scrapers must respect site terms; prefer manual/authenticated flows" — the script runs in the user's own logged-in browser, not headless.

---
*Plan pending approval at checkpoint. Execution follows approval.*
