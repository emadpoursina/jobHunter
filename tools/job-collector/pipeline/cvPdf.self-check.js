// Self-check for pipeline/cvPdf.js
// Run: REPO_ROOT=/path/to/jobHunter bun run pipeline/cvPdf.self-check.js
// Asserts:
//   1. cvToPdf converts an existing CV_*.md to a non-empty PDF
//   2. Calling cvToPdf again on the same source reuses the existing PDF (no re-convert)
// Exits 0 on success, 1 on failure. No test framework.
import { readdir, stat, unlink } from 'fs/promises';
import { resolve } from 'path';
import { cvToPdf, pdfPathFor } from './cvPdf.js';

const REPO_ROOT = resolve(process.env.REPO_ROOT ?? '../..');
const GENERATED_DIR = process.env.CV_OUTPUT_DIR ?? 'phase2/documents/generated';

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    console.error(`  FAIL  ${msg}`);
    failures += 1;
  }
}

async function main() {
  console.log('[self-check] cvPdf.js');

  const dirAbs = resolve(REPO_ROOT, GENERATED_DIR);
  const entries = await readdir(dirAbs).catch(() => []);
  const mdFiles = entries.filter((f) => f.endsWith('.md'));
  if (mdFiles.length === 0) {
    console.error(`  FAIL  no CV_*.md found in ${dirAbs}`);
    process.exit(1);
  }

  const mdFile = mdFiles[0];
  const mdRel = `${GENERATED_DIR}/${mdFile}`;
  const pdfAbs = pdfPathFor(resolve(REPO_ROOT, mdRel));

  // Force fresh conversion: delete any existing PDF
  try {
    await unlink(pdfAbs);
  } catch {
    // PDF may not exist — fine
  }

  // 1. Fresh conversion produces a non-empty PDF
  let producedPath;
  try {
    producedPath = await cvToPdf(mdRel);
  } catch (err) {
    console.error('  FAIL  cvToPdf threw:', err.message);
    process.exit(1);
  }
  assert(producedPath === pdfAbs, `returned path matches expected (${pdfAbs})`);
  let pdfStat = await stat(pdfAbs).catch(() => null);
  assert(pdfStat && pdfStat.size > 1000, `PDF created and non-empty (${pdfStat?.size ?? 0} bytes)`);

  // 2. Second call reuses (mtime unchanged)
  const firstMtime = pdfStat.mtimeMs;
  // Small delay to ensure a re-convert would produce a different mtime
  await new Promise((r) => setTimeout(r, 50));
  let reusedPath;
  try {
    reusedPath = await cvToPdf(mdRel);
  } catch (err) {
    console.error('  FAIL  second cvToPdf threw:', err.message);
    process.exit(1);
  }
  const pdfStat2 = await stat(pdfAbs).catch(() => null);
  assert(
    pdfStat2 && pdfStat2.mtimeMs === firstMtime,
    'second call reuses existing PDF (mtime unchanged)',
  );

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
