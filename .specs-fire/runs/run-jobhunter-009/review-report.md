---
run: run-jobhunter-009
work_item: docs-pipeline-to-job-collector
intent: application-funnel-stages
generated: 2026-08-10T20:32:30Z
---

# Code Review: Docs — pipeline.md → job-collector

## Summary

Docs-only repoint of application tracking from `pipeline.md` to job-collector. No app code. Review focused on consistency of messaging and leftover live-tracker claims.

## Auto-fixes

(none)

## Findings

| Severity | Finding | Action |
|----------|---------|--------|
| Info | Left intentional “legacy” mentions of `pipeline.md` so operators know the file still exists | Keep |
| Info | Skipped `raw/files/*` and FIRE intent artifacts (out of scope / correctly describe the migration) | Keep |

## Suggestions

(none — user requested no confirmation gates; nothing material to change)

## Verdict

**Approve** — acceptance checks pass; wording is consistent across high-traffic docs.
