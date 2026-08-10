---
id: agent-skills
title: Shared agent skill library
status: completed
created: 2026-08-10T18:59:25Z
completed_at: 2026-08-10T19:36:50.530Z
---

# Intent: Shared agent skill library

## Goal

Add a shared, file-based skill library (`docs/agents/skills/<name>/SKILL.md`) in
Cursor skill style that any job-collector LLM agent can opt into via frontmatter
on its existing agent prompt file. Reusable guidance (ATS rules, cover-letter
tone packs, country formats, parsing conventions) improves generation quality
without duplicating content across agent files or stuffing procedure into
`master-profile.md`.

## Users

Single user (Emad) operating the local jobHunter workflow via job-collector.

## Problem

Today each agent is a single monolithic prompt loaded from one file
(`docs/agents/cv-generator.md`, `cover-letter-generator.md`, etc.). Reusable
knowledge — ATS patterns, tone rules, salary phrasing, extraction conventions —
must be copy-pasted into each agent file or mixed into the master profile, which
is meant to be facts, not procedure. There is no modular way to give different
agents different optional knowledge packs.

## Success Criteria

- A skill can be added under `docs/agents/skills/<name>/SKILL.md` with Cursor-style
  frontmatter (`name`, `description`) and a Markdown body.
- An agent opts in by listing skill names in the frontmatter of its existing
  agent file (e.g. `skills: [ats-cv-rules, eu-salary-phrasing]` in
  `docs/agents/cv-generator.md`); the pipeline then appends those skills to the
  system prompt for that call.
- Applies to all four LLM agents: `cv`, `cover_letter`, `parse`
  (job-offer-research), and `profile_update` (profile-editor).
- Skills are always applied when listed (no per-job or runtime selection).
- A missing or unreadable listed skill logs a warning and generation continues;
  it never crashes a CV/cover-letter/parse/profile run.
- Agents without a `skills:` key behave exactly as today (no regression).
- Skills live in the repo and are version-controlled; no UI or DB changes.
- No new npm dependencies (tiny local frontmatter parsing only).

## Constraints

- Stay inside `tools/job-collector/` application code and `docs/agents/` content.
- Reuse `readRepoFile`, `callLlm`, `resolveTaskLlm`; smallest diff per ponytail rules.
- Frontmatter parsing is local and minimal (extract only the `skills:` list).
- No UI, no Settings changes, no DB schema changes.
- Apply-form agent (`server/routes/apply.js`) stays as-is for now (code-generating
  agent, hardcoded path); it may opt in later.
- SKILL.md convention follows Cursor skills: frontmatter with `name` (kebab-case,
  matches folder), `description`, body kept concise (target < 500 lines).

## Notes

- Current prompt assembly: `pipeline/cv.js`, `pipeline/coverLetter.js`,
  `pipeline/parser.js`, `pipeline/profileEditor.js` each have their own
  `buildSystemPrompt()` reading one agent file.
- Skill load order: agent file body first, then each listed skill in declared
  order, separated clearly.
- Env override for skills root can follow the existing `AGENTS_DIR` pattern
  (default `docs/agents`).
