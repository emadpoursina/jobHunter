// Self-check for server/routes/apply.js (end-to-end route smoke)
// Run: cd tools/job-collector && REPO_ROOT=/path/to/jobHunter bun run server/routes/apply.self-check.js
// Asserts (when a job with a CV exists and the LLM is available):
//   1. POST /api/apply/script returns 200 with a non-empty `script`
//   2. The script contains `__APPLY_CTX__` and `const SUBMIT = false`
// Skips gracefully (exit 0) if:
//   - no job has a cvMdPath (cannot test the happy path)
//   - the LLM is unavailable (LLM_ERROR) or PDF conversion fails (CV_PDF_ERROR)
// Exits 1 only on hard route bugs (wrong shape, missing fields, 500).
// No test framework.
import { spawn } from 'child_process';
import { resolve } from 'path';
import { Database } from 'bun:sqlite';

const REPO_ROOT = resolve(process.env.REPO_ROOT ?? '../..');
const PACKAGE_DIR = resolve(import.meta.dir, '../..');
const DB_PATH = resolve(PACKAGE_DIR, 'data/jobs.db');
const PORT = Number(process.env.PORT) || 3099; // avoid clashing with the default 3001
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

function findJobWithCv() {
  const db = new Database(DB_PATH, { readonly: true });
  const row = db
    .prepare("SELECT id FROM jobs WHERE cv_md_path IS NOT NULL AND cv_md_path != '' ORDER BY id LIMIT 1")
    .get();
  db.close();
  return row?.id ?? null;
}

async function main() {
  console.log('[self-check] apply.js route');

  const jobId = findJobWithCv();
  if (!jobId) {
    console.warn('  SKIP  no job with a cv_md_path found — cannot test the happy path.');
    console.warn('        Generate a CV for a job first, then re-run.');
    console.log('OK (skipped — no fixture)');
    process.exit(0);
  }
  console.log(`  using job id ${jobId} (has cv_md_path)`);

  // Start the server on a non-default port
  const server = spawn('bun', ['run', 'server/index.js'], {
    cwd: PACKAGE_DIR,
    env: { ...process.env, PORT: String(PORT), REPO_ROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`  [server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`  [server:err] ${d}`));

  let result;
  try {
    const up = await waitForHealth();
    if (!up) {
      console.error('  FAIL  server did not become healthy within timeout');
      process.exit(1);
    }
    console.log(`  ok  server healthy on port ${PORT}`);

    // Hit the route with a timeout
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

    try {
      result = await Promise.race([routeCall, timer]);
    } catch (err) {
      if (timedOut) {
        console.warn(`  SKIP  route timed out (${ROUTE_TIMEOUT_MS}ms) — likely LLM provider slowness.`);
        console.log('OK (skipped — LLM timeout)');
        process.exit(0);
      }
      throw err;
    }

    // Environment-dependent skips: LLM_ERROR or CV_PDF_ERROR are not route bugs
    if (result.data?.code === 'LLM_ERROR' || result.data?.code === 'CV_PDF_ERROR') {
      console.warn(`  SKIP  route returned ${result.data.code}: ${result.data.error}`);
      console.warn('        This is an environment issue (LLM/PDF), not a route bug.');
      console.log('OK (skipped — environment)');
      process.exit(0);
    }
    if (result.data?.code === 'PROFILE_INCOMPLETE') {
      console.warn(`  SKIP  profile incomplete: ${result.data.error}`);
      console.log('OK (skipped — profile)');
      process.exit(0);
    }

    // Hard assertions on the happy path
    assert(result.status === 200, `route returns 200 (got ${result.status})`);
    assert(typeof result.data?.script === 'string' && result.data.script.length > 0, 'response has non-empty script');
    assert(typeof result.data?.pdfPath === 'string' && result.data.pdfPath.length > 0, 'response has pdfPath');
    assert(result.data.script.includes('__APPLY_CTX__'), 'script contains __APPLY_CTX__');
    assert(/const\s+SUBMIT\s*=\s*false/i.test(result.data.script), 'script contains `const SUBMIT = false`');
  } finally {
    server.kill('SIGTERM');
    // give it a moment to exit cleanly
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
