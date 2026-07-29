---
id: application-status-tracking
title: Application status tracking
intent: linkedin-easy-apply-filler
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-07-28T07:45:00Z
run_id: run-jobhunter-001
completed_at: 2026-07-29T10:09:50.982Z
---

# Work Item: Application status tracking

## Description

Track that a job has been applied to so the same job is never re-applied, and so the UI can show application state alongside the existing collection status.

## Acceptance Criteria

- [ ] `jobs` table gains `applied_at TEXT` and `applied_url TEXT` columns via a migration in `server/db.js migrate()` (additive `ALTER TABLE ... ADD COLUMN` guarded by `PRAGMA table_info` check, since SQLite has no `IF NOT EXISTS` for columns).
- [ ] A helper `markApplied(id, { appliedUrl })` sets `applied_at = datetime('now')` and `applied_url`, and is exposed on the `db` export object.
- [ ] `getJobById` and `getJobs` summary columns include `applied_at` (and `applied_url` for detail view).
- [ ] The jobs route exposes `POST /api/jobs/:id/applied` (or extends the existing status update) accepting `{ appliedUrl }` and calling `markApplied`.
- [ ] Idempotent: calling `markApplied` twice on the same job updates `applied_at` only if it was null (first application wins); subsequent calls are a no-op returning the existing row.
- [ ] One runnable self-check: insert a throwaway job, call `markApplied` twice, assert `applied_at` did not change on the second call. Clean up the row. No test framework.
- [ ] Existing `status` column semantics (raw / parsed / applied / rejected / neutral) are unchanged — `applied_at` is a separate, authoritative timestamp for the apply action specifically.

## Technical Notes

- Do not overload the existing `status` field for the apply timestamp — `status` is the human review state, `applied_at` is the automated-apply fact. They can disagree (e.g. user marks `status='rejected'` after an auto-apply).
- An `applications` table was considered and rejected for v1: one application per job is the realistic case for LinkedIn Easy Apply. Revisit as a separate intent if multi-ATS apply is added later.
- The migration must be safe to run on the existing `data/jobs.db` without data loss — test against a copy first.

## Dependencies

(none)
