---
run: run-jobhunter-007
work_item: profile-editor-verification
generated: 2026-08-07T22:00:30Z
---

# Walkthrough: Profile editor verification

## Summary

Added a verification orchestrator and HTTP/settings self-checks that exercise the full profile editor stack with temp fixtures and mocked LLM — no live provider or real contact data.

## Run verification

```bash
cd tools/job-collector && bun run scripts/verify-profile-editor.mjs
```

## Files created

- `scripts/verify-profile-editor.mjs` — master runner
- `server/routes/profile.self-check.js` — API smoke (mocked AI)
- `server/routes/settings.profile-task.self-check.js` — task normalization

## Modified

- `pipeline/profileEditor.js` — `PROFILE_AI_MOCK=1` hook for route smoke

---
*Run run-jobhunter-007 — master-profile-editor intent complete.*
