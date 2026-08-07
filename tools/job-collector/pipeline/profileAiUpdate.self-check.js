// Self-check for profile AI preview/apply (pipeline/profileEditor.js)
// Run: cd tools/job-collector && bun run pipeline/profileAiUpdate.self-check.js
// Uses temp REPO_ROOT + mocked LLM — does not call a real provider.
// Asserts:
//   1. preview returns a proposal without modifying the profile file
//   2. invalid LLM output is rejected
//   3. apply persists approved proposal with matching baseRevision
//   4. stale baseRevision cannot overwrite a newer manual edit
// Exits 0 on success, 1 on failure. No test framework.
import { mkdtemp, mkdir, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

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

const PROPOSED_PROFILE = VALID_PROFILE.replace(
  'Backend engineer.',
  'Backend engineer with Node.js focus.',
);

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    console.error(`  FAIL  ${msg}`);
    failures += 1;
  }
}

async function expectThrows(fn, code, msg) {
  try {
    await fn();
    console.error(`  FAIL  ${msg} (expected throw)`);
    failures += 1;
    return false;
  } catch (err) {
    assert(err.code === code, `${msg} throws ${code} (got ${err.code})`);
    return true;
  }
}

async function main() {
  console.log('[self-check] profile AI preview/apply');

  const tempRoot = await mkdtemp(join(tmpdir(), 'profile-ai-'));
  const profileRel = 'test-profile.md';
  process.env.REPO_ROOT = tempRoot;
  process.env.PROFILE_PATH = profileRel;
  process.env.AGENTS_DIR = join(tempRoot, 'docs/agents');

  await writeFile(join(tempRoot, profileRel), VALID_PROFILE, 'utf8');
  await mkdir(join(tempRoot, 'docs/agents'), { recursive: true });
  await writeFile(
    join(tempRoot, 'docs/agents/profile-editor.md'),
    '# Profile editor agent\nReturn full document only.\n',
    'utf8',
  );

  const { hashProfileRevision } = await import('./profile.js');
  const { previewProfileUpdate, applyProfileProposal, sanitizeProfileProposal } = await import(
    './profileEditor.js',
  );

  const baseRevision = hashProfileRevision(VALID_PROFILE);
  const mockLlm = async () => PROPOSED_PROFILE;

  const preview = await previewProfileUpdate({
    prompt: 'Mention Node.js in the summary.',
    baseRevision,
    llmCall: mockLlm,
  });
  assert(preview.proposal.includes('Node.js'), 'preview returns proposed content');
  assert(preview.baseRevision === baseRevision, 'preview echoes source baseRevision');

  const onDiskAfterPreview = await readFile(join(tempRoot, profileRel), 'utf8');
  assert(onDiskAfterPreview === VALID_PROFILE, 'preview does not write profile file');

  await expectThrows(
    () =>
      previewProfileUpdate({
        prompt: 'Update summary',
        baseRevision: 'deadbeef',
        llmCall: mockLlm,
      }),
    'PROFILE_REVISION_CONFLICT',
    'preview rejects stale baseRevision',
  );

  const badLlm = async () => '# Incomplete profile\n\nNo personal block.';
  await expectThrows(
    () =>
      previewProfileUpdate({
        prompt: 'Break things',
        baseRevision,
        llmCall: badLlm,
      }),
    'PROFILE_INCOMPLETE',
    'invalid LLM output rejected on preview',
  );

  const applied = await applyProfileProposal({
    proposal: preview.proposal,
    baseRevision,
  });
  assert(applied.markdown === preview.proposal, 'apply persists approved proposal');
  assert(applied.revision === hashProfileRevision(preview.proposal), 'apply returns new revision');

  const onDiskAfterApply = await readFile(join(tempRoot, profileRel), 'utf8');
  assert(onDiskAfterApply === preview.proposal, 'apply writes profile file');

  await writeFile(join(tempRoot, profileRel), VALID_PROFILE, 'utf8');
  const staleRevision = hashProfileRevision(preview.proposal);

  await expectThrows(
    () =>
      applyProfileProposal({
        proposal: VALID_PROFILE,
        baseRevision: staleRevision,
      }),
    'PROFILE_REVISION_CONFLICT',
    'stale proposal cannot overwrite newer manual edit',
  );

  const stillOriginal = await readFile(join(tempRoot, profileRel), 'utf8');
  assert(stillOriginal === VALID_PROFILE, 'stale apply leaves file unchanged');

  const fenced = sanitizeProfileProposal(`\`\`\`markdown\n${preview.proposal}\n\`\`\``);
  assert(fenced === preview.proposal, 'sanitizeProfileProposal strips code fences');

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
