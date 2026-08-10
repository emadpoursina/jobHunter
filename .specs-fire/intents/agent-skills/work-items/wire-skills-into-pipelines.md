---
id: wire-skills-into-pipelines
title: Wire skills into all four agent pipelines
intent: agent-skills
complexity: medium
mode: confirm
status: completed
depends_on:
  - skill-loader-module
created: 2026-08-10T18:59:25Z
run_id: run-jobhunter-008
completed_at: 2026-08-10T19:24:29.748Z
---

# Work Item: Wire skills into all four agent pipelines

## Description

Switch the four LLM pipelines from "read one agent file" to the shared skill
loader, keeping behavior identical when no `skills:` key is declared.

Touch points (each currently has its own `buildSystemPrompt()`):

- `tools/job-collector/pipeline/cv.js` → `docs/agents/cv-generator.md`
- `tools/job-collector/pipeline/coverLetter.js` → `docs/agents/cover-letter-generator.md`
- `tools/job-collector/pipeline/parser.js` → `docs/agents/job-offer-research.md`
- `tools/job-collector/pipeline/profileEditor.js` → `docs/agents/profile-editor.md`

For each: call the skill loader with the agent path; on `null` keep the
existing default-prompt fallback; otherwise use the composed prompt (agent body
+ skills). Preserve per-module extras (e.g. parser's appended extraction task
and candidate summary stay exactly as they are).

## Acceptance Criteria

- [ ] All four pipelines compose their system prompt via the skill loader.
- [ ] With no `skills:` frontmatter, composed prompt equals the previous file
  content (trimmed), byte-for-byte except frontmatter removal.
- [ ] Existing fallback warnings and default prompts are unchanged when the
  agent file is missing.
- [ ] `parser.js` still appends its extraction task and candidate summary after
  the composed base prompt.
- [ ] `apply-form` route (`server/routes/apply.js`) is untouched.
- [ ] No changes to routes, DB, Settings, or frontend.

## Technical Notes

- Prefer delegating prompt assembly to the loader rather than duplicating
  composition logic in four files; keep each pipeline's diff small.
- Log at INFO level which skills were applied (names only, not content) to aid
  debugging without leaking prompt content.

## Dependencies

- skill-loader-module
