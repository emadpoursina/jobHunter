# Implementation Plan

## Work Item: page-fetcher-module

### Approach

- Add an ESM `pageFetcher.js` pipeline module with a five-second abort timeout,
  browser-like user agent, and non-throwing outcome handling.
- Trim fetched markup by removing scripts, styles, SVGs, comments, and excess
  whitespace; prefer a substantial form subtree and cap the result at 60,000
  characters.
- Reject pages without at least two form controls as unusable, while retaining
  stable outcome metadata (`ok`, `timeout`, `http-error`, `unusable`, or
  `network-error`) for the route integration work item.
- Keep `fetchApplyPageHtml(url)` as the simple required string-or-null API and
  expose `fetchApplyPage(url)` for callers that need the status.
- Add a runnable self-check using mocked `fetch` responses for trimming,
  form selection, truncation, unusable detection, HTTP errors, and timeouts.

### Files to Create

- `tools/job-collector/pipeline/pageFetcher.js` — raw HTTP fetcher and HTML
  normalization helpers.
- `tools/job-collector/pipeline/pageFetcher.self-check.js` — dependency-free
  Bun self-check for the fetcher behavior.

### Files to Modify

None.

### Tests

- `cd tools/job-collector && bun run pipeline/pageFetcher.self-check.js`
