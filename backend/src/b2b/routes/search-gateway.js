// @ts-check
/**
 * Gateway for hotel search routes (plan Stage 06 §3.7): who is asking decides the channel and the limits.
 * - Anonymous visitor (or MusafirBaba staff trying the website) → WEBSITE prices, limited per IP (stricter).
 * - Signed-in member of an ACTIVE client organisation with `hotel-search.search.use` → B2B_PORTAL prices, limited
 *   per user and per organisation. Hotel members and clients without the permission → 403; a suspended or
 *   onboarding organisation → 403 `ORG_NOT_ACTIVE`.
 * Entitlement checks and usage recording are hooks left as no-ops (filled in Stages 12 / 13).
 */
import { createCache } from '../core/cache.js';
import { ForbiddenError, RateLimitError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { clientIp, createRateLimiter } from '../core/rate-limit.js';
import { PERMISSIONS as SEARCH } from '../modules/hotel-search/index.js';

/** Requests per minute. Autocomplete is cheap; search / offers / price check run availability + pricing. */
export const SEARCH_LIMITS = Object.freeze({
  ip: { light: 120, heavy: 40 },
  user: { light: 300, heavy: 120 },
  org: { light: 1500, heavy: 600 },
});

/**
 * @typedef {import('../modules/hotel-search/index.js').SearchCaller} SearchCaller
 * @typedef {{ statusCode: number, userId: string | null, requestId: string | null, refresh: boolean, subject: string | null }} AfterInfo
 *   `refresh`: the dashboard's own refresh after a live update (`X-MB-Refresh: realtime`); `subject`: the hotel asked about
 * @typedef {{ before?: (caller: SearchCaller, kind: string) => Promise<void>, after?: (caller: SearchCaller, kind: string, info: AfterInfo) => Promise<void> }} SearchHooks
 */

/** @param {import('../core/clock.js').Clock} clock */
function limitsFor(clock) {
  const limiter = (/** @type {string} */ name, /** @type {number} */ points) =>
    createRateLimiter({ name, points, windowMs: 60_000, clock });
  return {
    light: {
      ip: limiter('search-ip-light', SEARCH_LIMITS.ip.light),
      user: limiter('search-user-light', SEARCH_LIMITS.user.light),
      org: limiter('search-org-light', SEARCH_LIMITS.org.light),
    },
    heavy: {
      ip: limiter('search-ip-heavy', SEARCH_LIMITS.ip.heavy),
      user: limiter('search-user-heavy', SEARCH_LIMITS.user.heavy),
      org: limiter('search-org-heavy', SEARCH_LIMITS.org.heavy),
    },
  };
}

/**
 * Sets the RateLimit headers; throws when over the limit.
 * @param {import('express').Response} res
 * @param {import('../core/rate-limit.js').RateLimitResult} r
 */
function enforce(res, r) {
  res.set({
    'RateLimit-Limit': String(r.limit),
    'RateLimit-Remaining': String(r.remaining),
    'RateLimit-Reset': String(r.retryAfterSeconds),
  });
  if (!r.allowed) throw new RateLimitError(r.retryAfterSeconds);
}

/**
 * @param {{ clock: import('../core/clock.js').Clock, orgInfo: (orgId: string) => Promise<{ type: string, status: string, clientCategory?: string | null } | null>, hooks?: SearchHooks }} deps
 */
export function createSearchGate(deps) {
  const limits = limitsFor(deps.clock);
  /** @type {ReturnType<typeof createCache<{ type: string, status: string, clientCategory?: string | null } | null>>} */
  const orgs = createCache({ max: 2000, ttlMs: 60_000, clock: deps.clock });
  const hooks = deps.hooks ?? {};

  /** @param {string} orgId */
  async function orgOf(orgId) {
    const hit = orgs.get(orgId);
    if (hit !== undefined) return hit;
    const info = await deps.orgInfo(orgId);
    orgs.set(orgId, info);
    return info;
  }

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {'light' | 'heavy'} weight
   * @returns {Promise<SearchCaller>}
   */
  async function callerOf(req, res, weight) {
    const { actor } = contextOf(res);
    const l = limits[weight];
    const check = (/** @type {import('../core/rate-limit.js').RateLimitResult} */ r) => enforce(res, r);
    if (actor.type !== 'member') {
      check(await l.ip.consume(clientIp(req)));
      return {
        channel: 'WEBSITE',
        catalogChannel: 'WEBSITE',
        clientOrgId: null,
        clientCategory: null,
        customerId: actor.type === 'customer' ? actor.customerId : null,
      };
    }
    if (!actor.permissions.includes(SEARCH.search)) throw new ForbiddenError();
    const org = await orgOf(actor.orgId);
    if (!org || org.type !== 'CLIENT') throw new ForbiddenError();
    if (org.status !== 'ACTIVE') throw new ForbiddenError('ORG_NOT_ACTIVE');
    check(await l.user.consume(actor.userId));
    check(await l.org.consume(actor.orgId));
    return {
      channel: 'B2B_PORTAL',
      catalogChannel: 'B2B',
      clientOrgId: actor.orgId,
      clientCategory: org.clientCategory ?? null,
      customerId: null,
    };
  }

  /**
   * Middleware: puts the caller in `res.locals.searchCaller`.
   * @param {string} kind e.g. 'hotel.search' (for the usage hooks)
   * @param {'light' | 'heavy'} weight
   * @returns {import('express').RequestHandler}
   */
  return (kind, weight) => (req, res, next) => {
    (async () => {
      const caller = await callerOf(req, res, weight);
      await hooks.before?.(caller, kind);
      res.locals.searchCaller = caller;
      res.on('finish', () => {
        if (res.statusCode >= 400) return; // failures are never counted
        const ctx = contextOf(res);
        const info = {
          statusCode: res.statusCode,
          userId: ctx.actor.type === 'member' ? ctx.actor.userId : null,
          requestId: ctx.requestId ?? null,
          refresh: req.get('x-mb-refresh') === 'realtime',
          subject: typeof req.params?.ref === 'string' ? req.params.ref : null,
        };
        hooks.after?.(caller, kind, info).catch(() => undefined);
      });
    })().then(() => next(), next);
  };
}
