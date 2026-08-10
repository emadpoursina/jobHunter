---
id: skill-loader-module
title: Skill loader module
intent: agent-skills
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-08-10T18:59:25Z
run_id: run-jobhunter-008
completed_at: 2026-08-10T19:21:44.052Z
---

# Work Item: Skill loader module

## Description

Create `tools/job-collector/pipeline/agentSkills.js` — a small shared module that
other pipelines use to compose an agent system prompt from its agent file plus
declared skill files.

Responsibilities:

- Parse a minimal `skills:` list from the frontmatter of an agent Markdown file
  (only that one key; no YAML library, no new dependencies).
- Resolve skill files at `<skillsRoot>/<name>/SKILL.md`, where skillsRoot
  defaults to `<AGENTS_DIR>/skills` (respecting the existing `AGENTS_DIR` env
  override pattern).
- Read each listed skill in declared order and return the composed prompt:
  agent body (without frontmatter) first, then each skill body, separated by a
  clear delimiter.
- Missing/unreadable agent file: return `null` so callers keep their existing
  fallback-prompt behavior.
- Missing/unreadable skill: `console.warn` and skip that skill; never throw.
- Malformed frontmatter or `skills:` not a list: treat as no skills.

## Acceptance Criteria

- [ ] Exported function takes the agent file's relative path (e.g.
  `docs/agents/cv-generator.md`) and returns the composed system prompt string
  or `null` when the agent file is missing.
- [ ] Agent frontmatter with `skills: [a, b]` (block or inline YAML list)
  resolves to `<skillsRoot>/a/SKILL.md` then `<skillsRoot>/b/SKILL.md` in order.
- [ ] Skills root honors `AGENTS_DIR` env override (default `docs/agents` →
  skills at `docs/agents/skills/`).
- [ ] Missing skill file logs a warning including the skill name and does not
  fail prompt composition.
- [ ] Agent file without frontmatter or without `skills:` returns just the
  agent body (frontmatter stripped when present).
- [ ] No new entries in `package.json` dependencies.

## Technical Notes

- Keep parsing minimal: split frontmatter block, match a `skills:` line,
  support inline `[a, b]` and simple `- item` lists; reject anything fancier
  silently (treat as no skills).
- Follow existing module conventions: ES modules, `readRepoFile` from
  `repoFiles.js` for reads.
- ponytail: deliberately not a general YAML parser — upgrade path is adding a
  dependency later if richer frontmatter is needed.

## Dependencies

(none)
