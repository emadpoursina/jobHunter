---
id: master-profile-editor
title: Master profile editor
status: completed
created: 2026-08-07T20:47:00Z
completed_at: 2026-08-07T22:00:00.777Z
---

# Intent: Master profile editor

## Goal

Add a dedicated Profile area to the local job-collector app where the operator can
manually edit the real `phase2/profile/master-profile.md` source of truth or ask an
AI task to propose updates to any part of that Markdown document, review the proposed
change, and apply it.

## Users

Single user (Emad) operating the local jobHunter workflow.

## Problem

The master profile currently has to be edited outside the app. That makes profile
maintenance disconnected from the CV and cover-letter generation workflow and gives
the operator no in-app way to request targeted profile updates with AI.

## Success Criteria

- A dedicated Profile page is available in app navigation and is separate from Settings.
- The page loads and displays the current `master-profile.md` content in a full Markdown editor with a rendered preview.
- Manual edits can be saved back to `master-profile.md`.
- AI accepts a free-form prompt, uses the current profile as context, can update any profile section while preserving Markdown, and returns a proposed updated document before changing the file.
- Applying an AI proposal requires an explicit user action and saves the approved document.
- Manual and AI saves reject updates missing required Personal Information fields: full name, email, or phone.
- Successful saves invalidate the cached parsed profile used by application autofill.
- Existing generated CVs and cover letters are not regenerated; future generations use the saved profile.
- Settings exposes a separate per-task provider/model override for the profile-update AI task, using the existing shared credentials and provider-order behavior.
- AI output is never persisted or used without human review and approval.

## Constraints

- Stay inside `tools/job-collector/` for application code and reuse existing Express, React, routing, LLM, Markdown, and error-handling patterns.
- Keep `phase2/profile/master-profile.md` as the single source of truth; do not introduce a second profile store.
- Keep only the current profile file; do not add backups, version history, or restore UI.
- Use the existing LLM provider configuration and task override mechanism; no new dependency or provider is required.
- Preserve the existing profile Markdown structure and factual grounding rules.
- Keep profile content and contact data local and do not log full profile contents or prompts.

## Notes

The current generation pipelines read the full profile plus their agent prompt files:
`docs/agents/cv-generator.md` and `docs/agents/cover-letter-generator.md`. The
profile editor's AI behavior should use a dedicated profile-editing agent prompt and
the existing `resolveTaskLlm` / `callLlm` path.
