---
id: grounded-apply-agent-prompt
title: Grounded apply-form agent
intent: html-grounded-apply-script
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-08-12T08:55:28Z
run_id: run-jobhunter-011
completed_at: 2026-08-12T09:03:54.264Z
---

# Work Item: Grounded apply-form agent

## Description

Replace `docs/agents/apply-form.md` with the HTML-grounded agent contract from `scratch/apply-form.md`. The agent still emits a pasteable userscript, but prefers selectors grounded in `__APPLY_CTX__.pageHtml` when present, with per-field fallback to label/host matching when HTML is null or incomplete.

## Acceptance Criteria

- [ ] `docs/agents/apply-form.md` documents `pageHtml` on `__APPLY_CTX__` (string or `null`).
- [ ] Prompt requires selector priority when `pageHtml` is present: `id` > `name` > `data-testid`/`data-qa`/`data-automation-id` > stable tag+class; never invent selectors absent from `pageHtml`.
- [ ] Per-field fallback to generic label/aria/placeholder/name matching when `pageHtml` is `null` or the field is missing from the snapshot.
- [ ] Safety anchors preserved: `const SUBMIT = false`, no auto-submit by default, EEO/demographic/consent skip + red highlight, no hardcoded PII.
- [ ] Robustness requirements present: React-safe value setter, async IIFE, per-field try/catch, combobox helper, shadow-DOM query helper, MutationObserver step wait, `console.table` summary including grounded vs fallback.
- [ ] Host hints remain as fallback signal only; `pageHtml` takes priority when present.
- [ ] `pipeline/applyForm.self-check.js` updated for new anchors (`pageHtml`, React-safe setter / no bare `el.value` guidance, grounded selector rules) while keeping LLM round-trip skippable.

## Technical Notes

- Prefer promoting `scratch/apply-form.md` content into `docs/agents/apply-form.md` (edit in place) rather than leaving two divergent prompts.
- Can proceed in parallel with `page-fetcher-module`.

## Dependencies

(none)
