// @ts-check
/**
 * Lease-locked schedules in `core_schedules` (docs/plan/01-architecture.md §8.2).
 * Each tick, a schedule whose time has come is claimed with ONE findOneAndUpdate, so it
 * runs once even with several worker containers. If a runner crashes, its lease expires
 * and another worker takes over. A failing run is recorded and doesn't stop later runs.
 * The existing app's node-cron jobs are not involved.
 */
import { b2bMongoose } from '../db/connection.js';
import { defineModel } from '../db/model.js';

export const SCHEDULES_COLLECTION = 'core_schedules';

const schema = new b2bMongoose.Schema(
  {
    _id: { type: String },
    everyMs: { type: Number, required: true },
    nextRunAt: { type: Date, required: true },
    lockedBy: { type: String, default: undefined },
    lockedUntil: { type: Date, default: undefined },
    lastRunAt: { type: Date, default: undefined },
    lastDurationMs: { type: Number, default: undefined },
    lastError: { type: String, default: undefined },
  },
  { versionKey: false },
);
export const ScheduleRecord = defineModel('ScheduleRecord', schema, SCHEDULES_COLLECTION);

/** @typedef {{ name: string, everyMs: number, run: () => Promise<void>, leaseMs?: number }} Schedule */

/**
 * @param {{ workerId: string, clock: import('../clock.js').Clock, logger: import('../logger.js').Logger, tickMs?: number }} options
 */
export function createScheduler(options) {
  /** @type {Map<string, Schedule>} */
  const schedules = new Map();
  /** @type {NodeJS.Timeout | null} */
  let timer = null;
  /** @type {Promise<void>} */
  let current = Promise.resolve();
  let busy = false;

  /** @param {Schedule} s */
  async function runIfDue(s) {
    const now = options.clock.now();
    try {
      await ScheduleRecord.updateOne({ _id: s.name }, { $setOnInsert: { nextRunAt: now }, $set: { everyMs: s.everyMs } }, { upsert: true });
    } catch (error) {
      if (/** @type {{ code?: number }} */ (error).code !== 11000) throw error; // another worker created it at the same moment
    }
    const claimed = await ScheduleRecord.findOneAndUpdate(
      { _id: s.name, nextRunAt: { $lte: now }, $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lt: now } }] },
      { $set: { lockedBy: options.workerId, lockedUntil: new Date(now.getTime() + (s.leaseMs ?? Math.max(s.everyMs, 60_000))) } },
    );
    if (!claimed) return false;
    const started = options.clock.now();
    /** @type {string | undefined} */
    let lastError;
    try {
      await s.run();
    } catch (error) {
      lastError = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
      options.logger.error({ schedule: s.name, err: error }, 'scheduled run failed');
    }
    const finished = options.clock.now();
    await ScheduleRecord.updateOne(
      { _id: s.name, lockedBy: options.workerId },
      {
        $set: { lastRunAt: started, lastDurationMs: finished.getTime() - started.getTime(), nextRunAt: new Date(started.getTime() + s.everyMs), ...(lastError ? { lastError } : {}) },
        $unset: { lockedBy: '', lockedUntil: '', ...(lastError ? {} : { lastError: '' }) },
      },
    );
    return true;
  }

  /** @returns {Promise<string[]>} names that ran in this tick */
  async function tick() {
    const ran = [];
    for (const s of schedules.values()) {
      try {
        if (await runIfDue(s)) ran.push(s.name);
      } catch (error) {
        options.logger.error({ schedule: s.name, err: error }, 'scheduler tick failed');
      }
    }
    return ran;
  }

  return {
    /** @param {Schedule} s */
    register(s) {
      if (schedules.has(s.name)) throw new Error(`[b2b] schedule "${s.name}" registered twice`);
      if (!Number.isSafeInteger(s.everyMs) || s.everyMs < 1000) throw new Error(`[b2b] schedule "${s.name}" needs everyMs >= 1000`);
      schedules.set(s.name, s);
    },
    tick,
    start() {
      if (timer) return;
      timer = setInterval(() => {
        if (busy) return; // previous tick still running — skip instead of piling up
        busy = true;
        current = tick().then(() => undefined).finally(() => { busy = false; });
      }, options.tickMs ?? 1000);
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
      await current;
    },
  };
}
