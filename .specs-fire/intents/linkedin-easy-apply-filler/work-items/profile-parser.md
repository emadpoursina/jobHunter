---
id: profile-parser
title: Profile parser + cache
intent: linkedin-easy-apply-filler
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-07-28T07:45:00Z
run_id: run-jobhunter-001
completed_at: 2026-07-28T15:33:54.548Z
---

# Work Item: Profile parser + cache

## Description

Parse `phase2/profile/master-profile.md` into a typed JSON object and cache it in the `settings` table so downstream work items (apply-form agent, apply script route) read a structured profile instead of re-parsing markdown each time.

Typed shape (minimum):
- `fullName`, `email`, `phone`, `telegram`, `linkedInUrl`, `githubUrl`, `location`, `seeking`, `workAuthorization`, `languages` (array of `{ name, level }`)
- `workHistory` (array of `{ company, role, start, end, summary }`) — only if needed by the apply script; skip if Easy Apply never asks for it.

## Acceptance Criteria

- [ ] A parser exists under `tools/job-collector/pipeline/` (e.g. `profile.js`) that reads `master-profile.md` (path from `PROFILE_PATH` env, same as `pipeline/cv.js`) and returns the typed object.
- [ ] First parse result is persisted to the `settings` table under a key like `parsed_profile` via `db.setSetting`.
- [ ] A refresh path exists: re-parse on demand (e.g. when the profile file mtime changes, or via an explicit `?refresh=1` query on a route) — not on every request.
- [ ] Missing required fields (name, email, phone) cause a clear error with code `PROFILE_INCOMPLETE`, not a silent partial fill.
- [ ] One runnable self-check: parse the current `master-profile.md` and assert the 3 required fields are non-empty. Smallest thing that fails if the parser breaks. No test framework.
- [ ] No new dependencies — use string/regex parsing or the existing LLM router if markdown is too messy (prefer regex for the fixed "Personal Information" block).

## Technical Notes

- The "Personal Information" block in `master-profile.md` is a fixed-format fenced code block with `Key: Value` lines — a simple regex split is enough; do not reach for a markdown parser.
- Cache shape must be stable because work item #4 (agent prompt) and #5 (route) depend on it. Lock the field names here.
- Lean toward parse-once-cache over re-parse-per-apply (decided in the intent brief notes).

## Dependencies

(none)
