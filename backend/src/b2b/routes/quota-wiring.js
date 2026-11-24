// @ts-check
/**
 * Stage 13 quota guard for the search gateway (plan §3.4): before a counted call from a B2B client (the kind's weight
 * > 0), the client's quota — cached 10 seconds per company in this process — decides: BLOCK plan at 100 % →
 * 429 QUOTA_EXCEEDED; suspended / cancelled → 403 SUBSCRIPTION_SUSPENDED (search and booking off; existing bookings,
 * documents and cancellations do not pass through here). Website traffic and free kinds are never checked.
 * A client without a subscription yet (verified before Stage 13, not yet caught up) is let through.
 */
import { createCache } from '../core/cache.js';
import { AppError, ForbiddenError } from '../core/errors.js';
import { quotaOf, queryWeights } from '../modules/subscriptions/index.js';

export const QUOTA_CACHE_MS = 10_000;
/** Off while suspended (whatever their weight): searching, prices and new bookings. */
const PAID_FEATURES = ['hotel.search', 'hotel.offers', 'hotel.pricecheck', 'hotel.order'];

/** @param {import('../core/clock.js').Clock} clock */
export function quotaGuard(clock) {
  const cache = createCache({ max: 5000, ttlMs: QUOTA_CACHE_MS, clock, shared: false });
  /** @type {{ at: number, value: Record<string, number> } | null} */
  let weights = null;
  const weightsNow = async () => {
    const now = clock.now().getTime();
    if (!weights || now - weights.at > 60_000) weights = { at: now, value: await queryWeights() };
    return weights.value;
  };
  /** @param {import('./search-gateway.js').SearchCaller} caller @param {string} kind */
  return async (caller, kind) => {
    if (!caller.clientOrgId) return;
    const weighted = ((await weightsNow())[kind] ?? 0) > 0;
    if (!weighted && !PAID_FEATURES.includes(kind)) return;
    let q = /** @type {any} */ (cache.get(caller.clientOrgId));
    if (q === undefined) {
      q = (await quotaOf(caller.clientOrgId, clock.now())) ?? null;
      cache.set(caller.clientOrgId, q);
    }
    if (q?.reason === 'SUBSCRIPTION_SUSPENDED') throw new ForbiddenError('SUBSCRIPTION_SUSPENDED');
    if (!weighted || !q?.blocked) return; // booking (weight 0) is never blocked by the limit
    throw new AppError('QUOTA_EXCEEDED', 429, 'Monthly query limit reached', { used: q.used, limit: q.allowance });
  };
}
