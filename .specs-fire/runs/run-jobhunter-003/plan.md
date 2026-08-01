---
run: run-jobhunter-003
work_item: cover-letter-viewer-ui
intent: cover-letter-generator
mode: confirm
checkpoint: plan
approved_at: null
---

# Implementation Plan: Cover letter pipeline + API

*(Completed — see test-report.md)*

---

# Implementation Plan: Cover letter viewer UI

## Approach

Mirror `CvViewer` with minimal duplication:

1. **API client** — Add `generateCoverLetter`, `getCoverLetterMarkdown`, `downloadCoverLetterPdf` to `frontend/src/api.js` (parallel to CV methods).
2. **Viewer page** — Add `CoverLetterViewer.jsx` copied/adapted from `CvViewer.jsx`: same polling UX for generate/rewrite, copy markdown, download `.md`, download PDF. Reuse `CvPreview` for markdown rendering.
3. **Routing** — Register `/jobs/:id/cover-letter` in `App.jsx`.
4. **Job detail entry** — Add a "Cover letter" section in `JobDetail.jsx` mirroring the CV section: generate button, preview when exists, link to full viewer.
5. **Empty state** — Viewer shows generate CTA when no letter exists (trigger API + poll), matching CV rewrite flow.

No enrichment fields UI. No apply-form wiring.

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/frontend/src/pages/CoverLetterViewer.jsx` | Full-page cover letter viewer |

## Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/frontend/src/api.js` | Cover letter API methods |
| `tools/job-collector/frontend/src/App.jsx` | Route for cover letter viewer |
| `tools/job-collector/frontend/src/pages/JobDetail.jsx` | Cover letter section + generate/link |

## Tests

Manual smoke via existing dev server (no new test framework files required by work item).

## Technical Details

- Filename helpers: `{slug}-cover-letter.md` / `.pdf` for browser downloads.
- Reuse existing `cv-viewer-page` CSS classes where possible (same layout).

---
*Awaiting plan approval checkpoint.*
