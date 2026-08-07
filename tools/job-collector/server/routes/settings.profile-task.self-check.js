// Self-check: settings llm_tasks normalization includes profile_update
// Run: cd tools/job-collector && bun run server/routes/settings.profile-task.self-check.js
import { DEFAULT_LLM_TASKS, getAllSettings, setSetting } from '../db.js';

const TEMP_PARSE_MODEL = 'selfcheck-parse-model-xyz';

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    console.error(`  FAIL  ${msg}`);
    failures += 1;
  }
}

// Mirror server/routes/settings.js normalizeLlmTasks (keys from DEFAULT_LLM_TASKS)
function normalizeLlmTasks(incoming, current = DEFAULT_LLM_TASKS) {
  const base = current && typeof current === 'object' ? current : {};
  const next = incoming && typeof incoming === 'object' ? incoming : base;
  const result = {};
  for (const task of Object.keys(DEFAULT_LLM_TASKS)) {
    const taskIn = next[task] && typeof next[task] === 'object' ? next[task] : {};
    const taskCur = base[task] && typeof base[task] === 'object' ? base[task] : {};
    result[task] = {
      provider: String(taskIn.provider ?? taskCur.provider ?? ''),
      model: String(taskIn.model ?? taskCur.model ?? ''),
      provider_order: String(taskIn.provider_order ?? taskCur.provider_order ?? ''),
    };
  }
  return result;
}

async function main() {
  console.log('[self-check] settings profile_update task');

  const prior = getAllSettings().llm_tasks;
  const priorParse = prior?.parse?.model ?? '';

  try {
    const merged = normalizeLlmTasks({
      parse: { provider: 'openai', model: TEMP_PARSE_MODEL, provider_order: '' },
      cv: prior?.cv ?? {},
    });

    assert(
      merged.profile_update && typeof merged.profile_update === 'object',
      'profile_update key present after normalization',
    );
    assert(merged.parse.model === TEMP_PARSE_MODEL, 'parse model override preserved');
    assert(
      Object.keys(merged).sort().join(',') === Object.keys(DEFAULT_LLM_TASKS).sort().join(','),
      'normalization exposes all default task keys',
    );
  } finally {
    if (prior) setSetting('llm_tasks', prior);
    else setSetting('llm_tasks', { ...DEFAULT_LLM_TASKS });
    const restored = getAllSettings().llm_tasks?.parse?.model ?? '';
    if (restored !== priorParse) {
      console.error('  FAIL  failed to restore llm_tasks after self-check');
      failures += 1;
    }
  }

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
