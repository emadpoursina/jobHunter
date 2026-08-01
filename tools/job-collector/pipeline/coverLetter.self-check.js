// Self-check for pipeline/coverLetter.js and writeCoverLetterMd
// Run: bun run pipeline/coverLetter.self-check.js
// Asserts:
//   1. writeCoverLetterMd writes non-empty markdown to a predictable path
//   2. readRepoFile round-trips the written content
//   3. writeCoverLetterMd refuses empty input
//   4. sanitizeCoverLetterOutput strips trailing Notes:/rationale blocks
// Exits 0 on success, 1 on failure. No test framework.
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

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
  console.log('[self-check] coverLetter pipeline');

  const prevRepoRoot = process.env.REPO_ROOT;
  const tempRoot = await mkdtemp(join(tmpdir(), 'cover-letter-selfcheck-'));
  process.env.REPO_ROOT = tempRoot;

  const { readRepoFile, writeCoverLetterMd } = await import('./repoFiles.js');
  const { sanitizeCoverLetterOutput } = await import('./coverLetter.js');

  try {
    const job = {
      company: 'Acme GmbH',
      title: 'Senior Backend Engineer',
    };
    const sample = 'Amsterdam, July 30, 2026\n\nDear Hiring Team at Acme GmbH,\n\nSample letter body.\n';

    const relativePath = await writeCoverLetterMd(job, sample);
    assert(
      relativePath.includes('CoverLetter_') && relativePath.endsWith('.md'),
      `path looks like cover letter file (${relativePath})`,
    );
    assert(
      relativePath.includes('AcmeGmbH') && relativePath.includes('SeniorBackendEngineer'),
      'filename includes company and title slugs',
    );

    const readBack = await readRepoFile(relativePath);
    assert(readBack === sample, 'readRepoFile round-trips written markdown');

    let refusedEmpty = false;
    try {
      await writeCoverLetterMd(job, '   ');
    } catch (err) {
      refusedEmpty = err.code === 'LLM_ERROR';
    }
    assert(refusedEmpty, 'writeCoverLetterMd refuses empty input');

    const withNotes = `Amsterdam, Aug 1, 2026

Dear Hiring Team,

Body paragraph.

Best regards,
Emad Poursina

Notes: Based on the 50% match score, the letter emphasizes Docker.`;
    const cleaned = sanitizeCoverLetterOutput(withNotes);
    assert(!/Notes:/i.test(cleaned), 'sanitizeCoverLetterOutput removes trailing Notes block');
    assert(cleaned.includes('Dear Hiring Team'), 'sanitizeCoverLetterOutput keeps letter body');
  } finally {
    process.env.REPO_ROOT = prevRepoRoot;
    await rm(tempRoot, { recursive: true, force: true });
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
