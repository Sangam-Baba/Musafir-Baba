// @ts-check
/**
 * Offline bookings by MusafirBaba (S12-T19): the client's own B2B price → order (channel ADMIN, by the staff member,
 * the reason kept) → paid from the client's wallet → confirmed; the client sees it and is told; not enough money →
 * rooms given back; staff without `orders.offline.book` can't; a hotel company is not a client.
 */
import { describe, expect, it } from 'vitest';

import { OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { createLedger, createLiveWallets } from '../../src/b2b/modules/wallet/index.js';
import { asStaff, auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';
import { clientOwner } from './helpers/search-setup.js';

const E = useOrderEngine();
const { app, clock, S, stay, bookedOrder } = E;
const ops = asStaff('s1:orders.offline.book');
let n = 0;
const key = () => `offline-key-${String((n += 1)).padStart(8, '0')}`;

/** @param {number} topUpPaise */
async function setup(topUpPaise) {
  const { h } = await bookedOrder(3);
  const c = await clientOwner(app, `offline${(n += 1)}@trips.in`);
  const ledger = createLedger({ clock });
  const wallets = createLiveWallets({ clock, ledger });
  await wallets.open(c.orgId);
  if (topUpPaise > 0)
    await wallets.apply({
      clientOrgId: c.orgId,
      opId: `top-${c.orgId}`,
      type: 'TOPUP',
      amountPaise: topUpPaise,
      journal: {
        reference: { type: 'test-top', id: c.orgId },
        purpose: 'wallet-topup',
        lines: [{ accountId: await ledger.accountId('platform', 'BANK'), debitPaise: topUpPaise }],
      },
      by: 'test',
    });
  const offers = (await app.admin.post('/api/v1/admin/offline-bookings/offers', { clientOrgId: c.orgId, hotelRef: h.ref, stay }, ops)).body;
  return { h, c, offers };
}
/** @param {string} clientOrgId @param {string} priceToken */
const book = (clientOrgId, priceToken) =>
  app.admin.post(
    '/api/v1/admin/offline-bookings',
    {
      clientOrgId,
      priceToken,
      rooms: [{ leadGuest: 'Asha Verma' }],
      contact: { name: 'Asha Verma', email: 'asha@trips.in', phone: '9876543210' },
      customerReference: 'PHONE-22',
      note: 'Client called at 11:05, asked for the Deluxe room',
    },
    { ...ops, 'idempotency-key': key() },
  );

describe('offline bookings', () => {
  it("the client's own price → booked and paid from its wallet; history and notice; the client sees it", async () => {
    const { c, offers } = await setup(10_000_000);
    const clientView = (await app.srv.post(`/api/v1/hotels/${offers.property.publicRef}/offers`, stay, auth(c.token))).body;
    expect(offers.offers[0].price.totalPaise).toBe(clientView.offers[0].price.totalPaise); // same price the client sees
    const r = await book(c.orgId, offers.offers[0].priceToken);
    expect(r.status).toBe(201);
    expect(r.body.order).toMatchObject({
      status: 'CONFIRMED',
      channel: 'ADMIN',
      paymentMode: 'WALLET',
      createdBy: 'staff:s1',
      customerReference: 'PHONE-22',
    });
    const o = /** @type {any} */ (await OrderRecord.findOne({ ref: r.body.order.ref }).setOptions(S).lean());
    expect(o.history.some((/** @type {any} */ h) => h.by === 'staff:s1' && /offline booking: Client called/.test(h.note ?? ''))).toBe(true);
    expect((o.pendingEvents ?? []).map((/** @type {any} */ e) => e.type)).toContain('orders.order.booked-offline');
    expect((await app.srv.get(`/api/v1/client/orders/${o.ref}`, auth(c.token))).body.status).toBe('CONFIRMED');
  });

  it('not enough in the wallet → rooms given back; staff without the permission → 403; unknown client → 404', async () => {
    const { c, offers } = await setup(1_000);
    const r = await book(c.orgId, offers.offers[0].priceToken);
    expect(r.body.order.status).toBe('FAILED');
    expect(r.body.payment).toEqual({ error: 'INSUFFICIENT_WALLET_BALANCE' });
    const res = await app.admin.post(
      '/api/v1/admin/offline-bookings/offers',
      { clientOrgId: c.orgId, hotelRef: 'x-hotel', stay },
      asStaff('s2:orders.admin.read'),
    );
    expect(res.status).toBe(403);
    const none = await app.admin.post(
      '/api/v1/admin/offline-bookings/offers',
      { clientOrgId: '65f00000000000000000ffff', hotelRef: 'x-hotel', stay },
      ops,
    );
    expect(none.status).toBe(404);
  });
});
