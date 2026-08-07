---
work_item: profile-ai-update-flow
intent: master-profile-editor
created: 2026-08-07T20:47:00Z
mode: validate
checkpoint_1: approved
---

# Design: AI profile update flow and task configuration

## Summary

Use the existing Markdown file as the only source of truth. The server will provide
a read/revision boundary, an AI preview endpoint that never writes, and an explicit
apply endpoint that validates the proposal and rejects stale proposals. The LLM task
will be `profile_update` and will reuse existing provider credentials and per-task
overrides.

## Scope

**In Scope:**
- Profile revision hashing, validation, cache invalidation, and atomic file writes.
- A dedicated profile-editing agent prompt.
- Profile read/save/AI preview/AI apply API routes.
- `profile_update` task defaults and Settings task-model configuration.
- Mocked checks for write-free preview, validation, stale proposals, and approved apply.

**Out of Scope:**
- The Profile page and its editor/diff UI.
- Automatic backups, version history, or restore UI.
- Regenerating existing CVs or cover letters.
- New LLM providers or dependencies.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage | Keep `PROFILE_PATH` under `REPO_ROOT`; no database copy | Prevents divergence from the profile used by CV, cover-letter, and apply pipelines |
| AI output | Require a complete proposed Markdown document | Makes review/apply deterministic and preserves arbitrary profile sections |
| Apply safety | Return a server revision fingerprint during preview; require it during apply | Prevents an old proposal from overwriting a newer manual edit |
| File writes | Validate first, then write atomically | Avoids corrupting the source of truth on validation or process failure |
| Required fields | Reuse `parseProfileText`; reject missing full name, email, or phone | Keeps the existing autofill contract intact |
| LLM configuration | Add `profile_update` to existing `llm_tasks` defaults and Settings task cards | Reuses provider/model/provider-order behavior without a second configuration system |
| AI review | Preview is write-free; Apply is a separate explicit request | Satisfies the project rule that AI output requires human review |
| Unsaved editor state | AI preview operates on the saved server profile; the UI must save or resolve unsaved edits first | Avoids silently merging unrelated manual edits into an AI rewrite |
| Persistence/history | Replace only the current file; no automatic backup/history | Matches the confirmed scope; Git remains the manual recovery mechanism |

## Data Models Affected

### Modifies
- **settings.llm_tasks**: adds the `profile_update` provider/model/provider-order entry — enables task-specific LLM configuration without a new persistence model.

## Technical Approach

### Architecture

```text
Profile page
  ├─ GET /api/profile ───────────────┐
  ├─ PUT /api/profile                 │
  ├─ POST /api/profile/ai-preview     │
  └─ POST /api/profile/ai-apply       │
                                      ▼
                           profile route / pipeline
                             ├─ read PROFILE_PATH
                             ├─ hash current Markdown
                             ├─ parse/validate required fields
                             ├─ resolveTaskLlm('profile_update')
                             └─ atomic write + invalidate parsed-profile cache
                                      │
                                      ▼
                    phase2/profile/master-profile.md
```

### API Changes

- `GET /api/profile` — returns `{ markdown, revision }`.
- `PUT /api/profile` — accepts `{ markdown, baseRevision }`, validates and atomically saves, then returns `{ markdown, revision }`.
- `POST /api/profile/ai-preview` — accepts `{ prompt, baseRevision }`, calls the LLM, and returns `{ proposal, baseRevision }` without writing.
- `POST /api/profile/ai-apply` — accepts `{ proposal, baseRevision }`, checks the revision, validates, saves, invalidates cache, and returns `{ markdown, revision }`.
- Add `PROFILE_INCOMPLETE` as a client-visible validation status and a conflict status for stale revisions.

### Database Changes

```sql
-- No schema migration. Expand the existing settings.llm_tasks JSON:
-- { ..., "profile_update": { "provider": "", "model": "", "provider_order": "" } }
```

## Affected Files

| File | Action | Purpose |
|------|--------|---------|
| `tools/job-collector/pipeline/profile.js` | Modify | Shared profile validation/cache invalidation and safe file-writing helpers |
| `tools/job-collector/pipeline/profileEditor.js` | Add | Prompt construction, revision hashing, AI preview orchestration |
| `tools/job-collector/server/routes/profile.js` | Add | Profile read/save/preview/apply endpoints |
| `tools/job-collector/server/index.js` | Modify | Mount profile routes |
| `tools/job-collector/server/db.js` | Modify | Add `profile_update` task defaults |
| `tools/job-collector/server/errors.js` | Modify | Map profile validation/stale-revision errors |
| `tools/job-collector/server/routes/settings.js` | Review/modify | Preserve and normalize the new task key |
| `tools/job-collector/frontend/src/pages/Settings.jsx` | Modify | Add “Update master profile” task override card |
| `docs/agents/profile-editor.md` | Add | Dedicated system prompt for safe full-document profile updates |

## Security Considerations

- **Factual integrity**: Dedicated prompt, full-document output contract, required-field validation, and human preview/apply reduce fabricated or destructive edits.
- **Stale writes**: Server revision fingerprints and conflict rejection prevent an old proposal from overwriting newer content.
- **Profile privacy**: Reuse the configured provider, never log profile/prompt contents, and keep profile data local except for the existing configured LLM request.
- **Rendered content safety**: The Profile UI must use a safe Markdown renderer/allowlist rather than blindly injecting arbitrary HTML.

## Integration Points

| System | Type | Purpose |
|--------|------|---------|
| `master-profile.md` | Filesystem source of truth | Read and persist profile content |
| `pipeline/profile.js` | Internal module | Parse required fields and invalidate parsed-profile cache |
| `server/llm.js` | Internal service | Resolve `profile_update` model settings and call the configured provider |
| `server/db.js` | SQLite settings | Persist task-specific provider/model overrides |
| Profile UI | REST consumer | Review proposals and explicitly apply changes |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI invents facts or changes profile instructions | High | Dedicated prompt, complete-document validation, and human review before apply |
| Proposal is based on an old profile | High | Server revision fingerprint and stale-proposal rejection |
| Failed write truncates the profile | High | Validate before write and use temp-file-then-rename atomic persistence |
| No automatic history makes a bad approved edit harder to recover | High | Explicit confirmation and diff review; Git remains available for manual recovery |
| Profile PII is sent to an external configured LLM | Medium | Reuse existing provider setting and never log full profile/prompt contents |
| Markdown preview executes injected HTML/script | Medium | Use a profile-specific safe Markdown rendering path |

## Implementation Checklist

- [ ] Define profile revision hashing, validation, cache invalidation, and atomic write helper.
- [ ] Add `profile_update` defaults and task normalization.
- [ ] Add the dedicated profile editor agent prompt.
- [ ] Implement profile GET/PUT/AI preview/AI apply routes and error mappings.
- [ ] Add mocked checks for write-free preview, validation, stale proposals, and approved apply.
- [ ] Document the API shape for the Profile UI work item.

---
*Generated by specs.md - fabriqa.ai FIRE Flow | Checkpoint 1 approved: 2026-08-07T20:47:00Z*
