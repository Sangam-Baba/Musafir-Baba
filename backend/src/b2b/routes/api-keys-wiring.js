// @ts-check
/**
 * Stage 14 key sign-in (plan §3.2). `Authorization: Bearer mb_…` → the key (cached ≤ 5 s, so a revoked key stops
 * within 5 s everywhere) → IP allow-list → per-key rate limit → the member who created it, still a usable member of
 * a usable client company → that member's permissions cut down to the key's scopes, marked with `apiKeyId` (the
 * search gateway and orders then use channel B2B_API and count usage per key). Off unless `B2B_API_ENABLED=true`:
 * then an `mb_…` key is refused with 401 and nothing else changes.
 */
import { createHash } from 'node:crypto';

import { createCache } from '../core/cache.js';
import { ForbiddenError, RateLimitError, UnauthorizedError } from '../core/errors.js';
import { clientIp, createRateLimiter } from '../core/rate-limit.js';
import { matchesPattern } from '../modules/access/index.js';
import { createApiKeys, ipAllowed, SCOPE_RULES } from '../modules/api-access/index.js';
import { publishedPlan, subscriptionOf } from '../modules/subscriptions/index.js';
import { inPilot } from './pilot.js';

export const KEY_CACHE_MS = 5_000;
export const KEY_CALLS_PER_MINUTE = 600;

/** @param {NodeJS.ProcessEnv} env */
export const apiEnabled = (env) => env.B2B_API_ENABLED === 'true';
/** @param {NodeJS.ProcessEnv} env @returns {'live' | 'test'} */
export const keyEnvOf = (env) => (env.B2B_API_ENV === 'test' ? 'test' : 'live');

/** May the company use the API on its plan? Only checked when plans are switched on (Stage 13). @param {NodeJS.ProcessEnv} env */
export const planAllowsApi = (env) => async (/** @type {string} */ orgId) => {
  if (env.B2B_BILLING_ENABLED !== 'true') return true;
  const sub = await subscriptionOf(orgId);
  const plan = sub ? await publishedPlan(sub.planKey) : null;
  return Boolean(plan?.features?.api);
};

/** @param {NodeJS.ProcessEnv} env @param {import('../core/clock.js').Clock} clock */
export function apiKeysFor(env, clock) {
  return createApiKeys({
    clock,
    pepper: env.B2B_API_KEY_PEPPER ?? env.B2B_AUTH_SECRET ?? '',
    env: keyEnvOf(env),
    planAllowsApi: planAllowsApi(env),
  });
}

/** @type {ReturnType<typeof createCache<Record<string, any> | null>> | null} */
let keyCache = null;
/** Drop cached keys at once in this process (after a revoke); other processes follow within 5 s. */
export const forgetCachedKeys = () => keyCache?.clear();

/**
 * @param {{ env: NodeJS.ProcessEnv, clock: import('../core/clock.js').Clock, keys: ReturnType<typeof createApiKeys>,
 *   resolveMember: (orgId: string, userId: string) => Promise<{ orgId: string, orgType: string, roles: readonly string[],
 *   permissions: readonly string[], branchIds?: readonly string[], propertyIds?: readonly string[], ownOnly?: boolean } | null> }} deps
 * @returns {import('../core/http/context-middleware.js').Authenticator}
 */
export function createApiKeyAuthenticator(deps) {
  keyCache ??= createCache({ max: 2_000, ttlMs: KEY_CACHE_MS, clock: deps.clock });
  const cache = keyCache;
  const limiter = createRateLimiter({ name: 'api-key', points: KEY_CALLS_PER_MINUTE, windowMs: 60_000, clock: deps.clock });
  return async (req) => {
    const header = req.get('authorization') ?? '';
    if (!header.startsWith('Bearer mb_')) return null; // not a key — the other sign-ins decide
    if (!apiEnabled(deps.env)) throw new UnauthorizedError('API_NOT_ENABLED');
    const token = header.slice(7).trim();
    const id = createHash('sha256').update(token).digest('hex');
    let k = cache.get(id);
    if (k === undefined) {
      k = await deps.keys.resolve(token);
      cache.set(id, k);
    }
    if (!k || (k.expiresAt && new Date(k.expiresAt).getTime() <= deps.clock.now().getTime()))
      throw new UnauthorizedError('API_KEY_INVALID');
    if (!inPilot(deps.env, k.orgId)) throw new UnauthorizedError('API_NOT_ENABLED'); // Stage 16: pilot companies first
    const ip = clientIp(req);
    if (!ipAllowed(ip, k.ipAllowList ?? [])) throw new ForbiddenError('API_KEY_IP_NOT_ALLOWED');
    const r = await limiter.consume(String(k._id));
    if (!r.allowed) throw new RateLimitError(r.retryAfterSeconds);
    const m = await deps.resolveMember(k.orgId, k.createdByUserId);
    if (!m || m.orgType !== 'CLIENT') throw new UnauthorizedError('API_KEY_INVALID'); // creator gone or company not usable
    deps.keys.touch(k, ip).catch(() => undefined);
    const patterns = /** @type {string[]} */ (k.scopes).flatMap(
      (s) => SCOPE_RULES[/** @type {keyof typeof SCOPE_RULES} */ (s)]?.patterns ?? [],
    );
    return {
      type: 'member',
      userId: k.createdByUserId,
      orgId: m.orgId,
      orgType: 'CLIENT',
      roles: m.roles,
      permissions: m.permissions.filter((p) => patterns.some((pattern) => matchesPattern(p, pattern))),
      branchIds: m.branchIds,
      propertyIds: m.propertyIds,
      ownOnly: m.ownOnly,
      apiKeyId: String(k._id),
    };
  };
}
