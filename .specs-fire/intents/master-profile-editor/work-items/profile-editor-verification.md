---
id: profile-editor-verification
title: Profile editor verification
intent: master-profile-editor
complexity: low
mode: autopilot
status: completed
depends_on:
  - profile-editor-page
created: 2026-08-07T20:47:00Z
run_id: run-jobhunter-007
completed_at: 2026-08-07T22:00:00.770Z
---

# Work Item: Profile editor verification

## Description

Add and run the smallest reliable verification for the profile editor's file,
validation, AI preview/apply, settings-task, and UI integration paths. Use mocked LLM
responses and temporary profile files so checks do not call a live provider or expose
real contact data.

## Acceptance Criteria

- [ ] Bun checks cover profile parsing/validation, successful save, failed save without file mutation, and parsed-profile cache invalidation.
- [ ] Bun checks cover AI preview without a write, explicit apply persistence, required-field rejection, and stale-proposal rejection.
- [ ] Settings normalization exposes the new task while preserving existing task overrides.
- [ ] An API smoke check covers profile load, manual save, AI preview, and approved apply without a live LLM request.
- [ ] The frontend production build completes and the Profile route is reachable in the built app.
- [ ] Verification output records any environment-dependent manual UI check separately from automated results.

## Technical Notes

Follow the existing Bun self-check/e2e conventions. Keep fixtures fictional and
minimal, use temporary directories for `REPO_ROOT`, and mock network/LLM I/O.

## Dependencies

- profile-editor-page
