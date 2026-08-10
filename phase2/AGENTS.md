# Phase 2 — Profile & Applications

When working in this folder, follow the spec at:
- `docs/agents/cv-generator.md`

**Key files:**
- `profile/master-profile.md` — single source of truth, update as Phase 3 closes gaps
- `offers/` — create one `.md` file per JD (use `_offer-template.md` as template)
- `documents/generated/` — AI-generated tailored CVs go here, review 100% before sending
- job-collector — live application funnel (`application_stage` on jobs in SQLite)
- `applications/pipeline.md` — legacy; not maintained (no DB sync)

**Before every send:** 100% human review of generated CV. No exceptions.
