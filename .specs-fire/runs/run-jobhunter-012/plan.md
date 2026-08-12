# Implementation Plan

## Work Item: grounding-verification

### Approach

- Extend the existing page-fetcher self-check with a mocked unusable HTML
  response so fallback status is deterministic and does not depend on a live
  Workday page.
- Keep the existing route self-check assertions for `pageHtml`, `grounded`,
  `fetchStatus`, and `SUBMIT = false`.
- Document a concise manual ATS validation checklist in the run walkthrough for
  Greenhouse, Lever, Workday, Ashby, and an auth-walled URL.

### Files to Create

None.

### Files to Modify

- `tools/job-collector/pipeline/pageFetcher.self-check.js` — assert the
  `unusable` fallback status with mocked HTML.

### Tests

- `cd tools/job-collector && bun run pipeline/pageFetcher.self-check.js`
- `PORT=3199 REPO_ROOT=/absolute/path/to/jobHunter bun run server/routes/apply.self-check.js`
