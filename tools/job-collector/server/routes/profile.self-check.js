// Self-check for profile API routes (HTTP smoke, mocked LLM)
// Run: cd tools/job-collector && bun run server/routes/profile.self-check.js
// Uses temp REPO_ROOT + PROFILE_AI_MOCK=1 — no live LLM or real profile data.
import { spawn } from 'child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const PACKAGE_DIR = resolve(import.meta.dir, '../..');
const PORT = 3098;
const HEALTH_TIMEOUT_MS = 15000;

const VALID_PROFILE = `# Test Profile

## 1. Personal Information

\`\`\`
Full Name:         Test User
Email:             test@example.com
Phone / WhatsApp:  +1 555 000 0000
Languages:         English (Fluent)
\`\`\`

## 2. Professional Summary

Backend engineer.
`;

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

async function main() {
  console.log('[self-check] profile API routes');

  const tempRoot = await mkdtemp(join(tmpdir(), 'profile-route-'));
  const profileRel = 'test-profile.md';
  await writeFile(join(tempRoot, profileRel), VALID_PROFILE, 'utf8');
  await mkdir(join(tempRoot, 'docs/agents'), { recursive: true });
  await writeFile(
    join(tempRoot, 'docs/agents/profile-editor.md'),
    '# Profile editor agent\nReturn full document only.\n',
    'utf8',
  );

  const server = spawn('bun', ['run', 'server/index.js'], {
    cwd: PACKAGE_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      REPO_ROOT: tempRoot,
      PROFILE_PATH: profileRel,
      AGENTS_DIR: join(tempRoot, 'docs/agents'),
      PROFILE_AI_MOCK: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stdout.write(`  [server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`  [server:err] ${d}`));

  try {
    const up = await waitForHealth();
    if (!up) {
      console.error('  FAIL  server did not become healthy within timeout');
      process.exit(1);
    }
    console.log(`  ok  server healthy on port ${PORT}`);

    const loaded = await fetchJson(`http://localhost:${PORT}/api/profile`);
    assert(loaded.status === 200, `GET profile returns 200 (got ${loaded.status})`);
    assert(typeof loaded.data?.markdown === 'string', 'GET returns markdown');
    assert(typeof loaded.data?.revision === 'string', 'GET returns revision');
    const baseRevision = loaded.data.revision;

    const edited = VALID_PROFILE.replace('Backend engineer.', 'Backend engineer (edited).');
    const saved = await fetchJson(`http://localhost:${PORT}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: edited, baseRevision }),
    });
    assert(saved.status === 200, `PUT profile returns 200 (got ${saved.status})`);
    assert(saved.data?.markdown === edited, 'PUT returns saved markdown');

    const onDisk = await readFile(join(tempRoot, profileRel), 'utf8');
    assert(onDisk === edited, 'PUT persists to disk');

    const badSave = await fetchJson(`http://localhost:${PORT}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: '# incomplete', baseRevision: saved.data.revision }),
    });
    assert(badSave.status === 422, `invalid PUT returns 422 (got ${badSave.status})`);
    assert(badSave.data?.code === 'PROFILE_INCOMPLETE', 'invalid PUT code PROFILE_INCOMPLETE');
    const stillEdited = await readFile(join(tempRoot, profileRel), 'utf8');
    assert(stillEdited === edited, 'invalid PUT does not mutate file');

    const preview = await fetchJson(`http://localhost:${PORT}/api/profile/ai-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Mention mocked update', baseRevision: saved.data.revision }),
    });
    assert(preview.status === 200, `AI preview returns 200 (got ${preview.status})`);
    assert(typeof preview.data?.proposal === 'string', 'AI preview returns proposal');
    assert(preview.data.proposal !== edited, 'AI preview returns a different proposal');
    const afterPreview = await readFile(join(tempRoot, profileRel), 'utf8');
    assert(afterPreview === edited, 'AI preview does not write profile file');

    const applied = await fetchJson(`http://localhost:${PORT}/api/profile/ai-apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposal: preview.data.proposal,
        baseRevision: preview.data.baseRevision,
      }),
    });
    assert(applied.status === 200, `AI apply returns 200 (got ${applied.status})`);
    assert(applied.data?.markdown === preview.data.proposal, 'AI apply returns applied markdown');
    const afterApply = await readFile(join(tempRoot, profileRel), 'utf8');
    assert(afterApply === preview.data.proposal, 'AI apply persists proposal');
  } finally {
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
