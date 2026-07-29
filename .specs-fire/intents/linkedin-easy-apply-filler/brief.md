---
id: linkedin-easy-apply-filler
title: LinkedIn Easy Apply form filler
status: completed
created: 2026-07-28T07:35:00Z
completed_at: 2026-07-29T12:09:55.445Z
---

# Intent: LinkedIn Easy Apply form filler

## Goal

After `tools/job-collector/` saves an offer and generates a tailored CV, automate filling the LinkedIn Easy Apply modal for that job from `master-profile.md` data. The user reviews the filled form and clicks Submit themselves.

## Users

Single user (personal workflow) — the jobHunter owner.

## Problem

Collection and CV generation are already automated, but the LinkedIn Easy Apply modal still has to be filled by hand for every saved job. That manual step is the bottleneck between "offer qualified" and "application submitted."

## Success Criteria

- From a saved job in the job-collector UI, one action produces a paste-script (or equivalent flow) that fills the LinkedIn Easy Apply form for that job's `source_url` in the user's own logged-in browser.
- Profile fields map onto the form: full name, email, phone, LinkedIn URL, GitHub URL, location, work authorization, languages.
- The generated CV (currently `.md`) is converted to PDF and supplied to the resume upload step.
- Free-text questions ("Why do you want to join?", cover-letter prompts) are answered by the existing LLM router (`server/llm.js`) with a short, token-capped response.
- Fields the script cannot confidently map are visually highlighted for manual review; the script does not auto-submit.
- EEO / demographic / consent questions are never auto-answered — always left for the human.
- Idempotency: a job already applied to is not re-applied (status tracking on the job record).
- Reuses the existing `collectors/browserScripts.js` paste-script UX and `server/llm.js` router — no new framework or dependency unless unavoidable.

## Constraints

- Run in the user's own logged-in browser (paste-script pattern), not headless — avoids LinkedIn CAPTCHA / session walls.
- CV pipeline currently outputs `.md`; this intent includes a md→PDF conversion step.
- Follow ponytail rules: smallest working diff, no unrequested abstractions, dry-run by default, explicit flag to mutate.
- No auto-submit of demographic, EEO, or consent answers.
- Scope is LinkedIn Easy Apply only for v1 (100% of currently collected offers are `de.linkedin.com`). Other ATSes are out of scope until a second intent.

## Notes

- Grounding data: `SELECT source_url FROM jobs` shows 8/8 collected offers are `de.linkedin.com` — Easy Apply is the right v1 target.
- Reusable assets already in repo: `collectors/linkedin.js` (selectors + blocked/CAPTCHA detection patterns), `collectors/browserScripts.js` (copy-script / paste-JSON UX), `server/llm.js` + `docs/agents/cv-generator.md` (LLM agent pattern), `pipeline/cv.js` (CV generation flow), `phase2/profile/master-profile.md` (source of truth for fill data).
- Open question for decomposition: store the parsed profile as JSON once (cache in `settings`) vs. re-parse `master-profile.md` per apply. Lean toward parse-once-cache.
