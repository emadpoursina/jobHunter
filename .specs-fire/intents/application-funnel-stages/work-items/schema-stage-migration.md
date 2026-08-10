---
id: schema-stage-migration
title: Schema + stage migration
intent: application-funnel-stages
complexity: medium
mode: confirm
status: pending
depends_on: []
created: 2026-08-10T20:03:30Z
---

# Work Item: Schema + stage migration

## Description

Add `application_stage` to the jobs table with a default of `not_started`, migrate existing application decisions out of `status`, and leave collector/CV `status` as the processing field only.

## Acceptance Criteria

- [ ] `jobs.application_stage` column exists (via `addColumnIfMissing` / migrate) with default `not_started`.
- [ ] Allowed values are documented in code: `not_started`, `draft`, `reviewed`, `sent`, `screening`, `interview`, `offer`, `rejected`, `withdrawn`.
- [ ] One-time migration: `status=applied` → `application_stage=sent` and `status` falls back to pipeline status (`cv_generated` if CV path present, else `parsed` if titled, else `raw`).
- [ ] One-time migration: `status=rejected` → `application_stage=rejected`; collector `status` falls back the same way (rejected lives on the funnel field, not as long-lived processing status).
- [ ] All other rows get `application_stage=not_started` (or already default).
- [ ] No `application_stage_history` table.
- [ ] Runnable self-check covers migrate/add-column idempotency and the applied/rejected mapping rules (temp DB or equivalent).

## Technical Notes

- Reuse `addColumnIfMissing` in `tools/job-collector/server/db.js`.
- Mirror `inferPipelineStatus` logic from `server/routes/jobs.js` for status fallback.
- Include `application_stage` in job summary columns / `toCamel` path so API responses expose `applicationStage`.
- Migration must be safe to re-run (idempotent): only rewrite rows still on legacy `status=applied|rejected` if needed, or gate with a settings flag — prefer simple SQL that is safe after first run.

## Dependencies

(none)
