---
id: apply-url-on-job
title: Apply URL on job record
intent: company-site-apply-filler
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-07-29T21:19:00Z
run_id: run-jobhunter-002
completed_at: 2026-07-29T21:27:22.581Z
---

# Work Item: Apply URL on job record

## Description

Add a dedicated `apply_url` field on jobs so the company careers/ATS apply link is stored separately from LinkedIn `source_url`. Expose it in the API and on the Job Detail page so the user can set, edit, and open the company apply URL.

## Acceptance Criteria

- [ ] `jobs` table gains `apply_url TEXT` via guarded `ALTER TABLE` in `server/db.js migrate()` (same pattern as `applied_at`).
- [ ] `apply_url` is included in job detail (`getJobById`) and optionally in list summary if useful for filtering later; at minimum detail + patch work.
- [ ] `PATCH /api/jobs/:id` accepts `applyUrl` (camelCase) and persists it.
- [ ] Job Detail UI shows the company apply URL when set (clickable), plus a way to set/edit it (simple input + save via existing updateJob).
- [ ] Empty / invalid URL is rejected or cleared cleanly (empty string → null); invalid URL returns `VALIDATION_ERROR`.
- [ ] One runnable self-check: insert throwaway job, set `applyUrl`, read back, assert value; clean up. No test framework.
- [ ] Existing `source_url` semantics unchanged (listing URL stays LinkedIn or collector source).

## Technical Notes

- Today all stored URLs are `de.linkedin.com` listing links — `apply_url` is empty until the user fills it. That is expected.
- Do not overload `applied_url` (post-submit record) for the target form URL.
- Match existing snake_case DB / camelCase API mapping in `db.js`.

## Dependencies

(none)
