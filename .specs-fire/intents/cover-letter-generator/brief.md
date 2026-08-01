---
id: cover-letter-generator
title: Per-job cover letter generation
status: completed
created: 2026-07-30T19:06:50Z
completed_at: 2026-08-01T07:25:30.437Z
---

# Intent: Per-job cover letter generation

## Goal

Add on-demand cover letter generation per saved job in `tools/job-collector/`, mirroring the existing CV flow: dedicated viewer, generate/rewrite, persist markdown, and download as Markdown or PDF. Generation is driven by the cover-letter agent and grounded in `master-profile.md` plus the structured job offer.

## Users

Single user (personal workflow) — the jobHunter owner.

## Problem

Many applications require a cover letter in addition to a CV. Today job-collector only generates tailored CVs, so cover letters are written outside the tool and are not stored per job.

## Success Criteria

- From a saved job, open a cover-letter viewer using the same UI pattern as the CV viewer.
- Generate / rewrite on demand (button), not as an automatic pipeline step.
- Letter content is produced via the cover-letter agent prompt with master profile + job data; no fabrication beyond agent rules.
- Markdown is persisted per job and reloads correctly on reopen.
- Download as `.md` and convert/download as PDF, same capabilities as CV.
- Enrichment fields (`about_company`, `why_this_role`, `tone_hint`) need no dedicated UI — letter works from parsed job + profile alone.
- Apply-form upload / wiring is out of scope for this intent.

## Constraints

- Stay inside `tools/job-collector/` and reuse CV patterns (pipeline, routes, viewer, PDF conversion).
- Use the existing cover-letter agent (`scratch/cover-letter-generator.md`; promote/place alongside other agents as needed).
- On-demand only — do not auto-generate in the collect/parse pipeline.
- No apply-form integration in this intent.
- Follow ponytail rules: smallest working diff, reuse existing helpers, no unrequested abstractions.

## Notes

- Agent draft already exists at `scratch/cover-letter-generator.md` (targets `docs/agents/cover-letter-generator.md`).
- CV reference implementation: `pipeline/cv.js`, `pipeline/cvPdf.js`, `frontend/src/pages/CvViewer.jsx`, related API routes.
- Optional enrichment fields may be omitted or null; agent already defines fallbacks.
