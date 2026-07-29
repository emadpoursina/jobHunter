---
id: company-site-apply-filler
title: Company-site apply form filler
status: completed
created: 2026-07-29T21:13:00Z
completed_at: 2026-07-29T21:31:02.269Z
---

# Intent: Company-site apply form filler

## Goal

After `tools/job-collector/` saves a job and generates a tailored CV, automate filling the **company’s own application form** (ATS / careers site) from `master-profile.md` and the CV PDF. The user reviews the filled form and clicks Submit themselves. LinkedIn Easy Apply is out of scope.

## Users

Single user (personal workflow) — the jobHunter owner.

## Problem

Applications are submitted on company websites whenever possible, not via LinkedIn Easy Apply. Manual form filling remains the bottleneck after collection and CV generation. The existing Easy Apply–specific agent and route do not match how applications are actually submitted.

## Success Criteria

- From a saved job in the job-collector UI, one action produces a paste-script (or equivalent fill-assist flow) for that job’s **company apply URL** stored on the job record.
- Profile fields map onto the form: full name, email, phone, LinkedIn URL, GitHub URL, location, work authorization, languages.
- Generated CV PDF is available for the resume upload step.
- Free-text questions are answered via the existing LLM router with short, token-capped responses when confident; unmapped fields are highlighted for review.
- Script does not auto-submit; dry-run / fill-assist by default.
- EEO / demographic / consent questions are never auto-answered.
- Idempotency via existing `applied_at` / `applied_url` tracking.
- v1 targets the 1–2 ATS / careers hosts that dominate the user’s real apply URLs (discovered from stored apply links / job data during planning or first build).
- Reuses profile parser, CV→PDF conversion, and apply-status tracking from the prior Easy Apply intent; LinkedIn-specific agent/route behavior is pivoted to company-site fill.

## Constraints

- Fill-assist only — human reviews and clicks Submit.
- Run in the user’s own logged-in browser (paste-script pattern), not headless auto-submit.
- Company apply URL is (or becomes) a field on the job record; user does not rely on Easy Apply.
- Follow ponytail rules: smallest working diff, dry-run by default, no unrequested abstractions.
- No auto-submit of demographic, EEO, or consent answers.
- LinkedIn Easy Apply is explicitly out of scope for this intent; keep reusable infra, replace LinkedIn-specific fill logic.

## Notes

- Prior intent `linkedin-easy-apply-filler` delivered reusable pieces: `pipeline/profile.js`, `pipeline/cvPdf.js`, `markApplied` / `applied_at`, apply route + UI box. This intent pivots the agent prompt and apply orchestration to company ATS forms.
- Dominant ATS hosts for v1 should be determined from real `apply_url` / job source data before locking selectors or agent assumptions.
- Show generated script on the job detail page (existing UI preference), with optional copy for DevTools paste.
