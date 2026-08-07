---
run: run-jobhunter-006
work_item: profile-editor-page
intent: master-profile-editor
mode: confirm
checkpoint: plan
approved_at: 2026-08-07T21:49:00Z
---

# Implementation Plan: Dedicated Profile editor page

## Approach

Add `/profile` route with `ProfileEditor.jsx`: split editor/preview layout, manual save with revision, AI preview/apply flow with separate proposal state, line diff display, unsaved-change guards (beforeunload + nav confirm), and `CvPreview` with `safe` mode to escape raw HTML.

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/pages/ProfileEditor.jsx` | Profile editor page |
| `frontend/src/profileDiff.js` | Line diff helper for AI proposals |
| `frontend/src/profileDiff.self-check.js` | Runnable diff helper check |

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/App.jsx` | Nav item + route |
| `frontend/src/components/CvPreview.jsx` | Optional `safe` HTML escaping |
| `frontend/src/index.css` | Profile editor layout styles |
