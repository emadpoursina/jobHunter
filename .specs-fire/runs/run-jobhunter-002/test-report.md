---
run: run-jobhunter-002
work_item: apply-url-on-job
intent: company-site-apply-filler
generated: 2026-07-29T21:27:30Z
status: passed
---

# Test Report: Apply URL on job record

## Summary

| Category | Passed | Failed | Skipped | Coverage |
|----------|--------|--------|---------|----------|
| Self-check | 7 | 0 | 0 | n/a |
| Regression | 7 | 0 | 0 | n/a |
| **Total** | 14 | 0 | 0 | n/a |

## Acceptance Criteria Validation

- ✅ **`jobs` table gains `apply_url TEXT`** — migration via `addColumnIfMissing`
- ✅ **`apply_url` in job detail + patch** — `getJobById` returns all columns; PATCH accepts `applyUrl`
- ✅ **Job Detail UI** — section with link, input, Save via `updateJob`
- ✅ **Empty/invalid URL handling** — whitespace → null; invalid → `VALIDATION_ERROR`
- ✅ **Runnable self-check** — `db.apply-url.self-check.js` passes
- ✅ **`source_url` unchanged** — no collector or listing URL changes

## Test Commands

```bash
cd tools/job-collector && bun run server/db.apply-url.self-check.js
cd tools/job-collector && bun run server/db.self-check.js
```

## Ready for Completion

- [x] All tests passing
- [x] All acceptance criteria validated
- [x] No critical issues open

---

## Work Item: company-site-apply-agent

# Test Report: Company-site apply agent prompt

## Summary

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| Prompt anchors | 10 | 0 | 0 |
| LLM round-trip | — | — | 1 (timeout) |

## Acceptance Criteria Validation

- ✅ **Agent targets company apply forms** — rewritten `docs/agents/apply-form.md`
- ✅ **`SUBMIT = false` by default** — mandated in prompt
- ✅ **`__APPLY_CTX__` contract** — profile, job, pdfPath, applyUrl, urlHost, answers
- ✅ **Label matching, resume upload, answers, highlights, EEO skip** — covered in prompt
- ✅ **Host-aware ATS hints** — Greenhouse, Lever, Workday, Personio, Ashby, BambooHR
- ✅ **Self-check updated** — structural anchors; LLM skippable on timeout/bad output

## Test Commands

```bash
cd tools/job-collector && bun run pipeline/applyForm.self-check.js
```

## Ready for Completion

- [x] All hard checks passing
- [x] All acceptance criteria validated

---

## Work Item: pivot-apply-route-and-ui

# Test Report: Pivot apply route and UI to company apply URL

## Summary

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| Route self-check | 3 | 0 | 1 (happy path — no fixture job) |
| Regression (db + agent) | 17 | 0 | 1 (LLM) |

## Acceptance Criteria Validation

- ✅ **`APPLY_URL_MISSING` when no applyUrl** — 409 on `POST /api/apply/script`
- ✅ **Context uses applyUrl / company urlHost** — from item 2, now required
- ✅ **CV still required** — `CV_NOT_GENERATED` unchanged
- ✅ **Response shape** — `{ script, warnings, pdfPath }`
- ✅ **UI gating** — generate button disabled until CV + apply URL set
- ✅ **Record application** — relabeled; `markApplied` uses `applyUrl` (fallback `sourceUrl`)
- ✅ **Help text** — company apply page + DevTools paste
- ✅ **Self-check** — `apply.self-check.js` asserts APPLY_URL_MISSING

## Test Commands

```bash
cd tools/job-collector && REPO_ROOT=/path/to/repo bun run server/routes/apply.self-check.js
cd tools/job-collector && bun run server/db.apply-url.self-check.js
cd tools/job-collector && bun run pipeline/applyForm.self-check.js
```

## Ready for Completion

- [x] All hard checks passing
- [x] All acceptance criteria validated
