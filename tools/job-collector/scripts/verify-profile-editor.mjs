#!/usr/bin/env bun
// Profile editor verification orchestrator
// Run: cd tools/job-collector && bun run scripts/verify-profile-editor.mjs
// Runs automated checks with temp fixtures; records manual UI steps separately.
import { spawn } from 'child_process';
import { readFile, readdir } from 'fs/promises';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');

const AUTOMATED = [
  { name: 'profile parse/cache', cmd: ['bun', 'run', 'pipeline/profile.self-check.js'], env: { REPO_ROOT: resolve(ROOT, '../..') } },
  { name: 'profile API helpers', cmd: ['bun', 'run', 'pipeline/profileApi.self-check.js'] },
  { name: 'profile AI preview/apply', cmd: ['bun', 'run', 'pipeline/profileAiUpdate.self-check.js'] },
  { name: 'profile diff helper', cmd: ['bun', 'run', 'frontend/src/profileDiff.self-check.js'] },
  { name: 'settings profile_update task', cmd: ['bun', 'run', 'server/routes/settings.profile-task.self-check.js'] },
  { name: 'profile API routes smoke', cmd: ['bun', 'run', 'server/routes/profile.self-check.js'] },
];

const MANUAL = [
  'Open http://localhost:5173/profile (or built app /profile) after `bun run dev`.',
  'Confirm editor + preview render; edit and Save persists after reload.',
  'Run AI preview with a real provider configured; review diff; Apply updates editor.',
  'Confirm unsaved-changes banner and leave-page confirm when navigating away.',
];

const results = [];

function runStep(name, cmd, extraEnv = {}) {
  return new Promise((resolvePromise) => {
    if (DRY_RUN) {
      console.log(`[dry-run] would run: ${cmd.join(' ')}`);
      results.push({ name, status: 'skipped' });
      resolvePromise(0);
      return;
    }

    const child = spawn(cmd[0], cmd.slice(1), {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      results.push({ name, status: code === 0 ? 'pass' : 'fail', code });
      resolvePromise(code ?? 1);
    });
  });
}

async function verifyBuild() {
  const name = 'frontend production build';
  if (DRY_RUN) {
    console.log('[dry-run] would run: bun run build');
    results.push({ name, status: 'skipped' });
    return 0;
  }

  const code = await runStep(name, ['bun', 'run', 'build']);
  if (code !== 0) return code;

  const distAssets = join(ROOT, 'frontend/dist/assets');
  const files = await readdir(distAssets);
  const jsFile = files.find((f) => f.endsWith('.js'));
  if (!jsFile) {
    console.error('  FAIL  no JS bundle in frontend/dist/assets');
    results.push({ name: 'profile route in build', status: 'fail' });
    return 1;
  }

  const bundle = await readFile(join(distAssets, jsFile), 'utf8');
  const hasRoute = bundle.includes('/profile') && bundle.includes('Profile');
  if (!hasRoute) {
    console.error('  FAIL  production bundle missing /profile route');
    results.push({ name: 'profile route in build', status: 'fail' });
    return 1;
  }

  console.log('  ok  production bundle includes Profile route');
  results.push({ name: 'profile route in build', status: 'pass' });
  return 0;
}

async function main() {
  console.log('=== Profile editor verification ===\n');
  console.log('Automated checks:\n');

  let failed = 0;
  for (const step of AUTOMATED) {
    console.log(`--- ${step.name} ---`);
    const code = await runStep(step.name, step.cmd, step.env ?? {});
    if (code !== 0) failed += 1;
    console.log('');
  }

  console.log('--- frontend production build ---');
  const buildCode = await verifyBuild();
  if (buildCode !== 0) failed += 1;
  console.log('');

  console.log('=== Automated summary ===');
  for (const row of results) {
    console.log(`  [${row.status.toUpperCase()}] ${row.name}`);
  }

  console.log('\n=== Manual UI checks (not run automatically) ===');
  for (const line of MANUAL) {
    console.log(`  - ${line}`);
  }

  if (failed > 0) {
    console.error(`\n${failed} automated step(s) failed`);
    process.exit(1);
  }

  console.log('\nAll automated profile editor checks passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('verify-profile-editor crashed:', err);
  process.exit(1);
});
