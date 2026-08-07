// Self-check for profile read/save API helpers (pipeline/profile.js)
// Run: cd tools/job-collector && bun run pipeline/profileApi.self-check.js
// Uses a temp REPO_ROOT + PROFILE_PATH — does not touch the real master profile.
// Asserts:
//   1. getProfileMarkdown reads seeded content
//   2. saveProfileMarkdown persists valid updates
//   3. blank / malformed saves throw without modifying the file
//   4. successful save clears parsed_profile cache keys
// Exits 0 on success, 1 on failure. No test framework.
import { mkdtemp, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { getSetting, setSetting } from '../server/db.js';

const VALID_PROFILE = `# Test Profile

## 1. Personal Information

\`\`\`
Full Name:         Test User
Email:             test@example.com
Phone / WhatsApp:  +1 555 000 0000
Languages:         English (Fluent)
\`\`\`
`;

const UPDATED_PROFILE = VALID_PROFILE.replace('Test User', 'Updated User');

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
  console.log('[self-check] profile API helpers');

  const tempRoot = await mkdtemp(join(tmpdir(), 'profile-api-'));
  const profileRel = 'test-profile.md';
  process.env.REPO_ROOT = tempRoot;
  process.env.PROFILE_PATH = profileRel;

  const { getProfileMarkdown, saveProfileMarkdown, hashProfileRevision } = await import('./profile.js');

  await writeFile(join(tempRoot, profileRel), VALID_PROFILE, 'utf8');

  const readBack = await getProfileMarkdown();
  assert(readBack === VALID_PROFILE, 'getProfileMarkdown returns seeded content');

  const saved = await saveProfileMarkdown(UPDATED_PROFILE);
  assert(saved.markdown === UPDATED_PROFILE, 'saveProfileMarkdown returns saved content');
  assert(saved.revision === hashProfileRevision(UPDATED_PROFILE), 'saveProfileMarkdown returns revision');
  const onDisk = await readFile(join(tempRoot, profileRel), 'utf8');
  assert(onDisk === UPDATED_PROFILE, 'saveProfileMarkdown writes to disk');

  await expectThrows(
    () => saveProfileMarkdown('   '),
    'VALIDATION_ERROR',
    'blank content rejected',
  );
  assert(onDisk === UPDATED_PROFILE, 'blank save does not modify file');

  await expectThrows(
    () => saveProfileMarkdown('# No personal block\n\nNothing here.'),
    'PROFILE_INCOMPLETE',
    'malformed profile rejected',
  );
  const stillUpdated = await readFile(join(tempRoot, profileRel), 'utf8');
  assert(stillUpdated === UPDATED_PROFILE, 'malformed save does not modify file');

  setSetting('parsed_profile', { email: 'cached@example.com', fullName: 'Cached', phone: '1' });
  setSetting('parsed_profile_mtime', 999);
  await saveProfileMarkdown(UPDATED_PROFILE.replace('Updated User', 'Cache Bust User'));
  assert(getSetting('parsed_profile') === null, 'parsed_profile cache cleared after save');
  assert(getSetting('parsed_profile_mtime') === null, 'parsed_profile_mtime cache cleared after save');

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
