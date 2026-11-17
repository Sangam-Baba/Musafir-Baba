// @ts-check
/**
 * `npm run b2b:gen-module -- <name> --prefix <prefix>`
 * Creates backend/src/b2b/modules/<name>/ in the standard anatomy (docs/plan/01-architecture.md §4.1)
 * plus a working integration test, so every module starts with the tenant guard, validation,
 * permissions and the error format already wired. Example: `npm run b2b:gen-module -- hotel-catalog --prefix htl`
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALLOWED_PREFIXES } from '../../src/b2b/core/db/prefixes.js';
import { moduleFiles } from './gen-module-templates.js';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--prefix');
const prefix = args[args.indexOf('--prefix') + 1];

function fail(/** @type {string} */ message) {
  console.error(
    `✗ ${message}\n  usage: npm run b2b:gen-module -- <kebab-name> --prefix <${ALLOWED_PREFIXES.map((p) => p.slice(0, -1)).join('|')}>`,
  );
  process.exit(1);
}

if (!name || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) fail('module name must be kebab-case, e.g. hotel-catalog');
if (!prefix || !(/** @type {readonly string[]} */ (ALLOWED_PREFIXES).includes(`${prefix}_`)))
  fail('--prefix must be one of the allowed collection prefixes');
if (/partner/.test(String(name))) fail('"partner" means the vehicle-partner module in this codebase — choose another name');

const files = moduleFiles(String(name), String(prefix));
const targets = Object.keys(files).map((rel) => path.join(backend, rel));
const clash = targets.find((t) => existsSync(t));
if (clash) fail(`${path.relative(backend, clash)} already exists`);

for (const [rel, content] of Object.entries(files)) {
  const target = path.join(backend, rel);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
  console.log(`+ ${rel}`);
}
console.log(`
Next steps:
  1. Add the migration printed in src/b2b/modules/${name}/README.md to src/b2b/migrations/index.js
  2. Add PERMISSION_CATALOGUE to src/b2b/permission-catalogue.js
  3. Mount the routes in src/b2b/routes/v1.js when the module has real endpoints
  4. npm run format:b2b && npm run lint:b2b && npm run test:b2b`);
