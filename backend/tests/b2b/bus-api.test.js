// @ts-check
/**
 * Buses in the B2B API (S18-T11, B8c): the bus scopes need the right permission to be given; a bus key only reaches
 * bus search / booking (never hotel booking or the wallet); bus booking events become `bus_booking.*` webhooks for the
 * client company of the order only; the OpenAPI document lists the bus endpoints.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { SCOPE_RULES, scopesAllowed } from '../../src/b2b/modules/api-access/index.js';
import { OrderRecord } from '../../src/b2b/modules/orders/index.js';
import { WEBHOOK_EVENTS } from '../../src/b2b/modules/webhooks/index.js';
import { openApiDocument } from '../../src/b2b/routes/openapi.js';
import { toPublicEvent } from '../../src/b2b/routes/webhooks-wiring.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-12-10T10:00:00Z') };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());

describe('bus API', () => {
  it('scopes need their permission; a bus key reaches buses only', () => {
    expect(scopesAllowed(['bus:search', 'bus:book'], ['bus-booking.search.use', 'orders.order.create'])).toBe(true);
    expect(scopesAllowed(['bus:search'], ['hotel-search.search.use'])).toBe(false);
    const reach = [...SCOPE_RULES['bus:search'].patterns, ...SCOPE_RULES['bus:book'].patterns];
    expect(reach.some((p) => /hotel|wallet|webhooks/.test(p))).toBe(false);
    expect(WEBHOOK_EVENTS).toEqual(expect.arrayContaining(['bus_booking.confirmed', 'bus_booking.cancelled', 'booking.confirmed']));
    expect(Object.keys(openApiDocument({}).paths)).toEqual(
      expect.arrayContaining(['/buses/search', '/client/bus-orders', '/bookings/buses/{ref}/cancel']),
    );
  });

  it('bus events → webhooks for the client of the order only', async () => {
    const client = await OrderRecord.create({
      ref: 'MBO-AAAA-AAAA',
      channel: 'B2B_API',
      clientOrgId: '65f0000000000000000a1881',
      createdBy: 'user:u',
      idempotency: { scope: 's', key: 'k1' },
      tokenHash: 't',
      contact: { name: 'A', email: 'a@b.in', phone: '9876543210' },
      totalPaise: 1,
      gstPaise: 0,
      paymentMode: 'WALLET',
      status: 'CONFIRMED',
      statusChangedAt: new Date(),
    });
    const web = await OrderRecord.create({
      ref: 'MBO-BBBB-BBBB',
      channel: 'WEBSITE',
      guestKey: 'g',
      createdBy: 'guest',
      idempotency: { scope: 's', key: 'k2' },
      tokenHash: 't',
      contact: { name: 'A', email: 'a@b.in', phone: '9876543210' },
      totalPaise: 1,
      gstPaise: 0,
      paymentMode: 'GATEWAY',
      status: 'CONFIRMED',
      statusChangedAt: new Date(),
    });
    expect(
      await toPublicEvent({
        type: 'bus-booking.booking.confirmed',
        payload: { orderId: String(client._id), ref: 'MBB-1234-5678', seats: 2 },
      }),
    ).toEqual({
      orgId: '65f0000000000000000a1881',
      type: 'bus_booking.confirmed',
      data: { orderRef: 'MBO-AAAA-AAAA', pnr: 'MBB-1234-5678', seats: 2 },
    });
    expect(
      await toPublicEvent({
        type: 'bus-booking.booking.cancelled',
        payload: { orderId: String(client._id), ref: 'MBB-1234-5678', seats: ['L1'], refundPaise: 900, all: false },
      }),
    ).toMatchObject({
      type: 'bus_booking.cancelled',
      data: { pnr: 'MBB-1234-5678', seats: ['L1'], refundPaise: 900, allCancelled: false },
    });
    expect(
      await toPublicEvent({ type: 'bus-booking.booking.confirmed', payload: { orderId: String(web._id), ref: 'MBB-9999-9999' } }),
    ).toBeNull(); // website order: no client
  });
});
