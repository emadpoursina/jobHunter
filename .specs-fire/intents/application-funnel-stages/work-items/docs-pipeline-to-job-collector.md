---
id: docs-pipeline-to-job-collector
title: Docs — pipeline.md → job-collector
intent: application-funnel-stages
complexity: low
mode: autopilot
status: completed
depends_on: []
created: 2026-08-10T20:03:30Z
run_id: run-jobhunter-009
completed_at: 2026-08-10T20:31:41.487Z
---

# Work Item: Docs — pipeline.md → job-collector

## Description

Stop documenting `phase2/applications/pipeline.md` as the live application tracker. Point operators and agents at job-collector / SQLite funnel stages instead, and mark `pipeline.md` as legacy/unused.

## Acceptance Criteria

- [ ] `AGENTS.md`, root `README.md`, `phase2/AGENTS.md`, and `phase2/applications/README.md` (plus other high-traffic refs if clearly wrong) no longer treat `pipeline.md` as the canonical tracker.
- [ ] Docs state that application funnel state lives in job-collector (`application_stage` on jobs in SQLite).
- [ ] `pipeline.md` itself (or its folder README) notes it is legacy / not maintained — no auto-sync from the DB.
- [ ] No code changes required beyond docs/markdown; Hermes/quickref prompts updated if they still say “read pipeline.md” for pipeline status.

## Technical Notes

- Grep for `pipeline.md` under repo docs (`AGENTS.md`, `HERMES_*`, `phase2/`, `networking/`, `docs/principles.md`) and fix only places that claim it is the live system.
- Do not delete `pipeline.md` unless already empty-template only and user prefers delete; prefer archive note.

## Dependencies

(none)
