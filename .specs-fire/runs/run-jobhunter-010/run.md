---
id: run-jobhunter-010
scope: batch
work_items:
  - id: schema-stage-migration
    intent: application-funnel-stages
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: stage-api-and-mark-applied
    intent: application-funnel-stages
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: funnel-stage-ui
    intent: application-funnel-stages
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
current_item: null
status: completed
started: 2026-08-10T20:32:07.532Z
completed: 2026-08-10T20:37:42.014Z
---

# Run: run-jobhunter-010

## Scope
batch (3 work items)

## Work Items
1. **schema-stage-migration** (confirm) — completed
2. **stage-api-and-mark-applied** (confirm) — completed
3. **funnel-stage-ui** (confirm) — completed


## Current Item
(all completed)

## Files Created
(none)

## Files Modified
- `tools/job-collector/frontend/src/pages/Jobs.jsx`: Stage filter + bulk sent/rejected
- `tools/job-collector/frontend/src/pages/JobDetail.jsx`: Stage select + mark applied/rejected
- `tools/job-collector/frontend/src/components/StatusBadge.jsx`: Stage badge variant
- `tools/job-collector/frontend/src/components/JobCard.jsx`: Show stage badge
- `tools/job-collector/frontend/src/api.js`: application_stage query param
- `tools/job-collector/frontend/src/pages/Dashboard.jsx`: Applied count via stage
- `tools/job-collector/frontend/src/index.css`: Stage badge styles
- `tools/job-collector/scripts/e2e-test.mjs`: Assert status=applied maps to sent

## Decisions
(none)


## Summary

- Work items completed: 3
- Files created: 0
- Files modified: 8
- Tests added: 2
- Coverage: 100%
- Completed: 2026-08-10T20:37:42.014Z
