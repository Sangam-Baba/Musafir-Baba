// @ts-check
/**
 * Zero-impact guards for B2B work (docs/plan/12-protecting-the-existing-system.md §6).
 * Pure functions — the CLI in guards.js feeds them git data. No dependencies.
 */

/** Paths B2B branches may change freely (repo-relative). */
export const FREE_PATHS = [
  /^backend\/src\/b2b\//,
  /^backend\/tests\/b2b\//,
  /^backend\/scripts\/b2b\//,
  /^docs\/plan\//,
  /^docs\/adr\//,
  /^docs\/progress\//,
  /^docs\/existing-system-map\.md$/,
  /^docs\/go-live\//, // go-live runbooks for the B2B releases
  /^\.github\/workflows\/b2b-[a-z0-9-]+\.yml$/,
  // new frontend code lives only in new folders (docs/plan/12-… §2); existing frontend files stay off-limits
  /^frontend\/src\/app\/business\//,
  /^frontend\/src\/app\/admin\/b2b\//,
  /^frontend\/src\/b2b\//,
  // the business login relay (D35): must sit at /api/v1 on the website so the sign-in cookie path matches; new folder
  /^frontend\/src\/app\/api\/v1\//,
];

/** One-time: the plan moved from `planning folder/` to `docs/plan/` — only deletions there are allowed. */
const MOVED_PLAN = /^planning folder\/(musafirbaba-b2b-plan\/|\.DS_Store$)/;

/** Existing files B2B work may edit — each has its own content check (B1–B3). */
export const APPROVED_EXISTING = /** @type {const} */ (['backend/src/app.js', 'backend/package.json', 'backend/package-lock.json']);

/** The only lines B1 may add to app.js. */
export const APP_JS_ALLOWED_LINES = [
  'import { mountB2B } from "./b2b/mount.js";',
  '// B2B + hotels (/api/v1): isolated in src/b2b, off unless B2B_ENABLED=true — docs/plan/12-protecting-the-existing-system.md',
  'mountB2B(app);',
];

/** New package.json scripts must be named like this (B2). */
const ALLOWED_SCRIPT = /^((test|typecheck|lint|format):b2b|b2b:[a-z-]+)$/;

/**
 * @param {{ status: string, path: string }[]} changes  from `git diff --name-status`
 * @returns {string[]} problems
 */
export function checkPaths(changes) {
  /** @type {string[]} */
  const problems = [];
  for (const { status, path } of changes) {
    if (FREE_PATHS.some((re) => re.test(path))) continue;
    if (status === 'D' && MOVED_PLAN.test(path)) continue;
    if (/** @type {readonly string[]} */ (APPROVED_EXISTING).includes(path) && status === 'M') continue;
    problems.push(`${status} ${path} — B2B work may not change this file (allowed: new B2B folders and edits B1–B3)`);
  }
  return problems;
}

/**
 * B1: app.js may only gain the allowed lines (and blank lines); nothing removed or altered.
 * @param {string} base
 * @param {string} head
 * @returns {string[]}
 */
export function checkAppJs(base, head) {
  const normalise = (/** @type {string} */ text) =>
    text
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.trim() !== '');
  const headWithoutB2B = normalise(head).filter((l) => !APP_JS_ALLOWED_LINES.includes(l.trim()));
  const baseLines = normalise(base);
  if (headWithoutB2B.length === baseLines.length && headWithoutB2B.every((l, i) => l === baseLines[i])) return [];
  return ['backend/src/app.js — only the B1 mount lines may be added; existing lines must stay exactly the same'];
}

/**
 * B2: existing fields, scripts and dependency versions unchanged; only additions.
 * @param {Record<string, any>} base
 * @param {Record<string, any>} head
 * @returns {string[]}
 */
export function checkPackageJson(base, head) {
  /** @type {string[]} */
  const problems = [];
  const sections = ['scripts', 'dependencies', 'devDependencies'];
  for (const key of new Set([...Object.keys(base), ...Object.keys(head)])) {
    if (sections.includes(key)) continue;
    if (JSON.stringify(base[key]) !== JSON.stringify(head[key])) problems.push(`package.json "${key}" changed`);
  }
  for (const section of sections) {
    const before = base[section] ?? {};
    const after = head[section] ?? {};
    for (const [name, value] of Object.entries(before)) {
      if (after[name] !== value) problems.push(`package.json ${section}.${name} changed or removed (${value} → ${after[name]})`);
    }
    if (section === 'scripts') {
      for (const name of Object.keys(after)) {
        if (!(name in before) && !ALLOWED_SCRIPT.test(name))
          problems.push(`package.json new script "${name}" must be named test:b2b, typecheck:b2b, lint:b2b, format:b2b or b2b:*`);
      }
    }
  }
  return problems;
}

/**
 * B3: no package already in the lockfile may change version or disappear.
 * @param {{ packages?: Record<string, { version?: string, dev?: boolean }> }} base
 * @param {{ packages?: Record<string, { version?: string, dev?: boolean }> }} head
 * @returns {{ problems: string[], added: string[], addedRuntime: string[] }}
 */
export function checkLockfile(base, head) {
  const before = base.packages ?? {};
  const after = head.packages ?? {};
  /** @type {string[]} */
  const problems = [];
  for (const [path, info] of Object.entries(before)) {
    if (path === '') continue; // the root project entry lists direct deps, checked by checkPackageJson
    const now = after[path];
    if (!now) problems.push(`lockfile: ${path} removed`);
    else if (now.version !== info.version) problems.push(`lockfile: ${path} ${info.version} → ${now.version}`);
  }
  const added = Object.keys(after).filter((p) => p !== '' && !(p in before));
  const addedRuntime = added.filter((p) => !after[p]?.dev);
  return { problems, added, addedRuntime };
}

/** Secret shapes that must never be committed (simple scan — no gitleaks licence needed). */
const SECRET_PATTERNS = [
  { name: 'MongoDB URI with a password', re: /mongodb(?:\+srv)?:\/\/(?!user:password@)[^\s:@/'"`]+:[^\s@/'"`]+@/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'private key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Resend API key', re: /\bre_[A-Za-z0-9]{24,}\b/ },
  { name: 'Razorpay live key', re: /\brzp_live_[A-Za-z0-9]{10,}\b/ },
  {
    name: 'secret assigned in a .env style line',
    re: /^\s*(?:JWT_[A-Z_]*SECRET|PAYU_SALT|PAYU_KEY|RESEND_API_KEY|B2B_REALTIME_SECRET)\s*=\s*\S{8,}/m,
  },
];

/**
 * @param {string} file
 * @param {string} text
 * @returns {string[]}
 */
export function checkSecrets(file, text) {
  return SECRET_PATTERNS.filter((p) => p.re.test(text)).map((p) => `${file} — looks like a committed secret (${p.name})`);
}
