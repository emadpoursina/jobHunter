---
run: run-jobhunter-001
intent: linkedin-easy-apply-filler
generated: 2026-07-29T12:10:00Z
---

# Walkthrough: LinkedIn Easy Apply form filler

## What was built

After `tools/job-collector/` collects an offer and generates a tailored CV, you can now
generate a **LinkedIn Easy Apply form-filler userscript** for that job from the job
detail page. The script is pasted into your own logged-in browser's DevTools console on
the LinkedIn job page; it fills the Easy Apply modal fields from your master profile,
uploads your CV (as PDF), answers common free-text questions, highlights unmapped
fields red, and leaves the Review step for you to click Submit.

## How to use it

1. In the job-collector UI, open a job that has a generated CV.
2. Click **Generate apply script** in the CV section.
3. The script is copied to your clipboard; the alert shows the PDF path and any warnings.
4. Open the job's `sourceUrl` in your own logged-in LinkedIn browser tab.
5. Open DevTools (F12) → Console, paste the script, press Enter.
6. The script opens the Easy Apply modal, fills fields (green outline), flags unknowns
   (red outline), and stops at the Review step.
7. Review red-outlined fields, fix anything wrong, click Submit yourself.
8. Back in the job-collector UI, click **Mark applied (Easy Apply)** to record
   `applied_at` + `applied_url` on the job row.

## Files created

| File | Purpose |
|------|---------|
| `tools/job-collector/pipeline/profile.js` | Parses `master-profile.md` "Personal Information" block into typed JSON, cached in `settings.parsed_profile`. |
| `tools/job-collector/pipeline/profile.self-check.js` | Smoke: required fields + cache round-trip. |
| `tools/job-collector/pipeline/cvPdf.js` | `cvToPdf(mdPath)` — `marked` + Playwright Chromium, idempotent reuse. |
| `tools/job-collector/pipeline/cvPdf.self-check.js` | Smoke: PDF created + reuse path. |
| `tools/job-collector/server/db.self-check.js` | `markApplied` idempotency smoke. |
| `docs/agents/apply-form.md` | Agent system prompt emitting the LinkedIn Easy Apply userscript. |
| `tools/job-collector/pipeline/applyForm.self-check.js` | Prompt-file structural validation. |
| `tools/job-collector/server/routes/apply.js` | `POST /api/apply/script` route + best-effort answer pre-generation. |
| `tools/job-collector/server/routes/apply.self-check.js` | E2E route smoke (starts server, hits endpoint). |

## Files modified

| File | Changes |
|------|---------|
| `tools/job-collector/server/db.js` | `applied_at`/`applied_url` columns (guarded ALTER), `markApplied` helper, added to summary columns + `db` export. |
| `tools/job-collector/server/routes/jobs.js` | `POST /:id/applied` route (idempotent). |
| `tools/job-collector/server/index.js` | Mounted `applyRouter` at `/api/apply`. |
| `tools/job-collector/frontend/src/api.js` | `generateApplyScript`, `markApplied` API methods. |
| `tools/job-collector/frontend/src/pages/JobDetail.jsx` | "Generate apply script" + "Mark applied (Easy Apply)" buttons. |

## Key design decisions

1. **Fill-assist, not auto-submit.** The script defaults `const SUBMIT = false` and stops at the Review step. The human reviews red-outlined fields and clicks Submit. This respects the constitution's "AI drafts require 100% human review before send" and LinkedIn's ToS on automated submission.

2. **Paste-into-DevTools, not headless.** The script runs in your own logged-in browser, bypassing CAPTCHA/session walls. Same UX as the existing `collectors/browserScripts.js` extraction pattern.

3. **Pre-generated answers, not runtime LLM calls.** The route calls the LLM once for 3 common Easy Apply questions and inlines the answers. Runtime calls from a `linkedin.com`-pasted script to `localhost:3001` would be cross-origin (CORS complexity) — avoided per the ponytail "smallest diff" rule. Unknown questions are highlighted red for manual fill.

4. **Synchronous route, not queued.** Single LLM call, frontend awaits with a loading state. Smaller diff than queue + poll.

5. **`marked` + Playwright for PDF.** Pandoc/weasyprint not installed; both `marked` and Playwright are already dependencies. Reuses the shared `getBrowser()` singleton from `collectors/linkedin.js`.

6. **Additive DB migration.** `applied_at`/`applied_url` added via guarded `ALTER TABLE` (SQLite has no `IF NOT EXISTS` for columns). Safe on the live `data/jobs.db`; 8 existing rows preserved.

## Known limitations

- **LLM provider flakiness.** The configured OpenRouter free model timed out / returned empty during self-checks. The apply-script route requires a working LLM. **Recommend configuring a reliable provider** (local Ollama via `ollama serve`, or a paid OpenAI/Anthropic key) in Settings before relying on this feature end-to-end.
- **Easy Apply modal selector drift.** The agent prompt instructs the LLM to match buttons by text ("Next", "Review") rather than brittle CSS classes, but LinkedIn can still change their DOM. If the script breaks on a specific job, regenerate it (the LLM may emit different selectors) or fall back to manual fill.
- **PDF upload is best-effort.** A pasted DevTools script cannot truly attach a file by path; the script attempts a `DataTransfer`-based assignment and warns the user to upload manually if it doesn't register.
- **One ATS only.** v1 targets LinkedIn Easy Apply (100% of currently collected offers are `de.linkedin.com`). Other ATSes (Workday, Greenhouse, etc.) are out of scope until a separate intent.
- **EEO/demographic questions are never auto-answered.** The script skips them with a red outline — by design.

## Self-checks

All self-checks are runnable without a test framework (ponytail rule):

```bash
cd tools/job-collector
REPO_ROOT=/Users/emad/Projects/playground/jobHunter bun run pipeline/profile.self-check.js
REPO_ROOT=/Users/emad/Projects/playground/jobHunter bun run pipeline/cvPdf.self-check.js
bun run server/db.self-check.js
REPO_ROOT=/Users/emad/Projects/playground/jobHunter bun run pipeline/applyForm.self-check.js
REPO_ROOT=/Users/emad/Projects/playground/jobHunter PORT=3099 bun run server/routes/apply.self-check.js
```

## State

- Run `run-jobhunter-001` (batch, 5 items) — completed.
- Intent `linkedin-easy-apply-filler` — all 5 work items implemented.
- Artifacts in `.specs-fire/runs/run-jobhunter-001/`: `run.md`, `plan.md`, `test-report.md`, `review-report.md`, `walkthrough.md`.

---
*Generated by specs.md - fabriqa.ai FIRE Flow Run run-jobhunter-001*
