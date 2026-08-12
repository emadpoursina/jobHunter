---
run: run-jobhunter-011
work_item: page-fetcher-module, grounded-apply-agent-prompt, wire-page-html-into-apply-route
intent: html-grounded-apply-script
generated: 2026-08-12T09:07:10Z
mode: confirm
---

# Implementation Walkthrough: HTML-grounded apply script generation

## Summary

Apply-script generation now fetches and trims the real company application page
before the single LLM call. The prompt treats that snapshot as the primary
selector source, falls back per field when needed, and the API/UI expose whether
generation was grounded or fallback-only.

## Structure Overview

The flow remains a modular-monolith pipeline:

1. `pageFetcher.js` performs bounded raw HTTP fetch and produces safe HTML plus
   a stable outcome status.
2. `POST /api/apply/script` gathers the existing profile, CV PDF, URL host, and
   answers, then adds `pageHtml` to the one LLM context.
3. The generated userscript retains the existing human-review and manual-submit
   contract.
4. The frontend displays the fetch status beside the copyable script.

## Architecture

### Pattern Used

Small pipeline module behind the existing Express route, with the React
frontend consuming a normalized REST response.

### Layer Structure

```text
┌─────────────────────────────┐
│ Job Detail React UI          │
├─────────────────────────────┤
│ /api/apply/script            │
├─────────────────────────────┤
│ pageFetcher + prompt loader  │
├─────────────────────────────┤
│ Raw apply page / LLM         │
└─────────────────────────────┘
```

## Files Changed

### Created

| File | Purpose |
|------|---------|
| `tools/job-collector/pipeline/pageFetcher.js` | Fetches, trims, validates, and classifies apply-page HTML. |
| `tools/job-collector/pipeline/pageFetcher.self-check.js` | Mocked fixture self-check for fetch outcomes and HTML normalization. |

### Modified

| File | Changes |
|------|---------|
| `docs/agents/apply-form.md` | Adds snapshot-grounded selector rules, per-field fallback, and resilience requirements. |
| `tools/job-collector/pipeline/applyForm.self-check.js` | Checks the new prompt contract and LLM output safety. |
| `tools/job-collector/server/routes/apply.js` | Fetches page HTML, logs status, injects context, and returns grounding metadata. |
| `tools/job-collector/server/routes/apply.self-check.js` | Verifies `grounded`, `fetchStatus`, and `pageHtml` response behavior. |
| `tools/job-collector/frontend/src/api.js` | Normalizes grounding fields without changing script handling. |
| `tools/job-collector/frontend/src/pages/JobDetail.jsx` | Shows grounded versus fallback status. |
| `tools/job-collector/frontend/src/index.css` | Styles the status label. |

## Key Implementation Details

### 1. Bounded HTML grounding

The fetcher uses a five-second timeout, removes script/style/SVG/comment noise,
prefers a substantial form subtree, caps output at 60,000 characters, and
rejects pages with fewer than two input/textarea controls.

### 2. Soft fallback

Fetch failures, HTTP errors, timeouts, and unusable CSR shells return
`pageHtml: null` and a status. Script generation continues through the existing
generic/host-hint path.

### 3. Safety-preserving prompt

The prompt prioritizes selectors in the order `id`, `name`, data attributes,
stable classes, and structural paths. It requires existence checks, native
React-compatible setters, per-field try/catch, no demographic/consent answers,
and `SUBMIT = false`.

## Security Considerations

| Concern | Approach |
|---------|----------|
| Accidental application submission | Generated scripts remain manual-submit only. |
| Sensitive profile exposure | Existing local LLM context flow is preserved; no new logging of HTML or profile contents was added. |
| Untrusted apply URLs | URL syntax is validated; protocol/private-network restrictions remain future hardening if URLs become user-supplied. |

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Fetch API | Expose metadata helper plus required HTML-only helper | The route needs status while simple callers can receive string-or-null. |
| Fallback granularity | Per field | A partial snapshot should still improve selectors for fields it contains. |
| Rendering strategy | Raw HTTP only | Keeps this pass bounded; Playwright capture remains future work. |
| UI status | Grounded boolean plus fetch status | Users can judge confidence before pasting the script. |

## Deviations from Plan

- The existing prompt was updated in place with the grounded contract sections
  rather than replaced wholesale from the scratch draft; this preserves its
  established safety and ATS guidance while adding the required behavior.
- The route self-check initially connected to an existing server on port 3061;
  verification was rerun successfully on isolated port 3199.

## Dependencies Added

| Package | Why Needed |
|---------|------------|
| `yaml` | Required by FIRE run lifecycle scripts for state and artifact tracking. |

## How to Verify

1. **Fetcher behavior**

   ```bash
   cd tools/job-collector && bun run pipeline/pageFetcher.self-check.js
   ```

   Expected: all fixture trim, unusable, HTTP-error, and timeout checks pass.

2. **Prompt and LLM safety**

   ```bash
   cd tools/job-collector && bun run pipeline/applyForm.self-check.js
   ```

   Expected: prompt anchors pass; LLM assertions pass when a provider is
   available and otherwise skip gracefully.

3. **Route and frontend**

   ```bash
   PORT=3199 REPO_ROOT=/absolute/path/to/jobHunter bun run server/routes/apply.self-check.js
   cd tools/job-collector && bun run build
   ```

   Expected: route returns `grounded` and `fetchStatus`, and the Vite build
   completes.

4. **Manual ATS checklist**

   Validate one Greenhouse and Lever page for grounded green fills, Workday for
   expected fallback, Ashby for mixed grounded/fallback fields, and an
   auth-walled URL for graceful fallback. Confirm `console.table` reports
   grounded/fallback status and the human still clicks Submit.

## Test Coverage

- Tests added: 1 focused fetcher self-check plus route/prompt self-check
  assertions.
- Coverage: Not instrumented; FIRE run recorded 11 route assertions.
- Status: Passing.

## Ready for Review

- [x] All completed-item acceptance criteria met
- [x] Tests passing
- [x] No critical issues
- [x] Documentation updated
- [x] Developer notes captured

## Developer Notes

The fetch status is intentionally returned separately from `grounded`. A
successful HTTP response can still be unusable when an ATS serves only a
client-rendered shell.

---
*Generated by specs.md - fabriqa.ai FIRE Flow Run run-jobhunter-011*
