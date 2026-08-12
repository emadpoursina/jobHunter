# Test Report

## Work Item: page-fetcher-module

### Test Results

- Command: `cd tools/job-collector && bun run pipeline/pageFetcher.self-check.js`
- Passed: 9
- Failed: 0
- Skipped: 0
- Coverage: Not instrumented; focused self-check exercises the exported
  transformation and fetch outcome paths.

### Acceptance Criteria Validation

- [x] `fetchApplyPageHtml(url)` returns trimmed HTML or `null`.
- [x] Fetches use a five-second timeout and non-OK/network/abort failures do
  not throw.
- [x] Scripts, styles, SVGs, comments, and excess whitespace are removed.
- [x] Substantial forms are preferred and output is capped at 60,000
  characters.
- [x] Pages with fewer than two input/textarea controls are marked unusable.
- [x] Fetch metadata distinguishes `ok`, `timeout`, `http-error`,
  `unusable`, and `network-error`.
- [x] Runnable fixture-based self-check added; no live network request is
  required.

### Notes

- The initial test command used the repository-relative script path from the
  `tools/job-collector` directory and failed to locate the script. The test was
  rerun with the absolute script path and passed; this was an invocation-path
  issue, not a product failure.

---

## Work Item: grounded-apply-agent-prompt

### Test Results

- Command: `cd tools/job-collector && bun run pipeline/applyForm.self-check.js`
- Passed: 21
- Failed: 0
- Skipped: 0
- Coverage: Not instrumented; prompt anchors and the available LLM round-trip
  passed.

### Acceptance Criteria Validation

- [x] `pageHtml` is documented as a string or `null` on `__APPLY_CTX__`.
- [x] Grounded selector priority is documented as `id` > `name` > data
  attributes > stable class/structure.
- [x] Invented selectors are forbidden and fallback is per field.
- [x] Safety anchors remain: `SUBMIT = false`, no auto-submit, demographic
  and consent skips, and no hardcoded PII.
- [x] React-safe writes, async IIFE, per-field try/catch, combobox,
  shadow-DOM, MutationObserver, and grounded/fallback reporting are required.
- [x] Host hints remain fallback-only.
- [x] The self-check validates the new prompt contract and its optional LLM
  round-trip passed.

### Notes

- The first self-check run found one missing literal phrase in the prompt
  assertion. The prompt was clarified to say “per-field fallback” and the
  complete check then passed.

---

## Work Item: wire-page-html-into-apply-route

### Test Results

- Route command: `PORT=3199 REPO_ROOT=/Users/emad/Projects/playground/jobHunter bun run server/routes/apply.self-check.js`
- Passed: 11
- Failed: 0
- Skipped: 0
- Build command: `cd tools/job-collector && bun run build`
- Build: Passed

### Acceptance Criteria Validation

- [x] The route fetches apply HTML after URL validation and injects usable
  markup or `null` into `__APPLY_CTX__.pageHtml`.
- [x] Existing profile, CV PDF, URL host, answer generation, and single LLM
  call remain in place.
- [x] Response includes `grounded` and `fetchStatus`.
- [x] Fetch outcomes are logged and failures continue through fallback
  generation.
- [x] Job Detail displays grounded versus fallback status.
- [x] Frontend API normalization preserves the script and exposes the new
  fields.

### Notes

- The initial route check used an existing server on port 3061 and therefore
  exercised stale code. It was rerun on isolated port 3199 and passed against
  the modified route.
