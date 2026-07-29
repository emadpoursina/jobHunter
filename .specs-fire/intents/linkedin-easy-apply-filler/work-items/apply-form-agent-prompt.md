---
id: apply-form-agent-prompt
title: Apply-form agent prompt
intent: linkedin-easy-apply-filler
complexity: medium
mode: confirm
status: completed
depends_on:
  - profile-parser
created: 2026-07-28T07:45:00Z
run_id: run-jobhunter-001
completed_at: 2026-07-29T12:06:59.329Z
---

# Work Item: Apply-form agent prompt

## Description

New agent file `docs/agents/apply-form.md` (same pattern as `docs/agents/cv-generator.md`) that, given the cached profile JSON + a job's parsed fields + the URL host, emits a single JavaScript userscript targeting LinkedIn Easy Apply on that job's `source_url`.

## Acceptance Criteria

- [ ] `docs/agents/apply-form.md` exists and follows the same structure as `cv-generator.md` (system prompt that produces a single artifact, no preamble, no code fences around the whole output).
- [ ] The prompt instructs the LLM to emit a self-contained JS snippet that:
  - [ ] Opens / navigates the Easy Apply modal on the job page.
  - [ ] Fills Contact step: name, email, phone, LinkedIn URL, GitHub URL, location, work authorization, languages — using the profile JSON field names locked in work item #1.
  - [ ] Uploads the CV PDF — the script receives the PDF path as a variable (the route injects it); the prompt does not hardcode a path.
  - [ ] Answers free-text questions ("Why do you want to join?", cover letter prompts) by leaving a placeholder that calls a provided `askLlm(question, context)` helper — the LLM call happens at runtime in the browser, not at script-generation time. (Alternative: pre-generate answers at route time and inline them — decide during the run; prefer runtime call so the script stays site-generic.)
  - [ ] Does NOT auto-submit. Final step leaves the Review screen visible for the human to click.
  - [ ] Does NOT answer EEO / demographic / consent questions — highlights them in red and skips.
  - [ ] Highlights filled fields green, unknown/unmapped fields red, with a visible outline.
  - [ ] Is a dry-run by default: a `SUBMIT` flag at the top of the script defaults to `false`; setting it `true` is the explicit mutate flag (per script-writing rule).
- [ ] The prompt caps any pre-generated free-text answers at 200 tokens (mirrors `CV_MAX_TOKENS` pattern in `pipeline/cv.js`).
- [ ] One runnable self-check: feed the prompt + a sample profile JSON + a sample job to the LLM via `server/llm.js` and assert the output contains `const SUBMIT = false` and no `document.querySelector('form').submit()` unconditional call. No test framework.

## Technical Notes

- The Easy Apply modal is multi-step (Contact → Resume → Questions → Review). The script must click "Next" between steps and wait for the next step's DOM. This is the main risk — selectors for step transitions are not stable. Mitigation: the prompt should instruct the LLM to prefer text-based button matching ("Next", "Review", "Submit") over brittle CSS classes.
- The script runs in the user's logged-in browser via paste-into-DevTools (same UX as `collectors/browserScripts.js`). It cannot import modules — everything must be inline, including a small `askLlm` shim if runtime LLM calls are used (would need a fetch to a local route; consider whether to expose one in work item #5).
- Alternative to runtime LLM calls: the route pre-generates answers for known question patterns and inlines them as a `const answers = { ... }` map; the script looks up by question text. Simpler, less flexible. Pick during the run based on how varied the questions are across the 8 existing LinkedIn jobs.
- Reuse `docs/agents/cv-generator.md` as the structural template — same "Output the X only, with no preamble, notes, or code fences" footer.

## Dependencies

- profile-parser (needs the locked JSON field names)
