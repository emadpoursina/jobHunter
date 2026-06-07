import manual from './manual.js';

export const registry = new Map([
  ['manual', manual],
]);

// Return a registered collector by machine name
export function getCollector(name) {
  const collector = registry.get(name);
  if (!collector) {
    throw new Error(`Unknown collector: ${name}`);
  }
  return collector;
}
