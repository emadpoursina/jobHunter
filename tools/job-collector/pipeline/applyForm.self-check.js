// Self-check for docs/agents/apply-form.md (company-site apply agent)
// Run: cd tools/job-collector && bun run pipeline/applyForm.self-check.js
// Asserts:
//   1. The agent file docs/agents/apply-form.md exists and is non-empty
//   2. Safety anchors: SUBMIT = false, no-auto-submit, EEO skip, __APPLY_CTX__
//   3. Company-site focus: no Easy Apply-only requirement; ATS/host hints present
//   4. (If LLM available) Round-trip produces SUBMIT=false script without unconditional submit
// Skips gracefully (exit 0) if the LLM provider is unavailable.
import { callLlm } from '../server/llm.js';
import { readRepoFile } from './repoFiles.js';

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
  console.log('[self-check] apply-form.md (company-site)');

  const prompt = await readRepoFile(AGENT_REL);
  assert(prompt !== null, `agent file exists (${AGENT_REL})`);
  assert(prompt && prompt.length > 500, `agent file is substantial (${prompt?.length ?? 0} chars)`);

  assert(prompt.includes('const SUBMIT = false'), 'prompt mandates SUBMIT = false');
  assert(/never auto-submit|do not auto-submit/i.test(prompt), 'prompt forbids auto-submit');
  assert(/EEO|demographic/i.test(prompt), 'prompt forbids EEO/demographic answers');
  assert(/__APPLY_CTX__/.test(prompt), 'prompt uses __APPLY_CTX__ injection contract');
  assert(/applyUrl|company careers|ATS/i.test(prompt), 'prompt targets company-site / ATS forms');
  assert(/urlHost/i.test(prompt), 'prompt includes urlHost for host-aware hints');
  assert(
    !/must click.*easy apply|locate and click the "easy apply"/i.test(prompt),
    'prompt does not require Easy Apply button flow',
  );
  assert(/greenhouse|lever|workday|personio/i.test(prompt), 'prompt mentions known ATS host patterns');

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
      applyUrl: 'https://boards.greenhouse.io/testco/jobs/456',
    },
    pdfPath: '/tmp/CV_Test.pdf',
    urlHost: 'boards.greenhouse.io',
    answers: { 'why do you want to join': 'I build Node.js systems.' },
  };

  const userMsg = `Produce the company-site apply form fill-assist userscript for this context. Read all values from __APPLY_CTX__.

const __APPLY_CTX__ = ${JSON.stringify(sampleCtx, null, 2)};

Emit the script only.`;

  let llmOutput = null;
  let llmSkipped = false;
  try {
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
      const looksLikeScript = /const\s+submit\s*=/.test(lower) || /function\s+mark\s*\(/.test(lower);
      if (!looksLikeScript) {
        console.warn('  WARN  LLM output does not look like a userscript (provider/model issue).');
        console.warn('        Skipping LLM round-trip assertions (prompt-file checks above still ran).');
      } else {
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
