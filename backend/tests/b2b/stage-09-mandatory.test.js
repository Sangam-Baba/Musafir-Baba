// @ts-check
/**
 * Stage 09 mandatory tests (plan §8). Where each one lives:
 * - cancellation table (percent / nights / fixed, buffer, `Asia/Kolkata` deadline ± 1 s) → cancellation-terms.test.js,
 *   and here: randomised policies and moments → charge + refund = paid, never above paid, never cheaper closer to check-in;
 * - cancellation returns rooms exactly once (also finished again; concurrent cancels) → cancellations.test.js;
 * - refund + charge = paid → cancellation-terms.test.js, cancellations.test.js, here (randomised);
 * - credit note numbering → credit-notes.test.js, and here: many reserved at once → 1…n, no gaps, no doubles;
 * - read-model rebuild from events gives the same rows → booking-summaries.test.js;
 * - payables adjust on cancel → payables.test.js; on no-show and hotel failure → here;
 * - a recorded payout can't exceed eligible payables (amount = their total; locked; never paid twice) → payouts.test.js.
 */
import { describe, expect, it } from 'vitest';

import { creditNoteNumber, creditSeriesKey, reserveNumber } from '../../src/b2b/modules/documents/index.js';
import {
  BookingRecord,
  cancellationCharge,
  checkInAt,
  createHotelFailures,
  payableState,
} from '../../src/b2b/modules/hotel-booking/index.js';
import { auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, clock, S, payuSays, engine, bookedOrder, stored, ctx, signed } = E;

/** Small seeded random numbers. @param {number} seed */
function random(seed) {
  let s = seed;
  return (/** @type {number} */ min, /** @type {number} */ max) => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return min + (s % (max - min + 1));
  };
}

describe('cancellation charges (randomised)', () => {
  it('2 000 random policies × moments: charge + refund = paid, charge ≤ paid, never cheaper closer to check-in', () => {
    const rnd = random(2026);
    const checkIn = checkInAt({ checkIn: '2027-01-15' }, { checkInTime: '13:00', timeZone: 'Asia/Kolkata' });
    for (let i = 0; i < 2000; i += 1) {
      const types = /** @type {const} */ (['PERCENT', 'NIGHTS', 'FIXED']);
      const hours = [...new Set([rnd(0, 240), rnd(0, 240), rnd(0, 240)])].sort((a, b) => b - a);
      const type = types[rnd(0, 2)] ?? 'PERCENT';
      const value = (/** @type {number} */ step) =>
        type === 'PERCENT' ? Math.min(100, 10 + step * 30) : type === 'NIGHTS' ? 1 + step : 100_000 * (1 + step);
      const policy = {
        nonRefundable: rnd(0, 20) === 0,
        rules: rnd(0, 20) === 0 ? [] : hours.map((h, step) => ({ hoursBefore: h, penalty: { type, value: value(step) } })),
        noShow: null,
        summary: '',
      };
      if (policy.nonRefundable) policy.rules = [];
      const paid = rnd(1_000, 5_000_000);
      const nights = Array.from({ length: rnd(1, 7) }, () => rnd(500, 1_000_000));
      const buffer = rnd(0, 6);
      let previous = -1;
      for (const hoursBefore of [300, 200, 100, 48, 24, 6, 1, 0, -5]) {
        const now = new Date(checkIn.getTime() - hoursBefore * 3_600_000);
        const r = cancellationCharge({ policy, checkIn, now, bufferHours: buffer, paidPaise: paid, nights });
        expect(r.chargePaise + r.refundPaise).toBe(paid);
        expect(r.chargePaise).toBeGreaterThanOrEqual(0);
        expect(r.chargePaise).toBeLessThanOrEqual(paid);
        expect(r.chargePaise).toBeGreaterThanOrEqual(previous); // closer to check-in never costs less
        previous = r.chargePaise;
      }
    }
  });
});

describe('credit note numbers', () => {
  it('40 credit notes numbered at once → 1…40 in their own series, no gaps or doubles; the same booking twice → one number', async () => {
    const series = creditSeriesKey('07', '26-27');
    const at = clock.now();
    const got = await Promise.all(Array.from({ length: 40 }, (_, i) => reserveNumber(series, `booking:b${i}`, at)));
    expect([...got].sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(await reserveNumber(series, 'booking:b7', at)).toBe(got[7]);
    expect(creditNoteNumber('26-27', '07', 40)).toBe('C2627DL000040');
  });
});

describe('payables on no-show and hotel failure', () => {
  /** A paid, confirmed booking. */
  async function confirmed() {
    const { h, order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
    const o = await stored(order.ref);
    return {
      h,
      o,
      b: /** @type {any} */ (
        await BookingRecord.findOne({ orderId: String(o._id) })
          .setOptions(S)
          .lean()
      ),
    };
  }

  it('no-show (50 % policy): pending while disputable, the hotel share once final and settled; hotel failure → nothing owed', async () => {
    const { h, b } = await confirmed();
    await BookingRecord.updateOne({ _id: b._id }, { $set: { 'snapshot.policy.noShow': { type: 'PERCENT', value: 50 } } }).setOptions(S);
    E.nowMs = Date.parse('2026-12-01T13:00:00+05:30');
    const { MemberRecord } = await import('../../src/b2b/modules/organizations/index.js');
    const { UserRecord } = await import('../../src/b2b/modules/identity/index.js');
    const m = /** @type {any} */ (await MemberRecord.findOne({ orgId: h.orgId }).setOptions(S).lean());
    const token = await app.login(/** @type {any} */ (await UserRecord.findById(m.userId).lean()).email);
    const marked = (await app.srv.post(`/api/v1/hotel/bookings/${b.ref}/no-show`, {}, auth(token))).body;
    const share = Math.round((marked.chargePaise * b.price.totals.hotelPayablePaise) / b.totalPaise);
    expect(await payableState(String(b._id))).toMatchObject({ state: 'PENDING', amountPaise: share });
    const { NoShowRecord } = await import('../../src/b2b/modules/hotel-booking/index.js');
    await NoShowRecord.updateOne({ bookingId: String(b._id) }, { $set: { status: 'FINAL', settled: true } }).setOptions(S);
    expect(await payableState(String(b._id))).toMatchObject({ state: 'ELIGIBLE', amountPaise: share });

    const second = await confirmed();
    const failures = createHotelFailures({ clock });
    await failures.report(/** @type {any} */ ({ actor: { type: 'system', reason: 'test' } }), second.b.ref, 'Hotel flooded');
    expect(await payableState(String(second.b._id))).toMatchObject({ state: 'VOID', amountPaise: 0 });
  });
});
