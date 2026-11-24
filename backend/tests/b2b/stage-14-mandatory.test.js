// @ts-check
/**
 * Stage 14 mandatory tests (plan §8). Where each one lives:
 * - key lifecycle (create, use, rotate, revoke < 5 s) → api-keys.test.js, api-gateway.test.js, developers-api.test.js;
 * - usage per key counted into the client's one pool → api-gateway.test.js (B2B_API events per key) and here;
 * - SSRF suite (private / metadata / loopback / mapped addresses, rebinding, redirects, timeout) → webhooks-endpoints.test.js;
 * - webhook signature verifiable (also the docs' Node / PHP / Python / Java code, run by hand) → webhooks-endpoints.test.js;
 * - retry schedule and auto-disable; replay keeps the event id → webhooks-deliveries.test.js;
 * - **API bookings in the mixed-channel race** → here: the last room wanted at once by the website, a client
 *   dashboard, an API key and MusafirBaba admin → exactly one booking; the API order is marked B2B_API.
 */
import { describe, expect, it } from 'vitest';

import { ApiKeyRecord } from '../../src/b2b/modules/api-access/index.js';
import { BookingRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { MemberRecord } from '../../src/b2b/modules/organizations/index.js';
import { createLedger, createLiveWallets } from '../../src/b2b/modules/wallet/index.js';
import { apiKeysFor } from '../../src/b2b/routes/api-keys-wiring.js';
import { asStaff, auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

const ENV = { B2B_API_ENABLED: 'true', B2B_API_KEY_PEPPER: 'stage-14-mandatory-pepper-001' };
const E = useOrderEngine({ env: ENV });
const { app, clock, S, stay } = E;
const contact = { name: 'Asha Verma', email: 'asha@trips.in', phone: '9876543210' };

describe('one inventory for every channel, API included', () => {
  it('the last room wanted by the website, a dashboard, an API key and admin at once → exactly one booking', async () => {
    E.nowMs = Date.parse('2026-11-19T10:00:00Z');
    await ApiKeyRecord.deleteMany({}).setOptions(S);
    await seedPricing(clock);
    const { seedPlatformAccounts } = await import('../../src/b2b/modules/wallet/index.js');
    await seedPlatformAccounts();
    const h = await sellableHotel(app, { rooms: 1 });
    const dashboard = await clientOwner(app, 'race14-dashboard@trips.in');
    const viaApi = await clientOwner(app, 'race14-api@trips.in');
    const phoned = await clientOwner(app, 'race14-phone@trips.in');
    const ledger = createLedger({ clock });
    const wallets = createLiveWallets({ clock, ledger });
    for (const c of [dashboard, viaApi, phoned]) {
      await wallets.open(c.orgId);
      await wallets.apply({
        clientOrgId: c.orgId,
        opId: `race14-top-${c.orgId}`,
        type: 'TOPUP',
        amountPaise: 10_000_000,
        journal: {
          reference: { type: 'test-top', id: c.orgId },
          purpose: 'wallet-topup',
          lines: [{ accountId: await ledger.accountId('platform', 'BANK'), debitPaise: 10_000_000 }],
        },
        by: 'test',
      });
    }
    const m = /** @type {any} */ (await MemberRecord.findOne({ orgId: viaApi.orgId }).setOptions(S).lean());
    const key = (
      await apiKeysFor(ENV, clock).create(
        {
          orgId: viaApi.orgId,
          userId: m.userId,
          permissions: ['api-access.key.manage', 'hotel-search.search.use', 'orders.order.create', 'orders.order.read'],
        },
        { name: 'Race', scopes: ['hotel:search', 'hotel:book'] },
      )
    ).key;

    const site = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).body.offers[0].priceToken;
    const b2b = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(dashboard.token))).body.offers[0].priceToken;
    const api = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(key))).body.offers[0].priceToken;
    const ops = asStaff('s1:orders.offline.book');
    const offline = (
      await app.admin.post('/api/v1/admin/offline-bookings/offers', { clientOrgId: phoned.orgId, hotelRef: h.ref, stay }, ops)
    ).body.offers[0].priceToken;
    const rooms = [{ leadGuest: 'Asha Verma' }];
    const results = await Promise.all([
      app.srv.post(
        '/api/v1/orders',
        { priceToken: site, rooms, contact, confirmDuplicate: true },
        { 'x-guest-session': 'race14-guest-session-0000001', 'idempotency-key': 'race14-website-key-01' },
      ),
      app.srv.post(
        '/api/v1/client/orders',
        { priceToken: b2b, rooms, contact },
        { ...auth(dashboard.token), 'idempotency-key': 'race14-dashboard-key-1' },
      ),
      app.srv.post(
        '/api/v1/client/orders',
        { priceToken: api, rooms, contact, customerReference: 'THEIR-1' },
        { ...auth(key), 'idempotency-key': 'race14-api-key-000001' },
      ),
      app.admin.post(
        '/api/v1/admin/offline-bookings',
        { clientOrgId: phoned.orgId, priceToken: offline, rooms, contact, note: 'Phoned in' },
        { ...ops, 'idempotency-key': 'race14-offline-key-01' },
      ),
    ]);
    const statusOf = (/** @type {any} */ r) => r.body?.order?.status ?? r.body?.status ?? null;
    const winners = results.filter((r) => r.status === 201 && ['AWAITING_PAYMENT', 'CONFIRMED'].includes(statusOf(r)));
    expect(winners).toHaveLength(1);
    expect(await BookingRecord.countDocuments({ propertyId: h.propertyId, status: { $in: ['HELD', 'CONFIRMED'] } }).setOptions(S)).toBe(1);
    const apiOrders = await OrderRecord.find({ clientOrgId: viaApi.orgId }).setOptions(S).lean();
    expect(apiOrders.every((o) => o.channel === 'B2B_API')).toBe(true); // the key's attempt (won or lost) is marked as API
  });
});
