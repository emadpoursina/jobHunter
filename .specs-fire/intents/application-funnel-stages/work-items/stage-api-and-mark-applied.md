---
id: stage-api-and-mark-applied
title: Stage API + mark-applied wiring
intent: application-funnel-stages
complexity: medium
mode: confirm
status: completed
depends_on:
  - schema-stage-migration
created: 2026-08-10T20:03:30Z
run_id: run-jobhunter-010
completed_at: 2026-08-10T20:35:35.237Z
---

# Work Item: Stage API + mark-applied wiring

## Description

Expose `application_stage` on the jobs API: validate on update, filter on list, and make “mark applied” set funnel stage to `sent` while preserving `applied_at` / `applied_url` behavior.

## Acceptance Criteria

- [ ] `PATCH /jobs/:id` accepts `applicationStage` / `application_stage` and rejects invalid values with 400 `VALIDATION_ERROR`.
- [ ] `GET /jobs` supports filtering by `application_stage` (query param).
- [ ] `POST /jobs/:id/applied` (and status-path that means “applied”) sets `application_stage=sent` and stamps `applied_at` / `applied_url` as today.
- [ ] Setting stage to `sent` without going through mark-applied may stamp `applied_at` once if missing (same first-wins rule), or require mark-applied — pick one and document in technical notes; prefer consistent “sent ⇒ applied_at stamped once”.
- [ ] Job JSON responses include `applicationStage`.
- [ ] Runnable self-check for validate / filter / mark-applied stage behavior.

## Technical Notes

- Touch `server/db.js` (`getJobs`, `updateJob`, `markApplied`) and `server/routes/jobs.js`.
- Keep `status=neutral` / `inferPipelineStatus` behavior for collector status resets; do not conflate with funnel stage.
- Removing long-lived `status=applied` from the write path: callers that still send `status: 'applied'` should either map to stage `sent` + pipeline status or return validation guidance — prefer mapping for backward compatibility during UI cutover.

## Dependencies

- schema-stage-migration
