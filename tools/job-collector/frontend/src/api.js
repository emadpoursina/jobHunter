const BASE = '/api';

// Shared fetch wrapper for all API calls
async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error), { code: data.code });
  return data;
}

// Reject stubbed endpoints until their backend routes exist
function notImplemented(name) {
  return () =>
    Promise.reject(
      Object.assign(new Error(`${name} is not implemented yet`), {
        code: 'NOT_IMPLEMENTED',
      }),
    );
}

// Static collector metadata until GET /api/collectors is wired (Batch 10)
const STUB_COLLECTORS = {
  collectors: [
    {
      name: 'linkedin',
      label: 'LinkedIn',
      configSchema: {
        queries: { type: 'array', description: 'Search strings, one per line' },
        location: { type: 'string', description: 'Location filter, e.g. Germany' },
        maxResults: { type: 'number', default: 10, description: 'Max listings per query' },
      },
    },
    {
      name: 'indeed',
      label: 'Indeed',
      configSchema: {
        queries: { type: 'array', description: 'Search strings, one per line' },
        location: { type: 'string', description: 'Location filter, e.g. Germany' },
        maxResults: { type: 'number', default: 10, description: 'Max listings per query' },
      },
    },
  ],
};

export const api = {
  // Jobs
  getJobs: notImplemented('getJobs'),
  getJob: notImplemented('getJob'),
  updateJob: notImplemented('updateJob'),
  deleteJob: notImplemented('deleteJob'),

  // Collection
  getCollectors: () => Promise.resolve(STUB_COLLECTORS),
  collect: notImplemented('collect'),
  getRuns: notImplemented('getRuns'),
  getRun: notImplemented('getRun'),

  // Pipeline
  parseOffer: notImplemented('parseOffer'),
  saveJob: notImplemented('saveJob'),
  generateCv: notImplemented('generateCv'),
  getCvMarkdown: notImplemented('getCvMarkdown'),

  // Settings
  getSettings: () => request('GET', '/settings'),
  saveSettings: (settings) => request('PUT', '/settings', { settings }),
  getOllamaModels: () => request('GET', '/ollama/models'),
};
