// @ts-check
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { backoffMs, claimNext, completeJob, enqueue, failJob, JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createJobRunner } from '../../src/b2b/core/jobs/runner.js';
import { createScheduler, ScheduleRecord } from '../../src/b2b/core/jobs/scheduler.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let nowMs = Date.parse('2026-11-12T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const advance = (/** @type {number} */ ms) => {
  nowMs += ms;
};
const quiet = createLogger({ write: () => {} });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await JobRecord.deleteMany({});
  await ScheduleRecord.deleteMany({});
});

describe('job queue', () => {
  it('claim → complete; a claimed job is not handed out twice', async () => {
    await enqueue({ name: 'send-email', payload: { to: 'x' }, clock });
    const a = await claimNext({ queue: 'default', workerId: 'w1', leaseMs: 60_000, clock });
    const b = await claimNext({ queue: 'default', workerId: 'w2', leaseMs: 60_000, clock });
    expect(a).toMatchObject({ name: 'send-email', attempts: 1, lockedBy: 'w1' });
    expect(b).toBeNull();
    expect(await completeJob(/** @type {any} */ (a), clock)).toBe(true);
    expect(await JobRecord.findById(a?._id).lean()).toMatchObject({ status: 'DONE' });
  });

  it('two workers racing over 30 jobs run each exactly once', async () => {
    for (let i = 0; i < 30; i += 1) await enqueue({ name: 'count', payload: { i }, clock });
    /** @type {number[]} */
    const seen = [];
    const handlers = new Map([
      [
        'count',
        async (/** @type {any} */ p) => {
          seen.push(p.i);
        },
      ],
    ]);
    const r1 = createJobRunner({ handlers, workerId: 'w1', clock, logger: quiet });
    const r2 = createJobRunner({ handlers, workerId: 'w2', clock, logger: quiet });
    for (;;) {
      const [x, y] = await Promise.all([r1.processOne(), r2.processOne()]);
      if (!x && !y) break;
    }
    expect(seen.sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i));
    expect(await JobRecord.countDocuments({ status: 'DONE' })).toBe(30);
  });

  it('failures retry with backoff, then go DEAD after maxAttempts', async () => {
    await enqueue({ name: 'flaky', maxAttempts: 2, clock });
    const handlers = new Map([
      [
        'flaky',
        async () => {
          throw new Error('PayU down');
        },
      ],
    ]);
    const runner = createJobRunner({ handlers, workerId: 'w1', clock, logger: quiet });
    expect(await runner.processOne()).toBe(true);
    let job = await JobRecord.findOne({ name: 'flaky' }).lean();
    expect(job).toMatchObject({ status: 'READY', attempts: 1, lastError: 'Error: PayU down' });
    expect(job?.runAt.getTime()).toBe(nowMs + backoffMs(1));
    expect(await runner.processOne()).toBe(false); // not due yet
    advance(backoffMs(1));
    await runner.processOne();
    job = await JobRecord.findOne({ name: 'flaky' }).lean();
    expect(job).toMatchObject({ status: 'DEAD', attempts: 2 });
  });

  it('a job whose worker crashed is picked up after the lease expires', async () => {
    await enqueue({ name: 'x', clock });
    await claimNext({ queue: 'default', workerId: 'crashed', leaseMs: 60_000, clock });
    expect(await claimNext({ queue: 'default', workerId: 'w2', leaseMs: 60_000, clock })).toBeNull();
    advance(60_001);
    expect(await claimNext({ queue: 'default', workerId: 'w2', leaseMs: 60_000, clock })).toMatchObject({ lockedBy: 'w2', attempts: 2 });
  });

  it('the crashed worker cannot complete or fail a job it no longer owns', async () => {
    await enqueue({ name: 'x', clock });
    const stale = /** @type {any} */ (await claimNext({ queue: 'default', workerId: 'old', leaseMs: 1000, clock }));
    advance(1001);
    await claimNext({ queue: 'default', workerId: 'new', leaseMs: 60_000, clock });
    expect(await completeJob(stale, clock)).toBe(false);
    await failJob(stale, new Error('late'), clock);
    expect(await JobRecord.findOne({ name: 'x' }).lean()).toMatchObject({ status: 'RUNNING', lockedBy: 'new' });
  });

  it('dedupeKey makes enqueue repeat-safe; unknown job names fail safely', async () => {
    const first = await enqueue({ name: 'invoice', dedupeKey: 'order:MBO-1', clock });
    const again = await enqueue({ name: 'invoice', dedupeKey: 'order:MBO-1', clock });
    expect(again).toEqual({ id: first.id, created: false });
    expect(await JobRecord.countDocuments({})).toBe(1);
    const runner = createJobRunner({ handlers: new Map(), workerId: 'w', clock, logger: quiet });
    await runner.processOne();
    expect((await JobRecord.findOne({}).lean())?.lastError).toMatch(/no handler registered/);
  });

  it('the runner loop processes work and stops cleanly', async () => {
    await enqueue({ name: 'a', clock });
    let done = 0;
    const runner = createJobRunner({
      handlers: new Map([
        [
          'a',
          async () => {
            done += 1;
          },
        ],
      ]),
      workerId: 'w',
      clock,
      logger: quiet,
      minIdleMs: 10,
      maxIdleMs: 20,
    });
    runner.start();
    await new Promise((r) => setTimeout(r, 200));
    await runner.stop();
    expect(done).toBe(1);
  });
});

describe('scheduler', () => {
  it('runs a schedule once per interval, even with two workers ticking together', async () => {
    let runs = 0;
    const make = (/** @type {string} */ id) => {
      const s = createScheduler({ workerId: id, clock, logger: quiet });
      s.register({
        name: 'reconciler',
        everyMs: 30_000,
        run: async () => {
          runs += 1;
          await new Promise((r) => setTimeout(r, 20));
        },
      });
      return s;
    };
    const [a, b] = [make('w1'), make('w2')];
    await Promise.all([a.tick(), b.tick()]);
    expect(runs).toBe(1);
    await Promise.all([a.tick(), b.tick()]);
    expect(runs).toBe(1); // not due yet
    advance(30_000);
    await Promise.all([a.tick(), b.tick()]);
    expect(runs).toBe(2);
  });

  it('a crashed run is taken over after its lease; errors are recorded and do not stop later runs', async () => {
    await ScheduleRecord.create({
      _id: 'invariants',
      everyMs: 600_000,
      nextRunAt: clock.now(),
      lockedBy: 'crashed',
      lockedUntil: new Date(nowMs + 600_000),
    });
    let calls = 0;
    const s = createScheduler({ workerId: 'w1', clock, logger: quiet });
    s.register({
      name: 'invariants',
      everyMs: 600_000,
      run: async () => {
        calls += 1;
        throw new Error('check broke');
      },
    });
    expect(await s.tick()).toEqual([]);
    advance(600_001);
    expect(await s.tick()).toEqual(['invariants']);
    expect(await ScheduleRecord.findById('invariants').lean()).toMatchObject({ lastError: 'check broke' });
    expect(calls).toBe(1);
  });

  it('refuses too-frequent or duplicate schedules', () => {
    const s = createScheduler({ workerId: 'w', clock, logger: quiet });
    expect(() => s.register({ name: 'x', everyMs: 10, run: async () => {} })).toThrow(/everyMs/);
    s.register({ name: 'y', everyMs: 1000, run: async () => {} });
    expect(() => s.register({ name: 'y', everyMs: 1000, run: async () => {} })).toThrow(/twice/);
  });
});
