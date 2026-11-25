// @ts-check
/**
 * Cancelling bus seats (S18-T10, B7a).
 * - rules: slabs checked (rising towards departure, no repeats); the strictest passed slab applies; the reversal always
 *   balances to the refund over many generated cases; the bus company keeps its share of the charge;
 * - a buyer cancels one seat of three: charge at the sold slabs, refund straight into the wallet, the seat on sale again,
 *   one balanced ledger entry; the same seat again → refused; after the bus left → refused; a later policy change never
 *   touches the sold ticket;
 * - ops cancel a whole trip with a full refund: a second person must approve; the trip is cancelled, every booking
 *   cancelled with everything refunded, the order cancelled;
 * - a cancellation left half-done (process stopped) is finished by the reconciler step, once.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BusBookingRecord, createBusCancellations, partCharge, partReversal } from '../../src/b2b/modules/bus-booking/index.js';
import { chargePercent, createCancellationPolicies, slabProblems } from '../../src/b2b/modules/bus-catalog/index.js';
import { TripRecord, TripSeatRecord } from '../../src/b2b/modules/bus-inventory/index.js';
import { createPartCancellations, ORDERS, OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { AccountRecord, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { busEngine, CLIENT, OP } from './helpers/bus-engine.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-12-10T10:00:00Z');
const clock = { now: () => now };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof busEngine>>} */
let E;

beforeAll(async () => {
  mongo = await startMongo();
  E = await busEngine(clock);
});
afterAll(async () => mongo.stop());

const passenger = (/** @type {string} */ name, gender = 'M') => ({ name, age: 30, gender });
const wallet = async () =>
  /** @type {any} */ (await AccountRecord.findOne({ ownerOrgId: CLIENT, type: 'WALLET' }).setOptions(S).lean()).balancePaise;
const bookingOf = async (/** @type {any} */ o) =>
  /** @type {any} */ (
    await BusBookingRecord.findOne({ orderId: String(o._id) })
      .setOptions(S)
      .lean()
  );
const seat = async (/** @type {string} */ no) =>
  /** @type {any} */ (await TripSeatRecord.findOne({ tripId: E.tripId, no }).setOptions(S).lean());
const parts = () => createPartCancellations(E.deps);
const cancels = () =>
  createBusCancellations({
    clock,
    cancelPart: async (orderId, bookingRef, part) =>
      parts().cancelPart({
        order: /** @type {any} */ (await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean()),
        bookingRef,
        part,
      }),
  });

describe('slabs and money', () => {
  it('slab checks; strictest slab; reversal balances; operator share', () => {
    expect(
      slabProblems([
        { hoursBefore: 24, percent: 50 },
        { hoursBefore: 4, percent: 25 },
      ]).map((p) => p.code),
    ).toEqual(['SLABS_MUST_RISE']);
    expect(
      slabProblems([
        { hoursBefore: 4, percent: 10 },
        { hoursBefore: 4, percent: 20 },
      ]).map((p) => p.code),
    ).toContain('SLAB_REPEATED');
    const slabs = [
      { hoursBefore: 720, percent: 10 },
      { hoursBefore: 24, percent: 25 },
      { hoursBefore: 4, percent: 100 },
    ];
    const departAt = new Date('2026-12-12T16:30:00Z');
    expect([50, 20, 3].map((h) => chargePercent(slabs, { departAt, now: new Date(departAt.getTime() - h * 3_600_000) }))).toEqual([
      10, 25, 100,
    ]);
    expect(chargePercent([], { departAt, now: departAt })).toBe(0);
    for (let i = 0; i < 1500; i += 1) {
      const net = 10_000 + ((i * 7919) % 300_000);
      const gst = Math.round(net * 0.05);
      const t = {
        totalPaise: net + 5_000 + gst,
        operatorPayablePaise: net,
        cgstPaise: Math.floor(gst / 2),
        sgstPaise: gst - Math.floor(gst / 2),
        igstPaise: 0,
      };
      const c = partCharge({
        slabs,
        departAt,
        now: new Date(departAt.getTime() - ((i % 60) + 1) * 3_600_000),
        totals: t,
        waive: i % 7 === 0,
      });
      expect(c.chargePaise + c.refundPaise).toBe(t.totalPaise);
      expect(c.operatorSharePaise).toBeLessThanOrEqual(c.chargePaise);
      const lines = partReversal(t, c);
      expect(lines.reduce((s, l) => s + (l.debitPaise ?? 0) - (l.creditPaise ?? 0), 0)).toBe(c.refundPaise);
    }
  });
});

describe('cancelling seats', () => {
  it('a buyer cancels one seat of three; refused twice or after departure; sold terms kept', async () => {
    const o = await E.paidOrder([
      { no: 'L1', passenger: passenger('Ravi Kumar') },
      { no: 'L2', passenger: passenger('Amit Rao') },
      { no: 'L3', passenger: passenger('Neha Sen', 'F') },
    ]);
    const b = await bookingOf(o);
    expect(b).toMatchObject({ status: 'CONFIRMED', cancellationPolicy: { slabs: expect.any(Array) } });
    await createCancellationPolicies({ clock }).save(
      { orgId: OP, userId: 'u' },
      { slabs: [{ hoursBefore: 720, percent: 50 }], expectedVersion: 0 },
    ); // after the sale
    const q = cancels().quote(b, ['L1']);
    expect(q).toMatchObject({ percent: 10, chargePaise: 9_975, refundPaise: 89_775, operatorSharePaise: 9_000 }); // 54.5 h before: the sold 10 % slab
    const before = await wallet();
    const part = cancels().buyerPart(b, ['L1'], 'user:u1');
    await parts().cancelPart({ order: o, bookingRef: b.ref, part });
    expect((await wallet()) - before).toBe(89_775);
    expect((await seat('L1')).taken).toBe(0);
    const after = await bookingOf(o);
    expect(after).toMatchObject({
      status: 'CONFIRMED',
      cancelledSeats: ['L1'],
      parts: [expect.objectContaining({ id: part.id, status: 'DONE', refundPaise: 89_775 })],
    });
    const tx = /** @type {any} */ (
      await TransactionRecord.findOne({ 'reference.type': 'part-cancel', 'reference.id': part.id }).setOptions(S).lean()
    );
    const sum = (/** @type {'debitPaise' | 'creditPaise'} */ k) =>
      tx.lines.reduce((/** @type {number} */ t, /** @type {any} */ l) => t + (l[k] ?? 0), 0);
    expect(sum('debitPaise')).toBe(sum('creditPaise'));
    const payable = /** @type {any} */ (await AccountRecord.findOne({ ownerOrgId: OP, type: 'OPERATOR_PAYABLE' }).setOptions(S).lean());
    expect(tx.lines.find((/** @type {any} */ l) => l.accountId === String(payable._id))?.debitPaise).toBe(81_000); // 90,000 − its 9,000 share
    expect(() => cancels().quote(after, ['L1'])).toThrow(expect.objectContaining({ code: 'SEATS_NOT_CANCELLABLE' }));
    now = new Date('2026-12-12T16:45:00Z');
    expect(() => cancels().quote(after, ['L2'])).toThrow(expect.objectContaining({ code: 'TRIP_DEPARTED' }));
    now = new Date('2026-12-10T10:00:00Z');
  });

  it('ops cancel the whole trip with a full refund — second person; trip, bookings and order cancelled', async () => {
    const o = await E.paidOrder([{ no: 'L4', passenger: passenger('Sita Devi', 'F') }]);
    const c = cancels();
    const proposal = await c.propose('staff:a', { scope: 'TRIP', tripId: E.tripId, reason: 'Bus broke down at the depot' });
    await expect(c.decide('staff:a', String(proposal._id), true)).rejects.toMatchObject({ code: 'SECOND_PERSON_REQUIRED' });
    const before = await wallet();
    const done = await c.decide('staff:b', String(proposal._id), true);
    expect(done.results.every((/** @type {any} */ r) => r.error === null)).toBe(true);
    expect((await wallet()) - before).toBe(99_750 + 2 * 99_750); // L4 fully + L2, L3 left from the first booking
    expect((await TripRecord.findById(E.tripId).setOptions(S).lean())?.status).toBe('CANCELLED');
    expect((await bookingOf(o)).status).toBe('CANCELLED');
    expect((await OrderRecord.findById(o._id).setOptions(S).lean())?.status).toBe('CANCELLED');
    await expect(c.decide('staff:c', String(proposal._id), true)).rejects.toMatchObject({ code: 'CANCELLATION_ALREADY_DECIDED' });
  });

  it('a cancellation left half-done is finished once by the reconciler step', async () => {
    await TripRecord.updateOne({ _id: E.tripId }, { $set: { status: 'SCHEDULED' } }).setOptions(S);
    const o = await E.paidOrder([{ no: 'L1', passenger: passenger('Ravi Kumar') }]);
    const b = await bookingOf(o);
    const part = cancels().buyerPart(b, ['L1'], 'user:u1');
    await E.handlers.get('BUS').partStart?.(E.ctx(), o.items[0], part); // started, then the process stopped
    expect((await bookingOf(o)).parts[0]).toMatchObject({ status: 'PENDING' });
    const before = await wallet();
    await parts().finishPart(String(o._id), String(b._id), part.id);
    await parts().finishPart(String(o._id), String(b._id), part.id); // again — nothing more
    expect((await wallet()) - before).toBe(part.refundPaise);
    expect(await bookingOf(o)).toMatchObject({ status: 'CANCELLED', parts: [expect.objectContaining({ status: 'DONE' })] });
    expect(randomUUID).toBeTypeOf('function');
  });
});
