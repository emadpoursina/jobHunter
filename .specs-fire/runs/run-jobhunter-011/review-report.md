# Code Review Report

## Work Item: page-fetcher-module

### Review Summary

| Category | Auto-fixed | Suggestions | Skipped |
|---|---:|---:|---:|
| Code quality | 0 | 0 | 0 |
| Security | 0 | 1 | 0 |
| Architecture | 0 | 0 | 0 |
| Testing | 0 | 0 | 0 |

### Reviewed Files

- `tools/job-collector/pipeline/pageFetcher.js`
- `tools/job-collector/pipeline/pageFetcher.self-check.js`

### Findings

- The module validates URL syntax but does not restrict the protocol to HTTP
  or HTTPS. The current route only supplies company apply URLs, so this does
  not block the requested behavior; consider protocol and private-network
  restrictions if apply URLs can later be supplied by untrusted users.
- No mechanical issues, unused imports, hardcoded secrets, or test failures
  were found.

### Verification

- `bun run pipeline/pageFetcher.self-check.js` passed after review.
- No linter or formatter is configured for this project.

### Status

Review complete. The security item is recorded as a future hardening concern
and was not expanded beyond this work item’s raw-fetch scope.

---

## Work Item: grounded-apply-agent-prompt

### Review Summary

| Category | Auto-fixed | Suggestions | Skipped |
|---|---:|---:|---:|
| Code quality | 0 | 0 | 0 |
| Security | 0 | 0 | 0 |
| Architecture | 0 | 0 | 0 |
| Testing | 0 | 0 | 0 |

### Reviewed Files

- `docs/agents/apply-form.md`
- `tools/job-collector/pipeline/applyForm.self-check.js`

### Findings

- The updated prompt preserves the dry-run and human-submit safety boundary,
  makes snapshot selectors authoritative when available, and limits fallback
  to individual fields.
- The self-check covers the new contract and the optional LLM round-trip.
- No mechanical issues, hardcoded secrets, unsafe prompt instructions, or
  linter findings were found.

### Verification

- `bun run pipeline/applyForm.self-check.js` passed, including the available
  LLM round-trip assertions.

### Status

Review complete with no pending suggestions.

---

## Work Item: wire-page-html-into-apply-route

### Review Summary

| Category | Auto-fixed | Suggestions | Skipped |
|---|---:|---:|---:|
| Code quality | 0 | 0 | 0 |
| Security | 0 | 0 | 1 |
| Architecture | 0 | 0 | 0 |
| Testing | 0 | 0 | 0 |

### Reviewed Files

- `tools/job-collector/server/routes/apply.js`
- `tools/job-collector/server/routes/apply.self-check.js`
- `tools/job-collector/frontend/src/api.js`
- `tools/job-collector/frontend/src/pages/JobDetail.jsx`
- `tools/job-collector/frontend/src/index.css`

### Findings

- The route keeps page-fetch failures soft, logs a stable status, and preserves
  one LLM generation call.
- The response contract is explicit and the UI presents grounding confidence
  next to the copyable script.
- No unused imports, hardcoded secrets, or unsafe submit behavior were found.
- Protocol/private-network restrictions remain the previously recorded
  hardening concern in the fetcher and are outside this wiring item.

### Verification

- Isolated route self-check passed on port 3199.
- Frontend production build passed.
- No linter or formatter is configured.

### Status

Review complete with no new pending suggestions.
