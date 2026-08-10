---
id: application-funnel-stages
title: Application funnel stages
status: completed
created: 2026-08-10T20:02:14Z
completed_at: 2026-08-10T20:37:42.021Z
---

# Intent: Application funnel stages

## Goal

Make job-collector the canonical application tracker by adding an `application_stage`
funnel field on jobs, separate from collector/CV `status`, so the operator can track
applications through sent → screening → interview → offer without relying on stale
`pipeline.md`.

## Users

Single user (Emad) operating the local jobHunter / job-collector workflow.

## Problem

`jobs.status` currently mixes job-processing states (`raw`, `parsed`, `cv_generated`)
with application decisions (`applied`, `rejected`). There is no way to track screening,
interview, or offer outcomes in the tool. `phase2/applications/pipeline.md` was meant
to hold the richer funnel but is empty and unused; the live data is in SQLite.

## Success Criteria

- Jobs have an `application_stage` column in SQLite with allowed values:
  `not_started`, `draft`, `reviewed`, `sent`, `screening`, `interview`, `offer`,
  `rejected`, `withdrawn`.
- Existing rows: `status=applied` → `application_stage=sent`; `status=rejected` →
  `application_stage=rejected`; all others → `not_started`.
- After migration, collector/CV `status` no longer uses `applied` as a long-lived
  meaning: migrated `applied` rows fall back to pipeline status (`cv_generated` /
  `parsed` / `raw` as appropriate). `rejected` as a collector status may remain or
  map cleanly so list filters stay useful.
- “Mark applied” / record application sets `application_stage=sent` and stamps
  `applied_at` / `applied_url` as today.
- Jobs list can filter by `application_stage`; job detail (and bulk actions where
  practical) can set stage.
- No `application_stage_history` table in this intent.
- Project docs that treat `pipeline.md` as the live tracker are updated to point at
  job-collector / SQLite instead (archive note for `pipeline.md`, not a markdown sync).

## Constraints

- Stay primarily in `tools/job-collector/` for app code; docs updates only where
  `pipeline.md` is described as canonical.
- Reuse existing `addColumnIfMissing` / migrate, job PATCH, and UI filter/status patterns.
- No new dependencies.
- No human-readable export or auto-sync of `pipeline.md`.
- No stage-history / conversion-timing metrics table yet (defer to a later intent).

## Notes

Agreed scope is the “5/10” version: schema + migration + API + UI + docs drift fix.
Stage history and metrics rollups are explicitly out of scope.
