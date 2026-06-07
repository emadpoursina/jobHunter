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

// Build query string for job list filters
function jobsQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.source) params.set('source', filters.source);
  if (filters.country_code) params.set('country_code', filters.country_code);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  // Jobs
  getJobs: (filters) => request('GET', `/jobs${jobsQuery(filters)}`),
  getJob: (id) => request('GET', `/jobs/${id}`),
  updateJob: (id, fields) => request('PATCH', `/jobs/${id}`, fields),
  deleteJob: (id) => request('DELETE', `/jobs/${id}`),

  // Collection
  getCollectors: () => request('GET', '/collectors'),
  collect: (source, config) => request('POST', '/collect', { source, config }),
  getRuns: (limit = 20) => request('GET', `/runs?limit=${limit}`),
  getRun: (id) => request('GET', `/runs/${id}`),

  // Pipeline
  parseOffer: (text) => request('POST', '/parse', { text }),
  saveJob: (id, payload) => request('POST', `/jobs/${id}/save`, payload),
  generateCv: (id) => request('POST', `/jobs/${id}/cv`),
  getCvMarkdown: (id) => request('GET', `/jobs/${id}/cv`),

  // Settings
  getSettings: () => request('GET', '/settings'),
  saveSettings: (settings) => request('PUT', '/settings', { settings }),
  getOllamaModels: () => request('GET', '/ollama/models'),
};
