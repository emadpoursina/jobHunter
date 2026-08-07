---
id: profile-editor-page
title: Dedicated Profile editor page
intent: master-profile-editor
complexity: medium
mode: confirm
status: completed
depends_on:
  - profile-document-access-api
  - profile-ai-update-flow
created: 2026-08-07T20:47:00Z
run_id: run-jobhunter-006
completed_at: 2026-08-07T21:51:20.611Z
---

# Work Item: Dedicated Profile editor page

## Description

Add a dedicated `/profile` route and navigation item in the React app. The page
provides a full Markdown editor with rendered preview, manual save, and a free-form
AI update flow that displays the proposed result/diff and requires an explicit Apply
action before saving.

## Acceptance Criteria

- [ ] Profile is available from primary navigation and is not nested under Settings.
- [ ] The page loads the current profile Markdown, supports editing the full document, and shows a rendered preview.
- [ ] Manual Save sends the edited document to the profile API, displays validation/errors, and reflects the saved content.
- [ ] The AI prompt action requires non-empty input, shows loading and failure states, and displays the proposed document/diff without changing the editor's saved source.
- [ ] Apply is explicit, uses the approved proposal returned by the server, and refreshes the editor after a successful save.
- [ ] Unsaved manual changes are not silently discarded when starting an AI preview or navigating away.
- [ ] The preview does not execute arbitrary HTML or scripts contained in profile Markdown.
- [ ] The UI follows existing React state, API, CSS, loading, alert, and Markdown-preview patterns without adding a dependency.

## Technical Notes

Reuse `CvPreview`/the installed Markdown renderer where safe, `frontend/src/api.js`
request helpers, React Router, and existing page styles. Keep AI proposals separate
from the editable current document until Apply succeeds.

## Dependencies

- profile-document-access-api
- profile-ai-update-flow
