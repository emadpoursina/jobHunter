# Test Report

## Work Item: grounding-verification

### Test Results

- Fetcher command: `cd tools/job-collector && bun run pipeline/pageFetcher.self-check.js`
- Fetcher checks passed: 10
- Route self-check: passed with 11 assertions on isolated port 3199
- Failed: 0
- Skipped: 0
- Coverage: Not instrumented.

### Acceptance Criteria Validation

- [x] Fetcher trim and unusable detection are covered by mocked fixtures.
- [x] Route generation still returns `const SUBMIT = false` and a
  `__APPLY_CTX__` containing `pageHtml`.
- [x] The unusable/CSR fallback path is deterministic and does not require a
  live Workday page.
- [x] Route fallback generation completed successfully with
  `fetchStatus: unusable` and `grounded: false`.
- [x] Checks use existing graceful self-check behavior for unavailable
  providers.

### Manual Checklist

- [ ] Greenhouse: verify grounded selectors fill matching fields green.
- [ ] Lever: verify grounded selectors and React-safe writes are observed.
- [ ] Workday: expect CSR fallback and confirm generation remains usable.
- [ ] Ashby: verify mixed grounded and per-field fallback behavior.
- [ ] Auth-walled page: confirm graceful fallback without a route crash.
- [ ] In every case, review `console.table`, red fields, and click Submit
  manually only after review.
