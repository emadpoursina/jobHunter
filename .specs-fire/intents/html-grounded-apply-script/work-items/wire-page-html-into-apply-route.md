---
id: wire-page-html-into-apply-route
title: Wire pageHtml into apply route + UI
intent: html-grounded-apply-script
complexity: medium
mode: confirm
status: pending
depends_on: [page-fetcher-module, grounded-apply-agent-prompt]
created: 2026-08-12T08:55:28Z
---

# Work Item: Wire pageHtml into apply route + UI

## Description

Integrate the page fetcher into `POST /api/apply/script` so `__APPLY_CTX__` includes `pageHtml` (or `null`), keep a single LLM call against the updated agent prompt, and surface grounded vs fallback status in the API response and Job Detail UI.

## Acceptance Criteria

- [ ] `server/routes/apply.js` calls `fetchApplyPageHtml(applyUrl)` before building context; sets `ctx.pageHtml` to usable HTML or `null`.
- [ ] Existing gather steps unchanged in spirit: parsed profile, CV→PDF, `urlHost`, precomputed `answers`, single LLM script generation.
- [ ] Route response includes `grounded` (boolean) and enough fetch status for UI/logging (e.g. `fetchStatus`: `ok` | `timeout` | `http-error` | `unusable` | equivalent).
- [ ] Fetch outcome is logged per generation request.
- [ ] Fetch failure / unusable page does not fail the route — generation continues with `pageHtml: null` (fallback path).
- [ ] Job Detail apply section shows whether the last generated script was grounded or fallback (clear label/hint).
- [ ] Frontend `api.generateApplyScript` consumes the new response fields without breaking copy/paste of `script`.

## Technical Notes

- Reference `scratch/implementation-plan.md` §2–3 and §5.
- Do not add a second LLM round-trip.
- Playwright capture remains out of scope.

## Dependencies

- page-fetcher-module
- grounded-apply-agent-prompt
