---
id: company-site-apply-agent
title: Company-site apply agent prompt
intent: company-site-apply-filler
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-07-29T21:19:00Z
run_id: run-jobhunter-002
completed_at: 2026-07-29T21:29:22.633Z
---

# Work Item: Company-site apply agent prompt

## Description

Replace the LinkedIn Easy Apply–specific agent at `docs/agents/apply-form.md` with a company-site / ATS fill-assist agent. The emitted userscript runs in the user’s own browser on the company apply page, fills from `__APPLY_CTX__`, does not auto-submit, and never answers EEO/demographic/consent questions.

## Acceptance Criteria

- [ ] `docs/agents/apply-form.md` (or a clearly named successor referenced by the route) targets **company apply forms**, not LinkedIn Easy Apply modals.
- [ ] Prompt requires `const SUBMIT = false` by default; no unconditional form submit.
- [ ] Prompt uses injected `__APPLY_CTX__` (`profile`, `job`, `pdfPath`, `applyUrl` / `urlHost`, `answers`) — no hardcoded PII.
- [ ] Instructions cover: label-based field matching, resume upload best-effort + warn, free-text via `answers` map, green/red highlights, skip EEO keywords.
- [ ] Host-aware guidance: if `urlHost` matches known patterns (Greenhouse, Lever, Workday, Personio, etc.), prefer stable selectors/conventions; otherwise generic label matching.
- [ ] Self-check updated: structural anchors (SUBMIT=false, no Easy Apply–only assumptions required, EEO skip, `__APPLY_CTX__`); LLM round-trip remains best-effort / skippable on timeout.
- [ ] One runnable self-check under `tools/job-collector/pipeline/` (reuse or replace `applyForm.self-check.js`).

## Technical Notes

- Prefer editing in place and retitling the agent file content rather than leaving a misleading LinkedIn-only prompt in place.
- Dominant ATS hosts are currently unknown (no `apply_url` data yet). Keep v1 generic + optional host hints; refine after users populate apply URLs.
- Pre-generated `answers` map remains the contract for free-text (avoids CORS from pasted scripts).

## Dependencies

(none — can proceed in parallel with apply-url-on-job; route pivot depends on both)
