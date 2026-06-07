import { inferCountryCode } from '../collectors/base.js';
import { callLlm } from '../server/llm.js';
import { readRepoFile } from './repoFiles.js';

const MAX_RAW_TEXT = 3000;
const CANDIDATE_SUMMARY_LEN = 400;
const PARSE_MAX_TOKENS = 800;

const AGENTS_DIR = process.env.AGENTS_DIR ?? 'docs/agents';
const PROFILE_PATH = process.env.PROFILE_PATH ?? 'phase2/profile/master-profile.md';

const EXTRACTION_TASK = `
---
STRUCTURED EXTRACTION TASK

You will receive the raw text of a job listing. Extract the information and
return ONLY a valid JSON object with exactly these keys — no markdown fences,
no preamble, no explanation:

{
  "title": "Job title",
  "company": "Company name",
  "location": "City, Country",
  "countryCode": "DE",
  "employmentType": "Full-time | Part-time | Contract | Remote",
  "salary": "Range as string, or null",
  "visaSponsorship": "Yes | No | Not mentioned",
  "requiredSkills": ["skill1", "skill2"],
  "niceToHave": ["skill1"],
  "responsibilities": ["resp1", "resp2"],
  "matchScore": <integer 0-100>
}

For matchScore, evaluate how well this candidate profile matches the role:
`;

const DEFAULT_PARSER_PROMPT = `You are an expert job offer analyst. Extract structured information from job listings accurately.`;

// Build the parser system prompt from the agent file and candidate summary
async function buildSystemPrompt() {
  const agentPath = `${AGENTS_DIR}/job-offer-research.md`;
  let basePrompt = await readRepoFile(agentPath);

  if (!basePrompt) {
    console.warn(`[WARN] [parser] Agent file not found at ${agentPath}, using default prompt`);
    basePrompt = DEFAULT_PARSER_PROMPT;
  }

  const profile = await readRepoFile(PROFILE_PATH);
  const candidateSummary = profile
    ? profile.slice(0, CANDIDATE_SUMMARY_LEN)
    : 'No candidate profile available.';

  return `${basePrompt.trim()}${EXTRACTION_TASK}${candidateSummary}`;
}

// Strip markdown fences and parse the LLM JSON response
function parseLlmJson(responseText) {
  const clean = responseText.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    const preview = responseText.slice(0, 200);
    const err = new Error(`Failed to parse LLM response as JSON. Preview: ${preview}`);
    err.code = 'PARSE_ERROR';
    throw err;
  }
}

// Normalize parsed offer fields with defaults and country code inference
function normalizeOffer(raw) {
  const offer = {
    title: raw.title ?? 'Unknown',
    company: raw.company ?? 'Unknown',
    location: raw.location ?? 'Unknown',
    countryCode: raw.countryCode ?? raw.country_code ?? '',
    employmentType: raw.employmentType ?? raw.employment_type ?? 'Unknown',
    salary: raw.salary ?? null,
    visaSponsorship: raw.visaSponsorship ?? raw.visa_sponsorship ?? 'Not mentioned',
    requiredSkills: Array.isArray(raw.requiredSkills ?? raw.required_skills)
      ? (raw.requiredSkills ?? raw.required_skills)
      : [],
    niceToHave: Array.isArray(raw.niceToHave ?? raw.nice_to_have)
      ? (raw.niceToHave ?? raw.nice_to_have)
      : [],
    responsibilities: Array.isArray(raw.responsibilities) ? raw.responsibilities : [],
    matchScore: Number(raw.matchScore ?? raw.match_score ?? 0),
  };

  if (!offer.countryCode || !/^[A-Za-z]{2}$/.test(offer.countryCode)) {
    offer.countryCode = inferCountryCode(offer.location);
  } else {
    offer.countryCode = offer.countryCode.toUpperCase();
    if (offer.countryCode === 'UK') offer.countryCode = 'GB';
  }

  offer.matchScore = Math.max(0, Math.min(100, Math.round(offer.matchScore) || 0));

  return offer;
}

// Convert unstructured raw offer text into a structured StandardOffer via LLM
export async function parseOffer(rawOffer) {
  let rawText = rawOffer.rawText ?? '';

  if (rawText.length > MAX_RAW_TEXT) {
    console.warn(
      `[WARN] [parser] Truncated rawText from ${rawText.length} to ${MAX_RAW_TEXT} chars`,
    );
    rawText = rawText.slice(0, MAX_RAW_TEXT);
  }

  const system = await buildSystemPrompt();
  const responseText = await callLlm({ system, user: rawText, maxTokens: PARSE_MAX_TOKENS });
  const parsed = parseLlmJson(responseText);

  return normalizeOffer(parsed);
}
