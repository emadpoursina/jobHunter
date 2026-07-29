---
id: apply-script-route-and-ui
title: Apply script API route + UI button
intent: linkedin-easy-apply-filler
complexity: medium
mode: confirm
status: completed
depends_on:
  - profile-parser
  - cv-md-to-pdf
  - application-status-tracking
  - apply-form-agent-prompt
created: 2026-07-28T07:45:00Z
run_id: run-jobhunter-001
completed_at: 2026-07-29T12:09:55.435Z
---

# Work Item: Apply script API route + UI button

## Description

Wire everything together: an Express route that takes a `jobId`, loads the cached profile + job + CV PDF path, calls the LLM with `docs/agents/apply-form.md`, and returns `{ script, warnings, pdfPath }`. A "Generate apply script" button on the job detail page copies the script to the clipboard using the same UX as the existing browser-extraction panel.

## Acceptance Criteria

- [ ] `server/routes/apply.js` exists and registers `POST /api/apply/script` on the Express app (mounted in `server/index.js` alongside the existing routes).
- [ ] Request body: `{ jobId: number }`. Response: `{ script: string, warnings: string[], pdfPath: string }`.
- [ ] Route flow:
  1. `db.getJobById(jobId)` — 404 with `NOT_FOUND` if missing.
  2. Load cached profile from `settings` (work item #1); if missing, return 424 with code `PROFILE_INCOMPLETE`.
  3. Resolve CV `.md` path from `job.cvMdPath`; if missing, return 409 with code `CV_NOT_GENERATED` (instruct user to generate CV first).
  4. Convert `.md` → `.pdf` via work item #2; on failure return 503 with code `CV_PDF_ERROR`.
  5. Call LLM with `docs/agents/apply-form.md` system prompt + `{ profile, job, pdfPath, urlHost }` user message; on failure return 503 with `LLM_ERROR`.
  6. Return script + any warnings the prompt emitted + `pdfPath` (so the UI can show the user where the PDF is).
- [ ] Route is queued through the existing `p-queue` (concurrency 2) in `server/queue.js` — same as parse / CV — so it does not starve other tasks.
- [ ] Frontend: job detail page gains a "Generate apply script" button (next to the existing "Generate CV" button). On success it copies the script to the clipboard and shows a toast with the PDF path + warning count.
- [ ] After the user pastes and runs the script and manually submits, the UI has a "Mark as applied" action that calls `POST /api/jobs/:id/applied` (work item #3) — the script itself does not auto-mark applied (it never auto-submits).
- [ ] One runnable self-check: with the server running, `curl -X POST localhost:3001/api/apply/script -d '{"jobId":<existing>}'` returns a non-empty `script` string containing `const SUBMIT = false`. No test framework.
- [ ] No new frontend dependency — reuse existing button + toast components in `frontend/src/components/`.

## Technical Notes

- The route must not auto-call `markApplied` — application is only "applied" when the human clicks Submit and confirms via the "Mark as applied" button. This keeps the human-in-the-loop contract from the intent brief.
- If the agent prompt (work item #4) chooses runtime LLM calls inside the script, expose an additional `POST /api/apply/answer` route here that takes `{ question, jobId }` and returns a short LLM answer; the script's `askLlm` shim fetches it. Decide this during #4 and add the route here if needed.
- Clipboard copy: check `frontend/src/components/` for an existing copy-to-clipboard helper used by the browser-extraction panel and reuse it verbatim.
- Errors follow the existing `{ error, code }` shape from `server/errors.js`.

## Dependencies

- profile-parser
- cv-md-to-pdf
- application-status-tracking
- apply-form-agent-prompt
