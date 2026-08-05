import germantechjobs from './germantechjobs.js';
import hiringcafe from './hiringcafe.js';
import indeed from './indeed.js';
import linkedin from './linkedin.js';
import manual from './manual.js';

export const registry = new Map([
  ['linkedin', linkedin],
  ['indeed', indeed],
  ['germantechjobs', germantechjobs],
  ['hiringcafe', hiringcafe],
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
