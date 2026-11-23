// @ts-check
/**
 * The usage recorder (plan Stage 12 §3.11 — no Redis, `01-…` §8.2): calls are buffered in this process and flushed
 * every 2 seconds or 200 events — one `insertMany` into `mtr_usage_events` plus `$inc` upserts into the daily and
 * monthly counters. `stop()` flushes what is left (called when background work stops — never a process signal handler).
 * A flush that fails keeps its events for the next one (at most 5 000 waiting; older ones dropped with a log line —
 * the nightly recount fixes the counters from the events that did land). Never throws into a request.
 */
import { randomUUID } from 'node:crypto';

import { istDay } from './domain/usage.js';
import { UsageDailyRecord, UsageEventRecord, UsageMonthlyRecord } from './models/usage.model.js';

export const FLUSH_EVERY_MS = 2000;
export const FLUSH_AT = 200;
const MAX_WAITING = 5000;

/**
 * @typedef {{ orgId: string, userId: string | null, apiKeyId?: string | null, channel: string, metric: string, billable: boolean,
 *   statusCode: number, requestId: string | null }} UsageInput
 */

/** Counter updates for a batch (one per org × metric × day / month). @param {Record<string, any>[]} batch */
function counterOps(batch) {
  /** @type {Map<string, { orgId: string, metric: string, day: string, count: number, billable: number, users: Map<string, number> }>} */
  const days = new Map();
  for (const e of batch) {
    const k = `${e.orgId}|${e.metric}|${e.day}`;
    const d = days.get(k) ?? { orgId: e.orgId, metric: e.metric, day: e.day, count: 0, billable: 0, users: new Map() };
    d.count += 1;
    d.billable += e.billable ? 1 : 0;
    if (e.userId) d.users.set(e.userId, (d.users.get(e.userId) ?? 0) + 1);
    days.set(k, d);
  }
  const daily = [...days.values()].map((d) => ({
    updateOne: {
      filter: { orgId: d.orgId, metric: d.metric, day: d.day },
      update: { $inc: { count: d.count, billable: d.billable, ...Object.fromEntries([...d.users].map(([u, n]) => [`byUser.${u}`, n])) } },
      upsert: true,
    },
  }));
  const monthly = [...days.values()].map((d) => ({
    updateOne: {
      filter: { orgId: d.orgId, metric: d.metric, month: d.day.slice(0, 7) },
      update: { $inc: { count: d.count, billable: d.billable } },
      upsert: true,
    },
  }));
  return { daily, monthly };
}

/** @param {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger, flushEveryMs?: number, flushAt?: number }} deps */
export function createUsageRecorder(deps) {
  /** @type {Record<string, any>[]} */
  let waiting = [];
  /** @type {NodeJS.Timeout | null} */
  let timer = null;
  /** @type {Promise<void> | null} */
  let running = null;

  async function flushNow() {
    if (waiting.length === 0) return;
    const batch = waiting;
    waiting = [];
    try {
      await UsageEventRecord.insertMany(batch, { ordered: false }).catch((e) => {
        if (/** @type {any} */ (e)?.code !== 11000 && !(/** @type {any} */ (e)?.writeErrors)) throw e; // a retried event already there
      });
      const ops = counterOps(batch);
      await UsageDailyRecord.bulkWrite(ops.daily, { ordered: false });
      await UsageMonthlyRecord.bulkWrite(ops.monthly, { ordered: false });
    } catch (error) {
      deps.logger.error({ err: error, events: batch.length }, 'usage flush failed — kept for the next one');
      waiting = [...batch, ...waiting].slice(-MAX_WAITING);
    }
  }
  const flush = () => (running ??= flushNow().finally(() => (running = null)));
  const ensureTimer = () => {
    if (timer) return;
    timer = setInterval(() => void flush(), deps.flushEveryMs ?? FLUSH_EVERY_MS);
    timer.unref();
  };

  return {
    /** @param {UsageInput} u */
    record(u) {
      const at = deps.clock.now();
      waiting.push({ eventId: randomUUID(), apiKeyId: null, ...u, day: istDay(at), at });
      if (waiting.length >= (deps.flushAt ?? FLUSH_AT)) void flush();
      ensureTimer();
    },
    flush,
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
      await running;
      await flushNow();
    },
    waiting: () => waiting.length,
  };
}
