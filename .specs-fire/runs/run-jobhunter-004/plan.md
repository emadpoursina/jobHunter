---
run: run-jobhunter-004
work_item: profile-document-access-api
intent: master-profile-editor
mode: confirm
checkpoint: plan
approved_at: pending
---

# Implementation Plan: Profile document access and API

## Approach

Add a dedicated profile route module (`GET` + `PUT /api/profile`) backed by new helpers in `pipeline/profile.js`. Reads and writes always resolve the configured `PROFILE_PATH` under `REPO_ROOT` — no client-supplied paths. Saves validate content with existing `parseProfileText()` before writing; on failure return machine-readable `{ error, code }` without touching disk. Successful saves call a new `invalidateProfileCache()` that clears `parsed_profile` and `parsed_profile_mtime` SQLite settings so autofill re-parses on next use.

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/server/routes/profile.js` | Express routes: GET/PUT profile markdown |
| `tools/job-collector/pipeline/profileApi.self-check.js` | Runnable check: read/save, validation rejection, no-write-on-failure, cache invalidation (temp profile file) |

## Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/pipeline/profile.js` | Add `getProfileMarkdown`, `saveProfileMarkdown`, `invalidateProfileCache`; export `PROFILE_PATH` |
| `tools/job-collector/pipeline/repoFiles.js` | Add `writeRepoFile(relativePath, content)` for controlled repo writes |
| `tools/job-collector/server/errors.js` | Map `PROFILE_INCOMPLETE` → 422 |
| `tools/job-collector/server/index.js` | Mount profile router at `/api/profile` |
| `tools/job-collector/frontend/src/api.js` | Add `getProfile` / `saveProfile` methods (for upcoming editor page) |

## Tests

| Test File | Coverage |
|-----------|----------|
| `tools/job-collector/pipeline/profileApi.self-check.js` | Read/save happy path, blank/malformed rejection, file unchanged on failure, cache cleared after save |

## Technical Details

- **GET `/api/profile`**: Returns `{ content }` from configured path; 404 `NOT_FOUND` if file missing.
- **PUT `/api/profile`**: Body `{ content: string }`; rejects non-string/blank; runs `parseProfileText` first; writes only to `PROFILE_PATH`; returns `{ content }` on success.
- **Security**: Never log full profile body or contact fields; no `path` field accepted from client.
- **Patterns**: Reuse `asyncHandler`, `readRepoFile`, `repoPath`, `parseProfileText`, `getSetting`/`setSetting` from existing modules.

---
*Plan pending approval at confirm checkpoint.*
