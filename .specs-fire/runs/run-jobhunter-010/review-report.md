---
run: run-jobhunter-010
generated: 2026-08-10T20:35:30Z
---

# Code Review: run-jobhunter-010

## schema-stage-migration
**Approve** — column + idempotent remap.

## stage-api-and-mark-applied
**Approve** — filter/validate/markApplied wired; legacy `status=applied|rejected` maps to funnel stages for UI cutover.

Auto-fixes: none. Suggestions deferred (user: no confirmation).
