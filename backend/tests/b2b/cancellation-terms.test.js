// @ts-check
/** Cancellation terms (S09-T03/T04 domain) and the customer's bookings (S09-T03): charge table, deadlines ± 1 s in Indian time, split; list and detail for the buyer only. */
import { describe, expect, it } from 'vitest';

import { cancellationCharge, checkInAt, deadlines, nightAmounts, splitCharge } from '../../src/b2b/modules/hotel-booking/index.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, payuSays, engine, bookedOrder, stored, ctx, signed } = E;

const policy = (/** @type {any} */ over = {}) => ({
  nonRefundable: false,
  rules: [
    { hoursBefore: 72, penalty: { type: 'PERCENT', value: 25 } },
    { hoursBefore: 24, penalty: { type: 'NIGHTS', value: 1 } },
    { hoursBefore: 0, penalty: { type: 'FIXED', value: 500000 } },
  ],
  noShow: { type: 'PERCENT', value: 100 },
  summary: 's',
  ...over,
});
const checkIn = checkInAt({ checkIn: '2026-12-10' }, { checkInTime: '14:00', timeZone: 'Asia/Kolkata' }); // 08:30 UTC
const nights = [120000, 130000, 140000];
const at = (/** @type {string} */ iso, /** @type {any} */ p = policy(), buffer = 0) =>
  cancellationCharge({ policy: p, checkIn, now: new Date(iso), bufferHours: buffer, paidPaise: 390000, nights });

describe('charge table', () => {
  it('check-in 14:00 India time = 08:30 UTC; free until 72 h before; each step only after its exact moment', () => {
    expect(checkIn.toISOString()).toBe('2026-12-10T08:30:00.000Z');
    expect(at('2026-12-07T08:29:59Z')).toMatchObject({ chargePaise: 0, refundPaise: 390000, penalty: null });
    expect(at('2026-12-07T08:30:00Z').chargePaise).toBe(0); // at the deadline itself: still free
    expect(at('2026-12-07T08:30:01Z')).toMatchObject({ chargePaise: 97500, refundPaise: 292500 }); // 25 %
    expect(at('2026-12-09T08:30:01Z').chargePaise).toBe(120000); // the first night (price + GST)
    expect(at('2026-12-10T08:30:01Z').chargePaise).toBe(390000); // fixed ₹5,000 > paid → capped at what was paid
  });

  it('a buffer moves every deadline earlier; non-refundable charges everything; charge + refund = paid', () => {
    expect(at('2026-12-07T05:00:00Z', policy(), 4).chargePaise).toBe(97500); // 72 h + 4 h before
    expect(at('2026-12-01T00:00:00Z', { ...policy(), nonRefundable: true, rules: [] })).toMatchObject({
      chargePaise: 390000,
      refundPaise: 0,
    });
    for (const iso of ['2026-12-01T00:00:00Z', '2026-12-08T00:00:00Z', '2026-12-09T12:00:00Z', '2026-12-11T00:00:00Z']) {
      const r = at(iso);
      expect(r.chargePaise + r.refundPaise).toBe(390000);
    }
    const d = deadlines(policy(), checkIn);
    expect(d.freeUntil?.toISOString()).toBe('2026-12-07T08:30:00.000Z');
    expect(d.steps.map((s) => s.text)).toEqual(['25% of the booking amount', "the first night's price", '₹5,000']);
  });

  it('nights in date order (all rooms of a night); the hotel keeps its share of the charge (D5, for now)', () => {
    const lines = [
      { date: '2026-12-11', sellPaise: 100, gst: { gstPaise: 5 } },
      { date: '2026-12-10', sellPaise: 200, gst: { gstPaise: 10 } },
      { date: '2026-12-10', sellPaise: 200, gst: { gstPaise: 10 } },
    ];
    expect(nightAmounts({ lines })).toEqual([420, 105]);
    expect(splitCharge({ chargePaise: 100000, totalPaise: 400000, hotelPayablePaise: 300000 })).toEqual({
      hotelPaise: 75000,
      musafirbabaPaise: 25000,
    });
  });
});

describe("the customer's bookings", () => {
  it('this browser lists its bookings; the detail with terms, payments and documents for the buyer only', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
    const o = await stored(order.ref);
    const { summaryJobs } = await import('../../src/b2b/routes/reporting-wiring.js');
    await summaryJobs(e.deps).summaries.project(String(o._id));
    const me = { 'x-guest-session': 'guest-session-0000000000001' };
    const list = await app.srv.get('/api/v1/bookings/hotels', me);
    expect(list.body.data).toEqual([expect.objectContaining({ orderRef: order.ref, bookingStatus: 'CONFIRMED', paymentState: 'PAID' })]);
    expect(JSON.stringify(list.body)).not.toMatch(/guestKey|hotelOrgId|customerId/);
    expect((await app.srv.get('/api/v1/bookings/hotels')).status).toBe(401);
    expect((await app.srv.get('/api/v1/bookings/hotels', { 'x-guest-session': 'someone-else-session-0000009' })).body.data).toEqual([]);
    const ref = o.items[0].bookingRef;
    const d = await app.srv.get(`/api/v1/bookings/hotels/${ref}`, me);
    expect(d.status).toBe(200);
    expect(d.body).toMatchObject({
      booking: { ref, status: 'CONFIRMED' },
      order: { ref: order.ref, status: 'CONFIRMED' },
      terms: { timeZone: 'Asia/Kolkata', canCancelOnline: true, ifCancelledNow: { chargePaise: 0, refundPaise: order.totalPaise } },
      payments: [expect.objectContaining({ status: 'SUCCEEDED', amountPaise: order.totalPaise })],
    });
    expect(JSON.stringify(d.body)).not.toMatch(/orderId|hotelOrgId|netPaise|marginPaise/);
    expect((await app.srv.get(`/api/v1/bookings/hotels/${ref}`, { 'x-guest-session': 'someone-else-session-0000009' })).status).toBe(404);
    expect((await app.srv.get(`/api/v1/bookings/hotels/${ref}?key=${order.linkKey}`)).status).toBe(200);
  });
});
