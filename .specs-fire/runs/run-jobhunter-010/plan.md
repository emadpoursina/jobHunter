---
run: run-jobhunter-010
work_item: schema-stage-migration
intent: application-funnel-stages
mode: confirm
checkpoint: plan
approved_at: 2026-08-10T20:33:00Z
---

# Implementation Plan: Schema + stage migration

## Approach

Add `jobs.application_stage` via `addColumnIfMissing` (default `not_started`), document allowed stages in an exported constant, and run an idempotent one-time remap: legacy `status=applied|rejected` → funnel stage + inferred pipeline status. Expose the column on job summaries. No history table.

## Files to Create

| File | Purpose |
|------|---------|
| (none) | Extend existing self-check |

## Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/server/db.js` | Column, `APPLICATION_STAGES`, migrate remap, summary columns |
| `tools/job-collector/server/db.self-check.js` | Idempotent migrate + applied/rejected mapping asserts |

## Tests

| Test File | Coverage |
|-----------|----------|
| `server/db.self-check.js` | Column present, remap applied→sent / rejected→rejected, pipeline status fallback, re-run safe |

## Technical Details

- Remap SQL only matches `status IN ('applied','rejected')` so second migrate is a no-op.
- Pipeline fallback mirrors `inferPipelineStatus`: cv path → `cv_generated`, title → `parsed`, else `raw`.
- `markApplied` / PATCH wiring deferred to next work item.
---
*Plan auto-approved (user: no confirmation). Execution follows.*
