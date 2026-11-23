// @ts-check
/**
 * Stage 08 mandatory tests (plan §9, `05-…` §12 for the website + admin channels; B2B channels are re-run in Stage 12).
 * Here: the last-room race through the real API, PayU pending resolved by the poller, a crash after the payment was
 * verified finished forward by the reconciler, and an abandoned checkout giving its rooms back — each ending with the
 * inventory, order and booking checks finding nothing wrong. Where the others live:
 * - multi-night partial, validator, allotment below booked, hold crash steps → hotel-inventory Stage 04 suites;
 * - late payment (rooms gone → refund once; rooms free → confirmed) → orders-payment.test.js;
 * - duplicate guard, idempotency (same key ×5 → 1 order, 1 hold), HOLDING crash → orders-create.test.js;
 * - ledger postings for a PayU booking match the table → orders-payment.test.js;
 * - invoice numbering gap-free under concurrency → documents.test.js;
 * - safety limits → orders-create.test.js; sweeper / invariants → orders-sweeper.test.js;
 * - mixed channels (website + dashboard + API) → Stage 12 / 14 when those channels can book;
 * - soak (2 h, random kills) → DEF-031 (needs a staging copy).
 */
import { describe, expect, it } from 'vitest';

import { BookingRecord, bookingInvariants } from '../../src/b2b/modules/hotel-booking/index.js';
import { bookedNightOwners, InventoryDayRecord, inventoryInvariants, sweepHolds } from '../../src/b2b/modules/hotel-inventory/index.js';
import { orderInvariants, orderReconcileRules, OrderRecord, sweepOrders } from '../../src/b2b/modules/orders/index.js';
import { IntentRecord, pollPayments } from '../../src/b2b/modules/payments/index.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, clock, S, logger, payuSays, stay, engine, bookedOrder, stored, ctx, signed } = E;

/** Every check of the inventory, orders and bookings finds nothing. */
async function allChecksClean() {
  const checks = [
    ...inventoryInvariants({ clock }),
    ...orderInvariants({ clock }),
    ...bookingInvariants({ clock, owners: () => bookedNightOwners(clock) }),
  ];
  for (const c of checks) expect({ name: c.name, found: await c.check() }).toEqual({ name: c.name, found: [] });
}
/** @param {any} b */
const nightsOf = async (b) =>
  InventoryDayRecord.find({ roomTypeId: b.stay.roomTypeId, date: { $in: b.stay.nights } })
    .setOptions(S)
    .lean();

describe('last room', () => {
  it('50 people book the last room at once → exactly 1 order, 49 sold out; counts consistent; paid → booked', async () => {
    const { h, order: first } = await bookedOrder(2); // 2 rooms: one held by the first order, one left
    const token = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).body.offers[0].priceToken;
    const body = {
      priceToken: token,
      rooms: [{ leadGuest: 'Asha Verma' }],
      contact: { name: 'Asha Verma', email: 'asha@example.com', phone: '9876543210' },
    };
    const tries = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        app.srv.post('/api/v1/orders', body, {
          'x-guest-session': `race-guest-session-${String(i).padStart(10, '0')}`,
          'idempotency-key': `race-key-${String(i).padStart(10, '0')}`,
          'cf-connecting-ip': `10.0.${Math.floor(i / 250)}.${(i % 250) + 1}`,
        }),
      ),
    );
    const won = tries.filter((t) => t.status === 201);
    expect(won).toHaveLength(1);
    expect(tries.filter((t) => t.status === 409 && t.body.code === 'SOLD_OUT')).toHaveLength(49);
    const winner = /** @type {any} */ (await BookingRecord.findOne({ orderRef: won[0]?.body.ref }).setOptions(S).lean());
    for (const n of await nightsOf(winner)) expect(n).toMatchObject({ total: 2, held: 2, booked: 0 });
    await allChecksClean();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(won[0]?.body.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: won[0]?.body.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
    expect((await stored(won[0]?.body.ref)).status).toBe('CONFIRMED');
    for (const n of await nightsOf(winner)) expect(n).toMatchObject({ total: 2, held: 1, booked: 1 });
    expect((await stored(first.ref)).status).toBe('AWAITING_PAYMENT');
    await allChecksClean();
  });
});

describe('payments', () => {
  it('PayU pending → hold extended once → the poller sees the success → confirmed', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'PENDING' });
    E.nowMs += 2 * 60_000;
    await pollPayments(e.paymentsDeps);
    await e.deliver(form.txnId);
    expect(await stored(order.ref)).toMatchObject({ status: 'PAYMENT_PENDING', holdExtended: true });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    E.nowMs += 3 * 60_000;
    await pollPayments(e.paymentsDeps);
    await e.deliver(form.txnId);
    expect((await stored(order.ref)).status).toBe('CONFIRMED');
    await allChecksClean();
  });
});

describe('crashes and abandonment', () => {
  it('stopped right after PayU verified (order CONFIRMING, rooms still held) → the reconciler finishes forward', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form)); // verified — but the process stops before the order hears it
    const intent = /** @type {any} */ (await IntentRecord.findOne({ txnId: form.txnId }).lean());
    await OrderRecord.updateOne(
      { ref: order.ref },
      {
        $set: {
          status: 'CONFIRMING',
          statusChangedAt: new Date(E.nowMs - 60_000),
          'payment.verified': true,
          'payment.verifiedIntentId': String(intent._id),
        },
      },
    ).setOptions(S);
    const rule = orderReconcileRules(e.deps).find((r) => r.name === 'orders-confirming');
    await rule?.resume(await stored(order.ref), { clock, logger });
    await rule?.resume(await stored(order.ref), { clock, logger });
    expect(await stored(order.ref)).toMatchObject({ status: 'CONFIRMED', journalPosted: true });
    await allChecksClean();
  });

  it('an abandoned checkout gives its rooms back within the sweeps; no negative counts', async () => {
    const { order } = await bookedOrder();
    const o = await stored(order.ref);
    const b = /** @type {any} */ (
      await BookingRecord.findOne({ orderId: String(o._id) })
        .setOptions(S)
        .lean()
    );
    E.nowMs += 16 * 60_000;
    await sweepHolds({ clock, logger });
    await sweepOrders((await engine()).deps);
    expect((await stored(order.ref)).status).toBe('EXPIRED');
    for (const n of await nightsOf(b)) expect(n).toMatchObject({ held: 0, booked: 0 });
    await allChecksClean();
  });
});
