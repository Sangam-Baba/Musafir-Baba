// @ts-check
/**
 * Paying bus companies and trip problems (S18-T10, B7b — a separate run from hotels).
 * - owed per booking: seats still travelling + the company's share of cancellation charges; PENDING → ELIGIBLE when the
 *   trip ended or everything was cancelled; VOID when nothing is owed;
 * - flow: 2 seats sold, 1 cancelled → trip ends → booking COMPLETED → payable ELIGIBLE → run proposed (payables locked,
 *   one open run) → a second person approves → bank file (amount, IFSC) → paid → one journal entry; the company's
 *   payable account ends at exactly zero; held lines (KYC not approved) wait; a cancelled run frees its payables;
 * - trip problems: the company reports on its own trips only; ops resolve once.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BusBookingRecord, completeTrips } from '../../src/b2b/modules/bus-booking/index.js';
import { createTripProblems } from '../../src/b2b/modules/bus-inventory/index.js';
import { BusPayableRecord, createBusPayables, createBusPayoutRuns, owedOf } from '../../src/b2b/modules/bus-payouts/index.js';
import { createBusCancellations } from '../../src/b2b/modules/bus-booking/index.js';
import { createPartCancellations, ORDERS, OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { AccountRecord, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { busEngine, OP } from './helpers/bus-engine.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-12-10T10:00:00Z');
const clock = { now: () => now };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const logger = /** @type {any} */ ({ warn: () => {}, info: () => {}, error: () => {} });
let kycApproved = true;
const facts = async () => ({
  name: 'Shree Travels',
  kycApproved,
  hasBank: true,
  bankChangedAt: null,
  openDisputes: 0,
  holderName: 'Shree Travels Pvt Ltd',
  ifsc: 'HDFC0001234',
});
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof busEngine>>} */
let E;

beforeAll(async () => {
  mongo = await startMongo();
  E = await busEngine(clock);
});
afterAll(async () => mongo.stop());

const runs = () => createBusPayoutRuns({ clock, ledger: E.ledger, facts, account: async () => '50100012345678' });
const payables = () => createBusPayables({ clock, logger });

describe('owed per booking', () => {
  it('travelling seats + charge shares; states', () => {
    const price = {
      lines: [
        { no: 'A', netPaise: 90_000 },
        { no: 'B', netPaise: 80_000 },
      ],
    };
    expect(owedOf({ status: 'CONFIRMED', price, cancelledSeats: [], parts: [] })).toEqual({ amountPaise: 170_000, state: 'PENDING' });
    expect(owedOf({ status: 'COMPLETED', price, cancelledSeats: ['B'], parts: [{ status: 'DONE', operatorSharePaise: 8_000 }] })).toEqual({
      amountPaise: 98_000,
      state: 'ELIGIBLE',
    });
    expect(owedOf({ status: 'CANCELLED', price, cancelledSeats: ['A', 'B'], parts: [{ status: 'DONE', operatorSharePaise: 0 }] })).toEqual({
      amountPaise: 0,
      state: 'VOID',
    });
  });
});

describe('bus payout run', () => {
  it('sold → part cancelled → trip ended → paid; the company payable account ends at zero', async () => {
    const o = await E.paidOrder([
      { no: 'L1', passenger: { name: 'Ravi Kumar', age: 30, gender: 'M' } },
      { no: 'L2', passenger: { name: 'Amit Rao', age: 31, gender: 'M' } },
    ]);
    const b = /** @type {any} */ (
      await BusBookingRecord.findOne({ orderId: String(o._id) })
        .setOptions(S)
        .lean()
    );
    const cancels = createBusCancellations({ clock, cancelPart: async () => null });
    await createPartCancellations(E.deps).cancelPart({ order: o, bookingRef: b.ref, part: cancels.buyerPart(b, ['L2'], 'user:u') });
    expect(await payables().sync(String(b._id))).toMatchObject({ status: 'PENDING', amountPaise: 99_000 }); // 90,000 + its 9,000 share
    now = new Date('2026-12-13T02:00:00Z'); // arrived 23:00Z + 3 h
    expect(await completeTrips({ clock })).toEqual({ completed: 1 });
    expect(await payables().sync(String(b._id))).toMatchObject({ status: 'ELIGIBLE', amountPaise: 99_000 });
    expect((await OrderRecord.findById(o._id).setOptions(S).lean())?.status).toBe('CONFIRMED'); // completed by the event consumer in the app

    const run = await runs().propose('staff:a', { cycleEnd: '2026-12-13' });
    expect(run.totals).toMatchObject({ lines: 1, grossPaise: 99_000, netPaise: 99_000 });
    await expect(runs().propose('staff:a', { cycleEnd: '2026-12-13' })).rejects.toMatchObject({ code: 'PAYOUT_RUN_OPEN' });
    expect(
      (
        await BusPayableRecord.findOne({ bookingId: String(b._id) })
          .setOptions(S)
          .lean()
      )?.runId,
    ).toBe(String(run._id));
    await expect(runs().approve('staff:a', String(run._id))).rejects.toMatchObject({ code: 'SECOND_PERSON_REQUIRED' });
    await runs().approve('staff:b', String(run._id));
    const csv = await runs().bankFile('staff:a', String(run._id));
    expect(csv.split('\n')[1]).toMatch(/^Shree Travels Pvt Ltd,50100012345678,HDFC0001234,990\.00,BPR-/);
    const paid = await runs().paid('staff:a', String(run._id), { bankReference: 'UTR123456' });
    expect(paid.status).toBe('PAID');
    expect(
      (
        await BusPayableRecord.findOne({ bookingId: String(b._id) })
          .setOptions(S)
          .lean()
      )?.status,
    ).toBe('PAID');
    await runs().paid('staff:a', String(run._id), { bankReference: 'UTR123456' }); // again — nothing more

    const account = /** @type {any} */ (await AccountRecord.findOne({ ownerOrgId: OP, type: 'OPERATOR_PAYABLE' }).setOptions(S).lean());
    const txs = await TransactionRecord.find({ 'lines.accountId': String(account._id) })
      .setOptions(S)
      .lean();
    const net = txs
      .flatMap((t) => t.lines)
      .filter((l) => l.accountId === String(account._id))
      .reduce((s, l) => s + (l.creditPaise ?? 0) - (l.debitPaise ?? 0), 0);
    expect(net).toBe(0); // 180,000 credited − 81,000 cancelled − 99,000 paid
    expect(txs.filter((t) => t.purpose === 'bus-payout')).toHaveLength(1);
    expect(await payables().sync(String(b._id))).toMatchObject({ status: 'PAID' }); // locked
  });

  it('a line waits when KYC is not approved; a cancelled run frees its payables', async () => {
    now = new Date('2026-12-10T10:00:00Z');
    const o = await E.paidOrder([{ no: 'L3', passenger: { name: 'Neha Sen', age: 28, gender: 'F' } }]);
    const b = /** @type {any} */ (
      await BusBookingRecord.findOne({ orderId: String(o._id) })
        .setOptions(S)
        .lean()
    );
    now = new Date('2026-12-13T02:00:00Z');
    await completeTrips({ clock });
    await payables().sync(String(b._id));
    kycApproved = false;
    const run = await runs().propose('staff:a', { cycleEnd: '2026-12-13' });
    const { lines } = await runs().get(String(run._id));
    expect(lines[0]).toMatchObject({ status: 'HELD', holdReasons: ['KYC_NOT_APPROVED'] });
    await runs().cancel('staff:a', String(run._id));
    expect(
      (
        await BusPayableRecord.findOne({ bookingId: String(b._id) })
          .setOptions(S)
          .lean()
      )?.runId,
    ).toBeNull();
    kycApproved = true;
    expect(await OrderRecord.countDocuments({}).setOptions(ORDERS)).toBeGreaterThan(0);
  });
});

describe('trip problems', () => {
  it('own trips only; resolved once', async () => {
    const problems = createTripProblems({ clock });
    await expect(
      problems.report({ orgId: '65f0000000000000000b9999', userId: 'x' }, E.tripId, { kind: 'BREAKDOWN', note: 'Engine trouble' }),
    ).rejects.toMatchObject({ code: 'TRIP_NOT_FOUND' });
    const p = await problems.report({ orgId: OP, userId: 'u' }, E.tripId, {
      kind: 'DELAY',
      note: 'Stuck at the toll plaza',
      delayMinutes: 90,
    });
    expect(await problems.queue({})).toEqual([expect.objectContaining({ id: p.id, kind: 'DELAY', delayMinutes: 90 })]);
    expect((await problems.resolve('staff:a', p.id, 'Passengers told; bus left 90 min late')).status).toBe('RESOLVED');
    await expect(problems.resolve('staff:b', p.id, 'again')).rejects.toMatchObject({ code: 'PROBLEM_ALREADY_RESOLVED' });
    expect(await problems.mine(OP)).toHaveLength(1);
  });
});
