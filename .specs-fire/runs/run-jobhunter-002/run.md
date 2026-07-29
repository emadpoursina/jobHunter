---
id: run-jobhunter-002
scope: batch
work_items:
  - id: apply-url-on-job
    intent: company-site-apply-filler
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: company-site-apply-agent
    intent: company-site-apply-filler
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: pivot-apply-route-and-ui
    intent: company-site-apply-filler
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
current_item: null
status: completed
started: 2026-07-29T21:24:55.389Z
completed: 2026-07-29T21:31:02.263Z
---

# Run: run-jobhunter-002

## Scope
batch (3 work items)

## Work Items
1. **apply-url-on-job** (confirm) — completed
2. **company-site-apply-agent** (confirm) — completed
3. **pivot-apply-route-and-ui** (confirm) — completed


## Current Item
(all completed)

## Files Created
- `tools/job-collector/server/db.apply-url.self-check.js`: apply_url DB round-trip self-check

## Files Modified
- `tools/job-collector/server/db.js`: apply_url column
- `tools/job-collector/server/routes/jobs.js`: applyUrl PATCH validation
- `tools/job-collector/server/routes/apply.js`: company apply pivot + APPLY_URL_MISSING
- `tools/job-collector/server/routes/apply.self-check.js`: APPLY_URL_MISSING assertion
- `docs/agents/apply-form.md`: company-site agent rewrite
- `tools/job-collector/pipeline/applyForm.self-check.js`: updated anchors
- `tools/job-collector/frontend/src/pages/JobDetail.jsx`: apply URL UI + company apply workflow
- `tools/job-collector/frontend/src/index.css`: apply URL and warning styles

## Decisions
(none)


## Summary

- Work items completed: 3
- Files created: 1
- Files modified: 8
- Tests added: 34
- Coverage: 0%
- Completed: 2026-07-29T21:31:02.263Z
