// @ts-check
/** Booking requests (D37, S12-T08 / T09 / T11): unchanged price only, no rooms taken, isolation, status flow, admin handling. */
import { describe, expect, it } from 'vitest';

import { BookingRequestRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { MarginRuleRecord, SigningKeyRecord } from '../../src/b2b/modules/pricing/index.js';
import { asStaff, auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-18T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [
    BookingRequestRecord,
    MarginRuleRecord,
    SigningKeyRecord,
    CancellationPolicyRecord,
    RatePlanRecord,
    InventoryDayRecord,
    RateDayRecord,
    ChangeLogRecord,
  ],
});
const stay = { checkIn: '2026-12-01', checkOut: '2026-12-03', rooms: [{ adults: 2, childrenAges: [] }] };
const customer = {
  name: 'Rahul Verma',
  phone: '9876543210',
  email: 'rahul@example.com',
  reference: 'TRIP-42',
  guestNames: ['Rahul Verma', 'Priya Verma'],
};
const OPS = asStaff('o1:hotel-booking.admin.read,hotel-booking.admin.handle');
const READ = asStaff('r1:hotel-booking.admin.read');
const v = (/** @type {number} */ n) => ({ 'if-match': `"${n}"` });

/** A sellable hotel, a client and a fresh price token for its first room. */
async function setup() {
  await seedPricing(clock);
  const h = await sellableHotel(app, { rooms: 3 });
  const c = await clientOwner(app, `owner${Math.random().toString(36).slice(2, 8)}@trips.in`);
  const offers = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token))).body;
  return { h, c, token: /** @type {string} */ (offers.offers[0].priceToken) };
}
const send = (/** @type {string} */ token, /** @type {string} */ priceToken) =>
  app.srv.post('/api/v1/booking-requests', { priceToken, customer, notes: 'Late check-in' }, auth(token));

describe('sending a request', () => {
  it("stored with the stay, the customer and the client's own quoted price — and no room is taken", async () => {
    const { h, c, token } = await setup();
    const r = await send(c.token, token);
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      ref: expect.stringMatching(/^BR-[2-9A-Z]{4}-[2-9A-Z]{4}$/),
      status: 'SUBMITTED',
      stay: {
        propertyRef: h.ref,
        roomTypeName: 'Deluxe',
        planName: 'Room only',
        checkIn: '2026-12-01',
        checkOut: '2026-12-03',
        occupancies: [{ adults: 2, children: 0 }],
      },
      quoted: { totalPaise: 178500, sellPaise: 170000 },
      customer: { name: 'Rahul Verma', reference: 'TRIP-42' },
    });
    expect(JSON.stringify(r.body)).not.toMatch(/netPaise|marginPaise|hotelGst|tokenHash/);
    const again = await send(c.token, token);
    expect(again.body.id).toBe(r.body.id); // the same token twice → the first request
    const after = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token))).body;
    expect(after.offers[0].roomsLeft).toBe(3); // nothing taken
    const stored = await BookingRequestRecord.findById(r.body.id).setOptions(SYSTEM).lean();
    expect(stored?.pendingEvents?.map((e) => e.type)).toEqual(['hotel-booking.request.submitted']);
  });

  it('a changed price is refused with the new one; sold out is refused', async () => {
    const { h, c, token } = await setup();
    await app.srv.put(
      `${h.base}/calendar`,
      {
        requestId: 'req-raise-1',
        from: '2026-12-01',
        to: '2026-12-03',
        weekdays: null,
        rooms: [],
        rates: [{ ratePlanId: h.plan, roomTypeId: h.room, prices: [{ guests: 2, amount: 80000 }] }],
      },
      auth(h.token),
    );
    const changed = await send(c.token, token);
    expect(changed.status).toBe(409);
    expect(changed.body).toMatchObject({
      code: 'PRICE_CHANGED',
      quotedTotalPaise: 178500,
      price: { totalPaise: 199500 },
      priceToken: expect.any(String),
    });
    await app.srv.put(
      `${h.base}/calendar`,
      {
        requestId: 'req-close-1',
        from: '2026-12-01',
        to: '2026-12-03',
        weekdays: null,
        rooms: [{ roomTypeId: h.room, total: 0 }],
        rates: [],
      },
      auth(h.token),
    );
    expect((await send(c.token, changed.body.priceToken)).body.code).toBe('SOLD_OUT');
  });

  it('only B2B clients send requests; each client sees only its own', async () => {
    const { c, token } = await setup();
    const r = await send(c.token, token);
    const other = await clientOwner(app, 'owner@other.in');
    expect((await app.srv.get('/api/v1/booking-requests', auth(other.token))).body.data).toEqual([]);
    expect((await app.srv.get(`/api/v1/booking-requests/${r.body.id}`, auth(other.token))).status).toBe(404);
    expect((await app.srv.post(`/api/v1/booking-requests/${r.body.id}/cancel`, {}, { ...auth(other.token), ...v(1) })).status).toBe(404);
    expect((await app.srv.post('/api/v1/booking-requests', { priceToken: token, customer })).status).toBe(401);
    const hotel = await app.hotelWithProperty('owner@seaview2.in');
    expect((await app.srv.post('/api/v1/booking-requests', { priceToken: token, customer }, auth(hotel.token))).status).toBe(403);
    await expect(BookingRequestRecord.find({}).lean()).rejects.toThrow(/no ownership filter/);
  });
});

describe('status flow', () => {
  it('MusafirBaba takes it and confirms with the hotel number; the client sees it and is notified', async () => {
    const { c, token } = await setup();
    const r = (await send(c.token, token)).body;
    const queue = (await app.admin.get('/api/v1/admin/booking-requests', READ)).body.data;
    expect(queue.map((/** @type {any} */ q) => q.ref)).toContain(r.ref);
    expect(queue[0].customer.phone).toBe('9876543210');
    expect((await app.admin.post(`/api/v1/admin/booking-requests/${r.id}/take`, {}, { ...READ, ...v(1) })).status).toBe(403);
    expect((await app.admin.post(`/api/v1/admin/booking-requests/${r.id}/take`, {}, { ...OPS, ...v(1) })).body.status).toBe('IN_PROGRESS');
    const done = await app.admin.post(
      `/api/v1/admin/booking-requests/${r.id}/confirm`,
      { hotelConfirmation: 'SV-12345', note: 'Paid by bank transfer' },
      { ...OPS, ...v(2) },
    );
    expect(done.body).toMatchObject({ status: 'CONFIRMED', hotelConfirmation: 'SV-12345', handledBy: 'staff:o1' });
    const mine = (await app.srv.get(`/api/v1/booking-requests/${r.id}`, auth(c.token))).body;
    expect(mine).toMatchObject({ status: 'CONFIRMED', hotelConfirmation: 'SV-12345' });
    expect(mine.history.map((/** @type {any} */ h) => h.action)).toEqual(['submit', 'take', 'confirm']);
    expect(mine.history[0].by).toBeUndefined(); // staff names stay inside MusafirBaba
    const stored = await BookingRequestRecord.findById(r.id).setOptions(SYSTEM).lean();
    expect(stored?.pendingEvents?.map((e) => e.type)).toContain('hotel-booking.request.confirmed');
  });

  it("declining needs a reason; a closed request can't change; the client can cancel an open one", async () => {
    const { c, token } = await setup();
    const r = (await send(c.token, token)).body;
    expect((await app.admin.post(`/api/v1/admin/booking-requests/${r.id}/decline`, {}, { ...OPS, ...v(1) })).body.code).toBe(
      'REASON_REQUIRED',
    );
    expect((await app.admin.post(`/api/v1/admin/booking-requests/${r.id}/confirm`, {}, { ...OPS, ...v(1) })).body.code).toBe(
      'REQUEST_STATUS',
    ); // take it first
    const declined = await app.admin.post(
      `/api/v1/admin/booking-requests/${r.id}/decline`,
      { note: 'Hotel is full that weekend' },
      { ...OPS, ...v(1) },
    );
    expect(declined.body).toMatchObject({ status: 'DECLINED', decisionNote: 'Hotel is full that weekend' });
    expect((await app.srv.post(`/api/v1/booking-requests/${r.id}/cancel`, {}, { ...auth(c.token), ...v(2) })).body.code).toBe(
      'REQUEST_STATUS',
    );
    const { c: c2, token: t2 } = await setup();
    const open = (await send(c2.token, t2)).body;
    expect((await app.srv.post(`/api/v1/booking-requests/${open.id}/cancel`, {}, { ...auth(c2.token), ...v(9) })).status).toBe(412);
    expect((await app.srv.post(`/api/v1/booking-requests/${open.id}/cancel`, {}, { ...auth(c2.token), ...v(1) })).body.status).toBe(
      'CANCELLED',
    );
  });
});
