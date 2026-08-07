---
run: run-jobhunter-007
work_item: profile-editor-verification
intent: master-profile-editor
mode: autopilot
---

# Implementation Plan: Profile editor verification

## Approach

Add a profile API route self-check (spawned server, `PROFILE_AI_MOCK=1`), a settings task normalization self-check, and a `verify-profile-editor.mjs` orchestrator that runs all profile-related self-checks, production build, and dist route presence — recording manual UI steps separately.

## Files to Create

| File | Purpose |
|------|---------|
| `server/routes/profile.self-check.js` | HTTP smoke: load, save, AI preview/apply (mocked) |
| `server/routes/settings.profile-task.self-check.js` | `profile_update` task normalization |
| `scripts/verify-profile-editor.mjs` | Master verification runner + report |

## Files to Modify

| File | Changes |
|------|---------|
| `pipeline/profileEditor.js` | `PROFILE_AI_MOCK=1` test hook for route smoke |
