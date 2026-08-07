---
run: run-jobhunter-005
work_item: profile-ai-update-flow
intent: master-profile-editor
mode: validate
checkpoint: plan
approved_at: 2026-08-07T21:39:00Z
design_doc: .specs-fire/intents/master-profile-editor/work-items/profile-ai-update-flow-design.md
---

# Implementation Plan: AI profile update flow and task configuration

## Approach

Extend `profile.js` with SHA-256 revision hashing, optimistic-lock checks, and atomic temp-then-rename writes. Add `profileEditor.js` for prompt loading, LLM preview (write-free), and apply orchestration via `resolveTaskLlm('profile_update')`. Update profile routes to design contract (`markdown` + `revision`, AI preview/apply endpoints). Add `profile_update` task defaults, Settings UI card, agent prompt doc, and mocked self-check.

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/pipeline/profileEditor.js` | AI preview/apply orchestration |
| `docs/agents/profile-editor.md` | Profile-editing agent system prompt |
| `tools/job-collector/pipeline/profileAiUpdate.self-check.js` | Mocked preview/apply/stale checks |

## Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/pipeline/profile.js` | Revision hash, atomic save, `getProfileDocument` |
| `tools/job-collector/server/routes/profile.js` | Revision API + AI routes |
| `tools/job-collector/server/db.js` | `profile_update` task default |
| `tools/job-collector/server/errors.js` | `PROFILE_REVISION_CONFLICT` → 409 |
| `tools/job-collector/frontend/src/pages/Settings.jsx` | Task card for profile update |
| `tools/job-collector/frontend/src/api.js` | Profile API shape + AI methods |
| `tools/job-collector/pipeline/profileApi.self-check.js` | Adapt to revision return shape |

## Based on Design Doc

Reference: `.specs-fire/intents/master-profile-editor/work-items/profile-ai-update-flow-design.md`

---
*Plan approved — user continued batch 2.*
