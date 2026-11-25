// @ts-check
/**
 * Bus search over HTTP (S18-T08): with both switches on, anyone may search (website prices, per-IP limit); a client
 * member needs `bus-booking.search.use` (Owner has it, Viewer doesn't); hotel members are refused; an unknown trip's
 * seat map is 404. With `B2B_BUS_SELLING_ENABLED` off the bus search answers 503 (bus-operator-switch.test.js).
 */
import { describe, expect, it } from 'vitest';

import { auth, PASSWORD, useInventoryApp } from './helpers/inventory-app.js';

const app = useInventoryApp({
  clock: { now: () => new Date('2026-12-10T10:00:00Z') },
  env: { B2B_BUS_ENABLED: 'true', B2B_BUS_SELLING_ENABLED: 'true' },
});
const Q = '/api/v1/buses/search?from=65f0000000000000000d0101&to=65f0000000000000000d0103&date=2026-12-12';

describe('bus search over HTTP', () => {
  it('website and client owners search; viewers and hotels refused; unknown trip 404', async () => {
    const anon = await app.srv.get(Q);
    expect([anon.status, anon.body]).toEqual([200, { data: [] }]);
    expect(anon.headers.get('ratelimit-limit')).toBe('40'); // per-IP heavy limit
    expect((await app.srv.get('/api/v1/buses/search?from=x&to=y&date=2026-12-12')).status).toBe(400);

    const owner = await app.users.create({ email: 'owner@travelco.in', name: 'Owner', password: PASSWORD });
    const client = await app.orgs.createOrganization({
      type: 'CLIENT',
      legalName: 'Travel Co',
      ownerUserId: owner.id,
      status: 'ACTIVE',
      createdBy: 's',
    });
    const token = await app.login('owner@travelco.in');
    const asClient = await app.srv.get(Q, auth(token));
    expect(asClient.status).toBe(200);
    expect(asClient.headers.get('ratelimit-limit')).toBe('600'); // signed in → per-company limits, not the visitor's 40
    const viewer = await app.staff(client.id, 'viewer@travelco.in', 'client.viewer');
    expect((await app.srv.get(Q, auth(viewer))).status).toBe(403);
    const hotel = await app.hotelWithProperty('owner@notaclient.in');
    expect((await app.srv.get(Q, auth(hotel.token))).status).toBe(403);

    const seats = await app.srv.get(
      '/api/v1/buses/trips/65f0000000000000000f0001/seats?from=65f0000000000000000e0001&to=65f0000000000000000e0003',
    );
    expect([seats.status, seats.body.code]).toEqual([404, 'TRIP_NOT_FOUND']);
  });
});
