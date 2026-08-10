---
run: run-jobhunter-008
work_item: agent-skills
intent: agent-skills
generated: 2026-08-10T19:38:00Z
mode: wide
---

# Implementation Walkthrough: Shared agent skill library

## Summary

Implemented a repository-backed skill loader that composes declared skill
guidance into CV, cover-letter, job-offer parsing, and profile-update prompts.
Seeded the first ATS skill and documented the opt-in convention, with warnings
and fallback behavior for missing files.

## Structure Overview

Each pipeline still owns its task-specific prompt assembly, but delegates the
agent-file portion to `agentSkills.js`. The loader strips metadata frontmatter,
resolves skills relative to `AGENTS_DIR`, and appends skill bodies in declaration
order. Agent files without skills remain compatible with their previous prompt
content.

## Architecture

### Pattern Used

Shared prompt-composition module: one loader centralizes file resolution,
minimal frontmatter parsing, ordering, and non-fatal skill failures while
pipeline modules retain their existing task-specific behavior.

### Layer Structure

```text
Agent Markdown + declared skills
              │
              ▼
      pipeline/agentSkills.js
              │
              ▼
   CV / cover letter / parser / profile editor
              │
              ▼
          callLlm(...)
```

## Files Changed

### Created

| File | Purpose |
|------|---------|
| `tools/job-collector/pipeline/agentSkills.js` | Loads and composes agent prompts with declared skills |
| `tools/job-collector/pipeline/agentSkills.self-check.js` | Assert-based loader and CV prompt propagation checks |
| `docs/agents/skills/ats-cv-rules/SKILL.md` | Starter ATS guidance skill |
| `docs/agents/skills/README.md` | Shared skill convention and behavior documentation |

### Modified

| File | Changes |
|------|---------|
| `tools/job-collector/pipeline/cv.js` | Uses the loader and accepts an optional injected LLM for deterministic checks |
| `tools/job-collector/pipeline/coverLetter.js` | Uses the shared loader |
| `tools/job-collector/pipeline/parser.js` | Uses the loader while preserving extraction and profile-summary suffixes |
| `tools/job-collector/pipeline/profileEditor.js` | Uses the shared loader |
| `docs/agents/cv-generator.md` | Opts into `ats-cv-rules` via frontmatter |

## Key Implementation Details

### 1. Minimal frontmatter parsing

Only inline lists such as `[a, b]` and simple block lists are accepted. Skill
names are constrained to safe kebab-case segments; richer YAML is intentionally
out of scope.

### 2. Non-fatal skill resolution

A missing agent returns `null`, preserving each pipeline's existing default
prompt. A missing skill logs its name and is skipped so generation continues.

### 3. Deterministic verification

The self-check uses temporary agent, skill, and profile files. An optional
`llmCall` argument on `generateCv` captures the composed system prompt without
requiring credentials or a network request.

## Security Considerations

| Concern | Approach |
|---------|----------|
| Skill path traversal | Skill names must match a restricted kebab-case pattern before path resolution |
| Prompt/content leakage in warnings | Missing-skill warnings include only the configured path and skill name |
| External LLM access in tests | Self-checks inject a mock function and never call a provider |

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontmatter parser | Small local parser | The requirement needs one list key; no dependency is necessary |
| Missing skill behavior | Warn and continue | One optional guidance file must not break a generation pipeline |
| Skill order | Declared order | Agent authors control precedence and composition deterministically |
| Test seam | Optional CV LLM injection | Verifies prompt propagation without changing normal callers or using a live provider |

## Deviations from Plan

None from the approved work-item plans.

## Dependencies Added

| Package | Why Needed |
|---------|------------|
| (none) | |

## How to Verify

1. **Run the loader and pipeline self-check**
   ```bash
   cd tools/job-collector && bun run pipeline/agentSkills.self-check.js
   ```
   Expected: all assertions pass and the command prints `OK`.

2. **Verify existing pipeline checks**
   ```bash
   cd tools/job-collector && bun run pipeline/coverLetter.self-check.js && bun run pipeline/profileAiUpdate.self-check.js
   ```
   Expected: both checks pass without a live LLM.

3. **Verify the seeded default skill**
   ```bash
   cd tools/job-collector && env -u AGENTS_DIR REPO_ROOT="/Users/emad/Projects/playground/jobHunter" bun -e "import { loadAgentPrompt } from './pipeline/agentSkills.js'; const prompt = await loadAgentPrompt('docs/agents/cv-generator.md'); if (!prompt?.includes('ATS CV Rules')) process.exit(1);"
   ```
   Expected: the command exits successfully because the CV prompt contains the starter skill body.

## Test Coverage

- Tests added: 61 assertions across the run
- Coverage: 0%
- Status: passing

## Ready for Review

- [x] All acceptance criteria met
- [x] Tests passing
- [x] No critical issues
- [x] Documentation updated
- [x] Developer notes captured

## Developer Notes

`AGENTS_DIR` is read by the loader when composing a prompt, while pipeline
agent-path constants follow the existing module pattern. The self-check must set
repository-related environment variables before importing pipeline modules
because repository path constants are initialized at module load time.

---
*Generated by specs.md - specs FIRE Flow Run run-jobhunter-008*
