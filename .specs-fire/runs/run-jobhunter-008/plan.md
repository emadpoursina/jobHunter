---
run: run-jobhunter-008
work_item: skill-loader-module
intent: agent-skills
mode: confirm
checkpoint: plan
approved_at: pending
---

# Implementation Plan: Skill loader module

## Approach

Add a small ESM module that uses `readRepoFile` to load an agent prompt, strips its
frontmatter, parses only a minimal `skills:` inline or block list, and appends the
declared skill bodies in order with a clear delimiter. Resolve the skills directory
from `AGENTS_DIR` (defaulting to `docs/agents`) and make missing skill files
non-fatal while returning `null` for a missing agent file.

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/pipeline/agentSkills.js` | Compose an agent prompt with its declared skill files |
| `tools/job-collector/pipeline/agentSkills.self-check.js` | Exercise frontmatter parsing, ordering, overrides, and missing-file behavior |

## Files to Modify

| File | Changes |
|------|---------|
| (none) | |

## Tests

| Test File | Coverage |
|-----------|----------|
| `tools/job-collector/pipeline/agentSkills.self-check.js` | Loader composition, inline/block skill lists, `AGENTS_DIR`, missing files, and frontmatter fallback |

## Technical Details

- Keep parsing deliberately narrow: frontmatter must be a top-level `---` block;
  accept `skills: [a, b]` and simple subsequent `- item` entries only.
- Use `readRepoFile` for every read so the module follows repository path and
  `REPO_ROOT` conventions.
- Avoid writing temporary repository files in the self-check; use an injected
  read function only if the implementation exposes one, otherwise use existing
  fixture files.
- Preserve the existing fallback behavior by returning `null` only when the
  agent file cannot be read.

---
*Plan awaiting approval at checkpoint.*

---

## Work Item: starter-skill-and-docs

### Approach

Create the first concise skill under the shared skills directory, prepend a
minimal `skills: [ats-cv-rules]` frontmatter block to the CV agent while leaving
its existing body unchanged, and document the convention in a README.

### Files to Create

| File | Purpose |
|------|---------|
| `docs/agents/skills/ats-cv-rules/SKILL.md` | Starter ATS guidance skill |
| `docs/agents/skills/README.md` | Skill folder, frontmatter, opt-in, ordering, and failure behavior documentation |

### Files to Modify

| File | Changes |
|------|---------|
| `docs/agents/cv-generator.md` | Add the reference `skills: [ats-cv-rules]` frontmatter only |

### Tests

| Test File | Coverage |
|-----------|----------|
| `tools/job-collector/pipeline/agentSkills.self-check.js` | Confirms the loader can resolve the newly seeded skill and strip both frontmatters |

### Technical Details

- Keep the starter skill under 500 lines and focused on keyword placement and
  section order not already stated as procedure in the CV agent.
- Use only `name` and `description` in the skill frontmatter.
- Do not modify any other agent file.

---
*Plan generated for autopilot execution.*

---

## Work Item: skills-self-checks

### Approach

Extend the existing loader self-check with full temporary-directory coverage for
inline and block lists, skill ordering, missing skills, missing agents, and
frontmatter stripping. Add a small optional LLM-call seam to `generateCv` so the
self-check can invoke the CV pipeline with a mock and assert that both agent and
skill content reach the system prompt.

### Files to Create

| File | Purpose |
|------|---------|
| (none) | |

### Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/pipeline/agentSkills.self-check.js` | Add temporary fixture and CV pipeline prompt assertions |
| `tools/job-collector/pipeline/cv.js` | Accept an optional injected LLM function for deterministic self-checking |

### Tests

| Test File | Coverage |
|-----------|----------|
| `tools/job-collector/pipeline/agentSkills.self-check.js` | Loader edge cases and CV pipeline-to-LLM prompt propagation |

### Technical Details

- Keep all fixtures in a temporary directory and restore environment variables
  after the check.
- Preserve `generateCv(job)` behavior for existing callers; the optional second
  argument is only a test seam.
- Do not call a real LLM or modify the actual `docs/agents/` tree.

---
*Plan generated for confirm execution.*

---

## Work Item: wire-skills-into-pipelines

### Approach

Replace each pipeline's direct agent-file read with `loadAgentPrompt`, preserving
the existing default prompt and warning when the loader returns `null`. Keep the
parser's extraction task and candidate summary appended after the composed base
prompt, and remove only imports that become unused.

### Files to Create

| File | Purpose |
|------|---------|
| (none) | |

### Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/pipeline/cv.js` | Load the CV agent prompt through the shared loader |
| `tools/job-collector/pipeline/coverLetter.js` | Load the cover-letter agent prompt through the shared loader |
| `tools/job-collector/pipeline/parser.js` | Load the research agent prompt while preserving parser extras |
| `tools/job-collector/pipeline/profileEditor.js` | Load the profile editor prompt through the shared loader |

### Tests

| Test File | Coverage |
|-----------|----------|
| `tools/job-collector/pipeline/agentSkills.self-check.js` | Confirms the shared loader remains healthy while pipeline imports change |

### Technical Details

- Keep existing fallback warning text and default prompts unchanged.
- `apply.js`, routes, database, settings, and frontend files remain untouched.
- Pipeline-specific agent paths continue to honor the existing `AGENTS_DIR`
  environment variable.

---
*Plan awaiting approval at checkpoint.*
