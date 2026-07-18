# Coding Standards

## Overview

Standards for `tools/job-collector` (Bun ESM JavaScript) and for Markdown workflow artifacts under phase folders. Prefer small modules, explicit error codes, and snake_case DB columns mapped to camelCase at the API boundary.

## Code Formatting

**Tool**: Not enforced (no Prettier config yet)
**Config**: —
**Enforcement**: Match surrounding file style; prefer 2-space indent, semicolons, single quotes where already used

### Key Settings

- **Indent**: 2 spaces
- **Quotes**: Single quotes (match existing modules)
- **Modules**: ESM (`"type": "module"`) — use `import`/`export`

## Linting

**Tool**: Not configured
**Base Config**: —
**Strictness**: Informal — follow existing patterns in `server/` and `frontend/`

### Key Rules

- `no-secrets`: never hardcode API keys — use `.env`
- `async-errors`: wrap Express handlers with `asyncHandler` so rejections reach the global error handler
- `error-codes`: use `httpError(message, status, code)` with machine-readable codes

## Naming Conventions

### Variables and Functions

| Element | Convention | Example |
|---------|------------|---------|
| Variables / functions | camelCase | `toCamel`, `statusForError` |
| Classes / components | PascalCase | `JobCard`, `BrowserCollector` |
| Constants | UPPER_SNAKE or camelCase object | `STATUS_BY_CODE`, `DEFAULT_SETTINGS` |
| DB columns | snake_case | `match_score`, `country_code` |
| API JSON fields | camelCase | `matchScore`, `countryCode` |
| Error codes | UPPER_SNAKE | `VALIDATION_ERROR`, `OLLAMA_UNAVAILABLE` |

### Files and Folders

- **Server modules**: camelCase or kebab descriptive (e.g., `db.js`, `queue.js`)
- **Routes**: noun plural under `server/routes/` (e.g., `jobs.js`, `collect.js`)
- **Collectors**: source name (e.g., `linkedin.js`, `indeed.js`)
- **React components**: PascalCase (e.g., `JobCard.jsx`)
- **React pages**: PascalCase under `frontend/src/pages/`
- **Phase Markdown**: kebab or descriptive (e.g., `master-profile.md`, `gap-report.md`)
- **Generated CVs**: `CV_<Company>_<Role>_<Date>.md`

## File Organization

### Project Structure

```
jobHunter/
├── docs/                    # Principles + agent prompts
├── networking/              # Phase 0
├── phase1/ … phase3/        # Workflow phases
├── metrics/
├── tools/job-collector/
│   ├── collectors/          # Source-specific scrapers
│   ├── pipeline/            # Parse, CV generation, repo file I/O
│   ├── server/              # Express API, db, queue, llm
│   │   └── routes/
│   ├── frontend/src/        # React SPA
│   │   ├── components/
│   │   └── pages/
│   ├── data/                # SQLite DB (local)
│   └── scripts/             # e2e / utilities
└── .specs-fire/             # FIRE state & standards
```

### Conventions

- **API boundary**: Convert DB snake_case → camelCase in `db.js` helpers before responding
- **Settings**: Persist collector/LLM settings in SQLite; secrets only via env
- **Workflow content**: Live offers in `phase2/offers/`; research corpus in `phase1/job-offers/`
- **Never invent CV facts** beyond `phase2/profile/master-profile.md`

## Import Order

```javascript
import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { httpError, asyncHandler } from './errors.js';
```

**Rules**:
- Built-ins / runtime first
- External packages next
- Local modules last
- Prefer explicit `.js` extensions for local ESM imports

## Error Handling

### Pattern

**Approach**: Tagged errors with HTTP status + machine-readable `code`; `asyncHandler` + central Express error middleware

### Guidelines

- Use `httpError(message, status, code)` from `server/errors.js`
- Map known codes via `STATUS_BY_CODE` / `statusForError`
- Return JSON errors with `code` for the frontend
- Do not leak stack traces or secrets to clients

### Example

```javascript
import { httpError, asyncHandler } from '../errors.js';

export const getJob = asyncHandler(async (req, res) => {
  const job = await findJob(req.params.id);
  if (!job) throw httpError('Job not found', 404, 'NOT_FOUND');
  res.json(job);
});
```

## Logging

**Tool**: `console` (local tool)
**Format**: Plain text / structured enough for debugging

### Log Levels

| Level | Usage |
|-------|-------|
| error | Failed LLM calls, DB failures, unhandled exceptions |
| warn | Retries, soft scrape failures, missing optional config |
| info | Job collection start/finish, pipeline stage transitions |
| debug | Verbose scrape/parse details (dev only) |

### Guidelines

**Always log**:
- Collection run start/end and item counts
- LLM provider failures (without prompt PII dump in production logs)
- Unexpected HTTP 5xx

**Never log**:
- API keys / Anthropic tokens
- Full CV or master-profile PII in shared logs
- Session cookies from scrapers

## Comments and Documentation

### When to Comment

- Non-obvious scrape or LLM parsing quirks
- Why an error code maps to a status
- Workflow rules that affect code behavior (link to `docs/principles.md`)

### Documentation Format

**Functions**: Short leading comment when non-obvious; no mandatory JSDoc
**Classes**: Component purpose in a one-liner if not clear from the name

## Code Patterns

### Preferred Patterns

#### asyncHandler for routes

Keep route handlers async-safe.

```javascript
export const handler = asyncHandler(async (req, res) => {
  // ...
});
```

#### DB ↔ API case mapping

Keep SQL snake_case; expose camelCase.

```javascript
export function toCamel(obj) {
  // convert keys for API responses
}
```

### Anti-Patterns to Avoid

- **Inventing CV content**: Always ground in master profile
- **Hardcoded secrets**: Use `.env` / settings UI
- **Unreviewed AI output to applications**: Human must approve before send
- **ORM sprawl**: Prefer thin SQL helpers for this local SQLite app

---
*Generated by specs.md - fabriqa.ai FIRE Flow*
