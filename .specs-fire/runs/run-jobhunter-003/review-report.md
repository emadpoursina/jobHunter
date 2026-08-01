---
run: run-jobhunter-003
work_item: cover-letter-pipeline-and-api
intent: cover-letter-generator
reviewed_at: 2026-07-30T19:40:00Z
---

# Code Review Report: Cover letter pipeline + API

## Summary

| Category | Auto-fixed | Suggested | Skipped |
|----------|------------|-----------|---------|
| Code Quality | 0 | 0 | 0 |
| Security | 0 | 0 | 0 |
| Architecture | 0 | 0 | 0 |
| Testing | 0 | 0 | 0 |

## Files Reviewed

- `docs/agents/cover-letter-generator.md` (created)
- `tools/job-collector/pipeline/coverLetter.js` (created)
- `tools/job-collector/pipeline/coverLetter.self-check.js` (created)
- `tools/job-collector/pipeline/repoFiles.js` (modified)
- `tools/job-collector/server/db.js` (modified)
- `tools/job-collector/server/routes/pipeline.js` (modified)

## Findings

No issues found. Implementation mirrors existing CV patterns consistently:
- Dual camelCase/snake_case reads for `coverLetterMdPath`
- Empty-input guard on write
- Async generation via `enqueueJob` with 202 response
- PDF reuse via `cvToPdf`

## Optional follow-ups (not blocking)

- Settings UI could add `cover_letter` task override (deferred to viewer work item scope / future polish).

## Verdict

**Approved** — no auto-fixes or suggestions required. Self-check passes.

---

## Work Item: cover-letter-viewer-ui

### Files Reviewed

- `tools/job-collector/frontend/src/pages/CoverLetterViewer.jsx` (created)
- `tools/job-collector/frontend/src/api.js` (modified)
- `tools/job-collector/frontend/src/App.jsx` (modified)
- `tools/job-collector/frontend/src/pages/JobDetail.jsx` (modified)

### Findings

No issues. Viewer mirrors `CvViewer` patterns; reuses `CvPreview` and existing CSS classes. Job detail section follows CV section structure.

### Verdict

**Approved**
