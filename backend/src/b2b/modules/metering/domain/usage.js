// @ts-check
/**
 * Usage rules (plan Stage 12 §3.11, §6, D3) — pure.
 * - Counted calls: search, offers, price check, booking (1 each; weights come with Stage 13). Autocomplete and content
 *   are free (not counted). Only successful answers are counted (the gateway calls `after` for status < 400).
 * - Website traffic is recorded under `platform` for analytics, never billable.
 * - `X-MB-Refresh: realtime` (the dashboard refreshing itself after a live update) is not billable — business-area
 *   sessions only (never API keys), only offers / price check, at most once per property per user per 60 seconds.
 */
export const BILLABLE_METRICS = /** @type {const} */ (['hotel.search', 'hotel.offers', 'hotel.pricecheck', 'hotel.order']);
export const REFRESHABLE_METRICS = /** @type {const} */ (['hotel.offers', 'hotel.pricecheck']);
export const REFRESH_EVERY_MS = 60_000;
const IST_MS = 330 * 60_000;

/** @param {Date} at */
export const istDay = (at) => new Date(at.getTime() + IST_MS).toISOString().slice(0, 10);

/**
 * Is this call counted, and does it count towards the bill?
 * @param {{ metric: string, clientOrgId: string | null, apiKey: boolean, refresh: boolean, lastFreeRefreshAt: number | null, now: number }} a
 * @returns {{ record: boolean, billable: boolean, freeRefresh: boolean }}
 */
export function usageOf(a) {
  if (!BILLABLE_METRICS.includes(/** @type {any} */ (a.metric))) return { record: false, billable: false, freeRefresh: false };
  if (!a.clientOrgId) return { record: true, billable: false, freeRefresh: false };
  const refreshable = a.refresh && !a.apiKey && REFRESHABLE_METRICS.includes(/** @type {any} */ (a.metric));
  const free = refreshable && (a.lastFreeRefreshAt === null || a.now - a.lastFreeRefreshAt >= REFRESH_EVERY_MS);
  return { record: true, billable: !free, freeRefresh: free };
}
