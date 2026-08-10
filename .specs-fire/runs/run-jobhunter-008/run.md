---
id: run-jobhunter-008
scope: wide
work_items:
  - id: skill-loader-module
    intent: agent-skills
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: wire-skills-into-pipelines
    intent: agent-skills
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
  - id: starter-skill-and-docs
    intent: agent-skills
    mode: autopilot
    status: completed
    current_phase: review
    checkpoint_state: none
    current_checkpoint: null
  - id: skills-self-checks
    intent: agent-skills
    mode: confirm
    status: completed
    current_phase: review
    checkpoint_state: approved
    current_checkpoint: plan
current_item: null
status: completed
started: 2026-08-10T19:15:05.670Z
completed: 2026-08-10T19:36:50.522Z
---

# Run: run-jobhunter-008

## Scope
wide (4 work items)

## Work Items
1. **skill-loader-module** (confirm) — completed
2. **wire-skills-into-pipelines** (confirm) — completed
3. **starter-skill-and-docs** (autopilot) — completed
4. **skills-self-checks** (confirm) — completed


## Current Item
(all completed)

## Files Created
- `tools/job-collector/pipeline/agentSkills.js`: Shared agent skill prompt loader
- `tools/job-collector/pipeline/agentSkills.self-check.js`: Loader and CV prompt propagation self-checks
- `docs/agents/skills/ats-cv-rules/SKILL.md`: Starter ATS guidance skill
- `docs/agents/skills/README.md`: Shared skills convention documentation

## Files Modified
- `tools/job-collector/pipeline/cv.js`: Use shared loader and add optional test LLM seam
- `tools/job-collector/pipeline/coverLetter.js`: Use shared loader for the cover-letter prompt
- `tools/job-collector/pipeline/parser.js`: Use shared loader while preserving parser extras
- `tools/job-collector/pipeline/profileEditor.js`: Use shared loader for profile-editor prompts
- `docs/agents/cv-generator.md`: Declare ats-cv-rules in frontmatter

## Decisions
(none)


## Summary

- Work items completed: 4
- Files created: 4
- Files modified: 5
- Tests added: 61
- Coverage: 0%
- Completed: 2026-08-10T19:36:50.522Z
