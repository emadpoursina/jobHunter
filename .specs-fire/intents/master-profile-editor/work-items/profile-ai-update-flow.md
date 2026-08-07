---
id: profile-ai-update-flow
title: AI profile update flow and task configuration
intent: master-profile-editor
complexity: high
mode: validate
status: completed
depends_on:
  - profile-document-access-api
design_doc: .specs-fire/intents/master-profile-editor/work-items/profile-ai-update-flow-design.md
checkpoint_1: approved
created: 2026-08-07T20:47:00Z
run_id: run-jobhunter-005
completed_at: 2026-08-07T21:42:03.865Z
---

# Work Item: AI profile update flow and task configuration

## Description

Add a dedicated profile-editing agent prompt and an AI preview/apply flow. The
preview operation sends the current profile and the operator's free-form request to
the configured LLM task and returns a complete proposed Markdown document without
writing it. The apply operation revalidates the approved document and writes it only
after explicit user approval. Add the `profile_update` per-task provider/model
override to the existing Settings task-model configuration.

## Acceptance Criteria

- [ ] A dedicated profile-editing agent prompt defines whole-document Markdown output, factual preservation, structure preservation, and no preamble or commentary.
- [ ] The profile AI task reads the current profile, accepts a non-empty operator prompt, and calls the existing LLM client through `resolveTaskLlm('profile_update')`.
- [ ] Preview returns a complete proposed profile plus a source revision/fingerprint and does not write the profile file.
- [ ] Apply requires explicit approved content and its source revision/fingerprint, rejects stale proposals when the current profile changed, revalidates required Personal Information fields, and writes only after all checks pass.
- [ ] The new task is present in DB defaults, settings normalization, and the Settings task-model UI as `Update master profile`; it supports the same provider, model, and OpenRouter provider-order overrides as existing tasks.
- [ ] AI failures and invalid output use existing error codes without exposing API keys, full prompts, or profile contents in logs.
- [ ] A focused runnable check proves preview is write-free, invalid output is rejected, approved output is persisted, and stale proposals cannot overwrite newer manual edits.

## Technical Notes

Use the profile API/document boundary from `profile-document-access-api`, the
existing `callLlm` and `resolveTaskLlm` patterns, and the existing settings
normalization path. A content hash or equivalent revision token should be generated
server-side for preview/apply conflict detection; the exact API contract belongs in
the Validate-mode design checkpoint.

## Dependencies

- profile-document-access-api
