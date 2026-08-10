---
id: starter-skill-and-docs
title: Starter skill + skills README
intent: agent-skills
complexity: low
mode: autopilot
status: completed
depends_on:
  - skill-loader-module
created: 2026-08-10T18:59:25Z
run_id: run-jobhunter-008
completed_at: 2026-08-10T19:25:22.028Z
---

# Work Item: Starter skill + skills README

## Description

Seed the skill library and document the convention.

- Create `docs/agents/skills/ats-cv-rules/SKILL.md` — a real, concise starter
  skill with Cursor-style frontmatter (`name`, `description`) containing
  ATS-safe CV formatting guidance distilled to non-duplicative rules (the
  existing `cv-generator.md` already covers many; keep this skill focused on
  what it adds, e.g. keyword placement discipline and section-order norms).
- Add `skills: [ats-cv-rules]` frontmatter to `docs/agents/cv-generator.md` as
  the reference opt-in example.
- Write `docs/agents/skills/README.md` documenting: folder layout, SKILL.md
  frontmatter fields, how an agent opts in via its own frontmatter, ordering
  and missing-skill behavior.

## Acceptance Criteria

- [ ] `docs/agents/skills/ats-cv-rules/SKILL.md` exists with valid frontmatter
  (`name` matches folder, non-empty `description`) and body under 500 lines.
- [ ] `docs/agents/cv-generator.md` declares `skills: [ats-cv-rules]` in
  frontmatter without changing its existing body content.
- [ ] `docs/agents/skills/README.md` explains creation and opt-in with a
  minimal example.
- [ ] Content of the starter skill does not contradict `cv-generator.md` rules
  (truthfulness, no fabrication, no named visa programs).

## Technical Notes

- Keep the starter skill short and high-signal; it is the template others copy.
- Do not modify `cover-letter-generator.md` or other agents in this item —
  opt-in examples for them can come later.

## Dependencies

- skill-loader-module
