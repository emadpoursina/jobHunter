import { readRepoFile } from './repoFiles.js';

const FRONTMATTER_START = /^---\r?\n/;
const FRONTMATTER_END = /\r?\n---(?:\r?\n|$)/;
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const SKILL_DELIMITER = '\n\n---\n\n';

// Compose an agent prompt with the skills declared in its frontmatter.
export async function loadAgentPrompt(agentRelativePath) {
  const agentContent = await readRepoFile(agentRelativePath);
  if (agentContent === null) return null;

  const parsedAgent = parseAgentPrompt(agentContent);
  const agentsDir = process.env.AGENTS_DIR ?? 'docs/agents';
  const sections = [parsedAgent.body];

  for (const skillName of parsedAgent.skills) {
    const skillPath = `${agentsDir}/skills/${skillName}/SKILL.md`;
    const skillContent = await readRepoFile(skillPath);

    if (skillContent === null) {
      console.warn(`[WARN] [agentSkills] Skill file not found at ${skillPath} (${skillName})`);
      continue;
    }

    const skillBody = stripFrontmatter(skillContent).body;
    sections.push(`Skill: ${skillName}\n${skillBody}`);
  }

  return sections.join(SKILL_DELIMITER).trim();
}

// Parse an agent document without treating frontmatter as prompt content.
export function parseAgentPrompt(content) {
  const { frontmatter, body } = splitFrontmatter(content);
  return {
    body,
    skills: frontmatter === null ? [] : parseSkills(frontmatter),
  };
}

function splitFrontmatter(content) {
  const source = String(content ?? '');
  if (!FRONTMATTER_START.test(source)) {
    return { frontmatter: null, body: source.trim() };
  }

  const endMatch = source.match(FRONTMATTER_END);
  if (!endMatch) {
    return { frontmatter: null, body: source.trim() };
  }

  const frontmatterStart = FRONTMATTER_START.exec(source)[0].length;
  const frontmatterEnd = endMatch.index;
  const bodyStart = endMatch.index + endMatch[0].length;

  return {
    frontmatter: source.slice(frontmatterStart, frontmatterEnd),
    body: source.slice(bodyStart).trim(),
  };
}

function parseSkills(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  const skillsLine = lines.findIndex((line) => /^skills:\s*/.test(line));
  if (skillsLine === -1) return [];

  const value = lines[skillsLine].slice('skills:'.length).trim();
  if (value) return parseInlineSkills(value);

  const skills = [];
  for (const line of lines.slice(skillsLine + 1)) {
    if (!line.trim()) continue;
    if (/^[A-Za-z0-9_-]+:\s*/.test(line)) break;

    const item = line.match(/^\s*-\s+(.+?)\s*$/);
    if (!item) return [];

    const skillName = normalizeSkillName(item[1]);
    if (!skillName) return [];
    skills.push(skillName);
  }

  return skills;
}

function parseInlineSkills(value) {
  if (!value.startsWith('[') || !value.endsWith(']')) return [];

  const entries = value.slice(1, -1).split(',').map(normalizeSkillName);
  return entries.every(Boolean) ? entries : [];
}

function normalizeSkillName(value) {
  const skillName = String(value).trim().replace(/^(['"])(.*)\1$/, '$2');
  return SKILL_NAME_PATTERN.test(skillName) ? skillName : null;
}

function stripFrontmatter(content) {
  return splitFrontmatter(content);
}
