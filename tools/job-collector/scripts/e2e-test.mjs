#!/usr/bin/env bun
import { resolve } from 'path';

/**
 * Batch 17 — manual E2E checklist for job-collector.
 * Prerequisites: server running (`bun run dev`, `bun run stack:up`, or Docker), and an LLM API key for LLM tests.
 *
 * Usage: bun scripts/e2e-test.mjs
 * Auto-detects API on :3001 (dev) or :3061 (Docker). Override with API_BASE / FRONTEND_BASE.
 */

let API = process.env.API_BASE ?? 'http://localhost:3001/api';
let FRONTEND = process.env.FRONTEND_BASE ?? 'http://localhost:5173';
const REPO_ROOT = process.env.REPO_ROOT ?? '../..';

// Pick the first healthy API base (dev :3001, Docker :3061)
async function resolveEndpoints() {
  if (process.env.API_BASE) return;

  for (const { api, frontend } of [
    { api: 'http://localhost:3001/api', frontend: 'http://localhost:5173' },
    { api: 'http://localhost:3061/api', frontend: 'http://localhost:3061' },
  ]) {
    try {
      const res = await fetch(`${api}/health`);
      const data = await res.json();
      if (res.ok && data?.ok) {
        API = api;
        if (!process.env.FRONTEND_BASE) FRONTEND = frontend;
        return;
      }
    } catch {
      // try next port
    }
  }
}

const results = [];
let passed = 0;
let failed = 0;

// Record a pass/fail result and print it
function record(ok, name, detail = '') {
  if (ok) {
    passed += 1;
    results.push(`PASS: ${name}`);
    console.log(`✓ PASS: ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    results.push(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`✗ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// HTTP helper with JSON body support
async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }
  return { status: res.status, data };
}

// Poll a collection run until it finishes or times out
async function waitForRun(runId, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await api('GET', `/runs/${runId}`);
    if (data?.status === 'done' || data?.status === 'error') return data;
    await Bun.sleep(2000);
  }
  return null;
}

// Poll until a job field is set
async function waitForJobField(jobId, field, timeoutMs = 300_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await api('GET', `/jobs/${jobId}`);
    const value = data?.job?.[field];
    if (value) return value;
    await Bun.sleep(3000);
  }
  return null;
}

// Resolve offer/CV path relative to REPO_ROOT
function repoFilePath(relativePath) {
  return resolve(import.meta.dir, '..', REPO_ROOT, relativePath);
}

async function test1_settings() {
  console.log('\n=== Test 1: Settings PUT/GET redaction ===');

  const before = await api('GET', '/settings');
  const put = await api('PUT', '/settings', {
    settings: {
      ...before.data.settings,
      llm_provider: 'openai',
      openai_api_key: 'sk-openai-secret-key-67890',
      openai_base_url: 'https://api.openai.com/v1',
      openai_model: 'gpt-4o-mini',
      openrouter_api_key: 'sk-or-test-secret-key-99999',
      openrouter_model: 'anthropic/claude-sonnet-4',
      openrouter_provider_order: 'anthropic, deepinfra',
      llm_tasks: {
        parse: { provider: 'openai', model: 'gpt-4o-mini' },
        cv: { provider: '', model: '' },
      },
      collectors: { manual: { enabled: true } },
    },
  });

  const putJson = JSON.stringify(put.data);
  record(
    put.status === 200
      && put.data?.settings?.openai_api_key_set === true
      && put.data?.settings?.openrouter_api_key_set === true
      && !putJson.includes('sk-openai-secret')
      && !putJson.includes('sk-or-test-secret'),
    'PUT redacts API keys',
    put.status !== 200 ? `HTTP ${put.status}` : '',
  );

  const get = await api('GET', '/settings');
  const getJson = JSON.stringify(get.data);
  record(
    get.data?.settings?.openai_api_key_set === true
      && get.data?.settings?.openrouter_api_key_set === true
      && !getJson.includes('sk-openai-secret')
      && !getJson.includes('sk-or-test-secret'),
    'GET redacts API keys',
  );
  record(
    get.data?.settings?.openai_base_url === 'https://api.openai.com/v1'
      && get.data?.settings?.openai_model === 'gpt-4o-mini',
    'Settings persist openai url/model',
  );
  record(
    get.data?.settings?.openrouter_model === 'anthropic/claude-sonnet-4'
      && get.data?.settings?.openrouter_provider_order === 'anthropic, deepinfra',
    'Settings persist openrouter model/provider order',
  );
  record(
    get.data?.settings?.llm_tasks?.parse?.provider === 'openai'
      && get.data?.settings?.llm_tasks?.parse?.model === 'gpt-4o-mini'
      && get.data?.settings?.llm_tasks?.cv?.provider === '',
    'Settings persist llm_tasks',
  );

  // Restore pre-test LLM config; replace fake keys with env (or clear via null)
  const restored = await api('GET', '/settings');
  await api('PUT', '/settings', {
    settings: {
      ...restored.data.settings,
      llm_provider: before.data.settings.llm_provider || 'openai',
      openai_api_key: process.env.OPENAI_API_KEY ?? null,
      openrouter_api_key: process.env.OPENROUTER_API_KEY ?? null,
      openai_base_url: before.data.settings.openai_base_url,
      openai_model: before.data.settings.openai_model,
      openrouter_model: before.data.settings.openrouter_model,
      openrouter_provider_order: before.data.settings.openrouter_provider_order,
      llm_tasks: {
        parse: { provider: '', model: '' },
        cv: { provider: '', model: '' },
        cover_letter: { provider: '', model: '' },
      },
      collectors: before.data.settings.collectors ?? { manual: { enabled: true } },
    },
  });
}

async function test2_manualCollect() {
  console.log('\n=== Test 2: Manual collect (text) ===');

  const collect = await api('POST', '/collect', {
    source: 'manual',
    config: {
      text: 'Senior Backend Engineer at E2ECorp GmbH\nLocation: Berlin, Germany\nSalary: €80,000\nFull-time. Required: Node.js, TypeScript, PostgreSQL.',
    },
  });

  const runId = collect.data?.runId;
  record(collect.status === 202 && runId, 'POST /collect returns runId', `runId=${runId}`);

  if (!runId) return { jobId: null };

  const run = await waitForRun(runId);
  record(run?.status === 'done', `Run ${runId} completes`, run?.error ?? `jobsNew=${run?.jobsNew}`);

  const jobs = await api('GET', '/jobs');
  const list = jobs.data?.jobs ?? [];
  record(list.length > 0, 'Job in DB', `count=${list.length}`);

  return { jobId: list.at(-1)?.id ?? null, runId };
}

async function test3_parse() {
  console.log('\n=== Test 3: POST /parse ===');

  const parse = await api('POST', '/parse', {
    text: 'Frontend Developer at WebAgency\nLocation: Munich, Germany\nRequired: React, CSS. Full-time.',
  });

  const offer = parse.data?.offer;
  record(
    offer?.title && offer?.company,
    'POST /parse returns valid StandardOffer',
    offer ? `${offer.title} @ ${offer.company}` : parse.data?.error,
  );

  return { offer, parseError: parse.data?.error };
}

async function test4_save(jobId, offer) {
  console.log('\n=== Test 4: POST /jobs/:id/save ===');
  if (!jobId) {
    record(false, 'POST /jobs/:id/save', 'No job id');
    return;
  }

  const save = await api('POST', `/jobs/${jobId}/save`, {
    offer,
    rawText: 'Frontend Developer at WebAgency\nLocation: Munich, Germany\nRequired: React, CSS. Full-time.',
  });

  const offerPath = save.data?.job?.offerMdPath;
  record(!!offerPath, 'Save returns offerMdPath', offerPath ?? save.data?.error);

  if (offerPath) {
    const full = repoFilePath(offerPath);
    const file = Bun.file(full);
    record(await file.exists(), 'Offer .md written to OFFERS_DIR', full);
  }
}

async function test5_cv(jobId) {
  console.log('\n=== Test 5: POST /jobs/:id/cv ===');
  if (!jobId) {
    record(false, 'POST /jobs/:id/cv', 'No job id');
    return;
  }

  const start = await api('POST', `/jobs/${jobId}/cv`);
  record(start.status === 202, 'POST /jobs/:id/cv returns 202');

  const cvPath = await waitForJobField(jobId, 'cvMdPath');
  record(!!cvPath, 'CV generation completes', cvPath ?? 'timeout');

  if (cvPath) {
    const cv = await api('GET', `/jobs/${jobId}/cv`);
    record(!!cv.data?.markdown, 'GET /jobs/:id/cv returns markdown', `length=${cv.data?.markdown?.length ?? 0}`);

    const full = repoFilePath(cvPath);
    record(await Bun.file(full).exists(), 'CV .md written to CV_OUTPUT_DIR', full);
  }
}

async function test6_status(jobId) {
  console.log('\n=== Test 6: PATCH /jobs/:id status ===');
  if (!jobId) {
    record(false, 'PATCH status', 'No job id');
    return;
  }

  const patch = await api('PATCH', `/jobs/${jobId}`, { status: 'applied' });
  record(patch.data?.job?.status === 'applied', 'PATCH status to applied');
}

async function test7_uiSmoke(jobId) {
  console.log('\n=== Test 7: UI smoke (frontend routes) ===');

  for (const route of ['/', '/jobs', '/settings']) {
    try {
      const res = await fetch(`${FRONTEND}${route}`);
      record(res.status === 200, `Frontend ${route} returns 200`, `HTTP ${res.status}`);
    } catch (err) {
      record(false, `Frontend ${route}`, err.message);
    }
  }

  if (jobId) {
    for (const route of [`/jobs/${jobId}`, `/jobs/${jobId}/cv`]) {
      try {
        const res = await fetch(`${FRONTEND}${route}`);
        record(res.status === 200, `Frontend ${route} returns 200`, `HTTP ${res.status}`);
      } catch (err) {
        record(false, `Frontend ${route}`, err.message);
      }
    }
  }
}

async function test8_dedup() {
  console.log('\n=== Test 8: Dedup same URL ===');

  const url = `https://example.com/jobs/dedup-e2e-${Date.now()}`;
  const payload = {
    source: 'manual',
    config: {
      text: `DevOps Engineer at DedupCo\nURL: ${url}\nLocation: Hamburg, Germany\nRequired: AWS.`,
      url,
    },
  };

  // Wait for the first run to finish before starting the second (avoid insert race)
  const first = await api('POST', '/collect', payload);
  const run1 = await waitForRun(first.data?.runId);
  const second = await api('POST', '/collect', payload);
  const run2 = await waitForRun(second.data?.runId);

  record(run1?.jobsNew >= 1, 'First collect inserts job', `jobsNew=${run1?.jobsNew}`);
  record(run2?.jobsNew === 0, 'Second collect with same URL has jobs_new=0', `jobsNew=${run2?.jobsNew}`);
}

async function test9_scrapers() {
  console.log('\n=== Test 9: LinkedIn/Indeed/GermanTechJobs run without crash ===');

  for (const source of ['linkedin', 'indeed', 'germantechjobs']) {
    const start = await api('POST', '/collect', {
      source,
      config: { query: 'software engineer', location: 'Berlin', maxResults: 1 },
    });

    const runId = start.data?.runId;
    record(start.status === 202 && runId, `${source} collect starts`, `runId=${runId}`);

    if (!runId) continue;

    const run = await waitForRun(runId, 360_000);
    record(
      run?.status === 'done' || run?.status === 'error',
      `${source} run completes without server crash`,
      `status=${run?.status ?? 'timeout'}${run?.error ? ` error=${run.error}` : ''}`,
    );
  }
}

async function main() {
  const fromTest = Number(process.env.TEST_FROM ?? 1);

  await resolveEndpoints();

  console.log('job-collector E2E test suite');
  console.log(`API: ${API}  Frontend: ${FRONTEND}  REPO_ROOT: ${REPO_ROOT}`);
  if (fromTest > 1) console.log(`(resuming from test ${fromTest})`);

  const health = await api('GET', '/health');
  if (!health.data?.ok) {
    console.error('Server not reachable. Start with: bun run dev:server  or  bun run stack:up');
    process.exit(1);
  }

  let jobId = Number(process.env.TEST_JOB_ID ?? 0) || null;
  let offer = null;

  if (fromTest <= 1) await test1_settings();
  if (fromTest <= 2) ({ jobId } = await test2_manualCollect());
  if (fromTest <= 3) ({ offer } = await test3_parse());
  if (fromTest <= 4) {
    if (!offer) ({ offer } = await test3_parse());
    if (!jobId) {
      const jobs = await api('GET', '/jobs');
      jobId = jobs.data?.jobs?.at(-1)?.id ?? null;
    }
    await test4_save(jobId, offer);
  }
  if (fromTest <= 5) {
    if (!jobId) {
      const jobs = await api('GET', '/jobs');
      jobId = jobs.data?.jobs?.at(-1)?.id ?? null;
    }
    await test5_cv(jobId);
  }
  if (fromTest <= 6) await test6_status(jobId ?? (await api('GET', '/jobs')).data?.jobs?.at(-1)?.id);
  if (fromTest <= 7) await test7_uiSmoke(jobId);
  if (fromTest <= 8) await test8_dedup();
  if (fromTest <= 9) await test9_scrapers();

  console.log('\n========================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('========================================');
  for (const line of results) console.log(line);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('E2E runner crashed:', err);
  process.exit(1);
});
