---
run: run-jobhunter-002
work_item: apply-url-on-job
intent: company-site-apply-filler
mode: confirm
checkpoint: plan
---

# Implementation Plan: Apply URL on job record

## Approach

Add `apply_url` as a dedicated column on `jobs`, separate from `source_url` (listing) and `applied_url` (post-submit record). Reuse existing patterns: guarded `ALTER TABLE` in `migrate()`, camelCase at the API boundary via `toCamel`/`normalizeJobInput`, and PATCH passthrough with explicit validation in the route layer.

Job detail already loads all fields via `getJobById` (`SELECT *`), so no DB read changes beyond the migration. PATCH handler will normalize `applyUrl`: empty/whitespace → `null`; non-empty must parse as `http:` or `https:` URL or return `VALIDATION_ERROR`.

UI: add a small "Company apply URL" section on Job Detail — show clickable link when set, inline input + Save button calling existing `api.updateJob`. Place near the existing "View listing" link in the header meta row.

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/server/db.apply-url.self-check.js` | Runnable assert-based check: insert job, set `applyUrl`, read back, clear, cleanup |

## Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/server/db.js` | Add `apply_url TEXT` via `addColumnIfMissing` in `migrate()` |
| `tools/job-collector/server/routes/jobs.js` | Validate/normalize `applyUrl` on PATCH before `updateJob` |
| `tools/job-collector/frontend/src/pages/JobDetail.jsx` | Display/edit company apply URL (link + input + save) |

## Tests

| Test File | Coverage |
|-----------|----------|
| `tools/job-collector/server/db.apply-url.self-check.js` | Migration column exists, updateJob round-trip, empty → null, invalid URL rejected at route |

## Technical Details

- `source_url` semantics unchanged; collectors keep writing LinkedIn/listing URLs there.
- `applied_url` remains for `markApplied` post-submit tracking only.
- List endpoint (`getJobs`) stays unchanged for now — detail + patch only per acceptance criteria.
- URL validation: `try { new URL(s) }` + require `http:` or `https:` protocol.

---
*Plan approved and executed.*

---

## Work Item: company-site-apply-agent

# Implementation Plan: Company-site apply agent prompt

## Approach

Retitle and rewrite `docs/agents/apply-form.md` in place for **company careers/ATS pages** (not LinkedIn Easy Apply modals). The user opens `job.applyUrl` in their browser, pastes the script in DevTools, and reviews before submitting.

Keep the safety contract (`SUBMIT = false`, no EEO, no fetch/cookies/storage). Replace modal-step flow with single-page / multi-section form filling: label-based matching, resume upload best-effort, free-text from `answers`, green/red highlights.

Add host-aware hints when `urlHost` matches known ATS patterns (Greenhouse, Lever, Workday, Personio, Ashby, BambooHR) — prefer stable conventions where documented, fall back to generic label matching.

Update `server/routes/apply.js` to:
- Derive `urlHost` from `job.applyUrl` (fallback `sourceUrl` for backward compat)
- Include `applyUrl` in `__APPLY_CTX__.job`
- Rename user message from "LinkedIn Easy Apply" to company-site fill-assist
- Broaden `COMMON_QUESTIONS` slightly (still generic application questions)

Update `pipeline/applyForm.self-check.js`:
- Assert no Easy Apply–only requirements (e.g. "Easy Apply button")
- Assert company-site / ATS language present
- Keep SUBMIT=false, EEO, `__APPLY_CTX__` anchors
- LLM round-trip remains best-effort / skippable

## Files to Create

| File | Purpose |
|------|---------|
| (none) | |

## Files to Modify

| File | Changes |
|------|---------|
| `docs/agents/apply-form.md` | Rewrite for company-site ATS fill-assist |
| `tools/job-collector/server/routes/apply.js` | Context + messaging pivot to `applyUrl` / company forms |
| `tools/job-collector/pipeline/applyForm.self-check.js` | Updated structural anchors + sample context |

## Tests

| Test File | Coverage |
|-----------|----------|
| `tools/job-collector/pipeline/applyForm.self-check.js` | Prompt anchors, no LinkedIn-only assumptions, optional LLM round-trip |

## Technical Details

- Route still returns `{ script, warnings, pdfPath }` — UI pivot is work item 3.
- If `applyUrl` is missing, route may still generate script using `sourceUrl` host with a warning in `warnings[]` (soft nudge until user sets apply URL).

---
*Plan pending approval at checkpoint.*

---

## Work Item: pivot-apply-route-and-ui

# Implementation Plan: Pivot apply route and UI to company apply URL

## Approach

Tighten `POST /api/apply/script` to **require** `job.applyUrl` — return `409` / `APPLY_URL_MISSING` when absent (remove soft warning-only path from item 2). Context already uses `applyUrl`/`urlHost` from item 2.

Job Detail UI pivot:
- Enable "Generate apply script" only when CV **and** apply URL exist
- Update help text: open company apply page → paste in DevTools → review → submit manually
- Rename "Mark applied (Easy Apply)" → "Record application" (or similar); pass `applyUrl` to `markApplied`, fallback `sourceUrl` only if applyUrl missing
- Show route `warnings` in UI if present

Self-check: add `apply.route.self-check.js` (or extend existing) — mock/minimal test that route logic rejects missing applyUrl with `APPLY_URL_MISSING`. Happy-path LLM skippable.

## Files to Create

| File | Purpose |
|------|---------|
| `tools/job-collector/server/routes/apply.self-check.js` | Assert APPLY_URL_MISSING when no applyUrl |

## Files to Modify

| File | Changes |
|------|---------|
| `tools/job-collector/server/routes/apply.js` | Require applyUrl (409 APPLY_URL_MISSING) |
| `tools/job-collector/frontend/src/pages/JobDetail.jsx` | Button gating, labels, help text, markApplied URL |

## Tests

| Test File | Coverage |
|-----------|----------|
| `server/routes/apply.self-check.js` | Missing applyUrl rejection code |

---
*Plan pending approval at checkpoint.*
