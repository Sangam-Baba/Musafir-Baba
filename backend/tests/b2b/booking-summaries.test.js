// @ts-check
/** Booking summaries (S09-T02): one row per booking from the order and its bookings; events applied twice or a full rebuild give the same rows. */
import { describe, expect, it } from 'vitest';

import { fingerprint } from '../../src/b2b/modules/orders/index.js';
import { BookingSummaryRecord } from '../../src/b2b/modules/reporting/index.js';
import { summaryJobs } from '../../src/b2b/routes/reporting-wiring.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { S, payuSays, engine, bookedOrder, newOrder, stored, ctx, signed } = E;
const rows = async () =>
  (await BookingSummaryRecord.find({}, { _id: 0, projectedAt: 0 }).setOptions(S).sort({ bookingRef: 1 }).lean()).map((r) => ({ ...r }));

describe('booking summaries', () => {
  it('paid and unpaid orders → their rows; repeats and a full rebuild give the same rows; the buyer lists theirs', async () => {
    const { h, order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
    const other = await newOrder(h, 'second-guest-session-0000002');
    const { consumer, summaries } = summaryJobs(e.deps);
    for (const ref of [order.ref, other.ref]) await consumer.handler({ payload: { orderId: String((await stored(ref))._id) } });
    const first = await rows();
    expect(first).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderRef: order.ref,
          productType: 'HOTEL',
          channel: 'WEBSITE',
          bookingStatus: 'CONFIRMED',
          orderStatus: 'CONFIRMED',
          paymentState: 'PAID',
          leadGuest: 'Asha Verma',
          propertyName: expect.any(String),
          totalPaise: order.totalPaise,
        }),
        expect.objectContaining({ orderRef: other.ref, bookingStatus: 'HELD', orderStatus: 'AWAITING_PAYMENT', paymentState: 'UNPAID' }),
      ]),
    );
    expect(first).toHaveLength(2);
    await consumer.handler({ payload: { orderId: String((await stored(order.ref))._id) } });
    expect(await rows()).toEqual(first);
    await BookingSummaryRecord.deleteMany({}).setOptions(S);
    expect(await summaries.rebuild()).toEqual({ orders: 2 });
    expect(await rows()).toEqual(first);
    const mine = await summaries.forBuyer({ guestKey: fingerprint('guest-session-0000000000001') });
    expect(mine.map((r) => r.orderRef)).toEqual([order.ref]);
    expect(await summaries.forBuyer({})).toEqual([]);
  });
});
