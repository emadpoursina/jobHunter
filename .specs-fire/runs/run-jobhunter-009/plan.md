---
run: run-jobhunter-009
work_item: docs-pipeline-to-job-collector
intent: application-funnel-stages
mode: autopilot
checkpoint: none
approved_at: n/a
---

# Implementation Plan: Docs — pipeline.md → job-collector

## Approach

Repoint high-traffic docs from `phase2/applications/pipeline.md` as the live application tracker to job-collector / SQLite (`application_stage` on jobs). Mark `pipeline.md` as legacy. No app code changes.

## Files to Create

| File | Purpose |
|------|---------|
| (none) | |

## Files to Modify

| File | Changes |
|------|---------|
| `AGENTS.md` | Point pipeline tracking at job-collector; keep pipeline.md as legacy note |
| `README.md` | Same tracker pointer |
| `phase2/AGENTS.md` | Same |
| `phase2/applications/README.md` | Canonical = job-collector; pipeline.md legacy |
| `phase2/applications/pipeline.md` | Legacy / not maintained banner |
| `HERMES_SETUP.md` | Fix pipeline.md as live tracker refs |
| `HERMES_QUICKREF.md` | Point status questions at job-collector |
| `docs/principles.md` | Referral link → job-collector |
| `networking/README.md` | Referral link → job-collector |
| `phase2/offers/README.md` | Track via job-collector |
| `phase2/offers/_offer-template.md` | Pipeline ID note → job-collector |
| `phase2/documents/generated/README.md` | Sent stage → job-collector |
| `phase2/documents/prompts/cv-from-offer.md` | Drop pipeline.md update instruction |

## Tests

| Test File | Coverage |
|-----------|----------|
| Inline grep self-check | Key docs no longer claim pipeline.md is canonical live tracker |

## Technical Details

- Fix only places that claim pipeline.md is the live system.
- Do not delete pipeline.md; archive note only.
- Skip `raw/files/*` (unrelated 05-pipeline.md references).
- Skip intent/work-item FIRE artifacts (they correctly describe the migration).
