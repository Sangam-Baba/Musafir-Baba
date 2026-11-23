// @ts-check
/**
 * Stage 12B usage counting wiring: one recorder per process (every search gateway feeds it), the gateway hook that
 * decides what is counted (`metering/domain/usage.js`), and the free-refresh memory (one per property per user per
 * 60 seconds, in this process — a second process may allow one more, which only ever counts less).
 */
import { logger as defaultLogger } from '../core/logger.js';
import { createUsageRecorder, recountDay, usageOf } from '../modules/metering/index.js';
import { quotaGuard } from './quota-wiring.js';

/** @type {ReturnType<typeof createUsageRecorder> | null} */
let recorder = null;
/** @type {Map<string, number>} */
const freeRefreshAt = new Map();

/** The process's recorder (created on first use). @param {import('../core/clock.js').Clock} clock */
export function usageRecorder(clock) {
  recorder ??= createUsageRecorder({ clock, logger: defaultLogger });
  return recorder;
}

/** The search gateway's hooks. @param {import('../core/clock.js').Clock} clock @returns {import('./search-gateway.js').SearchHooks} */
export function usageHooks(clock) {
  return {
    before: quotaGuard(clock), // Stage 13: plan limits
    after: async (caller, kind, info) => {
      const now = clock.now().getTime();
      const memo = `${info.userId ?? '-'}|${kind}|${info.subject ?? '-'}`;
      const u = usageOf({
        metric: kind,
        clientOrgId: caller.clientOrgId,
        apiKey: false,
        refresh: info.refresh,
        lastFreeRefreshAt: freeRefreshAt.get(memo) ?? null,
        now,
      });
      if (!u.record) return;
      if (u.freeRefresh) {
        freeRefreshAt.set(memo, now);
        if (freeRefreshAt.size > 50_000) freeRefreshAt.clear(); // memory bound; only ever counts more, never less
      }
      usageRecorder(clock).record({
        orgId: caller.clientOrgId ?? 'platform',
        userId: info.userId,
        channel: caller.channel,
        metric: kind,
        billable: u.billable,
        statusCode: info.statusCode,
        requestId: info.requestId,
      });
    },
  };
}

/** The nightly check: yesterday's counters rebuilt from its events (Indian dates). @param {import('../core/clock.js').Clock} clock */
export const USAGE_RECOUNT_SCHEDULE = (/** @type {import('../core/clock.js').Clock} */ clock) => ({
  name: 'metering-usage-recount',
  everyMs: 6 * 60 * 60_000,
  run: async () => {
    const ist = new Date(clock.now().getTime() + 330 * 60_000 - 86_400_000).toISOString().slice(0, 10);
    return recountDay(ist);
  },
});

/** Usage schedules for background work: the recount and a flush every 5 s. @param {import('../core/clock.js').Clock} clock */
export const usageSchedules = (clock) => [
  USAGE_RECOUNT_SCHEDULE(clock),
  { name: 'metering-usage-flush', everyMs: 5_000, run: () => usageRecorder(clock).flush() },
];
