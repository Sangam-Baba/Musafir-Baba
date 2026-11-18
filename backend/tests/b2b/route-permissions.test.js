// @ts-check
/**
 * Every /api/v1 route declares who may use it (plan Stage 01 §3.5, Definition of Done):
 * a labelled guard — publicRoute(), requirePermission(), requireCustomer() or requireBusinessUser() —
 * on the route itself or applied with router.use() before it in a parent router.
 */
import express from 'express';
import { describe, expect, it } from 'vitest';

import { publicRoute, requirePermission } from '../../src/b2b/core/http/permissions.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';

/**
 * @param {any[]} stack express router stack
 * @param {string | null} inherited label of a guard applied with router.use() further up
 * @param {string} where position, for messages
 * @returns {{ route: string, access: string | null }[]}
 */
function collectRoutes(stack, inherited, where) {
  /** @type {{ route: string, access: string | null }[]} */
  const out = [];
  let guard = inherited;
  stack.forEach((layer, i) => {
    if (layer.route) {
      const own = layer.route.stack.map((/** @type {any} */ l) => l.handle?.b2bAccess).find(Boolean) ?? null;
      const methods = Object.keys(layer.route.methods)
        .map((m) => m.toUpperCase())
        .join(',');
      out.push({ route: `${methods} ${layer.route.path} (${where}.${i})`, access: own ?? guard });
    } else if (Array.isArray(layer.handle?.stack)) {
      out.push(...collectRoutes(layer.handle.stack, guard, `${where}.${i}`));
    } else if (layer.handle?.b2bAccess) {
      guard = layer.handle.b2bAccess; // router.use(guard) protects the layers after it
    }
  });
  return out;
}

describe('every /api/v1 route declares who may use it', () => {
  const router = /** @type {any} */ (
    createB2BRouter({ connect: false, logger: createLogger({ write: () => {} }), env: { B2B_AUTH_SECRET: 'x'.repeat(40) } })
  );
  const routes = collectRoutes(router.stack, null, 'v1');

  it('found the real route table (sanity)', () => {
    expect(routes.length).toBeGreaterThan(30);
  });

  it('no route is missing a guard', () => {
    expect(routes.filter((r) => r.access === null).map((r) => r.route)).toEqual([]);
  });

  it('public routes are only the reviewed ones', () => {
    const publicPaths = [...new Set(routes.filter((r) => r.access === 'public').map((r) => r.route.replace(/ \(.*\)$/, '')))].sort();
    expect(publicPaths).toEqual(
      [
        'GET /files/download',
        'GET /health',
        'GET /hotels/:ref', // public hotel content: LIVE + visible listings only
        'GET /hotels/destinations', // website autocomplete: channel-visible names only, per-IP limit (search gateway)
        'GET /invitations/lookup',
        'GET /media/*key', // local development: public hotel photos from disk (fixed key format, public folder only)
        'GET /meta/version',
        'GET /stream',
        'POST /invitations/accept',
        'POST /login',
        'POST /logout',
        'POST /logout-all',
        'POST /mfa/verify',
        'POST /otp/request',
        'POST /otp/verify',
        'POST /password/forgot',
        'POST /password/reset',
        'POST /refresh',
        'GET /catalog/masters',
        'POST /registrations/hotel',
        'POST /registrations/verify-email',
      ].sort(),
    );
  });

  it('the check itself catches an unguarded route', () => {
    const r = /** @type {any} */ (express.Router());
    r.get('/ok', publicRoute(), (/** @type {any} */ _q, /** @type {any} */ s) => s.end());
    r.get('/guarded', requirePermission('x.y.read'), (/** @type {any} */ _q, /** @type {any} */ s) => s.end());
    r.get('/forgotten', (/** @type {any} */ _q, /** @type {any} */ s) => s.end());
    expect(
      collectRoutes(r.stack, null, 't')
        .filter((x) => x.access === null)
        .map((x) => x.route),
    ).toEqual(['GET /forgotten (t.2)']);
  });
});
