---
id: pivot-apply-route-and-ui
title: Pivot apply route and UI to company apply URL
intent: company-site-apply-filler
complexity: medium
mode: confirm
status: completed
depends_on:
  - apply-url-on-job
  - company-site-apply-agent
created: 2026-07-29T21:19:00Z
run_id: run-jobhunter-002
completed_at: 2026-07-29T21:31:02.263Z
---

# Work Item: Pivot apply route and UI to company apply URL

## Description

Point the existing apply pipeline (`POST /api/apply/script` + Job Detail apply section) at the company `apply_url` and the company-site agent. Require apply URL + CV, generate the fill-assist script into the on-page box, and mark applied using the company apply URL.

## Acceptance Criteria

- [ ] `POST /api/apply/script` requires `job.applyUrl`; if missing return `409` with code `APPLY_URL_MISSING` (or equivalent clear code) instructing the user to set the company apply URL first.
- [ ] Context passed to the LLM uses `applyUrl` / company `urlHost`, not LinkedIn Easy Apply assumptions.
- [ ] Still requires CV (`CV_NOT_GENERATED`) and uses `cvToPdf` + `getParsedProfile` as today.
- [ ] Response still `{ script, warnings, pdfPath }`; UI shows script in the on-page box (existing pattern).
- [ ] Job Detail: “Generate apply script” enabled only when CV exists **and** apply URL is set (or clearly errors if missing).
- [ ] “Mark applied (Easy Apply)” renamed/relabeled to company apply (e.g. Mark applied); `markApplied` stores `appliedUrl` from `applyUrl` (fallback sourceUrl only if needed — prefer applyUrl).
- [ ] Help text points user to open the company apply page and paste into DevTools — not LinkedIn Easy Apply.
- [ ] One runnable self-check: route rejects missing apply URL with the expected code; happy-path LLM check remains skippable on provider timeout.
- [ ] No new dependencies.

## Technical Notes

- Reuse `server/routes/apply.js` and Job Detail apply UI — pivot, don’t rebuild.
- Synchronous route remains fine (single LLM call + loading state).
- Constitution: human Submit; paste in user’s browser; no EEO auto-answers (enforced by agent).

## Dependencies

- apply-url-on-job
- company-site-apply-agent
