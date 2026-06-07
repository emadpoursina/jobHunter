# 03 — API Routes

All routes are mounted under `/api`. Base URL: `http://localhost:3001`.

Express 5 is used — async route handlers throw errors automatically without
needing `try/catch` or `next(err)` wrappers in most cases.

All request bodies are JSON (`Content-Type: application/json`).
All responses are JSON.

---

## Error envelope

All error responses use this shape:
```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

Common codes: `NOT_FOUND`, `VALIDATION_ERROR`, `LLM_ERROR`, `COLLECTOR_ERROR`,
`DB_ERROR`.

---

## Jobs  (`server/routes/jobs.js`)

### `GET /api/jobs`

Returns all jobs, optionally filtered.

**Query params** (all optional):
- `status` — filter by status string
- `source` — filter by source string
- `country_code` — filter by country code

**Response 200:**
```json
{
  "jobs": [
    {
      "id": 1,
      "source": "linkedin",
      "title": "Backend Engineer",
      "company": "Acme GmbH",
      "location": "Berlin, Germany",
      "country_code": "DE",
      "match_score": 78,
      "status": "parsed",
      "visa_sponsorship": "Yes",
      "created_at": "2025-06-01T10:00:00Z"
    }
  ]
}
```

Note: this endpoint returns summary fields only (not `raw_text` or full arrays).

---

### `GET /api/jobs/:id`

Returns a single job with all fields.

**Response 200:**
```json
{
  "job": {
    "id": 1,
    "source": "linkedin",
    "source_url": "https://linkedin.com/jobs/view/123",
    "title": "Backend Engineer",
    "company": "Acme GmbH",
    "location": "Berlin, Germany",
    "country_code": "DE",
    "employment_type": "Full-time",
    "salary": "€60,000–€80,000",
    "visa_sponsorship": "Yes",
    "required_skills": ["Node.js", "TypeScript", "PostgreSQL"],
    "nice_to_have": ["NestJS", "AWS"],
    "responsibilities": ["Build REST APIs", "..."],
    "match_score": 78,
    "status": "parsed",
    "offer_md_path": "job-offers/by-country/DE/acme-backend-engineer-2025-06.md",
    "cv_md_path": null,
    "created_at": "2025-06-01T10:00:00Z",
    "updated_at": "2025-06-01T10:00:00Z"
  }
}
```

**Response 404:** `{ "error": "Job not found", "code": "NOT_FOUND" }`

---

### `PATCH /api/jobs/:id`

Update a job's `status` or other mutable fields.

**Request body** (all fields optional):
```json
{ "status": "applied" }
```

**Response 200:** `{ "job": { ...updated job... } }`

---

### `DELETE /api/jobs/:id`

Soft-delete is not needed — hard delete is fine for this use case.
Does NOT delete the associated `.md` files on disk.

**Response 200:** `{ "deleted": true }`

---

## Collection  (`server/routes/collect.js`)

### `GET /api/collectors`

Returns list of all registered collectors and their current enabled/config state.

**Response 200:**
```json
{
  "collectors": [
    {
      "name": "linkedin",
      "label": "LinkedIn",
      "enabled": true,
      "configSchema": {
        "queries": { "type": "array", "description": "Search strings" },
        "location": { "type": "string", "description": "Location filter" },
        "maxResults": { "type": "number", "default": 10 }
      }
    },
    {
      "name": "indeed",
      "label": "Indeed",
      "enabled": false,
      "configSchema": { "queries": { "type": "array" }, "location": { "type": "string" } }
    },
    {
      "name": "manual",
      "label": "Manual (paste / URL)",
      "enabled": true,
      "configSchema": {
        "text": { "type": "string", "description": "Raw pasted job listing" },
        "url":  { "type": "string", "description": "Job listing URL" }
      }
    }
  ]
}
```

---

### `POST /api/collect`

Runs one collector. Enqueues a job in the p-queue. Returns immediately with a
run ID — the frontend polls `GET /api/runs/:id` for progress.

**Request body:**
```json
{
  "source": "linkedin",
  "config": {
    "queries": ["backend engineer Berlin"],
    "location": "Germany",
    "maxResults": 10
  }
}
```

**Response 202:**
```json
{ "runId": 42 }
```

**Response 400 (unknown source):**
```json
{ "error": "Unknown collector: foobar", "code": "VALIDATION_ERROR" }
```

**Side effects (async, happens in queue):**
1. Calls `collector.run(config)` → `RawOffer[]`
2. For each `RawOffer`, calls `pipeline/parser.js` → `StandardOffer`
3. Deduplicates against DB
4. Inserts new jobs into DB
5. Writes offer `.md` files to `job-offers/by-country/<CC>/`
6. Updates the run record with `status: "done"`, `jobs_found`, `jobs_new`

---

### `GET /api/runs`

Returns recent runs.

**Query params:** `limit` (default 20)

**Response 200:**
```json
{
  "runs": [
    {
      "id": 42,
      "source": "linkedin",
      "config": { "queries": ["..."], "location": "Germany" },
      "status": "done",
      "jobs_found": 8,
      "jobs_new": 3,
      "started_at": "2025-06-01T10:00:00Z",
      "finished_at": "2025-06-01T10:02:30Z"
    }
  ]
}
```

---

### `GET /api/runs/:id`

Used by the frontend to poll run progress.

**Response 200:** single run object (same shape as above).

**Response 404:** `{ "error": "Run not found", "code": "NOT_FOUND" }`

---

## Pipeline  (`server/routes/pipeline.js`)

### `POST /api/parse`

Parses a single raw offer text on demand (used by the manual collector flow).
Does NOT save to DB — returns the parsed result for the frontend to review.

**Request body:**
```json
{
  "text": "Full job listing text pasted by user..."
}
```

**Response 200:**
```json
{
  "offer": {
    "title": "Backend Engineer",
    "company": "Acme GmbH",
    "location": "Berlin, Germany",
    "employment_type": "Full-time",
    "salary": "€60k–€80k",
    "visa_sponsorship": "Yes",
    "required_skills": ["Node.js", "TypeScript"],
    "nice_to_have": ["NestJS"],
    "responsibilities": ["Build REST APIs"],
    "match_score": 78
  }
}
```

---

### `POST /api/jobs/:id/save`

Saves a parsed offer to the DB and writes the `.md` file. Called after the user
reviews the parsed result from `POST /api/parse`.

**Request body:**
```json
{
  "offer": { ...StandardOffer from /api/parse... },
  "rawText": "original raw text",
  "source": "manual",
  "sourceUrl": "https://..."
}
```

**Response 201:**
```json
{ "job": { ...full job record... } }
```

---

### `POST /api/jobs/:id/cv`

Generates a tailored CV for an existing job. Enqueues the LLM call.
Returns immediately — polls `GET /api/jobs/:id` to check `cv_md_path`.

**Response 202:**
```json
{ "message": "CV generation started" }
```

**Side effects:**
1. Reads `profile/master-profile.md`
2. Reads `agents/cv-generator.md` as system prompt instructions
3. Calls LLM → CV Markdown string
4. Writes to `documents/generated/CV_<Company>_<Role>_<Date>.md`
5. Updates `jobs.cv_md_path` and `jobs.status = "cv_generated"`

---

### `GET /api/jobs/:id/cv`

Returns the CV Markdown content for a job (reads the file from disk).

**Response 200:**
```json
{ "markdown": "# Emad Poursina\n\n..." }
```

**Response 404:** if `cv_md_path` is null or file doesn't exist.

---

## Settings  (`server/routes/settings.js`)

### `GET /api/settings`

Returns all settings. Sensitive values (API keys) are redacted — only returns
whether they are set, not their value.

**Response 200:**
```json
{
  "settings": {
    "llm_provider": "ollama",
    "ollama_base_url": "http://localhost:11434",
    "ollama_model": "mistral",
    "anthropic_api_key_set": true,
    "collectors": {
      "linkedin": { "enabled": true, "queries": ["backend engineer Berlin"] },
      "indeed": { "enabled": false, "queries": [] }
    }
  }
}
```

---

### `PUT /api/settings`

Replaces all settings. Partial update is not supported — send the full object.

**Request body:** same shape as GET response (without `_set` suffix fields).
If `anthropic_api_key` is the empty string `""`, the stored key is not changed.
Send the actual key string to update it.

**Response 200:** `{ "settings": { ...updated settings... } }`

---

### `GET /api/ollama/models`

Proxies a request to the Ollama `/api/tags` endpoint and returns available models.
Used by the Settings page to populate the model dropdown.

**Response 200:**
```json
{ "models": ["mistral", "llama3.1", "qwen2.5-coder"] }
```

**Response 503 (Ollama not running):**
```json
{ "error": "Cannot reach Ollama at http://localhost:11434", "code": "OLLAMA_UNAVAILABLE" }
```
