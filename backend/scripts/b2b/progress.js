// @ts-check
/**
 * `npm run b2b:progress`         — regenerate the counts block in docs/progress/STATUS.md
 * `npm run b2b:progress -- --check` — fail (exit 1) if the block is stale or task rows are invalid (CI)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseStageFile, renderStatus, validate } from './progress-lib.js';

const progressDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/progress');
const check = process.argv.includes('--check');

const files = readdirSync(path.join(progressDir, 'stages'))
  .map((name) => /^stage-(\d{2})\.md$/.exec(name))
  .filter((m) => m !== null)
  .map((m) => parseStageFile(/** @type {string} */ (m[1]), readFileSync(path.join(progressDir, 'stages', m[0]), 'utf8')));

const statusPath = path.join(progressDir, 'STATUS.md');
const current = readFileSync(statusPath, 'utf8');
const next = renderStatus(current, files);
const problems = validate(files, readFileSync(path.join(progressDir, 'DEFERRED.md'), 'utf8'));

if (check) {
  if (next !== current) problems.push('STATUS.md counts are stale — run `npm run b2b:progress` and commit');
  if (problems.length > 0) {
    console.error(`✗ progress check failed:\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }
  console.log('✓ progress files are consistent');
} else {
  writeFileSync(statusPath, next);
  for (const p of problems) console.warn(`! ${p}`);
  console.log(`STATUS.md updated from ${files.length} stage file(s)`);
}
