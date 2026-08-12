---
id: page-fetcher-module
title: Page fetcher module
intent: html-grounded-apply-script
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-08-12T08:55:28Z
run_id: run-jobhunter-011
completed_at: 2026-08-12T09:01:37.502Z
---

# Work Item: Page fetcher module

## Description

Add `tools/job-collector/pipeline/pageFetcher.js` that fetches a job's company `applyUrl` and returns a trimmed HTML string safe to inject into an LLM prompt, or `null` on failure / unusable content. This is the grounding source for apply-script generation.

## Acceptance Criteria

- [ ] `pipeline/pageFetcher.js` exports `fetchApplyPageHtml(url)` (and any small helpers needed).
- [ ] Fetch uses ~5s timeout; on abort/network/non-OK HTTP returns `null` (does not throw to the caller).
- [ ] HTML is trimmed: strip `<script>`, `<style>`, `<svg>`, comments; collapse excess whitespace.
- [ ] Prefer isolating a substantial `<form>...</form>` subtree when present; otherwise return trimmed body/page content.
- [ ] Hard cap ~60_000 characters with truncation.
- [ ] `looksUsable(html)` (or equivalent) rejects CSR shells with fewer than ~2 input/textarea tags; those resolve to `null`.
- [ ] Fetch outcome is distinguishable for logging (`ok` / `timeout` / `http-error` / `unusable`) — either returned alongside HTML or logged with a stable reason code.
- [ ] One runnable self-check under `tools/job-collector/pipeline/` (fixture HTML trim + unusable detection; live fetch optional / skippable).

## Technical Notes

- Follow `scratch/implementation-plan.md` §1–2 as the reference sketch; adapt to the repo's ESM/`bun` style (job-collector uses `import`, not `module.exports`).
- No Playwright / JS execution this pass — raw HTTP only.
- User-Agent can be a simple browser-compatible string; keep it boring.

## Dependencies

(none)
