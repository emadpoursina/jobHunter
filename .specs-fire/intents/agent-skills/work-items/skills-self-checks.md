---
id: skills-self-checks
title: Skills loader and pipeline self-checks
intent: agent-skills
complexity: medium
mode: confirm
status: completed
depends_on:
  - skill-loader-module
  - wire-skills-into-pipelines
created: 2026-08-10T18:59:25Z
run_id: run-jobhunter-008
completed_at: 2026-08-10T19:36:50.522Z
---

# Work Item: Skills loader and pipeline self-checks

## Description

Add assert-based self-checks following the existing `*.self-check.js` pattern
(no test framework).

- `pipeline/agentSkills.self-check.js`: uses a temp `AGENTS_DIR` (same trick as
  `profileAiUpdate.self-check.js`) to verify frontmatter parsing (inline and
  block lists), skill ordering, missing-skill warn-and-continue, missing agent
  file → `null`, and frontmatter stripping.
- Pipeline-level check: verify that with a declared skill present, the composed
  system prompt passed to the LLM contains both the agent body and the skill
  body (can reuse the mock-LLM injection pattern from `profileEditor.js` /
  `PROFILE_AI_MOCK`, or extract a seam if simpler).
- Wire the new self-check into an existing verification entry point if one
  exists (e.g. alongside `scripts/verify-profile-editor.mjs` pattern) or leave
  as a standalone `bun run` script consistent with current practice.

## Acceptance Criteria

- [ ] `bun run pipeline/agentSkills.self-check.js` passes from
  `tools/job-collector/` and fails loudly on regressions.
- [ ] Checks cover: ordering, missing skill (warn, continue), missing agent
  (null → fallback path), no-skills case identical to legacy content.
- [ ] A pipeline-level check proves a declared skill reaches the LLM system
  prompt for at least one pipeline (cv or coverLetter).
- [ ] No new dependencies; uses temp dirs and existing patterns only.

## Technical Notes

- Self-checks run against temp directories, never the real `docs/agents/`.
- Keep the pipeline-level check to one pipeline; the loader check covers the
  shared logic the other three use.

## Dependencies

- skill-loader-module
- wire-skills-into-pipelines
