// @ts-check
/**
 * The admin order explorer (S08-T11): search, the full timeline, actions with two people (release an unpaid order's
 * rooms; refund a failed paid order — never a confirmed one here), and the hotels not answering for an hour.
 */
import { describe, expect, it } from 'vitest';

import { createOrderAdmin, OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { IntentRecord, RefundRecord } from '../../src/b2b/modules/payments/index.js';
import { asStaff } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, S, payuSays, engine, bookedOrder, stored, ctx, signed } = E;
const READ = 'orders.admin.read';
const ACT = 'orders.admin.act';
const A = asStaff(`a1:${READ},${ACT},hotel-booking.admin.read`);
const B = asStaff(`b2:${READ},${ACT}`);

/** @param {string} ref */
async function pay(ref) {
  const e = await engine();
  const form = await e.orderPay.start(ctx(), await stored(ref), { returnUrl: 'https://x' });
  payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: (await stored(ref)).totalPaise });
  await e.payments.handleCallback(signed(form));
  await e.deliver(form.txnId);
  return { e, form };
}

describe('find and read', () => {
  it('by order reference, booking reference, email or status; read-only staff only; one timeline in time order', async () => {
    const { order } = await bookedOrder();
    await pay(order.ref);
    const o = await stored(order.ref);
    const find = async (/** @type {string} */ q) =>
      (await app.admin.get(`/api/v1/admin/orders?${q}`, A)).body.data.map((/** @type {any} */ r) => r.ref);
    expect(await find(`q=${order.ref}`)).toEqual([order.ref]);
    expect(await find(`q=${o.items[0].bookingRef}`)).toEqual([order.ref]);
    expect(await find('q=ASHA@example')).toEqual([order.ref]);
    expect(await find('status=CONFIRMED')).toEqual([order.ref]);
    expect(await find('status=EXPIRED')).toEqual([]);
    expect(await find('q=a.*')).toEqual([]); // typed text, not a pattern
    expect((await app.admin.get('/api/v1/admin/orders', asStaff('x:hotel-catalog.listing.read'))).status).toBe(403);
    const d = (await app.admin.get(`/api/v1/admin/orders/${order.ref}`, A)).body;
    expect(d.order).toMatchObject({ ref: order.ref, status: 'CONFIRMED', journalPosted: true });
    expect(d.payments).toEqual([expect.objectContaining({ status: 'SUCCEEDED', amountPaise: o.totalPaise })]);
    const what = d.timeline.map((/** @type {any} */ t) => t.what);
    expect(what).toEqual(
      expect.arrayContaining([
        'order → HOLDING',
        'order → CONFIRMED',
        expect.stringMatching(/^booking MBH-.*HELD → CONFIRMED$/),
        expect.stringMatching(/^PayU B2BH.* → SUCCEEDED$/),
      ]),
    );
    const times = d.timeline.map((/** @type {any} */ t) => Date.parse(t.at));
    expect([...times].sort((x, y) => x - y)).toEqual(times);
  });
});

describe('actions with two people', () => {
  it('release an unpaid order: proposed by one, refused for the same person, approved by another → rooms back', async () => {
    const { order } = await bookedOrder();
    const p = await app.admin.post(
      `/api/v1/admin/orders/${order.ref}/actions`,
      { action: 'RELEASE', reason: 'Customer asked us to cancel' },
      A,
    );
    expect(p.status).toBe(201);
    expect(
      (await app.admin.post(`/api/v1/admin/orders/${order.ref}/actions`, { action: 'RELEASE', reason: 'Again please' }, B)).body.code,
    ).toBe('ACTION_ALREADY_PROPOSED');
    expect((await app.admin.post(`/api/v1/admin/order-actions/${p.body.id}/approve`, {}, A)).body.code).toBe('SECOND_PERSON_REQUIRED');
    expect((await app.admin.post(`/api/v1/admin/order-actions/${p.body.id}/approve`, {}, asStaff(`r:${READ}`))).status).toBe(403);
    const ok = await app.admin.post(`/api/v1/admin/order-actions/${p.body.id}/approve`, { note: 'Checked with the customer' }, B);
    expect(ok.body).toMatchObject({ status: 'DONE', decidedBy: 'staff:b2', result: expect.stringMatching(/released/) });
    expect((await stored(order.ref)).status).toBe('EXPIRED');
    expect((await app.admin.post(`/api/v1/admin/order-actions/${p.body.id}/approve`, {}, B)).body.code).toBe('ACTION_ALREADY_DECIDED');
    expect(
      (await app.admin.post(`/api/v1/admin/orders/${order.ref}/actions`, { action: 'RELEASE', reason: 'Once more' }, A)).body.code,
    ).toBe('ONLY_UNPAID_ORDERS_CAN_BE_RELEASED');
  });

  it('refund: never a confirmed booking here; a failed paid order without a refund → refunded once with two people', async () => {
    const { order } = await bookedOrder();
    const { e } = await pay(order.ref);
    expect(
      (await app.admin.post(`/api/v1/admin/orders/${order.ref}/actions`, { action: 'REFUND', reason: 'Customer asked' }, A)).body.code,
    ).toBe('CONFIRMED_BOOKINGS_ARE_REFUNDED_BY_CANCELLING');
    await OrderRecord.updateOne({ ref: order.ref }, { $set: { status: 'FAILED', failure: { code: 'ROOMS_LOST' } } }).setOptions(S);
    const admin = createOrderAdmin(e.deps); // the service with the stand-in PayU
    const p = await admin.propose('staff:a1', order.ref, { action: 'REFUND', reason: 'PayU refused the automatic refund' });
    await expect(admin.decide('staff:a1', p.id, { approve: true })).rejects.toThrow(/SECOND_PERSON_REQUIRED/);
    expect(await admin.decide('staff:b2', p.id, { approve: true })).toMatchObject({ status: 'DONE' });
    const intent = /** @type {any} */ (await IntentRecord.findOne({}).lean());
    expect(await RefundRecord.find({ intentId: String(intent._id) }).lean()).toEqual([
      expect.objectContaining({ key: `admin:${p.id}`, amountPaise: intent.amountPaise }),
    ]);
    await expect(admin.propose('staff:a1', order.ref, { action: 'REFUND', reason: 'Once more please' })).rejects.toThrow(
      /REFUND_ALREADY_UNDER_WAY/,
    );
    const rejected = await admin.propose('staff:a1', order.ref, { action: 'RELEASE', reason: 'Not possible' }).catch((x) => x);
    expect(String(rejected)).toMatch(/ONLY_UNPAID/);
  });
});

describe('operations', () => {
  it('hotels not acknowledging for an hour are listed with whom to call', async () => {
    const { order } = await bookedOrder();
    await pay(order.ref);
    expect((await app.admin.get('/api/v1/admin/hotel-ack', A)).body.data).toEqual([]);
    E.nowMs += 61 * 60_000;
    const list = (await app.admin.get('/api/v1/admin/hotel-ack', A)).body.data;
    expect(list).toEqual([expect.objectContaining({ orderRef: order.ref, propertyName: expect.any(String) })]);
    expect('phone' in list[0]).toBe(true);
    expect((await app.admin.get('/api/v1/admin/hotel-ack', B)).status).toBe(403);
  });
});
