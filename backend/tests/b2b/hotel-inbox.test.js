// @ts-check
/** Hotel inbox and no-shows (S09-T08): views by day; no-show only in its window and own hotel; dispute → reversed; final → unused part refunded once. */
import { describe, expect, it } from 'vitest';

import { BookingRecord, createNoShows, NoShowRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { UserRecord } from '../../src/b2b/modules/identity/index.js';
import { MemberRecord } from '../../src/b2b/modules/organizations/index.js';
import { createOrderCancellations } from '../../src/b2b/modules/orders/index.js';
import { RefundRecord } from '../../src/b2b/modules/payments/index.js';
import { TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { asStaff, auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';
import { sellableHotel } from './helpers/search-setup.js';

const E = useOrderEngine();
const { app, clock, S, payuSays, engine, bookedOrder, stored, ctx, signed } = E;
const OPS = asStaff('o1:hotel-booking.admin.read,hotel-booking.admin.handle');
const ME = { 'x-guest-session': 'guest-session-0000000000001' };

async function confirmed() {
  const { h, order } = await bookedOrder();
  const e = await engine();
  const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
  payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
  await e.payments.handleCallback(signed(form));
  await e.deliver(form.txnId);
  const o = await stored(order.ref);
  return { h, order, o, e, ref: o.items[0].bookingRef };
}
/** Sign the hotel's owner in again (after moving the clock, the first token has expired). @param {any} h */
const signIn = async (h) => {
  const m = /** @type {any} */ (await MemberRecord.findOne({ orgId: h.orgId }).setOptions(S).lean());
  const u = /** @type {any} */ (await UserRecord.findById(m.userId).lean());
  return /** @type {string} */ (await app.login(u.email));
};
const list = async (/** @type {string} */ token, /** @type {string} */ q) =>
  (await app.srv.get(`/api/v1/hotel/bookings?${q}`, auth(token))).body.data.map((/** @type {any} */ b) => b.ref);

describe('hotel inbox', () => {
  it('arrivals, departures, upcoming, cancellations by day; when a no-show may be marked', async () => {
    const { h, ref } = await confirmed();
    expect(await list(h.token, 'view=arrivals&date=2026-12-01')).toEqual([ref]);
    expect(await list(h.token, 'view=arrivals&date=2026-12-02')).toEqual([]);
    expect(await list(h.token, 'view=departures&date=2026-12-03')).toEqual([ref]);
    expect(await list(h.token, 'view=upcoming')).toEqual([ref]); // today = 19 Nov 2026
    expect(await list(h.token, 'view=cancellations')).toEqual([]);
    const one = (await app.srv.get(`/api/v1/hotel/bookings/${ref}`, auth(h.token))).body;
    expect(one.noShow).toEqual({ from: '2026-12-01T06:30:00.000Z', until: '2026-12-03T18:30:00.000Z' }); // 12:00 check-in day → end of check-out day, India
  });
});

describe('no-shows', () => {
  it('only in the window and only by the own hotel; the buyer disputes; MusafirBaba reverses → stayed, nothing more charged', async () => {
    const { h, ref } = await confirmed();
    expect((await app.srv.post(`/api/v1/hotel/bookings/${ref}/no-show`, {}, auth(h.token))).body.code).toBe('NO_SHOW_NOT_NOW');
    E.nowMs = Date.parse('2026-12-01T13:00:00+05:30');
    h.token = await signIn(h);
    const other = await sellableHotel(app);
    expect((await app.srv.post(`/api/v1/hotel/bookings/${ref}/no-show`, {}, auth(other.token))).status).toBe(404);
    const marked = await app.srv.post(`/api/v1/hotel/bookings/${ref}/no-show`, {}, auth(h.token));
    expect(marked.status).toBe(201);
    expect(marked.body).toMatchObject({ status: 'DISPUTE_WINDOW', refundPaise: 0 }); // the policy's no-show: 100 %
    expect((await app.srv.post(`/api/v1/hotel/bookings/${ref}/no-show`, {}, auth(h.token))).body.code).toBe('BOOKING_NOT_CONFIRMED');
    expect(await list(h.token, 'view=no-shows')).toEqual([ref]);
    const d = await app.srv.post(`/api/v1/bookings/hotels/${ref}/no-show-dispute`, { message: 'We checked in at 11 pm, room 204' }, ME);
    expect(d.body.status).toBe('DISPUTED');
    const queue = (await app.admin.get('/api/v1/admin/no-show-disputes', OPS)).body.data;
    expect(queue).toEqual([
      expect.objectContaining({ bookingRef: ref, dispute: expect.objectContaining({ message: 'We checked in at 11 pm, room 204' }) }),
    ]);
    const r = await app.admin.post(
      `/api/v1/admin/no-shows/${queue[0].id}/resolve`,
      { decision: 'REVERSE', note: 'Hotel confirmed late check-in' },
      OPS,
    );
    expect(r.body).toMatchObject({ status: 'REVERSED', resolution: { decision: 'REVERSE' } });
    expect((await BookingRecord.findOne({ ref }).setOptions(S).lean())?.status).toBe('COMPLETED');
    expect(
      (await app.admin.post(`/api/v1/admin/no-shows/${queue[0].id}/resolve`, { decision: 'UPHOLD', note: 'again' }, OPS)).body.code,
    ).toBe('NO_SHOW_ALREADY_DECIDED');
  });

  it('no dispute within 72 h → final → the unused part (50 % policy) refunded and settled exactly once', async () => {
    const { h, o, e, ref } = await confirmed();
    await BookingRecord.updateOne({ ref }, { $set: { 'snapshot.policy.noShow': { type: 'PERCENT', value: 50 } } }).setOptions(S);
    E.nowMs = Date.parse('2026-12-01T13:00:00+05:30');
    h.token = await signIn(h);
    const marked = (await app.srv.post(`/api/v1/hotel/bookings/${ref}/no-show`, {}, auth(h.token))).body;
    expect(marked.chargePaise + marked.refundPaise).toBe(o.totalPaise);
    expect(marked.refundPaise).toBe(o.totalPaise - Math.round(o.totalPaise / 2));
    const noShows = createNoShows({ clock });
    expect(await noShows.dueToSettle()).toEqual([]);
    E.nowMs += 73 * 3_600_000;
    expect((await app.srv.post(`/api/v1/bookings/hotels/${ref}/no-show-dispute`, { message: 'Too late now?' }, ME)).body.code).toBe(
      'DISPUTE_CLOSED',
    );
    const cancellations = createOrderCancellations(e.deps);
    for (let i = 0; i < 2; i += 1)
      for (const n of await noShows.dueToSettle()) {
        await cancellations.settleNoShow(n.orderId, n.bookingId, { chargePaise: n.chargePaise, refundPaise: n.refundPaise });
        await noShows.markSettled(String(n._id));
      }
    expect(await NoShowRecord.findOne({ bookingRef: ref }).setOptions(S).lean()).toMatchObject({ status: 'FINAL', settled: true });
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'no-show' })).toBe(1);
    expect(await RefundRecord.find({}).lean()).toEqual([
      expect.objectContaining({ key: `no-show:${o.items[0].bookingId}`, amountPaise: marked.refundPaise }),
    ]);
  });
});
