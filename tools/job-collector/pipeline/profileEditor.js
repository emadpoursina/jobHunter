import { callLlm, requireLlmText, resolveTaskLlm } from '../server/llm.js';
import {
  getProfileDocument,
  parseProfileText,
  saveProfileMarkdown,
} from './profile.js';
import { readRepoFile } from './repoFiles.js';

const AGENTS_DIR = process.env.AGENTS_DIR ?? 'docs/agents';
const PROFILE_UPDATE_MAX_TOKENS = 16000;

const DEFAULT_PROFILE_EDITOR_PROMPT = `You edit master-profile.md for a job search workflow.
Return the COMPLETE updated Markdown document only.
Preserve factual accuracy and document structure.
Never invent experience, employers, or skills.
Keep ## 1. Personal Information with Full Name, Email, and Phone.
No preamble, commentary, or code fences.`;

// Strip code fences and common LLM preambles from profile proposals
export function sanitizeProfileProposal(raw) {
  let text = String(raw ?? '').trim();
  if (!text) return text;

  const fence = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (fence) text = fence[1].trim();

  text = text.replace(/^here is (?:the |your )?(?:updated )?profile:?\s*\n+/i, '');
  return text.trim();
}

async function buildSystemPrompt() {
  const agentPath = `${AGENTS_DIR}/profile-editor.md`;
  const agentPrompt = await readRepoFile(agentPath);

  if (!agentPrompt) {
    console.warn(`[WARN] [profileEditor] Agent file not found at ${agentPath}, using default prompt`);
    return DEFAULT_PROFILE_EDITOR_PROMPT;
  }

  return agentPrompt.trim();
}

function buildUserMessage({ markdown, prompt }) {
  return `CURRENT MASTER PROFILE (Markdown):
${markdown}

---

OPERATOR REQUEST:
${prompt.trim()}

---

Output the COMPLETE updated master profile Markdown document only. No preamble, no commentary, no code fences.`;
}

function revisionConflict(message = 'Profile has changed since this revision; refresh and try again') {
  const err = new Error(message);
  err.code = 'PROFILE_REVISION_CONFLICT';
  return err;
}

// ponytail: PROFILE_AI_MOCK=1 only — route self-check; returns a minimal in-document edit without a live LLM
function mockProfileLlmResponse({ user }) {
  const match = user.match(
    /CURRENT MASTER PROFILE \(Markdown\):\n([\s\S]*?)\n\n---\n\nOPERATOR REQUEST:/,
  );
  const base = (match?.[1] ?? '').trim();
  if (!base) {
    const err = new Error('PROFILE_AI_MOCK: could not parse profile from prompt');
    err.code = 'LLM_ERROR';
    throw err;
  }
  if (base.includes('Backend engineer.')) {
    return base.replace('Backend engineer.', 'Backend engineer (mocked).');
  }
  return `${base}\n\n_(Mock verification edit.)_`;
}

function resolvePreviewLlmCall(llmCall) {
  if (llmCall !== callLlm) return llmCall;
  if (process.env.PROFILE_AI_MOCK === '1') return mockProfileLlmResponse;
  return callLlm;
}

// Call LLM to propose a full profile rewrite without writing to disk
export async function previewProfileUpdate({ prompt, baseRevision, llmCall = callLlm } = {}) {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    const err = new Error('prompt must be a non-empty string');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const doc = await getProfileDocument();
  if (baseRevision && doc.revision !== baseRevision) {
    throw revisionConflict();
  }

  const system = await buildSystemPrompt();
  const user = buildUserMessage({ markdown: doc.markdown, prompt });
  const taskLlm = resolveTaskLlm('profile_update');
  const llmFn = resolvePreviewLlmCall(llmCall);

  const raw = await llmFn({
    system,
    user,
    maxTokens: PROFILE_UPDATE_MAX_TOKENS,
    ...taskLlm,
  });

  const proposal = sanitizeProfileProposal(requireLlmText(raw, 'Profile update LLM'));
  parseProfileText(proposal);

  return { proposal, baseRevision: doc.revision };
}

// Validate and persist an approved AI proposal; rejects stale baseRevision
export async function applyProfileProposal({ proposal, baseRevision }) {
  if (!baseRevision || typeof baseRevision !== 'string') {
    const err = new Error('baseRevision is required');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (typeof proposal !== 'string' || !proposal.trim()) {
    const err = new Error('proposal must be a non-empty string');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const sanitized = sanitizeProfileProposal(proposal);
  return saveProfileMarkdown(sanitized, { baseRevision });
}
