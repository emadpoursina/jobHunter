---
id: run-jobhunter-001
scope: batch
work_items:
  - id: profile-parser
    intent: linkedin-easy-apply-filler
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: cv-md-to-pdf
    intent: linkedin-easy-apply-filler
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: application-status-tracking
    intent: linkedin-easy-apply-filler
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: apply-form-agent-prompt
    intent: linkedin-easy-apply-filler
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: apply-script-route-and-ui
    intent: linkedin-easy-apply-filler
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
current_item: null
status: completed
started: 2026-07-28T15:28:31.128Z
completed: 2026-07-29T12:09:55.435Z
---

# Run: run-jobhunter-001

## Scope
batch (5 work items)

## Work Items
1. **profile-parser** (confirm) — completed
2. **cv-md-to-pdf** (confirm) — completed
3. **application-status-tracking** (confirm) — completed
4. **apply-form-agent-prompt** (confirm) — completed
5. **apply-script-route-and-ui** (confirm) — completed


## Current Item
(all completed)

## Files Created
- `tools/job-collector/pipeline/profile.js`: Profile parser + cache
- `tools/job-collector/pipeline/profile.self-check.js`: Profile parser self-check
- `tools/job-collector/pipeline/cvPdf.js`: CV md→PDF conversion
- `tools/job-collector/pipeline/cvPdf.self-check.js`: cvPdf self-check
- `tools/job-collector/server/db.self-check.js`: markApplied idempotency self-check
- `docs/agents/apply-form.md`: LinkedIn Easy Apply form-filler agent prompt
- `tools/job-collector/pipeline/applyForm.self-check.js`: apply-form agent self-check
- `tools/job-collector/server/routes/apply.js`: POST /api/apply/script route
- `tools/job-collector/server/routes/apply.self-check.js`: apply route E2E self-check

## Files Modified
- `tools/job-collector/server/db.js`: Added applied_at/applied_url columns + markApplied helper
- `tools/job-collector/server/routes/jobs.js`: Added POST /:id/applied route
- `tools/job-collector/server/index.js`: Mounted applyRouter at /api/apply
- `tools/job-collector/frontend/src/api.js`: Added generateApplyScript + markApplied
- `tools/job-collector/frontend/src/pages/JobDetail.jsx`: Added Generate apply script + Mark applied (Easy Apply) buttons

## Decisions
(none)


## Summary

- Work items completed: 5
- Files created: 9
- Files modified: 5
- Tests added: 9
- Coverage: 0%
- Completed: 2026-07-29T12:09:55.435Z
