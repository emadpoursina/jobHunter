import { callLlm, resolveTaskLlm } from '../server/llm.js';
import { readRepoFile } from './repoFiles.js';

const COVER_LETTER_MAX_TOKENS = 2000;

const AGENTS_DIR = process.env.AGENTS_DIR ?? 'docs/agents';
const PROFILE_PATH = process.env.PROFILE_PATH ?? 'phase2/profile/master-profile.md';

const DEFAULT_COVER_LETTER_PROMPT = `Write a tailored, ready-to-send cover letter in Markdown.
- Use only facts from the candidate profile; never fabricate experience or skills
- Professional but warm tone; avoid hollow openers and buzzword stacking
- State only "requires employer-sponsored work authorization"; do not name a visa program
- Output the finished letter only, with no preamble, notes, or code fences`;

async function buildSystemPrompt() {
  const agentPath = `${AGENTS_DIR}/cover-letter-generator.md`;
  const agentPrompt = await readRepoFile(agentPath);

  if (!agentPrompt) {
    console.warn(`[WARN] [coverLetter] Agent file not found at ${agentPath}, using default prompt`);
    return DEFAULT_COVER_LETTER_PROMPT;
  }

  return agentPrompt.trim();
}

function formatList(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      return value;
    }
  }
  return '';
}

async function buildUserMessage(job) {
  const profile = await readRepoFile(PROFILE_PATH);

  if (!profile) {
    const err = new Error(
      `Master profile not found at ${PROFILE_PATH}. Please create this file.`,
    );
    err.code = 'LLM_ERROR';
    throw err;
  }

  const requiredSkills = formatList(job.requiredSkills ?? job.required_skills);
  const niceToHave = formatList(job.niceToHave ?? job.nice_to_have);
  const responsibilities = formatList(job.responsibilities);

  return `CANDIDATE PROFILE:
${profile.trim()}

---

TARGET JOB:
Title: ${job.title ?? 'Unknown'}
Company: ${job.company ?? 'Unknown'}
Location: ${job.location ?? 'Unknown'}
Country code: ${job.countryCode ?? job.country_code ?? 'Unknown'}
Type: ${job.employmentType ?? job.employment_type ?? 'Unknown'}
Visa sponsorship: ${job.visaSponsorship ?? job.visa_sponsorship ?? 'Not mentioned'}
Salary: ${job.salary ?? 'Not listed'}
Required skills: ${requiredSkills || 'Not listed'}
Nice to have: ${niceToHave || 'Not listed'}
Key responsibilities: ${responsibilities || 'Not listed'}
Match score: ${job.matchScore ?? job.match_score ?? 'Not scored'}

Generate the tailored cover letter now.`;
}

export async function generateCoverLetter(job) {
  const system = await buildSystemPrompt();
  const user = await buildUserMessage(job);
  const taskLlm = resolveTaskLlm('cover_letter');
  const coverLetterMarkdown = await callLlm({
    system,
    user,
    maxTokens: COVER_LETTER_MAX_TOKENS,
    ...taskLlm,
  });

  const trimmed = coverLetterMarkdown.trim();
  if (!trimmed) {
    const err = new Error('LLM returned an empty cover letter');
    err.code = 'LLM_ERROR';
    throw err;
  }

  return trimmed;
}
