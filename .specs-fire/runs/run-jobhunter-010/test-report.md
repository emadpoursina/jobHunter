---
run: run-jobhunter-010
generated: 2026-08-10T20:35:30Z
status: passed
---

# Test Report: run-jobhunter-010

## Work Item: schema-stage-migration

| Passed | Failed |
|--------|--------|
| 25 | 0 |

Acceptance: column, APPLICATION_STAGES, applied/rejected remap, idempotent migrate — ✅

## Work Item: stage-api-and-mark-applied

| Passed | Failed |
|--------|--------|
| 31 | 0 |

Acceptance: PATCH stage validate, GET filter, markApplied→sent, sent stamps applied_at, responses include applicationStage — ✅

```bash
cd tools/job-collector && bun run server/db.self-check.js
```
