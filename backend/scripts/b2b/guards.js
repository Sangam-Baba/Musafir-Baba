// @ts-check
/**
 * Runs all zero-impact guards for a B2B branch: `npm run b2b:guards`.
 * Compares the working tree (committed + uncommitted + new files) with the merge base
 * of B2B_GUARD_BASE (default origin/main). Exit code 1 if anything is wrong.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { checkB2BSource, checkExistingSource } from './code-rules.js';
import { checkAppJs, checkLockfile, checkPackageJson, checkPaths, checkSecrets } from './guards-lib.js';

/**
 * @param {string[]} args
 * @param {string} [cwd]
 */
function git(args, cwd = root) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const baseRef = process.env.B2B_GUARD_BASE ?? 'origin/main';
const base = git(['merge-base', baseRef, 'HEAD']).trim();

/** @param {string} file */
const atBase = (file) => git(['show', `${base}:${file}`]);
/** @param {string} file */
const atHead = (file) => readFileSync(path.join(root, file), 'utf8');

function changedFiles() {
  const tracked = git(['diff', '--name-status', '--no-renames', base])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [status = '', file = ''] = l.split('\t');
      return { status: status[0] ?? '', path: file };
    });
  const untracked = git(['ls-files', '--others', '--exclude-standard'])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((file) => ({ status: 'A', path: file }));
  return [...tracked, ...untracked];
}

/** @param {string} dir @returns {string[]} */
function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : jsFiles(full);
    return e.name.endsWith('.js') ? [full] : [];
  });
}

function codeProblems() {
  const src = path.join(root, 'backend/src');
  const b2b = path.join(src, 'b2b');
  const rel = (/** @type {string} */ from, /** @type {string} */ f) => path.relative(from, f).split(path.sep).join('/');
  const inB2B = jsFiles(b2b).flatMap((f) => checkB2BSource(rel(b2b, f), readFileSync(f, 'utf8')));
  const existing = jsFiles(src)
    .filter((f) => !f.startsWith(b2b + path.sep))
    .flatMap((f) => checkExistingSource(rel(src, f), readFileSync(f, 'utf8')));
  return [
    ...inB2B.map((v) => ({ ...v, file: `backend/src/b2b/${v.file}` })),
    ...existing.map((v) => ({ ...v, file: `backend/src/${v.file}` })),
  ].map((v) => `${v.file}:${v.line} — ${v.rule}`);
}

function main() {
  const changes = changedFiles();
  const changed = new Set(changes.map((c) => c.path));
  /** @type {string[]} */
  const problems = [...checkPaths(changes)];

  if (changed.has('backend/src/app.js')) problems.push(...checkAppJs(atBase('backend/src/app.js'), atHead('backend/src/app.js')));
  if (changed.has('backend/package.json')) {
    problems.push(...checkPackageJson(JSON.parse(atBase('backend/package.json')), JSON.parse(atHead('backend/package.json'))));
  }
  if (changed.has('backend/package-lock.json')) {
    const lock = checkLockfile(JSON.parse(atBase('backend/package-lock.json')), JSON.parse(atHead('backend/package-lock.json')));
    problems.push(...lock.problems);
    console.log(
      `lockfile: ${lock.added.length} packages added (${lock.addedRuntime.length} runtime${lock.addedRuntime.length ? ': ' + lock.addedRuntime.join(', ') : ''})`,
    );
  }
  problems.push(...codeProblems());
  for (const { status, path: file } of changes) {
    if (status === 'D' || file.endsWith('package-lock.json')) continue;
    try {
      problems.push(...checkSecrets(file, readFileSync(path.join(root, file), 'utf8')));
    } catch {
      // unreadable or binary — not a text file we scan
    }
  }

  console.log(`b2b guards — compared with ${baseRef} (${base.slice(0, 7)}), ${changes.length} changed files`);
  if (problems.length === 0) {
    console.log('✓ all zero-impact guards passed');
    return;
  }
  console.error(`✗ ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

main();
