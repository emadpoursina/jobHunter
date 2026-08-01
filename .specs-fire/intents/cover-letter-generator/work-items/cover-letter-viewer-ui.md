---
id: cover-letter-viewer-ui
title: Cover letter viewer UI
intent: cover-letter-generator
complexity: medium
mode: confirm
status: completed
depends_on:
  - cover-letter-pipeline-and-api
created: 2026-07-30T19:11:00Z
run_id: run-jobhunter-003
completed_at: 2026-08-01T07:25:30.430Z
---

# Work Item: Cover letter viewer UI

## Description

Add a dedicated cover-letter viewer in the job-collector frontend that mirrors the CV viewer: open from a job, generate/rewrite on demand, preview markdown, copy, download `.md`, and download PDF.

## Acceptance Criteria

- [ ] Route `/jobs/:id/cover-letter` renders a viewer page following the same pattern as `CvViewer`.
- [ ] Job detail (and list actions if CV has them) exposes an entry point to open / generate the cover letter.
- [ ] Generate / rewrite uses the cover-letter API, with the same async polling UX pattern as CV rewrite.
- [ ] User can copy markdown, download `.md`, and download PDF when a letter exists.
- [ ] Empty state when no letter has been generated yet; clear feedback on generate/rewrite success and failure.
- [ ] API client methods exist for generate, get markdown, and download PDF (parallel to CV methods).
- [ ] No UI for enrichment fields; no apply-form wiring.

## Technical Notes

- Primary reference: `frontend/src/pages/CvViewer.jsx`, `frontend/src/api.js`, `App.jsx` route, `JobDetail.jsx` CV link/button.
- Reuse `CvPreview` (or equivalent markdown preview) rather than inventing a new preview component unless naming requires a thin rename/alias.
- Filename convention: `{slug}-cover-letter.md` / `.pdf` (or closest existing naming helper style).

## Dependencies

- cover-letter-pipeline-and-api
