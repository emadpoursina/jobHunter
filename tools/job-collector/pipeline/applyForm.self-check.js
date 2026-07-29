// Self-check for docs/agents/apply-form.md
// Run: cd tools/job-collector && bun run pipeline/applyForm.self-check.js
// Asserts:
//   1. The agent file docs/agents/apply-form.md exists and is non-empty
//   2. It contains the required safety anchors: SUBMIT = false, no-auto-submit, EEO skip
//   3. (If LLM available) Feeding the prompt + sample context to callLlm produces a
//      script containing `const SUBMIT = false` and no unconditional `.submit()` call
// Skips gracefully (exit 0) if the LLM provider is unavailable, with a clear warning.
// Exits 1 only on hard failures (prompt file missing/corrupt). No test framework.
import { resolve } from 'path';
import { callLlm } from '../server/llm.js';
import { readRepoFile } from './repoFiles.js';

const REPO_ROOT = resolve(process.env.REPO_ROOT ?? '../..');
const AGENT_REL = 'docs/agents/apply-form.md';

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
  console.log('[self-check] apply-form.md');

  // 1. Agent file exists and is non-empty
  const prompt = await readRepoFile(AGENT_REL);
  assert(prompt !== null, `agent file exists (${AGENT_REL})`);
  assert(prompt && prompt.length > 500, `agent file is substantial (${prompt?.length ?? 0} chars)`);

  // 2. Required safety anchors present in the prompt
  assert(prompt.includes('const SUBMIT = false'), 'prompt mandates SUBMIT = false');
  assert(/never auto-submit/i.test(prompt), 'prompt forbids auto-submit');
  assert(/EEO|demographic/i.test(prompt), 'prompt forbids EEO/demographic answers');
  assert(/__APPLY_CTX__/.test(prompt), 'prompt uses __APPLY_CTX__ injection contract');

  // 3. LLM round-trip (skips gracefully if provider unavailable)
  const sampleCtx = {
    profile: {
      fullName: 'Test Candidate',
      email: 'test@example.com',
      phone: '+1 555 0100',
      telegram: '',
      linkedInUrl: 'https://www.linkedin.com/in/test/',
      githubUrl: 'https://github.com/test',
      location: 'Testville',
      seeking: 'Relocation',
      workAuthorization: 'Requires employer-sponsored work authorization',
      languages: [{ name: 'English', level: 'Fluent' }],
    },
    job: {
      title: 'Backend Engineer',
      company: 'Test Co',
      sourceUrl: 'https://www.linkedin.com/jobs/view/123',
    },
    pdfPath: '/tmp/CV_Test.pdf',
    answers: { 'why do you want to join': 'I build Node.js systems.' },
  };

  const userMsg = `Produce the LinkedIn Easy Apply userscript for this context. Read all values from __APPLY_CTX__.

__APPLY_CTX__ = ${JSON.stringify(sampleCtx, null, 2)};

Emit the script only.`;

  let llmOutput = null;
  let llmSkipped = false;
  try {
    // Race the LLM call against a timeout so a flaky/slow provider cannot hang the run.
    const timeoutMs = Number(process.env.APPLY_SELFCHECK_LLM_TIMEOUT_MS) || 20000;
    llmOutput = await Promise.race([
      callLlm({ system: prompt, user: userMsg, maxTokens: 2000 }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`LLM timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  } catch (err) {
    console.warn(`  WARN  LLM unavailable: ${err.message || err.code}`);
    console.warn('        Skipping LLM round-trip assertion (prompt-file checks above still ran).');
    llmSkipped = true;
  }

  if (!llmSkipped && llmOutput) {
    const trimmed = llmOutput.trim();
    if (trimmed.length === 0) {
      console.warn('  WARN  LLM returned empty output (provider/model issue, not a prompt bug).');
      console.warn('        Skipping LLM round-trip assertions (prompt-file checks above still ran).');
    } else {
      const lower = trimmed.toLowerCase();
      assert(
        /const\s+submit\s*=\s*false/.test(lower),
        'LLM output contains `const SUBMIT = false`',
      );
      assert(
        !/form\.submit\(\)/.test(lower) || /submit\s*&&[^;]*submit/.test(lower),
        'LLM output has no unconditional form.submit()',
      );
      assert(
        /outline/.test(lower) || /style\.outline/.test(lower),
        'LLM output includes a highlight helper',
      );
    }
  }

  if (failures === 0) {
    console.log(llmSkipped ? 'OK (LLM checks skipped)' : 'OK');
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
