---
id: profile-document-access-api
title: Profile document access and API
intent: master-profile-editor
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-08-07T20:47:00Z
run_id: run-jobhunter-004
completed_at: 2026-08-07T21:33:09.097Z
---

# Work Item: Profile document access and API

## Description

Add the server-side read and manual-save boundary for the configured master profile
file. The API must always resolve the configured `PROFILE_PATH` under `REPO_ROOT`,
validate the profile before replacing the file, and invalidate the parsed-profile
cache after a successful save.

## Acceptance Criteria

- [ ] A profile API returns the current Markdown content from the configured `PROFILE_PATH`.
- [ ] A manual-save API accepts only profile Markdown content, writes only to the configured profile path, and returns the saved content or a clear success response.
- [ ] Saves reject blank or malformed content and reject documents missing required Personal Information fields: full name, email, or phone.
- [ ] Validation failures use existing machine-readable error handling and do not modify the profile file.
- [ ] A successful save invalidates the cached parsed profile and mtime state used by application autofill.
- [ ] The API never accepts a client-provided filesystem path and does not log full profile contents or contact data.
- [ ] A focused runnable check covers successful read/save, validation rejection, no-write-on-failure, and cache invalidation using temporary profile data.

## Technical Notes

Reuse `repoPath`, `readRepoFile`, `parseProfileText`, `PROFILE_PATH`, the existing
Express `asyncHandler`/error mapping, and the current SQLite settings helpers. Keep
the API response shape consistent with existing frontend API methods.

## Dependencies

(none)
