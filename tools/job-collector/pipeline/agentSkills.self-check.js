// Self-check for pipeline/agentSkills.js
// Run: cd tools/job-collector && bun run pipeline/agentSkills.self-check.js
// Uses temporary agent and skill files; it never touches docs/agents/.
// Exits 0 on success, 1 on failure. No test framework.
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

let failures = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ok  ${message}`);
  } else {
    console.error(`  FAIL  ${message}`);
    failures += 1;
  }
}

async function main() {
  console.log('[self-check] agent skill loader');

  const tempRoot = await mkdtemp(join(tmpdir(), 'agent-skills-'));
  const previousRepoRoot = process.env.REPO_ROOT;
  const previousAgentsDir = process.env.AGENTS_DIR;
  const previousProfilePath = process.env.PROFILE_PATH;
  const agentsDir = join(tempRoot, 'custom-agents');

  process.env.REPO_ROOT = tempRoot;
  process.env.AGENTS_DIR = 'custom-agents';
  process.env.PROFILE_PATH = 'phase2/profile/master-profile.md';

  try {
    await mkdir(join(agentsDir, 'skills/first'), { recursive: true });
    await mkdir(join(agentsDir, 'skills/second'), { recursive: true });
    await mkdir(join(agentsDir, 'skills/pipeline-check'), { recursive: true });
    await mkdir(join(tempRoot, 'phase2/profile'), { recursive: true });
    await writeFile(
      join(tempRoot, 'agent.md'),
      `---
skills:
  - first
  - missing-skill
  - second
---
Agent body.
`,
      'utf8',
    );
    await writeFile(
      join(agentsDir, 'skills/first/SKILL.md'),
      `---
name: first
description: First test skill
---
First skill body.
`,
      'utf8',
    );
    await writeFile(join(agentsDir, 'skills/second/SKILL.md'), 'Second skill body.\n', 'utf8');
    await writeFile(
      join(agentsDir, 'cv-generator.md'),
      `---
skills: [pipeline-check]
---
CV agent body.
`,
      'utf8',
    );
    await writeFile(
      join(agentsDir, 'skills/pipeline-check/SKILL.md'),
      `---
name: pipeline-check
description: Pipeline test skill
---
Pipeline skill body.
`,
      'utf8',
    );
    await writeFile(
      join(tempRoot, 'phase2/profile/master-profile.md'),
      '# Test Profile\n\nVerified backend experience.\n',
      'utf8',
    );

    const { loadAgentPrompt, parseAgentPrompt } = await import('./agentSkills.js');
    const { generateCv } = await import('./cv.js');

    const inline = parseAgentPrompt('---\nskills: [alpha, beta]\n---\nBody');
    assert(inline.body === 'Body', 'strips frontmatter from inline-list agent');
    assert(
      inline.skills.join(',') === 'alpha,beta',
      'parses inline skills in declared order',
    );

    const malformed = parseAgentPrompt('---\nskills: alpha\n---\nBody');
    assert(malformed.skills.length === 0, 'rejects non-list skills frontmatter');

    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(String(message));
    let prompt;
    try {
      prompt = await loadAgentPrompt('agent.md');
    } finally {
      console.warn = originalWarn;
    }

    assert(prompt.includes('Agent body.'), 'keeps agent body in composed prompt');
    assert(prompt.includes('First skill body.'), 'loads the first declared skill');
    assert(prompt.includes('Second skill body.'), 'continues after a missing skill');
    assert(
      prompt.indexOf('First skill body.') < prompt.indexOf('Second skill body.'),
      'preserves declared skill order',
    );
    assert(
      warnings.some((message) => message.includes('missing-skill')),
      'warns with the missing skill name',
    );

    assert((await loadAgentPrompt('missing-agent.md')) === null, 'missing agent returns null');

    const noSkills = parseAgentPrompt('Legacy body without frontmatter.\n');
    assert(
      noSkills.body === 'Legacy body without frontmatter.' && noSkills.skills.length === 0,
      'leaves a legacy agent without frontmatter unchanged',
    );

    let capturedSystem = '';
    const mockLlm = async ({ system }) => {
      capturedSystem = system;
      return '# Generated CV';
    };
    const generatedCv = await generateCv(
      { title: 'Backend Engineer', company: 'Test Company' },
      { llmCall: mockLlm },
    );
    assert(generatedCv === '# Generated CV', 'CV pipeline returns the injected LLM output');
    assert(capturedSystem.includes('CV agent body.'), 'CV pipeline passes the agent body to LLM');
    assert(
      capturedSystem.includes('Pipeline skill body.'),
      'CV pipeline passes the declared skill body to LLM',
    );
  } finally {
    if (previousRepoRoot === undefined) delete process.env.REPO_ROOT;
    else process.env.REPO_ROOT = previousRepoRoot;
    if (previousAgentsDir === undefined) delete process.env.AGENTS_DIR;
    else process.env.AGENTS_DIR = previousAgentsDir;
    if (previousProfilePath === undefined) delete process.env.PROFILE_PATH;
    else process.env.PROFILE_PATH = previousProfilePath;
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

main().catch((error) => {
  console.error('self-check crashed:', error);
  process.exit(1);
});
