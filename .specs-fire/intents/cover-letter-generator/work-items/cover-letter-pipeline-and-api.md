---
id: cover-letter-pipeline-and-api
title: Cover letter pipeline + API
intent: cover-letter-generator
complexity: medium
mode: confirm
status: completed
depends_on: []
created: 2026-07-30T19:11:00Z
run_id: run-jobhunter-003
completed_at: 2026-07-30T19:37:01.298Z
---

# Work Item: Cover letter pipeline + API

## Description

Promote the existing cover-letter agent into `docs/agents/` and add job-collector backend support mirroring the CV path: generate tailored cover-letter markdown on demand, persist it per job, serve it via API, and convert to PDF by reusing the existing markdown→PDF converter.

## Acceptance Criteria

- [ ] Cover-letter agent is available at `docs/agents/cover-letter-generator.md` (content from `scratch/cover-letter-generator.md`).
- [ ] A pipeline module under `tools/job-collector/pipeline/` generates cover-letter markdown from master profile + job fields via the agent prompt (on demand only — not wired into collect/parse auto-pipeline).
- [ ] Generated markdown is written to a predictable path under the generated-docs directory and the job record stores that path (parallel to `cvMdPath`).
- [ ] `POST /jobs/:id/cover-letter` enqueues generation and returns 202; `GET /jobs/:id/cover-letter` returns persisted markdown (404 if missing).
- [ ] `POST /jobs/:id/cover-letter/pdf` converts the saved cover-letter `.md` to PDF using the existing `cvToPdf` helper and returns the PDF (no new PDF library).
- [ ] Enrichment fields (`about_company`, `why_this_role`, `tone_hint`) are optional/omitted — generation works from parsed job + profile alone.
- [ ] One runnable self-check for the pipeline module (assert non-empty generation or mocked path + write/read); no test framework.

## Technical Notes

- Mirror `pipeline/cv.js`, `writeCvMd` in `repoFiles.js`, and `/jobs/:id/cv` routes in `server/routes/pipeline.js`.
- Reuse `callLlm` / `resolveTaskLlm` — add a `cover_letter` (or similar) task key if settings already pattern by task.
- DB: add `cover_letter_md_path` (or equivalent) the same way `cv_md_path` was added; keep camelCase/snake_case dual reads consistent with existing job fields.
- PDF: call `cvToPdf(mdPath)` with the cover-letter markdown path; do not fork the converter.
- Do not wire into apply-form upload in this work item.

## Dependencies

(none)
