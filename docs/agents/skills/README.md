# Agent Skills

Reusable prompt guidance lives under `docs/agents/skills/<name>/SKILL.md`.

## Skill file format

Each `SKILL.md` starts with a small frontmatter block:

```markdown
---
name: example-skill
description: One-line description of the guidance.
---

Skill instructions go here.
```

The `name` must match its kebab-case folder name. Keep the body concise and
focused on reusable guidance rather than facts from the master profile.

## Opting in

Add a `skills` list to the frontmatter of an agent file:

```markdown
---
skills: [ats-cv-rules, another-skill]
---
```

The agent body is loaded first, followed by each listed skill in declared order.
The four supported pipelines are CV generation, cover-letter generation,
job-offer parsing, and profile updates.

Missing or unreadable skills produce a warning and are skipped. A missing agent
file keeps the pipeline's existing default-prompt fallback. Agents without a
`skills` key behave as before.
