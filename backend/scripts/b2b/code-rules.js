// @ts-check
/**
 * Static rules for B2B code (docs/plan/12-… §6 item 4, 10-coding-standards.md).
 * Plain text checks — no ESLint needed, so no packages are added to the existing app.
 */
import path from 'node:path';

/** @typedef {{ file: string, line: number, rule: string }} Violation */

/** Rules for every file under backend/src/b2b. `allowIn` = files where the rule doesn't apply. */
const SOURCE_RULES = [
  { rule: 'no multi-document transactions (D28)', re: /\b(startSession|withTransaction)\s*\(/ },
  { rule: 'no change streams (D28)', re: /\.watch\s*\(/ },
  { rule: 'no default exports', re: /\bexport\s+default\b/ },
  { rule: 'no require() — ES modules only', re: /\brequire\s*\(/ },
  { rule: 'no third-party messaging SDKs (D26)', re: /from\s+['"](ably|expo-server-sdk|firebase-admin|twilio)['"]/ },
  { rule: 'read the time through the Clock (core/clock.js)', re: /new Date\(\s*\)|Date\.now\s*\(/, allowIn: ['core/clock.js'] },
  { rule: 'use the B2B Mongoose instance (core/db/connection.js), never the default one', re: /import\s+mongoose\s+from\s+['"]mongoose['"]/, allowIn: ['core/db/connection.js'] },
  { rule: 'define models with defineModel() (core/db/model.js)', re: /\.model\s*\(\s*['"]/, allowIn: ['core/db/model.js'] },
];

const LEGACY_WRITE = /\.(insert\w*|update\w*|delete\w*|replace\w*|bulkWrite|findOneAnd\w*|drop\w*|createIndex\w*|rename)\s*\(/;
const IMPORT_SPEC = /(?:\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/g;

/**
 * @param {string} relFile  path relative to backend/src/b2b (posix)
 * @param {string} source
 * @returns {Violation[]}
 */
export function checkB2BSource(relFile, source) {
  /** @type {Violation[]} */
  const out = [];
  const lines = source.split('\n');
  if (!lines[0]?.startsWith('// @ts-check')) out.push({ file: relFile, line: 1, rule: 'first line must be // @ts-check' });
  lines.forEach((text, i) => {
    if (/^\s*(\*|\/\/)/.test(text)) return; // comments
    for (const r of SOURCE_RULES) {
      if (r.allowIn?.includes(relFile)) continue;
      if (r.re.test(text)) out.push({ file: relFile, line: i + 1, rule: r.rule });
    }
    if (relFile.startsWith('legacy-read/') && LEGACY_WRITE.test(text)) {
      out.push({ file: relFile, line: i + 1, rule: 'legacy-read is read-only (D2)' });
    }
  });
  for (const spec of importsOf(source)) {
    if (!spec.startsWith('.')) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(relFile), spec));
    if (target.startsWith('..')) out.push({ file: relFile, line: lineOf(lines, spec), rule: `imports outside src/b2b: "${spec}"` });
  }
  return out;
}

/**
 * Existing backend files (outside src/b2b) must not import B2B code — except app.js → b2b/mount.js.
 * @param {string} relFile  path relative to backend/src (posix)
 * @param {string} source
 * @returns {Violation[]}
 */
export function checkExistingSource(relFile, source) {
  /** @type {Violation[]} */
  const out = [];
  const lines = source.split('\n');
  for (const spec of importsOf(source)) {
    if (!spec.startsWith('.')) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(relFile), spec));
    if (!target.startsWith('b2b/')) continue;
    if (relFile === 'app.js' && target === 'b2b/mount.js') continue;
    out.push({ file: relFile, line: lineOf(lines, spec), rule: 'existing code must not import B2B code (only app.js → b2b/mount.js)' });
  }
  return out;
}

/** @param {string} source */
function importsOf(source) {
  return [...source.matchAll(IMPORT_SPEC)].map((m) => /** @type {string} */ (m[1]));
}

/**
 * @param {string[]} lines
 * @param {string} needle
 */
function lineOf(lines, needle) {
  const i = lines.findIndex((l) => l.includes(needle));
  return i === -1 ? 1 : i + 1;
}
