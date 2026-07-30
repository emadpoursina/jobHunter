#!/usr/bin/env bun
// Run: cd tools/job-collector && bun run server/llm.self-check.js
import { normalizeMessageContent, requireLlmText } from './llm.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log('[self-check] llm empty-response guards');

assert(normalizeMessageContent('hello') === 'hello', 'string content');
assert(
  normalizeMessageContent([{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }]) === 'ab',
  'content parts joined',
);
assert(normalizeMessageContent(null) === '', 'null → empty');
assert(normalizeMessageContent(undefined) === '', 'undefined → empty');

assert(requireLlmText('  ok  ') === '  ok  ', 'non-empty passes through');

let threw = false;
try {
  requireLlmText('   ');
} catch (err) {
  threw = err.code === 'LLM_ERROR';
}
assert(threw, 'whitespace-only throws LLM_ERROR');

threw = false;
try {
  requireLlmText([{ type: 'text', text: '' }]);
} catch (err) {
  threw = err.code === 'LLM_ERROR';
}
assert(threw, 'empty content parts throw LLM_ERROR');

console.log('[self-check] ok');
