// @ts-check
/** Creating orders (S08-T01–T03): guests book with rooms held, idempotency, owner-only reads, duplicate guard, refusals. */
import express from 'express';
import { describe, expect, it } from 'vitest';

import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';

import { BookingRecord, BookingStatusRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  HoldRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createHotelItemHandler } from '../../src/b2b/modules/hotel-booking/index.js';
import { createHoldService } from '../../src/b2b/modules/hotel-inventory/index.js';
import { createItemHandlers, createPaymentModes, orderReconcileRules, OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { MarginRuleRecord, SigningKeyRecord } from '../../src/b2b/modules/pricing/index.js';
import { createLedger } from '../../src/b2b/modules/wallet/index.js';
import { auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-19T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [
    OrderRecord,
    BookingRecord,
    BookingStatusRecord,
    HoldRecord,
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
const SESSION = 'guest-session-0000000000001';
const HIDDEN = /netPaise|marginPaise|hotelGst|hotelPayable|ruleId|priceBreakdown|hotelOrgId|"70000"/;
let n = 0;
const key = () => `order-key-${String((n += 1)).padStart(8, '0')}`;
const guest = (session = SESSION, k = key()) => ({ 'x-guest-session': session, 'idempotency-key': k });
/** @param {string} priceToken @param {Record<string, unknown>} [over] */
const body = (priceToken, over = {}) => ({
  priceToken,
  rooms: [{ leadGuest: 'Asha Verma', guests: ["Rahul D'Souza"] }],
  contact: { name: 'Asha Verma', email: 'Asha@Example.com', phone: '98765 43210' },
  specialRequests: 'High floor please',
  ...over,
});
/** @param {any} h */
const offer = async (h) => (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).body.offers[0];

async function ready(rooms = 3) {
  await seedPricing(clock);
  return sellableHotel(app, { rooms });
}

describe('a guest books', () => {
  it('rooms held for 15 minutes, booking HELD with its copies, the buyer sees only their price view', async () => {
    const h = await ready();
    const o = await offer(h);
    const r = await app.srv.post('/api/v1/orders', body(o.priceToken), guest());
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      ref: expect.stringMatching(/^MBO-/),
      status: 'AWAITING_PAYMENT',
      channel: 'WEBSITE',
      totalPaise: o.price.totalPaise,
      paymentMode: 'GATEWAY',
      holdExpiresAt: '2026-11-19T10:15:00.000Z',
      contact: { name: 'Asha Verma', email: 'asha@example.com', phone: '9876543210' },
      linkKey: expect.any(String),
      items: [
        expect.objectContaining({
          ref: expect.stringMatching(/^MBH-/),
          status: 'HELD',
          stay: expect.objectContaining({ checkIn: '2026-12-01', nights: 2 }),
          rooms: [{ leadGuest: 'Asha Verma', guests: ["Rahul D'Souza"] }],
          specialRequests: 'High floor please',
          cancellation: expect.objectContaining({ nonRefundable: false }),
        }),
      ],
    });
    expect(JSON.stringify(r.body)).not.toMatch(HIDDEN);
    expect((await offer(h)).roomsLeft).toBe(o.roomsLeft - 1);
    const b = /** @type {any} */ (
      await BookingRecord.findOne({ orderId: { $exists: true } })
        .setOptions({ tenantScope: 'SYSTEM', tenantReason: 't' })
        .lean()
    );
    expect(b.snapshot.property).toMatchObject({
      name: expect.any(String),
      address: { line1: '12 Main Road', pin: '400020' },
      timeZone: 'Asia/Kolkata',
    });
    expect(b.price.totals.netPaise).toBeGreaterThan(0); // the full breakdown is kept (internal)
  });

  it('the same Idempotency-Key five times at once → one order, one hold', async () => {
    const h = await ready();
    const o = await offer(h);
    const headers = guest();
    const all = await Promise.all(Array.from({ length: 5 }, () => app.srv.post('/api/v1/orders', body(o.priceToken), headers)));
    const ok = all.filter((x) => x.status === 201);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(new Set(ok.map((x) => x.body.ref)).size).toBe(1);
    expect(all.every((x) => x.status === 201 || x.body.code === 'IDEMPOTENCY_IN_PROGRESS')).toBe(true);
    expect(await OrderRecord.countDocuments({}).setOptions({ tenantScope: 'SYSTEM', tenantReason: 't' })).toBe(1);
    expect(await HoldRecord.countDocuments({}).setOptions({ tenantScope: 'SYSTEM', tenantReason: 't' })).toBe(1);
    const again = await app.srv.post('/api/v1/orders', body(o.priceToken), headers);
    expect(again.body.ref).toBe(ok[0]?.body.ref);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
  });
});

describe('who can see an order', () => {
  it('the same guest session or the link key; anyone else 404', async () => {
    const h = await ready();
    const created = (await app.srv.post('/api/v1/orders', body((await offer(h)).priceToken), guest())).body;
    const path = `/api/v1/orders/${created.ref}`;
    expect((await app.srv.get(path, { 'x-guest-session': SESSION })).body.ref).toBe(created.ref);
    expect((await app.srv.get(`${path}?key=${created.linkKey}`)).status).toBe(200);
    expect(
      (await app.srv.get(path.toLowerCase().replace('/api/v1/orders/mbo', '/api/v1/orders/mbo'), { 'x-guest-session': SESSION })).status,
    ).toBe(200);
    expect((await app.srv.get(path, { 'x-guest-session': 'another-session-000000000002' })).status).toBe(404);
    expect((await app.srv.get(`${path}?key=${'x'.repeat(32)}`)).status).toBe(404);
    expect((await app.srv.get(path)).status).toBe(404);
    const c = await clientOwner(app, 'owner@trips.in');
    expect((await app.srv.get(path, auth(c.token))).status).toBe(404);
  });
});

describe('guards', () => {
  it('same token, new key, within 2 minutes → DUPLICATE_ORDER_SUSPECTED with the order; confirmDuplicate → a second order', async () => {
    const h = await ready();
    const token = (await offer(h)).priceToken;
    const first = (await app.srv.post('/api/v1/orders', body(token), guest())).body;
    const dup = await app.srv.post('/api/v1/orders', body(token), guest());
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ code: 'DUPLICATE_ORDER_SUSPECTED', ref: first.ref, orderStatus: 'AWAITING_PAYMENT' });
    const second = await app.srv.post('/api/v1/orders', body(token, { confirmDuplicate: true }), guest());
    expect(second.status).toBe(201);
    expect(second.body.ref).not.toBe(first.ref);
  });

  it('refused before anything is taken: no key, no guest session, a bad name, a member, a changed price, no rooms', async () => {
    const h = await ready(1);
    const o = await offer(h);
    expect((await app.srv.post('/api/v1/orders', body(o.priceToken), { 'x-guest-session': SESSION })).status).toBe(400);
    expect((await app.srv.post('/api/v1/orders', body(o.priceToken), { 'idempotency-key': key() })).body.code).toBe(
      'GUEST_SESSION_REQUIRED',
    );
    const bad = await app.srv.post('/api/v1/orders', body(o.priceToken, { rooms: [{ leadGuest: '<script>' }] }), guest());
    expect(bad.status).toBe(400);
    const c = await clientOwner(app, 'owner@trips.in');
    expect((await app.srv.post('/api/v1/orders', body(o.priceToken), { ...auth(c.token), 'idempotency-key': key() })).status).toBe(403);
    const two = await app.srv.post('/api/v1/orders', body(o.priceToken, { rooms: [{ leadGuest: 'A B' }, { leadGuest: 'C D' }] }), guest());
    expect(two.body.code).toBe('ROOMS_DONT_MATCH_STAY');
    await app.srv.put(
      `${h.base}/calendar`,
      {
        requestId: 'req-price-up-1',
        from: '2026-12-01',
        to: '2026-12-03',
        weekdays: null,
        rooms: [],
        rates: [{ ratePlanId: h.plan, roomTypeId: h.room, prices: [{ guests: 2, amount: 90000 }] }],
      },
      auth(h.token),
    );
    const changed = await app.srv.post('/api/v1/orders', body(o.priceToken), guest());
    expect(changed.status).toBe(409);
    expect(changed.body).toMatchObject({ code: 'PRICE_CHANGED', priceToken: expect.any(String) });
    expect(await HoldRecord.countDocuments({}).setOptions({ tenantScope: 'SYSTEM', tenantReason: 't' })).toBe(0);
    const fresh = changed.body.priceToken;
    expect((await app.srv.post('/api/v1/orders', body(fresh), guest())).status).toBe(201);
    const late = await app.srv.post('/api/v1/orders', body(fresh, { confirmDuplicate: true }), guest('other-guest-session-0000003'));
    expect(late.status).toBe(409);
    expect(late.body.code).toBe('SOLD_OUT');
  });
});

describe('plug-in points', () => {
  it('a wallet payment mode and another item type register without changing orders code; twice is refused', () => {
    const modes = createPaymentModes();
    modes.register('WALLET', /** @type {any} */ ({ start: async () => ({}), debitAccount: async () => 'w', refund: async () => {} }));
    expect(modes.has('WALLET')).toBe(true);
    expect(() => modes.register('WALLET', /** @type {any} */ ({}))).toThrow(/twice/);
    expect(() => modes.get('CREDIT')).toThrow(/PAYMENT_MODE_NOT_AVAILABLE/);
    const handlers = createItemHandlers();
    handlers.register('HOTEL', /** @type {any} */ ({}));
    expect(handlers.keys()).toEqual(['HOTEL']);
  });
});

describe('safety net', () => {
  it('an order stuck in HOLDING (process stopped) → rooms given back, booking and order FAILED, repeat-safe', async () => {
    const h = await ready();
    const o = await offer(h);
    const created = (await app.srv.post('/api/v1/orders', body(o.priceToken), guest())).body;
    expect((await offer(h)).roomsLeft).toBe(o.roomsLeft - 1);
    const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 't' };
    await OrderRecord.updateOne({ ref: created.ref }, { $set: { status: 'HOLDING' } }).setOptions(S);
    const stuck = /** @type {any} */ (await OrderRecord.findOne({ ref: created.ref }).setOptions(S).lean());
    const logger = createLogger({ write: () => {} });
    const handlers = createItemHandlers();
    handlers.register('HOTEL', createHotelItemHandler(/** @type {any} */ ({ clock, logger, holds: createHoldService({ clock }) })));
    const [rule] = orderReconcileRules({ clock, logger, handlers, modes: createPaymentModes(), ledger: createLedger({ clock }) });
    await rule?.resume(stuck, { clock, logger });
    await rule?.resume(stuck, { clock, logger });
    expect((await offer(h)).roomsLeft).toBe(o.roomsLeft);
    expect(await OrderRecord.findOne({ ref: created.ref }).setOptions(S).lean()).toMatchObject({
      status: 'FAILED',
      failure: { code: 'ABANDONED' },
    });
    expect(
      (
        await BookingRecord.findOne({ orderId: String(stuck._id) })
          .setOptions(S)
          .lean()
      )?.status,
    ).toBe('FAILED');
  });
});

describe('switch', () => {
  it('online booking is off on a server until B2B_ORDERS_ENABLED=true (503 ORDERS_NOT_ENABLED)', async () => {
    const off = express();
    off.use(
      '/api/v1',
      createB2BRouter({ connect: false, logger: createLogger({ write: () => {} }), clock, env: { B2B_AUTH_SECRET: 'x'.repeat(40) } }),
    );
    const srv = await startServer(off);
    try {
      const r = await srv.post('/api/v1/orders', body('x'.repeat(20)), guest());
      expect(r.status).toBe(503);
      expect(r.body.code).toBe('ORDERS_NOT_ENABLED');
      expect((await srv.get('/api/v1/orders/MBO-0000-0000')).body.code).toBe('ORDERS_NOT_ENABLED');
    } finally {
      await srv.close();
    }
  });
});
