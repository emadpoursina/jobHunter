# 02 — Database

## Engine

`better-sqlite3` — synchronous SQLite bindings for Node.js. Chosen over
`node-sqlite3` (async/callback) because synchronous code is simpler and
performance is not a concern for a single-user local tool.

## Connection singleton (`server/db.js`)

- Opens (or creates) `data/jobs.db` relative to the repo root
- Runs `PRAGMA journal_mode = WAL` for safe concurrent reads
- Runs `PRAGMA foreign_keys = ON`
- Calls `migrate()` on startup to create tables if they don't exist
- Exports a single `db` object used by all route handlers

## Tables

### `jobs`

The canonical record for every collected job offer.

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source        TEXT    NOT NULL,               -- "linkedin" | "indeed" | "manual"
  source_url    TEXT,                           -- original URL if available
  raw_text      TEXT    NOT NULL,               -- raw HTML/text from collector
  title         TEXT,                           -- parsed
  company       TEXT,                           -- parsed
  location      TEXT,                           -- parsed
  employment_type TEXT,                         -- parsed
  salary        TEXT,                           -- parsed (nullable)
  visa_sponsorship TEXT,                        -- "Yes" | "No" | "Not mentioned"
  required_skills   TEXT,                       -- JSON array string
  nice_to_have      TEXT,                       -- JSON array string
  responsibilities  TEXT,                       -- JSON array string
  match_score   INTEGER,                        -- 0–100
  offer_md_path TEXT,                           -- relative path to .md file in repo
  cv_md_path    TEXT,                           -- relative path to generated CV .md
  status        TEXT    NOT NULL DEFAULT 'raw', -- "raw"|"parsed"|"cv_generated"|"applied"|"rejected"
  country_code  TEXT,                           -- ISO 3166-1 alpha-2, e.g. "DE"
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

**Notes:**
- `required_skills`, `nice_to_have`, `responsibilities` are stored as JSON
  strings (`JSON.stringify(array)`). Read them back with `JSON.parse()`.
- `offer_md_path` and `cv_md_path` are relative to `REPO_ROOT`, e.g.
  `job-offers/by-country/DE/acme-backend-engineer-2025-06.md`
- `status` is a simple state machine: `raw → parsed → cv_generated → applied`
  (or `rejected` at any point)

### `runs`

Audit log of every collection run.

```sql
CREATE TABLE IF NOT EXISTS runs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source        TEXT    NOT NULL,
  config        TEXT    NOT NULL,               -- JSON: { query, location, ... }
  status        TEXT    NOT NULL DEFAULT 'running', -- "running"|"done"|"failed"
  jobs_found    INTEGER NOT NULL DEFAULT 0,
  jobs_new      INTEGER NOT NULL DEFAULT 0,     -- not previously seen
  error         TEXT,                           -- error message if failed
  started_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  finished_at   TEXT
);
```

### `settings`

Key-value store for user configuration persisted across restarts.

```sql
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL               -- always stored as JSON string
);
```

**Default settings inserted on first run:**
```json
{ "llm_provider": "ollama" }
{ "ollama_base_url": "http://localhost:11434" }
{ "ollama_model": "" }
{ "anthropic_api_key": "" }
{ "collectors": {} }
```

`collectors` value is an object keyed by collector name, e.g.:
```json
{
  "linkedin": { "enabled": true, "queries": ["backend engineer Germany", "node.js engineer Berlin"] },
  "indeed":   { "enabled": false, "queries": [] }
}
```

## Helper functions to export from `server/db.js`

These are thin wrappers around `better-sqlite3` prepared statements.
Cursor should implement all of them.

```js
// Jobs
db.getJobs(filters)           // filters: { status, source, country_code }
db.getJobById(id)
db.insertJob(jobData)         // returns inserted id
db.updateJob(id, fields)      // partial update
db.jobExistsByUrl(source_url) // returns bool — deduplication check

// Runs
db.insertRun(runData)         // returns inserted id
db.updateRun(id, fields)
db.getRecentRuns(limit = 20)

// Settings
db.getSetting(key)            // returns parsed value or null
db.setSetting(key, value)     // JSON.stringifies value
db.getAllSettings()           // returns plain object
```

## Deduplication

Before inserting a job, check `db.jobExistsByUrl(source_url)`. If it exists,
skip insertion and increment `jobs_found` (not `jobs_new`) on the run record.

For manual/paste jobs with no URL, skip the deduplication check.

## Updated_at trigger

Add an `AFTER UPDATE` trigger on `jobs` to keep `updated_at` current:

```sql
CREATE TRIGGER IF NOT EXISTS jobs_updated_at
AFTER UPDATE ON jobs
BEGIN
  UPDATE jobs SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```
