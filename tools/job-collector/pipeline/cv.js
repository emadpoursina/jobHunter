import { callLlm, resolveTaskLlm } from '../server/llm.js';
import { readRepoFile } from './repoFiles.js';

const CV_MAX_TOKENS = 2000;

const AGENTS_DIR = process.env.AGENTS_DIR ?? 'docs/agents';
const PROFILE_PATH = process.env.PROFILE_PATH ?? 'phase2/profile/master-profile.md';

const DEFAULT_CV_PROMPT = `Write a truthful, natural-sounding, ATS-friendly CV in Markdown.
- Use only facts and experience explicitly verified by the candidate profile
- Use one column and standard headings: Professional Summary, Skills, Work Experience,
  Selected Projects, Education, and Languages
- Put job keywords in context only when supported; never substitute adjacent technologies
- Avoid tables, ratings, keyword stuffing, generic promotional language, and invented metrics
- Include LinkedIn and GitHub as clickable links with their readable URLs as labels
- State only "Requires employer-sponsored work authorization"; do not name a visa program
- Keep it to two pages maximum
- Output the finished CV only, with no preamble, notes, or code fences`;

// Load the CV generator agent file or fall back to the default system prompt
async function buildSystemPrompt() {
  const agentPath = `${AGENTS_DIR}/cv-generator.md`;
  const agentPrompt = await readRepoFile(agentPath);

  if (!agentPrompt) {
    console.warn(`[WARN] [cv] Agent file not found at ${agentPath}, using default prompt`);
    return DEFAULT_CV_PROMPT;
  }

  return agentPrompt.trim();
}

// Format array fields from a DB job record for the LLM user message
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

// Build the user message with candidate profile and target job details
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
Type: ${job.employmentType ?? job.employment_type ?? 'Unknown'}
Visa sponsorship: ${job.visaSponsorship ?? job.visa_sponsorship ?? 'Not mentioned'}
Required skills: ${requiredSkills || 'Not listed'}
Nice to have: ${niceToHave || 'Not listed'}
Key responsibilities: ${responsibilities || 'Not listed'}

Generate the tailored CV now.`;
}

// Generate a tailored CV in Markdown for a saved job record
export async function generateCv(job) {
  const system = await buildSystemPrompt();
  const user = await buildUserMessage(job);
  const taskLlm = resolveTaskLlm('cv');
  const cvMarkdown = await callLlm({
    system,
    user,
    maxTokens: CV_MAX_TOKENS,
    ...taskLlm,
  });

  return cvMarkdown.trim();
}
