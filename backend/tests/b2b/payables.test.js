// @ts-check
/** Completed stays and hotel payables (S09-T10): one payable per booking following its state; completed → ready to pay; paid ones locked; the ledger's hotel payable equals the payables. */
import { describe, expect, it } from 'vitest';

import { BookingRecord, completeStays } from '../../src/b2b/modules/hotel-booking/index.js';
import { balancesOf, PayableRecord, rollUpBalances } from '../../src/b2b/modules/wallet/index.js';
import { payableJobs } from '../../src/b2b/routes/payables-wiring.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, clock, S, payuSays, engine, bookedOrder, newOrder, stored, ctx, signed } = E;
const ME = (/** @type {string} */ s) => ({ 'x-guest-session': s });
let k = 0;

/** @param {string} session @param {any} [hotel] */
async function confirmed(session = 'guest-session-0000000000001', hotel) {
  const order = hotel ? await newOrder(hotel, session) : (await bookedOrder()).order;
  const e = await engine();
  const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
  payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
  await e.payments.handleCallback(signed(form));
  await e.deliver(form.txnId);
  const o = await stored(order.ref);
  const b = /** @type {any} */ (
    await BookingRecord.findOne({ orderId: String(o._id) })
      .setOptions(S)
      .lean()
  );
  return { o, e, b, jobs: payableJobs(e.deps) };
}
const payable = async (/** @type {any} */ b) =>
  /** @type {any} */ (
    await PayableRecord.findOne({ bookingId: String(b._id) })
      .setOptions(S)
      .lean()
  );

describe('hotel payables', () => {
  it('confirmed → pending; the stay ends (hotel time) → completed, ready to pay, order completed; paid ones never change', async () => {
    const { o, b, jobs } = await confirmed();
    await jobs.payables.sync(String(b._id));
    expect(await payable(b)).toMatchObject({ status: 'PENDING', amountPaise: b.price.totals.hotelPayablePaise, checkOut: '2026-12-03' });
    E.nowMs = Date.parse('2026-12-03T23:00:00+05:30'); // check-out day not over yet
    expect(await completeStays({ clock })).toEqual({ completed: 0 });
    E.nowMs = Date.parse('2026-12-04T00:30:00+05:30');
    expect(await completeStays({ clock })).toEqual({ completed: 1 });
    expect((await BookingRecord.findById(b._id).setOptions(S).lean())?.status).toBe('COMPLETED');
    for (const c of jobs.consumers) await c.handler({ payload: { bookingId: String(b._id), orderId: String(o._id) } });
    expect(await payable(b)).toMatchObject({ status: 'ELIGIBLE', eligibleAt: expect.any(Date) });
    expect((await stored(o.ref)).status).toBe('COMPLETED');
    await PayableRecord.updateOne({ bookingId: String(b._id) }, { $set: { status: 'PAID', amountPaise: 1 } }).setOptions(S);
    await jobs.payables.sync(String(b._id));
    expect(await payable(b)).toMatchObject({ status: 'PAID', amountPaise: 1 }); // locked
  });

  it('cancellations: free → void; with a charge → the hotel share, ready to pay; the ledger hotel payable = the sum of payables', async () => {
    const first = await confirmed();
    await BookingRecord.updateOne(
      { _id: first.b._id },
      { $set: { 'snapshot.policy.rules': [{ hoursBefore: 8000, penalty: { type: 'PERCENT', value: 40 } }] } },
    ).setOptions(S);
    const q = (await app.srv.post(`/api/v1/bookings/hotels/${first.b.ref}/cancellation-quote`, {}, ME('guest-session-0000000000001'))).body;
    k += 1;
    await app.srv.post(
      `/api/v1/bookings/hotels/${first.b.ref}/cancel`,
      { quoteToken: q.quoteToken },
      { ...ME('guest-session-0000000000001'), 'idempotency-key': `pay-key-${String(k).padStart(8, '0')}` },
    );
    await first.jobs.payables.sync(String(first.b._id));
    const share = /** @type {any} */ (await BookingRecord.findById(first.b._id).setOptions(S).lean()).cancellation.hotelSharePaise;
    expect(share).toBeGreaterThan(0);
    expect(await payable(first.b)).toMatchObject({ status: 'ELIGIBLE', amountPaise: share });
    const hotel = /** @type {any} */ (await (await import('./helpers/search-setup.js')).sellableHotel(app));
    const second = await confirmed('guest-session-0000000000002', hotel);
    const q2 = (await app.srv.post(`/api/v1/bookings/hotels/${second.b.ref}/cancellation-quote`, {}, ME('guest-session-0000000000002')))
      .body;
    k += 1;
    await app.srv.post(
      `/api/v1/bookings/hotels/${second.b.ref}/cancel`,
      { quoteToken: q2.quoteToken },
      { ...ME('guest-session-0000000000002'), 'idempotency-key': `pay-key-${String(k).padStart(8, '0')}` },
    );
    await second.jobs.payables.sync(String(second.b._id));
    expect(await payable(second.b)).toMatchObject({ status: 'VOID', amountPaise: 0 });
    await rollUpBalances({ clock });
    const balances = await balancesOf();
    for (const b of [first.b, second.b]) {
      const acc = balances.find((a) => a.type === 'PAYABLE' && a.ownerOrgId === b.hotelOrgId);
      expect(acc?.balancePaise ?? 0).toBe((await payable(b)).amountPaise);
    }
  });
});
