// @ts-check
/**
 * Stage 12 part B mandatory tests (plan §8). Where each one lives:
 * - mixed-channel last-room race (website + dashboard + admin → 1 winner) → here;
 * - wallet path ledger postings match the expected table → orders-wallet.test.js;
 * - insufficient balance releases rooms → orders-wallet.test.js, offline-bookings.test.js;
 * - wallet refund on cancel → orders-wallet.test.js, client-orders.test.js (through the API);
 * - client-branded voucher contains no net / margin → documents-client-voucher.test.js;
 * - usage counting (N billable calls → N events after flush; failures not counted; refresh-header rules) →
 *   metering-usage.test.js;
 * - other companies never see a client's orders or bookings → client-orders.test.js, client-bookings.test.js.
 * ("My Bookings < 300 ms on staging data" is checked on staging, with the `client_recent` index.)
 */
import { describe, expect, it } from 'vitest';

import { BookingRecord } from '../../src/b2b/modules/hotel-booking/index.js';
import { createLedger, createLiveWallets } from '../../src/b2b/modules/wallet/index.js';
import { asStaff, auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';
import { clientOwner, seedPricing, sellableHotel } from './helpers/search-setup.js';

const E = useOrderEngine();
const { app, clock, S, stay } = E;
const contact = { name: 'Asha Verma', email: 'asha@trips.in', phone: '9876543210' };

describe('one inventory for every channel', () => {
  it('the last room, wanted by the website, a client dashboard and MusafirBaba admin at once → exactly one booking', async () => {
    E.nowMs = Date.parse('2026-11-19T10:00:00Z');
    await seedPricing(clock);
    const { seedPlatformAccounts } = await import('../../src/b2b/modules/wallet/index.js');
    await seedPlatformAccounts();
    const h = await sellableHotel(app, { rooms: 1 });
    const dashboard = await clientOwner(app, 'race-dashboard@trips.in');
    const phoned = await clientOwner(app, 'race-phone@trips.in');
    const ledger = createLedger({ clock });
    const wallets = createLiveWallets({ clock, ledger });
    for (const c of [dashboard, phoned]) {
      await wallets.open(c.orgId);
      await wallets.apply({
        clientOrgId: c.orgId,
        opId: `race-top-${c.orgId}`,
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
    const site = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).body.offers[0].priceToken;
    const b2b = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay, auth(dashboard.token))).body.offers[0].priceToken;
    const ops = asStaff('s1:orders.offline.book');
    const offline = (
      await app.admin.post('/api/v1/admin/offline-bookings/offers', { clientOrgId: phoned.orgId, hotelRef: h.ref, stay }, ops)
    ).body.offers[0].priceToken;
    const rooms = [{ leadGuest: 'Asha Verma' }];
    const results = await Promise.all([
      app.srv.post(
        '/api/v1/orders',
        { priceToken: site, rooms, contact, confirmDuplicate: true },
        { 'x-guest-session': 'race-guest-session-000000001', 'idempotency-key': 'race-website-key-0001' },
      ),
      app.srv.post(
        '/api/v1/client/orders',
        { priceToken: b2b, rooms, contact },
        { ...auth(dashboard.token), 'idempotency-key': 'race-dashboard-key-01' },
      ),
      app.admin.post(
        '/api/v1/admin/offline-bookings',
        { clientOrgId: phoned.orgId, priceToken: offline, rooms, contact, note: 'Phoned in at the same moment' },
        { ...ops, 'idempotency-key': 'race-offline-key-0001' },
      ),
    ]);
    const statusOf = (/** @type {any} */ r) => r.body?.order?.status ?? r.body?.status ?? null;
    const winners = results.filter((r) => r.status === 201 && ['AWAITING_PAYMENT', 'CONFIRMED'].includes(statusOf(r)));
    expect(winners).toHaveLength(1);
    const live = await BookingRecord.countDocuments({ propertyId: h.propertyId, status: { $in: ['HELD', 'CONFIRMED'] } }).setOptions(S);
    expect(live).toBe(1);
  });
});
