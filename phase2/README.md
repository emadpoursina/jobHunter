# Phase 2 — Applications

> Mode: Operate (default) — applications out. Identity lives here: `profile/master-profile.md` is the only source of facts for CVs. Funnel source of truth is job-collector `application_stage`; `applications/pipeline.md` is legacy, do not sync or revive.

**Goal:** One consistent identity; every application customized, reviewed, and tracked.

| Folder | Purpose |
|--------|---------|
| [`profile/`](profile/) | Master profile — single source of truth for CV generation |
| [`offers/`](offers/) | Live job offer files you apply to (`by-country/<code>/offer-*.md`) |
| [`documents/`](documents/) | AI prompts and generated CVs |
| [`applications/`](applications/) | Pipeline tracking — sent → response → interview → offer |

**Agents:**

- [`docs/agents/cv-generator.md`](../docs/agents/cv-generator.md) — tailored CV from profile + offer file
- [`docs/agents/project-profile-extractor.md`](../docs/agents/project-profile-extractor.md) — extract projects into master profile

Runs **in parallel** with [`../phase3/`](../phase3/). Feed rejection and interview feedback into [`../phase1/skills/gap-report.md`](../phase1/skills/gap-report.md).
