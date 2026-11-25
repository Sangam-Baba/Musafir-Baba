// @ts-check
/**
 * Bus orders over HTTP (S18-T09) with every switch on: a client Owner must send an Idempotency-Key; an unknown trip is
 * refused (nothing held); a client Viewer and a hotel are refused; website guests need their browser session. The full
 * paid flow is in bus-booking.test.js (service layer, wallet).
 */
import { describe, expect, it } from 'vitest';

import { auth, PASSWORD, useInventoryApp } from './helpers/inventory-app.js';

const app = useInventoryApp({
  clock: { now: () => new Date('2026-12-10T10:00:00Z') },
  env: { B2B_BUS_ENABLED: 'true', B2B_BUS_SELLING_ENABLED: 'true', B2B_ORDERS_ENABLED: 'true' },
});
const body = {
  tripId: '65f0000000000000000f0001',
  fromStopId: '65f0000000000000000e0001',
  toStopId: '65f0000000000000000e0003',
  seats: [{ no: 'L1', passenger: { name: 'Ravi Kumar', age: 30, gender: 'M' } }],
  contact: { name: 'Asha', email: 'desk@asha.in', phone: '9876543210' },
};

describe('bus orders over HTTP', () => {
  it('idempotency key, unknown trip, permissions, guest session', async () => {
    const owner = await app.users.create({ email: 'owner@asha.in', name: 'Owner', password: PASSWORD });
    const client = await app.orgs.createOrganization({
      type: 'CLIENT',
      legalName: 'Asha Travels',
      ownerUserId: owner.id,
      status: 'ACTIVE',
      createdBy: 's',
    });
    const token = await app.login('owner@asha.in');
    expect((await app.srv.post('/api/v1/client/bus-orders', body, auth(token))).body.code).toBe('VALIDATION_FAILED'); // no Idempotency-Key
    const r = await app.srv.post('/api/v1/client/bus-orders', body, { ...auth(token), 'idempotency-key': 'bus-order-key-000001' });
    expect([r.status, r.body.code]).toEqual([404, 'TRIP_NOT_FOUND']);
    const viewer = await app.staff(client.id, 'viewer@asha.in', 'client.viewer');
    expect(
      (await app.srv.post('/api/v1/client/bus-orders', body, { ...auth(viewer), 'idempotency-key': 'bus-order-key-000002' })).status,
    ).toBe(403);
    const hotel = await app.hotelWithProperty('owner@nothotel.in');
    expect(
      (await app.srv.post('/api/v1/client/bus-orders', body, { ...auth(hotel.token), 'idempotency-key': 'bus-order-key-000003' })).status,
    ).toBe(403);
    const guest = await app.srv.post('/api/v1/bus-orders', body, { 'idempotency-key': 'bus-order-key-000004' });
    expect([guest.status, guest.body.code]).toEqual([401, 'GUEST_SESSION_REQUIRED']);
    const withSession = await app.srv.post('/api/v1/bus-orders', body, {
      'idempotency-key': 'bus-order-key-000005',
      'x-guest-session': 'guest-session-0123456789abcdef',
    });
    expect([withSession.status, withSession.body.code]).toEqual([404, 'TRIP_NOT_FOUND']);
  });
});
