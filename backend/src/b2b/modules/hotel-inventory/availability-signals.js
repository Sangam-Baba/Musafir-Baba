// @ts-check
/**
 * Live availability signals (plan Stage 04 §3.11, `05-…` §8): each `inventory.changed` event (from the outbox,
 * once per consumer) becomes, for that property,
 * - `availability:changed { propertyId, roomTypeIds, dateFrom, dateTo }` in room `availability:property:{id}`
 *   (open calendars, website pages and dashboards refresh), and
 * - `cache:evict` of `availability:property:{id}` (API processes drop cached search results, when caching exists).
 * At most one per property per second: the first goes out at once, later ones in that second are merged into one
 * trailing signal. Signals carry ids and dates only; correctness never depends on them (booking re-checks).
 */
import { publish, publishCacheEvict } from '../../core/realtime/signals.js';
import { addDays } from './domain/dates.js';

export const SIGNAL_EVERY_MS = 1000;

/** @typedef {{ propertyId: string, roomTypeIds: string[], dateFrom: string, dateTo: string }} Change */

/** @param {Change} a @param {Change} b @returns {Change} */
const merge = (a, b) => ({
  propertyId: a.propertyId,
  roomTypeIds: [...new Set([...a.roomTypeIds, ...b.roomTypeIds])].sort(),
  dateFrom: a.dateFrom < b.dateFrom ? a.dateFrom : b.dateFrom,
  dateTo: a.dateTo > b.dateTo ? a.dateTo : b.dateTo,
});

/**
 * @param {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger, everyMs?: number,
 *   send?: (c: Change) => Promise<void> }} deps
 */
export function createAvailabilitySignals(deps) {
  const every = deps.everyMs ?? SIGNAL_EVERY_MS;
  const send =
    deps.send ??
    (async (/** @type {Change} */ c) => {
      await publish(`availability:property:${c.propertyId}`, 'availability:changed', { ...c }, deps);
      await publishCacheEvict(`availability:property:${c.propertyId}`, deps);
    });
  /** @type {Map<string, { lastAt: number, pending: Change | null, timer: NodeJS.Timeout | null }>} */
  const state = new Map();

  /** @param {string} propertyId */
  async function flush(propertyId) {
    const st = state.get(propertyId);
    if (!st || !st.pending) return;
    const change = st.pending;
    st.pending = null;
    st.timer = null;
    st.lastAt = deps.clock.now().getTime();
    await send(change).catch((error) => deps.logger.warn({ err: error, propertyId }, 'inventory: availability signal failed'));
  }

  return {
    /** The consumer handler. @param {{ payload: Record<string, any> }} event */
    async handle(event) {
      const p = event.payload;
      const change = {
        propertyId: String(p.propertyId),
        roomTypeIds: [...(p.roomTypeIds ?? [])],
        dateFrom: String(p.dateFrom),
        dateTo: String(p.dateTo || addDays(String(p.dateFrom), 1)),
      };
      const now = deps.clock.now().getTime();
      const st = state.get(change.propertyId) ?? { lastAt: -Infinity, pending: null, timer: null };
      state.set(change.propertyId, st);
      if (now - st.lastAt >= every && !st.timer) {
        st.lastAt = now;
        await send(change);
        return;
      }
      st.pending = st.pending ? merge(st.pending, change) : change;
      if (!st.timer) {
        st.timer = setTimeout(() => void flush(change.propertyId), Math.max(0, every - (now - st.lastAt)));
        st.timer.unref();
      }
    },
    /** Sends every merged signal now (shutdown, tests). */
    async flushAll() {
      for (const [id, st] of state) {
        if (st.timer) clearTimeout(st.timer);
        await flush(id);
      }
    },
  };
}
