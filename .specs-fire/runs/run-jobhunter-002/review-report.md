---
run: run-jobhunter-002
work_item: apply-url-on-job
generated: 2026-07-29T21:27:35Z
---

# Code Review: apply-url-on-job

## Summary

| Category | Auto-fixed | Suggested | Skipped |
|----------|------------|-----------|---------|
| Code Quality | 0 | 0 | 0 |
| Security | 0 | 0 | 0 |
| Architecture | 0 | 0 | 0 |
| Testing | 0 | 0 | 0 |

## Files Reviewed

- `tools/job-collector/server/db.js`
- `tools/job-collector/server/routes/jobs.js`
- `tools/job-collector/server/db.apply-url.self-check.js`
- `tools/job-collector/frontend/src/pages/JobDetail.jsx`
- `tools/job-collector/frontend/src/index.css`

## Findings

No mechanical issues found. Implementation follows existing patterns (`addColumnIfMissing`, camelCase mapping, route validation, self-check style). URL validation restricts to http/https. No secrets or injection risks introduced.

## Status

**Passed** — no auto-fixes or pending suggestions.

---

## Work Item: company-site-apply-agent

## Files Reviewed

- `docs/agents/apply-form.md`
- `tools/job-collector/server/routes/apply.js`
- `tools/job-collector/pipeline/applyForm.self-check.js`

## Findings

Prompt rewrite is comprehensive and maintains safety contract. Route changes correctly prefer `applyUrl` for `urlHost` and include warning when missing (strict 409 deferred to pivot work item). Self-check appropriately treats flaky LLM output as skippable.

## Status

**Passed**

---

## Work Item: pivot-apply-route-and-ui

## Files Reviewed

- `tools/job-collector/server/routes/apply.js`
- `tools/job-collector/server/routes/apply.self-check.js`
- `tools/job-collector/frontend/src/pages/JobDetail.jsx`
- `tools/job-collector/frontend/src/index.css`

## Findings

Route correctly fails fast with `APPLY_URL_MISSING` before expensive LLM/PDF work. UI gating and copy align with company-site workflow. No issues requiring changes.

## Status

**Passed**
