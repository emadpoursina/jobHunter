---
run: run-jobhunter-010
generated: 2026-08-10T20:38:00Z
status: passed
---

# Test Report: run-jobhunter-010

## Work Item: schema-stage-migration
Self-check column + migrate remap — ✅

## Work Item: stage-api-and-mark-applied
Self-check filter / validate / markApplied→sent — ✅ (31 asserts)

## Work Item: funnel-stage-ui
UI acceptance greps (stage filter, badges, detail stage change, api query) — ✅  
e2e expectations updated for status→stage mapping

```bash
cd tools/job-collector && bun run server/db.self-check.js
```
