---
run: run-jobhunter-003
intent: cover-letter-generator
generated: 2026-08-01T07:26:00Z
mode: confirm
scope: batch
---

# Implementation Walkthrough: Per-job cover letter generation

## Summary

Added on-demand cover letter generation to job-collector, mirroring the existing CV flow. Work item 1 delivered the backend pipeline, API routes, DB column, and agent prompt. Work item 2 added a React viewer page, job-detail entry points, and API client methods for generate, preview, copy, and PDF download.

## Structure Overview

```
Job detail / Cover letter viewer (React)
        ↓ POST/GET /api/jobs/:id/cover-letter
Express pipeline routes
        ↓ enqueueJob
coverLetter.js → callLlm(agent prompt + profile + job)
        ↓ writeCoverLetterMd
phase2/documents/generated/CoverLetter_*.md
        ↓ cover_letter_md_path on jobs row
SQLite
```

PDF export reuses `cvToPdf` on the saved markdown path — no separate converter.

## Files Changed

### Created

| File | Purpose |
|------|---------|
| `docs/agents/cover-letter-generator.md` | LLM agent prompt (promoted from scratch) |
| `tools/job-collector/pipeline/coverLetter.js` | Generation module |
| `tools/job-collector/pipeline/coverLetter.self-check.js` | Assert-based pipeline check |
| `tools/job-collector/frontend/src/pages/CoverLetterViewer.jsx` | Full-page viewer |

### Modified

| File | Changes |
|------|---------|
| `tools/job-collector/pipeline/repoFiles.js` | `writeCoverLetterMd` |
| `tools/job-collector/server/db.js` | `cover_letter_md_path`, `cover_letter` LLM task |
| `tools/job-collector/server/routes/pipeline.js` | Cover letter REST routes |
| `tools/job-collector/frontend/src/api.js` | Client methods |
| `tools/job-collector/frontend/src/App.jsx` | `/jobs/:id/cover-letter` route |
| `tools/job-collector/frontend/src/pages/JobDetail.jsx` | Cover letter section |

## Key Decisions

- **Mirror CV, don't fork** — Same enqueue/poll UX, dual camelCase/snake_case reads, and `cvToPdf` for PDF.
- **No status change on cover letter** — Unlike CV (`cv_generated`), cover letter generation only sets `cover_letter_md_path` to keep the diff minimal.
- **Viewer empty state generates in-page** — Cover letter viewer includes a Generate button when empty (CV viewer redirects to job detail).
- **Self-check uses dynamic import** — `REPO_ROOT` is captured at module load; self-check sets env then `import()` to avoid writing test files into the real repo.

## Deviations from Plan

None material. Settings UI was not updated with a `cover_letter` task override (optional follow-up; global LLM settings apply via fallback).

## How to Verify

```bash
# Pipeline self-check
cd tools/job-collector && bun run pipeline/coverLetter.self-check.js

# Start dev stack
cd tools/job-collector && bun run dev
```

1. Open a saved job in the UI (`http://localhost:5173/jobs/:id`).
2. Click **Generate cover letter** in the Cover letter section (or open `/jobs/:id/cover-letter` and generate there).
3. Wait for polling to complete — preview should appear.
4. Use **Copy Markdown**, **Download .md**, and **Download PDF**.
5. Reopen the job — letter should persist from `cover_letter_md_path`.

## Ready for Review

- [x] All acceptance criteria met (both work items)
- [x] Self-check passes
- [x] Frontend builds (`vite build`)
- [x] No apply-form or auto-pipeline wiring
- [x] plan.md, test-report.md, review-report.md present

## Developer Notes

- LLM task key: `cover_letter` (configure per-task in settings JSON if needed; UI task list not yet extended).
- Generated files live beside CVs under `phase2/documents/generated/`.
- Generation is async (202 + queue) — UI must poll `GET /cover-letter` like CV rewrite.
