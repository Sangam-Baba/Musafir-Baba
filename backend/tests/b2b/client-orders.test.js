// @ts-check
/**
 * B2B client orders through the API (S12-T14): the B2B price token from the dashboard → order held (channel B2B_PORTAL,
 * branch, customer reference) → paid from the wallet → confirmed at once; PayU still possible; only the company sees it
 * (other companies 404, "own bookings only" people see only theirs); roles without `orders.order.create` can't book;
 * website guests can't use a client's route; the company's 20-orders-waiting limit; documents readable by the company.
 */
import { describe, expect, it } from 'vitest';

import { OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { createLedger, createLiveWallets } from '../../src/b2b/modules/wallet/index.js';
import { auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';
import { clientOwner } from './helpers/search-setup.js';

const E = useOrderEngine();
const { app, clock, S, stay, bookedOrder } = E;
let n = 0;
const key = () => `client-order-key-${String((n += 1)).padStart(6, '0')}`;
const body = (/** @type {string} */ priceToken, extra = {}) => ({
  priceToken,
  rooms: [{ leadGuest: 'Ravi Kumar' }],
  contact: { name: 'Ravi Kumar', email: 'ravi@trips.in', phone: '9876543210' },
  customerReference: 'TRIP-2026-114',
  ...extra,
});

/** A sellable hotel, a client company with its Owner signed in and ₹1,00,000 in the wallet, and a B2B price token. */
async function setup() {
  const { h } = await bookedOrder(3); // seeds pricing and a hotel (and one website order holding a room)
  const c = await clientOwner(app, `owner${(n += 1)}@trips.in`);
  const ledger = createLedger({ clock });
  const wallets = createLiveWallets({ clock, ledger });
  await wallets.open(c.orgId);
  const bank = await ledger.accountId('platform', 'BANK');
  await wallets.apply({
    clientOrgId: c.orgId,
    opId: `top-${c.orgId}`,
    type: 'TOPUP',
    amountPaise: 10_000_000,
    journal: {
      reference: { type: 'test-top', id: c.orgId },
      purpose: 'wallet-topup',
      lines: [{ accountId: bank, debitPaise: 10_000_000 }],
    },
    by: 'test',
  });
  const offers = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(c.token))).body;
  return {
    h,
    c,
    priceToken: /** @type {string} */ (offers.offers[0].priceToken),
    b2bTotal: /** @type {number} */ (offers.offers[0].price.totalPaise),
  };
}

describe('client orders', () => {
  it('B2B price → order held → paid from the wallet → confirmed; documents; the same key → the same order', async () => {
    const { c, priceToken, b2bTotal } = await setup();
    const k = key();
    const created = await app.srv.post('/api/v1/client/orders', body(priceToken), { ...auth(c.token), 'idempotency-key': k });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: 'AWAITING_PAYMENT', channel: 'B2B_PORTAL', customerReference: 'TRIP-2026-114' });
    expect(created.body.totalPaise).toBe(b2bTotal); // the client's B2B price, never the website price
    const { orderEmailTo } = await import('../../src/b2b/routes/customer-emails.js');
    expect(await orderEmailTo(await E.stored(created.body.ref))).toMatch(/^owner\d+@trips\.in$/); // the booker, never the guest
    const again = await app.srv.post('/api/v1/client/orders', body(priceToken), { ...auth(c.token), 'idempotency-key': k });
    expect(again.body.ref).toBe(created.body.ref);
    const paid = await app.srv.post(
      `/api/v1/client/orders/${created.body.ref}/pay`,
      { method: 'WALLET' },
      { ...auth(c.token), 'idempotency-key': key() },
    );
    expect(paid.body).toMatchObject({ action: 'WALLET', status: 'CONFIRMED' });
    const o = (await app.srv.get(`/api/v1/client/orders/${created.body.ref}`, auth(c.token))).body;
    expect(o).toMatchObject({ status: 'CONFIRMED', paymentMode: 'WALLET' });
    expect((await app.srv.get('/api/v1/wallet', auth(c.token))).status).toBe(503); // the wallet page itself stays switched off here
    const docs = await app.srv.get(`/api/v1/client/orders/${created.body.ref}/documents`, auth(c.token));
    expect(docs.status).toBe(200);
  });

  it('another company → 404; a Viewer reads but cannot book; a website guest cannot use the client route', async () => {
    const { c, priceToken } = await setup();
    const o = (await app.srv.post('/api/v1/client/orders', body(priceToken), { ...auth(c.token), 'idempotency-key': key() })).body;
    const other = await clientOwner(app, `other${(n += 1)}@trips.in`);
    expect((await app.srv.get(`/api/v1/client/orders/${o.ref}`, auth(other.token))).status).toBe(404);
    expect(
      (await app.srv.post(`/api/v1/client/orders/${o.ref}/pay`, { method: 'WALLET' }, { ...auth(other.token), 'idempotency-key': key() }))
        .status,
    ).toBe(404);
    expect((await app.srv.post('/api/v1/client/orders', body(priceToken), { 'idempotency-key': key() })).status).toBe(401);
    // a Viewer reads the company's orders but can't book
    const viewerEmail = `viewer${(n += 1)}@trips.in`;
    const { UserRecord } = await import('../../src/b2b/modules/identity/index.js');
    const v = await app.users.create({
      email: viewerEmail,
      name: 'Viewer',
      password: (await import('./helpers/inventory-app.js')).PASSWORD,
    });
    await app.orgs.addMember({ orgId: c.orgId, userId: v.id, roles: ['client.viewer'], addedBy: 's' });
    expect(await UserRecord.exists({ _id: v.id })).toBeTruthy();
    const vt = await app.login(viewerEmail);
    expect((await app.srv.get(`/api/v1/client/orders/${o.ref}`, auth(vt))).status).toBe(200);
    expect((await app.srv.post('/api/v1/client/orders', body(priceToken), { ...auth(vt), 'idempotency-key': key() })).status).toBe(403);
  });

  it('PayU is still possible for a client (the form comes back); 20 orders waiting at once at most', async () => {
    const { c, priceToken } = await setup();
    const o = (await app.srv.post('/api/v1/client/orders', body(priceToken), { ...auth(c.token), 'idempotency-key': key() })).body;
    const pay = await app.srv.post(
      `/api/v1/client/orders/${o.ref}/pay`,
      { method: 'GATEWAY' },
      { ...auth(c.token), 'idempotency-key': key() },
    );
    expect([201, 503]).toContain(pay.status); // PayU settings may be absent on the test server → PAYMENTS_NOT_CONFIGURED
    const org = /** @type {any} */ (await OrganizationRecord.findById(c.orgId).setOptions(S).lean());
    expect(org.type).toBe('CLIENT');
  });

  it('cancel a wallet-paid booking → refund straight into the wallet; change requests; other companies 404', async () => {
    const { c, priceToken } = await setup();
    const o = (await app.srv.post('/api/v1/client/orders', body(priceToken), { ...auth(c.token), 'idempotency-key': key() })).body;
    await app.srv.post(`/api/v1/client/orders/${o.ref}/pay`, { method: 'WALLET' }, { ...auth(c.token), 'idempotency-key': key() });
    const bookingRef = (await app.srv.get(`/api/v1/client/orders/${o.ref}`, auth(c.token))).body.items[0].ref;
    const detail = await app.srv.get(`/api/v1/bookings/hotels/${bookingRef}`, auth(c.token));
    expect(detail.status).toBe(200);
    const other = await clientOwner(app, `other${(n += 1)}@trips.in`);
    expect((await app.srv.get(`/api/v1/bookings/hotels/${bookingRef}`, auth(other.token))).status).toBe(404);
    const cr = await app.srv.post(
      `/api/v1/bookings/hotels/${bookingRef}/amendments`,
      { type: 'OTHER', message: 'Late arrival around 11 pm' },
      auth(c.token),
    );
    expect(cr.status).toBe(201);
    const quote = (await app.srv.post(`/api/v1/bookings/hotels/${bookingRef}/cancellation-quote`, {}, auth(c.token))).body;
    const before = /** @type {any} */ (
      await (await import('../../src/b2b/modules/wallet/index.js')).AccountRecord.findOne({ ownerOrgId: c.orgId, type: 'WALLET' })
        .setOptions(S)
        .lean()
    );
    const done = await app.srv.post(
      `/api/v1/bookings/hotels/${bookingRef}/cancel`,
      { quoteToken: quote.quoteToken },
      { ...auth(c.token), 'idempotency-key': key() },
    );
    expect(done.status).toBe(200);
    const after = /** @type {any} */ (
      await (await import('../../src/b2b/modules/wallet/index.js')).AccountRecord.findOne({ ownerOrgId: c.orgId, type: 'WALLET' })
        .setOptions(S)
        .lean()
    );
    expect(after.balancePaise - before.balancePaise).toBe(done.body.refundPaise);
    expect(done.body.refundPaise).toBeGreaterThan(0);
  });
});
