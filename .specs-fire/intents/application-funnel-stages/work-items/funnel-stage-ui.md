---
id: funnel-stage-ui
title: Funnel stage UI
intent: application-funnel-stages
complexity: medium
mode: confirm
status: completed
depends_on:
  - stage-api-and-mark-applied
created: 2026-08-10T20:03:30Z
run_id: run-jobhunter-010
completed_at: 2026-08-10T20:37:42.014Z
---

# Work Item: Funnel stage UI

## Description

Let the operator filter and set application funnel stages in the Jobs list and Job detail UI, and align “Mark applied” / bulk actions with `application_stage` instead of long-lived `status=applied`.

## Acceptance Criteria

- [ ] Jobs list has an `application_stage` filter (all stages including empty “All stages”).
- [ ] Job detail shows current stage and allows changing it to any allowed value.
- [ ] “Mark applied” / “Record application” sets stage to `sent` (via existing API) and still records `applied_at`.
- [ ] Bulk actions support setting useful stages where practical (at least `sent` and `rejected`); “Mark applied” bulk uses stage `sent`.
- [ ] Status filter no longer presents `applied` as the primary way to find submitted applications (stage filter is the funnel view); collector statuses (`raw`, `parsed`, `cv_generated`, `unmatched`) remain.
- [ ] Job cards / badges show stage clearly enough to scan the pipeline.

## Technical Notes

- Primary files: `frontend/src/pages/Jobs.jsx`, `JobDetail.jsx`, `api.js`, and any shared badge/card component.
- Reuse existing filter and status-change patterns; keep CSS minimal and consistent with current UI.
- `status=neutral` reset remains a collector-status reset, not a funnel reset (funnel reset → `not_started` if exposed).

## Dependencies

- stage-api-and-mark-applied
