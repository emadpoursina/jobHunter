---
id: grounding-verification
title: Grounding verification
intent: html-grounded-apply-script
complexity: low
mode: autopilot
status: pending
depends_on: [wire-page-html-into-apply-route]
created: 2026-08-12T08:55:28Z
---

# Work Item: Grounding verification

## Description

Add or extend runnable self-checks covering the grounded and fallback generation paths, and leave a short manual validation checklist for real ATS hosts. Confirms the feature is safe to use and that CSR/auth failures degrade cleanly.

## Acceptance Criteria

- [ ] Self-check(s) cover page fetcher trim + unusable detection (if not already fully covered by `page-fetcher-module`).
- [ ] Route/self-check asserts successful generation still includes `const SUBMIT = false` and `__APPLY_CTX__` with a `pageHtml` key (value may be string or `null`).
- [ ] Fallback path is exercisable in checks (e.g. force null HTML / unusable fixture) without requiring a live Workday page.
- [ ] A short manual checklist is documented (intent notes, work-item notes, or run walkthrough later): Greenhouse, Lever, Workday (expect fallback), Ashby, one auth-walled URL — confirm green fills / graceful fallback via `console.table`.
- [ ] Checks skip gracefully when LLM/network unavailable (match existing apply self-check conventions).

## Technical Notes

- Prefer extending existing `applyForm.self-check.js` / `apply.self-check.js` over new frameworks.
- Manual ATS spot-checks are human-run; this item only needs the checklist written and automated pieces green.

## Dependencies

- wire-page-html-into-apply-route
