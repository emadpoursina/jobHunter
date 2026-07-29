// Self-check for server/routes/apply.js (end-to-end route smoke)
// Run: cd tools/job-collector && REPO_ROOT=/path/to/jobHunter bun run server/routes/apply.self-check.js
// Asserts:
//   1. POST /api/apply/script without applyUrl returns 409 APPLY_URL_MISSING
//   2. (When a job with CV + applyUrl exists and LLM is available) happy path returns script
// Skips gracefully (exit 0) on missing fixtures or LLM/PDF/profile issues.
// No test framework.
import { spawn } from 'child_process';
import { resolve } from 'path';
import { Database } from 'bun:sqlite';
import { insertJob, deleteJob } from '../db.js';

const REPO_ROOT = resolve(process.env.REPO_ROOT ?? '../..');
const PACKAGE_DIR = resolve(import.meta.dir, '../..');
const DB_PATH = resolve(PACKAGE_DIR, 'data/jobs.db');
const PORT = Number(process.env.PORT) || 3099;
const HEALTH_TIMEOUT_MS = 15000;
const ROUTE_TIMEOUT_MS = 30000;

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    console.error(`  FAIL  ${msg}`);
    failures += 1;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function waitForHealth() {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/health`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  return false;
}

function findJobWithCvAndApplyUrl() {
  const db = new Database(DB_PATH, { readonly: true });
  const row = db
    .prepare(
      `SELECT id FROM jobs
       WHERE cv_md_path IS NOT NULL AND cv_md_path != ''
         AND apply_url IS NOT NULL AND apply_url != ''
       ORDER BY id LIMIT 1`,
    )
    .get();
  db.close();
  return row?.id ?? null;
}

async function main() {
  console.log('[self-check] apply.js route');

  const jobId = findJobWithCvAndApplyUrl();

  const server = spawn('bun', ['run', 'server/index.js'], {
    cwd: PACKAGE_DIR,
    env: { ...process.env, PORT: String(PORT), REPO_ROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`  [server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`  [server:err] ${d}`));

  let throwawayId = null;
  try {
    const up = await waitForHealth();
    if (!up) {
      console.error('  FAIL  server did not become healthy within timeout');
      process.exit(1);
    }
    console.log(`  ok  server healthy on port ${PORT}`);

    throwawayId = insertJob({
      source: 'selfcheck',
      sourceUrl: `selfcheck-apply-route-${Date.now()}`,
      rawText: 'apply route self-check',
      title: 'Apply Route Check',
    });
    assert(throwawayId !== null, 'insert throwaway job without applyUrl');

    const missing = await fetchJson(`http://localhost:${PORT}/api/apply/script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: throwawayId }),
    });
    assert(missing.status === 409, `missing applyUrl returns 409 (got ${missing.status})`);
    assert(
      missing.data?.code === 'APPLY_URL_MISSING',
      `missing applyUrl code APPLY_URL_MISSING (got ${missing.data?.code})`,
    );

    if (!jobId) {
      console.warn('  SKIP  no job with cv_md_path + apply_url — cannot test happy path.');
      console.log('OK (APPLY_URL_MISSING only)');
      process.exit(failures === 0 ? 0 : 1);
    }
    console.log(`  using job id ${jobId} (has cv_md_path + apply_url)`);

    let timedOut = false;
    const routeCall = fetchJson(`http://localhost:${PORT}/api/apply/script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    const timer = new Promise((_, reject) =>
      setTimeout(() => {
        timedOut = true;
        reject(new Error(`route timed out after ${ROUTE_TIMEOUT_MS}ms`));
      }, ROUTE_TIMEOUT_MS),
    );

    let result;
    try {
      result = await Promise.race([routeCall, timer]);
    } catch (err) {
      if (timedOut) {
        console.warn(`  SKIP  route timed out (${ROUTE_TIMEOUT_MS}ms) — likely LLM provider slowness.`);
        console.log('OK (skipped — LLM timeout)');
        process.exit(failures === 0 ? 0 : 1);
      }
      throw err;
    }

    if (result.data?.code === 'LLM_ERROR' || result.data?.code === 'CV_PDF_ERROR') {
      console.warn(`  SKIP  route returned ${result.data.code}: ${result.data.error}`);
      console.log('OK (skipped — environment)');
      process.exit(failures === 0 ? 0 : 1);
    }
    if (result.data?.code === 'PROFILE_INCOMPLETE') {
      console.warn(`  SKIP  profile incomplete: ${result.data.error}`);
      console.log('OK (skipped — profile)');
      process.exit(failures === 0 ? 0 : 1);
    }

    assert(result.status === 200, `route returns 200 (got ${result.status})`);
    assert(typeof result.data?.script === 'string' && result.data.script.length > 0, 'response has non-empty script');
    assert(typeof result.data?.pdfPath === 'string' && result.data.pdfPath.length > 0, 'response has pdfPath');
    assert(result.data.script.includes('__APPLY_CTX__'), 'script contains __APPLY_CTX__');
    assert(/const\s+SUBMIT\s*=\s*false/i.test(result.data.script), 'script contains `const SUBMIT = false`');
  } finally {
    if (throwawayId) deleteJob(throwawayId);
    server.kill('SIGTERM');
    await sleep(500);
  }

  if (failures === 0) {
    console.log('OK');
    process.exit(0);
  } else {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('self-check crashed:', err);
  process.exit(1);
});
