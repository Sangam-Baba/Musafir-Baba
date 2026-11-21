// @ts-check
/**
 * Cancelling a hotel booking (S09-T05): quote → cancel → rooms back once → ledger reversal (D5 pro rata) → refund to the
 * source → CANCELLED (booking and order); refund + charge = paid; two at once → one wins; crash → finished forward.
 */
import { describe, expect, it } from 'vitest';

import { BookingRecord, CancellationRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { InventoryDayRecord } from '../../src/b2b/modules/hotel-inventory/index.js';
import { createOrderCancellations } from '../../src/b2b/modules/orders/index.js';
import { RefundRecord } from '../../src/b2b/modules/payments/index.js';
import { AccountRecord, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { asStaff } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, S, payuSays, engine, bookedOrder, stored, ctx, signed } = E;
const ME = { 'x-guest-session': 'guest-session-0000000000001' };
let n = 0;
const key = () => `cancel-key-${String((n += 1)).padStart(8, '0')}`;

/** A paid, confirmed booking. */
async function confirmed() {
  const { order } = await bookedOrder();
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
  return { order, o, b, e };
}
/** @param {any} b */
const nights = async (b) =>
  InventoryDayRecord.find({ roomTypeId: b.stay.roomTypeId, date: { $in: b.stay.nights } })
    .setOptions(S)
    .lean();
/** @param {string} ref */
const quote = async (ref) => (await app.srv.post(`/api/v1/bookings/hotels/${ref}/cancellation-quote`, {}, ME)).body;
const typeOf = async () => new Map((await AccountRecord.find({}).setOptions(S).lean()).map((a) => [String(a._id), a.type]));

describe('cancel', () => {
  it('free cancellation: rooms back, the whole confirmation reversed, full refund to the source, booking and order CANCELLED', async () => {
    const { order, o, b } = await confirmed();
    for (const x of await nights(b)) expect(x.booked).toBe(1);
    const q = await quote(b.ref);
    const r = await app.srv.post(
      `/api/v1/bookings/hotels/${b.ref}/cancel`,
      { quoteToken: q.quoteToken, reason: 'Plans changed' },
      { ...ME, 'idempotency-key': key() },
    );
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      chargePaise: 0,
      refundPaise: order.totalPaise,
      booking: { status: 'CANCELLED', cancelled: { refundPaise: order.totalPaise } },
    });
    for (const x of await nights(b)) expect(x).toMatchObject({ booked: 0, held: 0 });
    expect((await stored(order.ref)).status).toBe('CANCELLED');
    const [entry] = await TransactionRecord.find({ 'reference.type': 'cancellation' }).lean();
    const types = await typeOf();
    const by = Object.fromEntries((entry?.lines ?? []).map((l) => [types.get(l.accountId), [l.debitPaise ?? 0, l.creditPaise ?? 0]]));
    expect(by.CUSTOMER_ADVANCES).toEqual([0, order.totalPaise]);
    expect(by.PAYABLE).toEqual([b.price.totals.hotelPayablePaise, 0]);
    const debits = (entry?.lines ?? []).reduce((s, l) => s + (l.debitPaise ?? 0), 0);
    expect(debits).toBe(order.totalPaise);
    expect(await RefundRecord.find({}).lean()).toEqual([
      expect.objectContaining({ key: `cancel:${String(b._id)}`, amountPaise: order.totalPaise }),
    ]);
    expect(
      await CancellationRecord.findOne({ bookingId: String(b._id) })
        .setOptions(S)
        .lean(),
    ).toMatchObject({ status: 'CANCELLED', chargePaise: 0, hotelSharePaise: 0, orderRef: o.ref });
    const monitor = await app.admin.get('/api/v1/admin/cancellations', asStaff('o1:hotel-booking.admin.read'));
    expect(monitor.body.data).toEqual([expect.objectContaining({ bookingRef: b.ref, status: 'CANCELLED', refundPaise: order.totalPaise })]);
    expect((await app.admin.get('/api/v1/admin/cancellations', asStaff('x:hotel-catalog.listing.read'))).status).toBe(403);
  });

  it('with a charge: refund + charge = paid; the hotel keeps its share (D5), the refunded part is reversed', async () => {
    const { order, b } = await confirmed();
    await BookingRecord.updateOne(
      { _id: b._id },
      { $set: { 'snapshot.policy.rules': [{ hoursBefore: 8000, penalty: { type: 'PERCENT', value: 40 } }] } },
    ).setOptions(S);
    const q = await quote(b.ref);
    expect(q.chargePaise + q.refundPaise).toBe(order.totalPaise);
    expect(q.chargePaise).toBe(Math.round(order.totalPaise * 0.4));
    await app.srv.post(`/api/v1/bookings/hotels/${b.ref}/cancel`, { quoteToken: q.quoteToken }, { ...ME, 'idempotency-key': key() });
    const c = /** @type {any} */ (
      await CancellationRecord.findOne({ bookingId: String(b._id) })
        .setOptions(S)
        .lean()
    );
    const hp = b.price.totals.hotelPayablePaise;
    expect(c.hotelSharePaise).toBe(Math.round((q.chargePaise * hp) / order.totalPaise));
    const [entry] = await TransactionRecord.find({ 'reference.type': 'cancellation' }).lean();
    const types = await typeOf();
    const by = Object.fromEntries((entry?.lines ?? []).map((l) => [types.get(l.accountId), [l.debitPaise ?? 0, l.creditPaise ?? 0]]));
    expect(by.PAYABLE).toEqual([hp - c.hotelSharePaise, 0]);
    expect(by.CUSTOMER_ADVANCES).toEqual([0, q.refundPaise]);
    expect(await RefundRecord.find({}).lean()).toEqual([expect.objectContaining({ amountPaise: q.refundPaise })]);
  });

  it('two cancellations at once → one wins; rooms back, entry and refund exactly once even when finished again', async () => {
    const { o, b, e } = await confirmed();
    const q = await quote(b.ref);
    const both = await Promise.all(
      [1, 2].map(() =>
        app.srv.post(`/api/v1/bookings/hotels/${b.ref}/cancel`, { quoteToken: q.quoteToken }, { ...ME, 'idempotency-key': key() }),
      ),
    );
    expect(both.filter((x) => x.status === 200)).toHaveLength(1);
    expect(both.find((x) => x.status !== 200)?.status).toBe(409);
    await createOrderCancellations(e.deps).finishBooking(String(o._id), String(b._id));
    for (const x of await nights(b)) expect(x).toMatchObject({ booked: 0, held: 0, total: x.total });
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'cancellation' })).toBe(1);
    expect(await RefundRecord.countDocuments({})).toBe(1);
  });

  it('stopped half way (CANCELLING) → the reconciler finishes it; someone else, an edited or expired quote are refused', async () => {
    const { o, b, e } = await confirmed();
    expect(
      (await app.srv.post(`/api/v1/bookings/hotels/${b.ref}/cancellation-quote`, {}, { 'x-guest-session': 'someone-else-session-0000009' }))
        .status,
    ).toBe(404);
    const q = await quote(b.ref);
    const [body, mac] = q.quoteToken.split('.');
    const original = JSON.parse(Buffer.from(body, 'base64url').toString());
    const edited = Buffer.from(JSON.stringify({ ...original, chargePaise: 1, refundPaise: original.refundPaise - 1 })).toString(
      'base64url',
    );
    const tampered = await app.srv.post(
      `/api/v1/bookings/hotels/${b.ref}/cancel`,
      { quoteToken: `${edited}.${mac}` },
      { ...ME, 'idempotency-key': key() },
    );
    expect(tampered.body.code).toBe('QUOTE_INVALID');
    E.nowMs += 6 * 60_000;
    expect(
      (await app.srv.post(`/api/v1/bookings/hotels/${b.ref}/cancel`, { quoteToken: q.quoteToken }, { ...ME, 'idempotency-key': key() }))
        .body.code,
    ).toBe('QUOTE_EXPIRED');
    const item = o.items[0];
    await e.deps.handlers.get('HOTEL').cancelStart(ctx(), item, { chargePaise: 0, refundPaise: o.totalPaise, by: 'guest' }); // process stops here
    expect((await BookingRecord.findById(b._id).setOptions(S).lean())?.status).toBe('CANCELLING');
    await createOrderCancellations(e.deps).finishBooking(String(o._id), String(b._id)); // what the reconciler runs
    expect((await BookingRecord.findById(b._id).setOptions(S).lean())?.status).toBe('CANCELLED');
    expect((await stored(o.ref)).status).toBe('CANCELLED');
  });
});
