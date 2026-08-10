---
run: run-jobhunter-010
work_item: schema-stage-migration
intent: application-funnel-stages
generated: 2026-08-10T20:34:00Z
---

# Code Review: Schema + stage migration

## Summary

Added `application_stage` column + idempotent legacy status remap. No history table. Self-check green.

## Auto-fixes

(none)

## Findings

| Severity | Finding | Action |
|----------|---------|--------|
| Info | `markApplied` still writes `status=applied` until next work item | Deferred by design |

## Verdict

**Approve**
