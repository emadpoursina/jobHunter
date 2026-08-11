import germantechjobs from './germantechjobs.js';
import hiringcafe from './hiringcafe.js';
import indeed from './indeed.js';
import ireland from './ireland.js';
import linkedin from './linkedin.js';
import manual from './manual.js';
import uk from './uk.js';

export const registry = new Map([
  ['linkedin', linkedin],
  ['indeed', indeed],
  ['germantechjobs', germantechjobs],
  ['hiringcafe', hiringcafe],
  ['ireland', ireland],
  ['manual', manual],
  ['uk', uk],
]);

// Return a registered collector by machine name
export function getCollector(name) {
  const collector = registry.get(name);
  if (!collector) {
    throw new Error(`Unknown collector: ${name}`);
  }
  return collector;
}
