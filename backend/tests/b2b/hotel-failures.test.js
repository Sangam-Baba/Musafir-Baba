// @ts-check
/** Hotel can't honour (S09-T09): reported by the hotel or MusafirBaba; rooms stay out of sale; resolved by a full refund (order cancelled) or a move (payable to suspense); once each. */
import { describe, expect, it } from 'vitest';

import { BookingRecord, bookingInvariants, createHotelFailures } from '../../src/b2b/modules/hotel-booking/index.js';
import { bookedNightOwners, InventoryDayRecord } from '../../src/b2b/modules/hotel-inventory/index.js';
import { createOrderCancellations } from '../../src/b2b/modules/orders/index.js';
import { RefundRecord } from '../../src/b2b/modules/payments/index.js';
import { AccountRecord, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { asStaff, auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';
import { sellableHotel } from './helpers/search-setup.js';

const E = useOrderEngine();
const { app, clock, S, payuSays, engine, bookedOrder, stored, ctx, signed } = E;
const OPS = asStaff('o1:hotel-booking.admin.read,hotel-booking.admin.handle');

async function confirmed() {
  const { h, order } = await bookedOrder();
  const e = await engine();
  const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
  payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
  await e.payments.handleCallback(signed(form));
  await e.deliver(form.txnId);
  const o = await stored(order.ref);
  return { h, order, o, e, ref: o.items[0].bookingRef, bookingId: o.items[0].bookingId };
}
const typeOf = async () => new Map((await AccountRecord.find({}).setOptions(S).lean()).map((a) => [String(a._id), a.type]));

describe("hotel can't honour", () => {
  it('reported by the hotel → HOTEL_FAILED, rooms stay out of sale; MusafirBaba refunds everything → order cancelled; once', async () => {
    const { h, o, e, ref, bookingId } = await confirmed();
    const other = await sellableHotel(app);
    expect(
      (await app.srv.post(`/api/v1/hotel/bookings/${ref}/cannot-honour`, { reason: 'Overbooked tonight' }, auth(other.token))).status,
    ).toBe(404);
    const r = await app.srv.post(`/api/v1/hotel/bookings/${ref}/cannot-honour`, { reason: 'Overbooked tonight' }, auth(h.token));
    expect(r.status).toBe(201);
    expect((await app.srv.post(`/api/v1/hotel/bookings/${ref}/cannot-honour`, { reason: 'Again please' }, auth(h.token))).body.code).toBe(
      'BOOKING_NOT_CONFIRMED',
    );
    const b = /** @type {any} */ (await BookingRecord.findOne({ ref }).setOptions(S).lean());
    expect(b.status).toBe('HOTEL_FAILED');
    for (const n of await InventoryDayRecord.find({ roomTypeId: b.stay.roomTypeId, date: { $in: b.stay.nights } })
      .setOptions(S)
      .lean())
      expect(n.booked).toBe(1);
    E.nowMs += 11 * 60_000;
    for (const c of bookingInvariants({ clock, owners: () => bookedNightOwners(clock) })) expect(await c.check()).toEqual([]);
    const queue = (await app.admin.get('/api/v1/admin/hotel-failures', OPS)).body.data;
    expect(queue).toEqual([expect.objectContaining({ bookingRef: ref, reason: 'Overbooked tonight', status: 'OPEN' })]);
    const failures = createHotelFailures({ clock });
    await failures.resolve('staff:o1', queue[0].id, { action: 'REFUND', note: 'No similar hotel nearby' });
    await expect(failures.resolve('staff:o1', queue[0].id, { action: 'RELOCATE', note: 'x' })).rejects.toThrow(/ALREADY_RESOLVED/);
    const cancellations = createOrderCancellations(e.deps);
    for (let i = 0; i < 2; i += 1) await cancellations.settleHotelFailure(String(o._id), bookingId, 'REFUND');
    expect(await RefundRecord.find({}).lean()).toEqual([
      expect.objectContaining({ key: `hotel-failed:${bookingId}`, amountPaise: o.totalPaise }),
    ]);
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'hotel-failure' })).toBe(1);
    expect((await stored(o.ref)).status).toBe('CANCELLED');
    expect((await BookingRecord.findOne({ ref }).setOptions(S).lean())?.cancellation).toMatchObject({
      chargePaise: 0,
      refundPaise: o.totalPaise,
    });
  });

  it('reported by MusafirBaba and moved to another hotel → what the first hotel was owed goes to suspense; no refund; order stays', async () => {
    const { o, e, ref, bookingId } = await confirmed();
    const reported = await app.admin.post(`/api/v1/admin/bookings/${ref}/hotel-failed`, { reason: 'Hotel closed for repairs' }, OPS);
    expect(reported.body).toMatchObject({ status: 'OPEN', reportedBy: 'staff:o1' });
    const failures = createHotelFailures({ clock });
    await failures.resolve('staff:o1', reported.body.id, { action: 'RELOCATE', note: 'Moved to Hotel Sunrise', alternativeRef: 'SUN-123' });
    await createOrderCancellations(e.deps).settleHotelFailure(String(o._id), bookingId, 'RELOCATE');
    const [entry] = await TransactionRecord.find({ 'reference.type': 'hotel-failure' }).lean();
    const types = await typeOf();
    const by = Object.fromEntries((entry?.lines ?? []).map((l) => [types.get(l.accountId), [l.debitPaise ?? 0, l.creditPaise ?? 0]]));
    const b = /** @type {any} */ (await BookingRecord.findOne({ ref }).setOptions(S).lean());
    expect(by).toEqual({ PAYABLE: [b.price.totals.hotelPayablePaise, 0], SUSPENSE: [0, b.price.totals.hotelPayablePaise] });
    expect(await RefundRecord.countDocuments({})).toBe(0);
    expect((await stored(o.ref)).status).toBe('CONFIRMED');
  });
});
