// @ts-check
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { fixedClock } from '../../src/b2b/core/clock.js';
import { hashRequest, IDEMPOTENCY_COLLECTION, idempotencyScope, withIdempotency } from '../../src/b2b/core/db/idempotency.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { startMongo } from './helpers/mongo.js';

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
const clock = fixedClock(new Date('2026-11-12T10:00:00Z'));
const base = { scope: 'customer:c1', key: '3f2b8c1e-9d4a-4f6b-8a2c-1e5d7f9b0a3c', requestHash: hashRequest({ method: 'POST', path: '/orders', body: { a: 1 } }), clock };

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await mongo.db.collection(IDEMPOTENCY_COLLECTION).deleteMany({});
});

describe('withIdempotency', () => {
  it('runs once; repeats get the first response', async () => {
    let runs = 0;
    const op = async () => ({ statusCode: 201, body: { order: `MBO-${(runs += 1)}` } });
    const first = await withIdempotency(base, op);
    const second = await withIdempotency(base, op);
    expect(first).toEqual({ statusCode: 201, body: { order: 'MBO-1' }, replayed: false });
    expect(second).toEqual({ statusCode: 201, body: { order: 'MBO-1' }, replayed: true });
    expect(runs).toBe(1);
  });

  it('double-click: 10 parallel requests with one key run the operation once', async () => {
    let runs = 0;
    const op = async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 50));
      return { statusCode: 201, body: { ok: true } };
    };
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => withIdempotency(base, op)));
    expect(runs).toBe(1);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const busy = results.filter((r) => r.status === 'rejected');
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const r of busy) expect(/** @type {PromiseRejectedResult} */ (r).reason.code).toBe('IDEMPOTENCY_IN_PROGRESS');
  });

  it('same key, different request → IDEMPOTENCY_KEY_REUSED', async () => {
    await withIdempotency(base, async () => ({ statusCode: 201, body: {} }));
    const other = { ...base, requestHash: hashRequest({ method: 'POST', path: '/orders', body: { a: 2 } }) };
    await expect(withIdempotency(other, async () => ({ statusCode: 201, body: {} }))).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED', status: 422 });
  });

  it('a failed run can be retried with the same key', async () => {
    await expect(withIdempotency(base, async () => { throw new Error('PayU timeout'); })).rejects.toThrow('PayU timeout');
    expect(await withIdempotency(base, async () => ({ statusCode: 201, body: { ok: 1 } }))).toMatchObject({ replayed: false });
  });

  it('an abandoned run (crashed process) is taken over after its lease', async () => {
    await mongo.db.collection(IDEMPOTENCY_COLLECTION).insertOne({
      scope: base.scope, key: base.key, requestHash: base.requestHash, status: 'IN_PROGRESS',
      leaseUntil: new Date('2026-11-12T09:59:00Z'), expiresAt: new Date('2026-11-13T10:00:00Z'),
    });
    expect(await withIdempotency(base, async () => ({ statusCode: 201, body: { recovered: true } }))).toMatchObject({ body: { recovered: true } });
  });

  it('keys are per caller', async () => {
    await withIdempotency(base, async () => ({ statusCode: 201, body: { who: 'c1' } }));
    expect(await withIdempotency({ ...base, scope: 'customer:c2' }, async () => ({ statusCode: 201, body: { who: 'c2' } }))).toMatchObject({ body: { who: 'c2' }, replayed: false });
  });
});

describe('helpers', () => {
  it('hashRequest ignores key order but not values', () => {
    expect(hashRequest({ method: 'post', path: '/x', body: { a: 1, b: [1, { c: 2, d: 3 }] } }))
      .toBe(hashRequest({ method: 'POST', path: '/x', body: { b: [1, { d: 3, c: 2 }], a: 1 } }));
    expect(hashRequest({ method: 'POST', path: '/x', body: { a: 1 } })).not.toBe(hashRequest({ method: 'POST', path: '/x', body: { a: 2 } }));
  });

  it('scope comes from the actor; anonymous callers cannot use idempotency', () => {
    /** @param {import('../../src/b2b/core/context.js').Actor} actor */
    const ctx = (actor) => /** @type {any} */ ({ actor });
    expect(idempotencyScope(ctx({ type: 'member', userId: 'u', orgId: 'o1', permissions: [] }))).toBe('org:o1');
    expect(() => idempotencyScope(ctx({ type: 'anonymous' }))).toThrow(/Sign in/);
  });
});
