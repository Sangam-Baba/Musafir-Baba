// @ts-check
/** Change requests (S09-T07): the buyer opens and answers through the booking; MusafirBaba answers, applies guest names, closes; staff names never reach the buyer. */
import { describe, expect, it } from 'vitest';

import { AmendmentRecord, BookingRecord, BookingStatusRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { amendmentEmailConsumer } from '../../src/b2b/routes/customer-emails.js';
import { asStaff } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, S, payuSays, engine, bookedOrder, stored, ctx, signed } = E;
const ME = { 'x-guest-session': 'guest-session-0000000000001' };
const OPS = asStaff('o1:hotel-booking.admin.read,hotel-booking.admin.handle');

async function confirmed() {
  const { order } = await bookedOrder();
  const e = await engine();
  const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
  payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
  await e.payments.handleCallback(signed(form));
  await e.deliver(form.txnId);
  const o = await stored(order.ref);
  return { order, o, e, ref: o.items[0].bookingRef };
}

describe('change requests', () => {
  it('guest name change: buyer asks → team answers (asking back) → buyer answers → team applies the name → resolved', async () => {
    const { o, e, ref } = await confirmed();
    const path = `/api/v1/bookings/hotels/${ref}/amendments`;
    expect(
      (await app.srv.post(path, { type: 'MODIFY_GUESTS', message: 'Wrong spelling', guestNames: [{ room: 1, leadGuest: '<b>x</b>' }] }, ME))
        .body.code,
    ).toBe('GUEST_NAMES_INVALID');
    expect(
      (await app.srv.post(path, { type: 'OTHER', message: 'Hello there' }, { 'x-guest-session': 'someone-else-session-0000009' })).status,
    ).toBe(404);
    const opened = await app.srv.post(
      path,
      { type: 'MODIFY_GUESTS', message: 'Please change the lead guest to my wife', guestNames: [{ room: 1, leadGuest: 'Priya Verma' }] },
      ME,
    );
    expect(opened.status).toBe(201);
    expect(opened.body).toMatchObject({
      ref: expect.stringMatching(/^CR-/),
      status: 'OPEN',
      messages: [{ from: 'You', text: 'Please change the lead guest to my wife' }],
    });
    const id = opened.body.id;
    const queue = (await app.admin.get('/api/v1/admin/amendments', OPS)).body.data;
    expect(queue).toEqual([expect.objectContaining({ id, bookingRef: ref, firstRespondedAt: null })]);
    expect((await app.admin.get('/api/v1/admin/amendments', asStaff('x:hotel-catalog.listing.read'))).status).toBe(403);
    const asked = await app.admin.post(
      `/api/v1/admin/amendments/${id}/messages`,
      { text: 'Please confirm the spelling', waitForCustomer: true },
      OPS,
    );
    expect(asked.body).toMatchObject({ status: 'WAITING_CUSTOMER', firstRespondedAt: expect.any(String) });
    const mine = (await app.srv.get(path, ME)).body.data[0];
    expect(mine.messages.map((/** @type {any} */ m) => m.from)).toEqual(['You', 'MusafirBaba']);
    expect(JSON.stringify(mine)).not.toMatch(/staff:o1/);
    expect((await app.srv.post(`${path}/${id}/messages`, { text: 'Yes, Priya Verma' }, ME)).body.status).toBe('OPEN');
    await app.admin.post(`/api/v1/admin/amendments/${id}/apply-guest-names`, {}, OPS);
    const b = /** @type {any} */ (await BookingRecord.findOne({ ref }).setOptions(S).lean());
    expect(b.rooms[0].leadGuest).toBe('Priya Verma');
    expect(
      (
        await BookingStatusRecord.findOne({ bookingId: String(b._id), note: /guest names changed/ })
          .setOptions(S)
          .lean()
      )?.note,
    ).toContain('Asha Verma → Priya Verma');
    expect((await app.admin.post(`/api/v1/admin/amendments/${id}/apply-guest-names`, {}, OPS)).body.code).toBe('NOTHING_TO_APPLY');
    expect(
      (await app.admin.post(`/api/v1/admin/amendments/${id}/close`, { status: 'RESOLVED', resolution: 'Name updated' }, OPS)).body.status,
    ).toBe('RESOLVED');
    expect((await app.srv.post(`${path}/${id}/messages`, { text: 'Thanks!' }, ME)).body.code).toBe('AMENDMENT_CLOSED');
    // the buyer is emailed when the team answers
    /** @type {any[]} */
    const sent = [];
    const mail = amendmentEmailConsumer(
      {
        ordersDeps: e.deps,
        publicUrl: 'https://musafirbaba.com',
        linkSecret: 'x'.repeat(40),
        send: async (m) => void sent.push(m),
        events: /** @type {any} */ ({}),
      },
      'hotel-booking.amendment.staff-replied',
    );
    await mail.handler({ payload: { orderId: String(o._id), ref: opened.body.ref, bookingRef: ref } });
    expect(sent[0]).toMatchObject({ to: 'asha@example.com', subject: expect.stringContaining(opened.body.ref) });
    expect(sent[0].text).toMatch(new RegExp(`/hotels/my-bookings/${ref}\\?key=`));
  });

  it('at most 5 open per booking; date changes only on confirmed bookings', async () => {
    const { ref } = await confirmed();
    const path = `/api/v1/bookings/hotels/${ref}/amendments`;
    for (let i = 0; i < 5; i += 1) expect((await app.srv.post(path, { type: 'OTHER', message: `Question ${i}` }, ME)).status).toBe(201);
    expect((await app.srv.post(path, { type: 'OTHER', message: 'One more' }, ME)).body.code).toBe('TOO_MANY_OPEN_REQUESTS');
    await AmendmentRecord.deleteMany({}).setOptions(S);
    await BookingRecord.updateOne({ ref }, { $set: { status: 'CANCELLED' } }).setOptions(S);
    expect((await app.srv.post(path, { type: 'MODIFY_DATES', message: 'New dates' }, ME)).body.code).toBe('BOOKING_CANNOT_BE_CHANGED');
    expect((await app.srv.post(path, { type: 'REFUND_REQUEST', message: 'Where is my refund?' }, ME)).status).toBe(201);
  });
});
