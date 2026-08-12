---
id: html-grounded-apply-script
title: HTML-grounded apply script generation
status: in_progress
created: 2026-08-12T08:50:38Z
---

# Intent: HTML-grounded apply script generation

## Goal

Improve company-site apply-script generation so the LLM is grounded in a trimmed
snapshot of the real apply-page HTML (fetched server-side at generation time),
instead of inventing selectors from host hints alone. Keep the existing
paste-into-DevTools userscript flow and human Submit.

## Users

Single user (personal workflow) — the jobHunter / job-collector owner.

## Problem

`POST /apply/script` never sees the apply page DOM today. Generated userscripts
rely on generic/host-hint matching, so fields are often missed or filled with
weak selectors. Blind generation is the remaining bottleneck after CV generation
and company apply URL are in place.

## Success Criteria

- At generate time, the server fetches `job.applyUrl`, trims HTML, and injects
  usable markup into `__APPLY_CTX__.pageHtml` (or `null` on failure / unusable page).
- Auth walls, timeouts, HTTP errors, and CSR-only shells set `pageHtml: null` and
  fall back to the existing generic/host-hint path — no crash, no broken empty script.
- `docs/agents/apply-form.md` is updated so that when `pageHtml` is present, the
  agent prefers real selectors from the snapshot (`id` > `name` > data-* test ids >
  stable class path), with **per-field** fallback when a field is missing from HTML.
- Generated scripts keep the safety contract: `SUBMIT = false` by default, never
  auto-answer EEO/demographic/consent questions, React-safe value setters,
  per-field try/catch, existence checks before every selector use.
- UI surfaces whether the generation was grounded (`grounded: true/false`) so the
  user knows confidence before paste.
- Fetch outcome is logged (`ok` / `timeout` / `http-error` / `unusable`) to inform
  a later Playwright-capture decision.
- Manual validation against Greenhouse, Lever, Workday (expect fallback), Ashby,
  and one auth-walled page confirms green fills where fields exist and graceful
  fallback where they do not.

## Constraints

- Fill-assist only — human reviews and clicks Submit; no auto-submit.
- Raw HTTP `fetch` only this pass — Playwright / headless HTML capture is future work.
- Single LLM call (same shape as today); complexity lives in fetch/trim, not a
  second round-trip.
- Prompt-size guardrails: strip script/style/svg/comments; prefer `<form>` subtree
  when substantial; hard cap ~60_000 chars; fetch timeout ~5s.
- Reuse existing apply route, profile parser, CV→PDF, and answers pre-generation.
- Follow ponytail: smallest working diff, no unrequested abstractions.
- LinkedIn Easy Apply remains out of scope.

## Notes

- Builds on completed intent `company-site-apply-filler` (apply URL on job,
  company-site agent, `/apply/script` + Job Detail UI).
- Authoritative draft inputs for decomposition/build:
  - `scratch/implementation-plan.md` — backend module, route, observability, tests
  - `scratch/apply-form.md` — replacement agent prompt (includes `pageHtml` contract)
- Future extension (not this intent): if observability shows CSR-only ATS dominate,
  fetch with Playwright so client-rendered forms appear in the snapshot.
