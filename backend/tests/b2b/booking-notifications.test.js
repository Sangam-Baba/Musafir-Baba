// @ts-check
/**
 * Booking notifications (S08-T09): the hotel's bell alert (critical), its bookings (own only, minimal fields),
 * acknowledging, reminders at 15 / 30 / 60 minutes (each once, stop on acknowledgement), and the customer's emails.
 */
import { describe, expect, it } from 'vitest';

import { BookingRecord, ackEscalation } from '../../src/b2b/modules/hotel-booking/index.js';
import { createDelivery, InboxRecord } from '../../src/b2b/modules/notifications/index.js';
import { EVENTS as ORDER_EVENTS, OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { customerEmailConsumers } from '../../src/b2b/routes/customer-emails.js';
import { auth } from './helpers/inventory-app.js';
import { clientOwner, sellableHotel } from './helpers/search-setup.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, clock, S, payuSays, engine, bookedOrder, stored, ctx, signed } = E;

/** A paid, confirmed order (stand-in PayU). */
async function confirmed() {
  const { h, order } = await bookedOrder();
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
  return { h, order, o, b, e };
}
/** @param {any} b */
const eventsOf = async (b) =>
  /** @type {any[]} */ ((await BookingRecord.findById(b._id).setOptions(S).lean())?.pendingEvents ?? []).map((x) => x.type);

describe('the hotel', () => {
  it('a critical bell alert; its own bookings with minimal fields; others see nothing; acknowledging once', async () => {
    const { h, b } = await confirmed();
    const event = (await BookingRecord.findById(b._id).setOptions(S).lean())?.pendingEvents?.find(
      (x) => x.type === 'hotel-booking.booking.confirmed',
    );
    expect(event?.payload).toMatchObject({ orgId: b.hotelOrgId, name: expect.any(String), ref: b.ref });
    await createDelivery({
      clock,
      publicUrl: 'https://musafirbaba.com',
      orgName: async () => 'Sea View',
      ownerContacts: async () => [],
      userContact: async () => null,
      publish: async () => {},
    })(/** @type {any} */ (event));
    expect(await InboxRecord.findOne({ recipientId: b.hotelOrgId }).lean()).toMatchObject({
      category: 'booking.new',
      critical: true,
      link: '/business/bookings',
      title: 'New booking',
    });
    const list = await app.srv.get('/api/v1/hotel/bookings?waiting=true', auth(h.token));
    expect(list.body.data).toHaveLength(1);
    const view = list.body.data[0];
    expect(view).toMatchObject({
      ref: b.ref,
      status: 'CONFIRMED',
      rooms: [expect.objectContaining({ leadGuest: 'Asha Verma', adults: 2 })],
      payablePaise: b.price.totals.hotelPayablePaise,
      acknowledgedAt: null,
    });
    expect(JSON.stringify(view)).not.toMatch(/asha@example\\.com|9876543210|totalPaise|marginPaise|sellPaise/);
    const other = await sellableHotel(app);
    expect((await app.srv.get(`/api/v1/hotel/bookings/${b.ref}`, auth(other.token))).status).toBe(404);
    expect((await app.srv.get('/api/v1/hotel/bookings', auth(other.token))).body.data).toEqual([]);
    const client = await clientOwner(app, 'owner@trips.in');
    expect((await app.srv.get(`/api/v1/hotel/bookings/${b.ref}`, auth(client.token))).status).toBe(404); // a client may read bookings, but only its own
    const ack = await app.srv.post(`/api/v1/hotel/bookings/${b.ref}/acknowledge`, {}, auth(h.token));
    expect(ack.body.acknowledgedAt).toBeTruthy();
    await app.srv.post(`/api/v1/hotel/bookings/${b.ref}/acknowledge`, {}, auth(h.token));
    expect((await eventsOf(b)).filter((t) => t === 'hotel-booking.booking.acknowledged')).toHaveLength(1);
    expect((await app.srv.get('/api/v1/hotel/bookings?waiting=true', auth(h.token))).body.data).toEqual([]);
  });

  it('not acknowledged: 15 min → reminder, 30 min → owners, 60 min → operations (with the hotel phone); each once; stops on acknowledgement', async () => {
    const { h, b } = await confirmed();
    const reminders = async () => (await eventsOf(b)).filter((t) => t.includes('.ack-'));
    E.nowMs += 14 * 60_000;
    await ackEscalation({ clock });
    expect(await reminders()).toEqual([]);
    E.nowMs += 2 * 60_000;
    await ackEscalation({ clock });
    await ackEscalation({ clock });
    expect(await reminders()).toEqual(['hotel-booking.booking.ack-reminded']);
    E.nowMs += 15 * 60_000;
    await ackEscalation({ clock });
    E.nowMs += 30 * 60_000;
    await ackEscalation({ clock });
    expect(await reminders()).toEqual([
      'hotel-booking.booking.ack-reminded',
      'hotel-booking.booking.ack-escalated',
      'hotel-booking.booking.ack-overdue',
    ]);
    const overdue = (await BookingRecord.findById(b._id).setOptions(S).lean())?.pendingEvents?.find(
      (x) => x.type === 'hotel-booking.booking.ack-overdue',
    );
    expect(overdue?.payload).toMatchObject({ level: 3, ref: b.ref });
    expect('phone' in (overdue?.payload ?? {})).toBe(true);
    await app.srv.post(`/api/v1/hotel/bookings/${b.ref}/acknowledge`, {}, auth(h.token));
    E.nowMs += 60 * 60_000;
    await ackEscalation({ clock });
    expect(await reminders()).toHaveLength(3);
  });

  it('after a pause only the highest step due is sent', async () => {
    const { b } = await confirmed();
    E.nowMs += 61 * 60_000;
    await ackEscalation({ clock });
    expect((await eventsOf(b)).filter((t) => t.includes('.ack-'))).toEqual(['hotel-booking.booking.ack-overdue']);
  });
});

describe('the customer', () => {
  it('booking confirmed → an email with the order link; rooms lost after paying → a refund email', async () => {
    const { o, e } = await confirmed();
    /** @type {{ to: string, subject: string, text: string }[]} */
    const sent = [];
    const consumers = customerEmailConsumers({
      ordersDeps: e.deps,
      publicUrl: 'https://musafirbaba.com',
      linkSecret: 'link-secret-for-tests-0000000000',
      send: async (m) => void sent.push(m),
      events: ORDER_EVENTS,
    });
    const ok = consumers.find((c) => c.consumer === 'customer-email-order-confirmed');
    const refunding = consumers.find((c) => c.consumer === 'customer-email-order-refunding');
    await ok?.handler({ payload: { orderId: String(o._id) } });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'asha@example.com', subject: expect.stringContaining(o.ref) });
    expect(sent[0]?.text).toMatch(new RegExp(`https://musafirbaba.com/hotels/booking/${o.ref}\\?key=[A-Za-z0-9_-]{32}`));
    expect(sent[0]?.text).toContain('Total paid: ₹');
    await OrderRecord.updateOne({ _id: o._id }, { $set: { status: 'FAILED', failure: { code: 'ROOMS_LOST' } } }).setOptions(S);
    await refunding?.handler({ payload: { orderId: String(o._id) } });
    expect(sent[1]?.subject).toMatch(/is being refunded/);
    await OrderRecord.updateOne({ _id: o._id }, { $set: { failure: { code: 'ABANDONED' } } }).setOptions(S);
    await refunding?.handler({ payload: { orderId: String(o._id) } });
    expect(sent).toHaveLength(2); // nothing paid back for a checkout that was never paid
  });
});
