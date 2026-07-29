---
id: cv-md-to-pdf
title: CV md→PDF conversion
intent: linkedin-easy-apply-filler
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-07-28T07:45:00Z
run_id: run-jobhunter-001
completed_at: 2026-07-29T05:18:43.777Z
---

# Work Item: CV md→PDF conversion

## Description

Convert a generated CV `.md` file (produced by `pipeline/cv.js`, written under `CV_OUTPUT_DIR`) to a PDF at a predictable path, so the LinkedIn Easy Apply resume-upload step has a file to supply from the user's machine.

## Acceptance Criteria

- [ ] A converter exists under `tools/job-collector/pipeline/` (e.g. `cvPdf.js`) exposing `async function cvToPdf(mdPath) -> pdfPath`.
- [ ] Output PDF path is derived from the `.md` path (same basename, `.pdf` extension) and is returned to the caller.
- [ ] If the PDF already exists and is newer than the `.md`, it is reused (no re-conversion) — idempotent.
- [ ] Conversion failure raises a clear error with code `CV_PDF_ERROR` and the underlying tool's stderr in the message.
- [ ] One runnable self-check: convert one existing generated CV `.md` to PDF and assert the file exists and is non-empty. No test framework.
- [ ] The chosen tool is invoked as a subprocess (no in-process PDF library) to keep the dependency surface minimal.

## Technical Notes

- Tool decision to make during the run, in priority order:
  1. `pandoc` (smallest diff if installed) — `pandoc input.md -o output.pdf` (needs a LaTeX engine for PDF, or use `--pdf-engine=weasyprint`).
  2. Headless Chromium print via the already-installed Playwright (`getBrowser()` from `collectors/linkedin.js`) — navigate to the rendered markdown, `page.pdf()`. Avoids LaTeX dependency; reuses existing browser.
  3. `md-to-pdf` npm package only if 1 and 2 are blocked.
  Prefer #2 to avoid a system dependency (pandoc + LaTeX) and because Playwright is already a dependency.
- The CV is plain markdown with no images, so a simple HTML wrapper + Chromium print is enough; no need for a markdown-to-HTML library beyond a tiny hand-rolled converter or the existing `cleanHtml` helper (note: `cleanHtml` strips tags, so don't use it here — write a minimal md→html or use marked if already installed).
- Check `package.json` before adding any markdown library; reuse what's there.

## Dependencies

(none)
