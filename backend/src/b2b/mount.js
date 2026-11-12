// @ts-check
/**
 * Entry point of the B2B + hotel code inside the existing backend.
 *
 * This is the ONLY file the existing app imports from `src/b2b/` (edit B1 in
 * docs/plan/12-protecting-the-existing-system.md). Rules:
 * - When B2B_ENABLED is not "true", it does nothing: no route, no middleware.
 * - The rest of the B2B code is loaded with a guarded dynamic import. If that
 *   fails, the error is logged and `/api/v1` answers 503. The existing app keeps running.
 * - It is mounted before the existing body parsers, cookie parser and audit
 *   interceptor, and the B2B router never hands requests back to them.
 *
 * Keep this file tiny and dependency-free.
 */

export const B2B_BASE_PATH = '/api/v1';

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {boolean}
 */
export function isB2BEnabled(env) {
  return env.B2B_ENABLED === 'true';
}

/**
 * @param {import('express').Express} app
 * @param {{ env?: NodeJS.ProcessEnv, load?: () => Promise<{ createB2BRouter: () => import('express').RequestHandler }> }} [options]
 * @returns {boolean} true when mounted
 */
export function mountB2B(app, options = {}) {
  const env = options.env ?? process.env;
  if (!isB2BEnabled(env)) return false;

  const load = options.load ?? (() => import('./routes/v1.js'));
  /** @type {Promise<import('express').RequestHandler | null>} */
  const routerReady = load()
    .then((mod) => mod.createB2BRouter())
    .catch((error) => {
      console.error('[b2b] failed to load — /api/v1 disabled, existing app unaffected:', error);
      return null;
    });

  app.use(B2B_BASE_PATH, (req, res) => {
    // `next` from the existing app is deliberately never called: /api/v1 requests
    // must not fall through to the existing middleware or routes.
    routerReady
      .then((router) => {
        if (!router) return sendProblem(res, 503, 'Service unavailable');
        router(req, res, (/** @type {unknown} */ error) => {
          if (error) console.error('[b2b] unhandled error:', error);
          sendProblem(res, error ? 500 : 404, error ? 'Internal error' : 'Not found');
        });
      })
      .catch((error) => {
        console.error('[b2b] dispatch failed:', error);
        sendProblem(res, 500, 'Internal error');
      });
  });
  return true;
}

/**
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} title
 */
function sendProblem(res, status, title) {
  if (res.headersSent) return;
  res.status(status).type('application/problem+json').json({ type: 'about:blank', title, status });
}
