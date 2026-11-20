// @ts-check
/** Orders sweeper and checks (S08-T06): unpaid orders expire with their rooms back; refunds never asked are asked once; the invariant checks find what they should. */
import { describe, expect, it } from 'vitest';

import { BookingRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { orderInvariants, OrderRecord, sweepOrders } from '../../src/b2b/modules/orders/index.js';
import { IntentRecord, RefundRecord } from '../../src/b2b/modules/payments/index.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, clock, S, payuSays, stay, engine, bookedOrder, stored, ctx, signed } = E;

describe('sweeper and checks', () => {
  it('an unpaid order whose hold ended → EXPIRED, rooms back, booking EXPIRED; checks find nothing wrong', async () => {
    const { h, order } = await bookedOrder();
    const e = await engine();
    const left = async () => (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).body.offers[0].roomsLeft;
    const before = await left();
    E.nowMs += 16 * 60_000;
    expect(await sweepOrders(e.deps)).toMatchObject({ expired: 1 });
    expect(await sweepOrders(e.deps)).toMatchObject({ expired: 0 });
    const o = await stored(order.ref);
    expect(o.status).toBe('EXPIRED');
    expect(
      (
        await BookingRecord.findOne({ orderId: String(o._id) })
          .setOptions(S)
          .lean()
      )?.status,
    ).toBe('EXPIRED');
    expect(await left()).toBe(before + 1);
    for (const inv of orderInvariants({ clock })) expect(await inv.check()).toEqual([]);
  });

  it('checks: a confirmed gateway order without a verified payment, an order stuck in a middle step, a paid order neither confirmed nor refunded', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form)); // paid — but the order never hears of it (as if the consumer were down)
    await OrderRecord.updateOne({ ref: order.ref }, { $set: { status: 'CONFIRMED' } }).setOptions(S);
    E.nowMs += 11 * 60_000;
    const [verified, stuck, paid] = orderInvariants({ clock });
    expect((await verified?.check())?.map((f) => f.detail)).toEqual([`${order.ref} confirmed without a verified PayU payment`]);
    expect(await paid?.check()).toEqual([expect.objectContaining({ id: form.txnId })]);
    await OrderRecord.updateOne(
      { ref: order.ref },
      { $set: { status: 'CONFIRMING', statusChangedAt: new Date(E.nowMs - 6 * 60_000) } },
    ).setOptions(S);
    expect((await stuck?.check())?.map((f) => f.detail)).toEqual([`${order.ref} still CONFIRMING`]);
  });

  it('a failed paid order whose refund was never asked (process stopped) → the sweeper asks once', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form));
    const intent = /** @type {any} */ (await IntentRecord.findOne({ txnId: form.txnId }).lean());
    await OrderRecord.updateOne(
      { ref: order.ref },
      {
        $set: {
          status: 'FAILED',
          'payment.verified': true,
          'payment.verifiedIntentId': String(intent._id),
          'payment.refundKey': 'rooms-lost',
        },
      },
    ).setOptions(S);
    E.nowMs += 2 * 60_000;
    expect(await sweepOrders(e.deps)).toMatchObject({ refundsAsked: 1 });
    expect(await sweepOrders(e.deps)).toMatchObject({ refundsAsked: 0 });
    expect(E.refundCalls).toHaveLength(1);
    expect(await RefundRecord.countDocuments({ key: 'rooms-lost' })).toBe(1);
  });
});
