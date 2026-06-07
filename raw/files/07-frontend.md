# 07 — Frontend (React + Vite)

## Setup

- Vite 5 + React 18
- No CSS framework — plain CSS with CSS variables (matches the existing tool's style)
- `frontend/src/api.js` is the single file for all `fetch()` calls to the API
- Vite proxies `/api` to `http://localhost:3001` in dev — no CORS issues

### `vite.config.js`
```js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
}
```

---

## Pages

### `Dashboard.jsx`

The home screen. Shows:
- **Run controls** — a button per enabled collector ("Run LinkedIn", "Run Indeed"),
  plus a manual input section (paste text or URL)
- **Recent runs** — list of last 10 runs with source, status, jobs found/new,
  duration. Polls `GET /api/runs` every 3 seconds when a run is active.
- **Quick stats** — total jobs collected, jobs with CVs generated, jobs marked
  applied

### `Jobs.jsx`

Paginated list of all jobs. Each row: title, company, location, match score
(colour-coded: ≥70 green, ≥50 amber, <50 red), status badge, visa badge,
"View" button.

Filters (rendered as a filter bar above the list):
- Status dropdown
- Source dropdown
- Country code dropdown
- Sort: match score (default), date collected

### `JobDetail.jsx`

Full detail view for a single job. Sections:
- **Header** — title, company, location, status badge, visa badge, match score
- **Skills** — required (amber tags) + nice to have (green tags)
- **Responsibilities** — bullet list
- **Offer Markdown** — shows the `.md` file path and a "Copy path" button
- **CV section** — if `cv_md_path` is set: shows a preview and a download
  button. If not: shows a "Generate CV" button.
- **Status controls** — buttons to move status: "Mark applied", "Mark rejected"

**"Generate CV" button behaviour:**
1. Calls `POST /api/jobs/:id/cv`
2. Shows a spinner in place of the button
3. Polls `GET /api/jobs/:id` every 2 seconds until `cv_md_path` is set
4. Renders the CV preview

### `CvViewer.jsx`

Standalone page at `/jobs/:id/cv`. Shows the full CV Markdown rendered as HTML
(use `marked` or `react-markdown`). Has a "Copy Markdown" button and a
"Download .md" button (triggers a blob download in the browser).

### `Settings.jsx`

Two sections:

**LLM Provider:**
- Toggle between "Ollama (local)" and "Anthropic API"
- If Ollama: URL field + model dropdown (populated via `GET /api/ollama/models`
  with a "Refresh" button) + "Save & test" button (calls `GET /api/ollama/models`
  to verify connectivity)
- If Anthropic: API key input field + save button

**Collectors:**
- For each collector returned by `GET /api/collectors`:
  - Enable/disable toggle
  - Config fields (queries textarea, location input, maxResults input)
  - These are rendered dynamically from the `configSchema` field
- "Save settings" button calls `PUT /api/settings`

---

## `frontend/src/api.js`

All fetch logic lives here. Route handlers import from this file.

```js
const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json()
  if (!res.ok) throw Object.assign(new Error(data.error), { code: data.code })
  return data
}

export const api = {
  // Jobs
  getJobs: (filters) => request('GET', '/jobs?' + new URLSearchParams(filters)),
  getJob:  (id)      => request('GET', `/jobs/${id}`),
  updateJob: (id, fields) => request('PATCH', `/jobs/${id}`, fields),
  deleteJob: (id)    => request('DELETE', `/jobs/${id}`),

  // Collection
  getCollectors: ()           => request('GET', '/collectors'),
  collect: (source, config)   => request('POST', '/collect', { source, config }),
  getRuns: (limit = 20)       => request('GET', `/runs?limit=${limit}`),
  getRun:  (id)               => request('GET', `/runs/${id}`),

  // Pipeline
  parseOffer: (text)          => request('POST', '/parse', { text }),
  saveJob: (offer, raw, src, url) => request('POST', '/jobs/save', { offer, rawText: raw, source: src, sourceUrl: url }),
  generateCv: (id)            => request('POST', `/jobs/${id}/cv`),
  getCvMarkdown: (id)         => request('GET',  `/jobs/${id}/cv`),

  // Settings
  getSettings: ()             => request('GET', '/settings'),
  saveSettings: (settings)    => request('PUT', '/settings', settings),
  getOllamaModels: ()         => request('GET', '/ollama/models'),
}
```

---

## Routing

Use `react-router-dom` v6.

```
/                →  Dashboard
/jobs            →  Jobs (list)
/jobs/:id        →  JobDetail
/jobs/:id/cv     →  CvViewer
/settings        →  Settings
```

Sidebar navigation with links to all top-level routes. Active link highlighted.

---

## Polling pattern

When waiting for an async backend operation (run completion, CV generation),
use this pattern:

```js
useEffect(() => {
  if (!polling) return
  const interval = setInterval(async () => {
    const data = await api.getRun(runId)
    if (data.run.status !== 'running') {
      setPolling(false)
      // refresh jobs list
    }
  }, 2000)
  return () => clearInterval(interval)
}, [polling, runId])
```

---

## Manual input flow (on Dashboard)

1. User pastes text or URL into the input area
2. User clicks "Parse"
3. Frontend calls `POST /api/parse` — shows loading spinner
4. On success: shows a preview card with the parsed offer (title, company,
   skills, match score, visa)
5. User clicks "Save & Generate CV" or "Save only"
6. Frontend calls `POST /api/jobs/save` with the offer + raw text
7. If "Save & Generate CV": immediately calls `POST /api/jobs/:id/cv` and
   starts polling

---

## Error display

All API errors are shown as an inline alert below the action that triggered
them. No global toast or modal. Alert auto-dismisses after 5 seconds or on
next user action.

---

## No UI library

Keep dependencies minimal. Use plain CSS with the same variable palette from
the existing `job-workflow.html` tool. The variables are already defined in
that file and should be moved to `frontend/src/index.css` as the global
stylesheet.
