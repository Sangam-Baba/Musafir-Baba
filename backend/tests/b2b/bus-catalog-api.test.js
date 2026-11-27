// @ts-check
/**
 * Bus catalogue over HTTP (S18-T05): an operator uploads papers (`purpose=bus-paper`), builds a bus from a layout
 * template, attaches the papers, sends it; staff with `platform.bus.review` see it and approve; a hotel can't use the
 * bus pages; a KYC upload still needs the KYC permission; the switch-off answer is in bus-operator-switch.test.js.
 * Then (S18-T06): points in known cities → route → sent → staff approve (with company name) → schedule → trips listed.
 */
import { describe, expect, it } from 'vitest';

import { ApplicationRecord, gstinCheckChar } from '../../src/b2b/modules/kyc/index.js';
import {
  createSchedules,
  FareRecord,
  LayoutRecord,
  RouteRecord,
  ScheduleRecord,
  StopRecord,
  VehicleRecord,
} from '../../src/b2b/modules/bus-catalog/index.js';
import { ClaimRecord, createTrips, TripRecord, TripSeatRecord } from '../../src/b2b/modules/bus-inventory/index.js';
import { CityRecord } from '../../src/b2b/modules/hotel-catalog/index.js';
import { asStaff, auth, useInventoryApp } from './helpers/inventory-app.js';

const clock = { now: () => new Date('2026-11-25T10:00:00Z') };
const app = useInventoryApp({
  clock,
  models: [
    ApplicationRecord,
    LayoutRecord,
    VehicleRecord,
    StopRecord,
    RouteRecord,
    ScheduleRecord,
    TripRecord,
    TripSeatRecord,
    CityRecord,
    ClaimRecord,
    FareRecord,
  ],
  env: { B2B_BUS_ENABLED: 'true' },
});
const PDF = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n(RC RJ14PA1234)\n%%EOF', 'latin1');
const gstin = (/** @type {string} */ b) => b + gstinCheckChar(b);
const details = {
  legalName: 'Ganga Bus Services Private Limited',
  contactName: 'Mohan Lal',
  mobile: '9876543212',
  email: 'mohan@gangabus.in',
  gstRegistered: true,
  gstin: gstin('09AABCG1234K1Z'),
  pan: 'AABCG1234K',
  address: { line1: '1 Charbagh', city: 'Lucknow', stateCode: '09', pin: '226004' },
  termsAccepted: true,
  termsVersion: '2026-11',
  fleetSize: 5,
};

/** @param {string} token @param {string} purpose */
async function upload(token, purpose) {
  const res = await fetch(`${app.srv.base}/api/v1/files?purpose=${purpose}`, {
    method: 'POST',
    headers: { ...auth(token), 'x-file-name': 'rc.pdf', 'content-type': 'application/pdf' },
    body: PDF,
  });
  return { status: res.status, body: /** @type {any} */ (await res.json()) };
}

/** Points → route → staff approval → schedule → trips. @param {string} t @param {string} busId */
async function routesOverHttp(t, busId) {
  const city = (/** @type {string} */ name, /** @type {number} */ lng) =>
    CityRecord.create({
      name,
      slug: name.toLowerCase(),
      stateCode: '09',
      location: { type: 'Point', coordinates: [lng, 26] },
      radiusKm: 30,
    });
  const [lko, knp] = [await city('Lucknow', 80.9), await city('Kanpur', 80.3)];
  const stop = async (/** @type {any} */ c, /** @type {string} */ name) =>
    (await app.srv.post('/api/v1/bus/stops', { cityId: String(c._id), name }, auth(t))).body;
  const [a, b] = [await stop(lko, 'Charbagh'), await stop(knp, 'Jhakarkati')];
  expect((await app.srv.post('/api/v1/bus/stops', { cityId: '65f0000000000000000d0999', name: 'Nowhere' }, auth(t))).body.code).toBe(
    'CITY_NOT_FOUND',
  );
  const route = (
    await app.srv.post(
      '/api/v1/bus/routes',
      {
        name: 'Lucknow → Kanpur',
        stops: [
          { stopId: a.id, dayOffset: 0, time: '06:00', boarding: true, dropping: false },
          { stopId: b.id, dayOffset: 0, time: '08:30', boarding: false, dropping: true },
        ],
      },
      auth(t),
    )
  ).body;
  expect(route.status).toBe('DRAFT');
  await app.srv.post(`/api/v1/bus/routes/${route.id}/submit`, { expectedVersion: route.version }, auth(t));
  const queue = (await app.admin.get('/api/v1/admin/bus/routes', asStaff('s1:platform.bus.review'))).body.data;
  expect(queue).toEqual([
    expect.objectContaining({ id: route.id, operatorName: expect.any(String), stopNames: { [a.id]: 'Charbagh', [b.id]: 'Jhakarkati' } }),
  ]);
  const ok = await app.admin.post(`/api/v1/admin/bus/routes/${route.id}/decide`, { move: 'approve' }, asStaff('s1:platform.bus.review'));
  expect(ok.body.status).toBe('APPROVED');
  const s = await app.srv.post(
    '/api/v1/bus/schedules',
    { routeId: route.id, vehicleId: busId, weekdays: [3], validFrom: '2026-11-25', validTo: null },
    auth(t),
  );
  expect(s.status).toBe(201);
  const tr = await app.srv.get('/api/v1/bus/trips?from=2026-11-25&to=2026-12-20', auth(t));
  expect(tr.body.data).toEqual([]); // the trip job makes them (bus-routes.test.js)
  expect((await app.srv.get('/api/v1/bus/trips?from=2026-11-25&to=2027-01-31', auth(t))).body.code).toBe('DATE_RANGE_INVALID');
  await seatsAndFaresOverHttp(t, route.id);
}

/** Fares saved; trips made; a counter block, its release and stop sale (S18-T07). @param {string} t @param {string} routeId */
async function seatsAndFaresOverHttp(t, routeId) {
  const row = { fromIdx: 0, toIdx: 1, seatType: 'SLEEPER', deck: null, netPaise: 45_000 };
  const saved = await app.srv.put(`/api/v1/bus/routes/${routeId}/fares`, { rows: [row], rules: [], expectedVersion: 0 }, auth(t));
  expect(saved.body).toMatchObject({ version: 1, rows: [row] });
  expect((await app.srv.put(`/api/v1/bus/routes/${routeId}/fares`, { rows: [], rules: [], expectedVersion: 0 }, auth(t))).body.code).toBe(
    'VERSION_CONFLICT',
  );
  const today = () => '2026-11-25';
  await createTrips({ today, catalog: createSchedules({ today }) }).generate();
  const [trip] = (await app.srv.get('/api/v1/bus/trips?from=2026-12-02&to=2026-12-02', auth(t))).body.data;
  const blk = await app.srv.post(`/api/v1/bus/trips/${trip.id}/blocks`, { seats: ['L1', 'L2'], note: 'counter' }, auth(t));
  expect(blk.status).toBe(201);
  expect((await app.srv.post(`/api/v1/bus/trips/${trip.id}/blocks`, { seats: ['L2'] }, auth(t))).body.code).toBe('SEAT_UNAVAILABLE');
  const seats = (await app.srv.get(`/api/v1/bus/trips/${trip.id}`, auth(t))).body.decks.flatMap((/** @type {any} */ d) => d.seats);
  expect(seats.filter((/** @type {any} */ s) => s.taken).map((/** @type {any} */ s) => s.no)).toEqual(['L1', 'L2']);
  expect((await app.srv.get(`/api/v1/bus/trips/${trip.id}/blocks`, auth(t))).body.data).toHaveLength(1);
  expect((await app.srv.post(`/api/v1/bus/blocks/${blk.body.id}/release`, {}, auth(t))).body.status).toBe('RELEASED');
  expect((await app.srv.put(`/api/v1/bus/trips/${trip.id}/sale`, { stopped: true }, auth(t))).body).toEqual({
    tripId: trip.id,
    saleStopped: true,
  });
}

describe('bus catalogue over HTTP', () => {
  it('papers → template layout → bus → submit → staff approve; hotels kept out', async () => {
    const reg = await app.srv.post(
      '/api/v1/registrations/operator',
      { details, owner: { name: 'Mohan Lal', password: 'correct-horse-battery-1' } },
      { 'x-b2b-auth': '1' },
    );
    expect(reg.status).toBe(201);
    const t = reg.body.accessToken;
    const templates = (await app.srv.get('/api/v1/bus/layout-templates', auth(t))).body.data;
    expect(templates.map((/** @type {any} */ x) => x.key)).toContain('sleeper-2x1-30');
    const layout = (await app.srv.post('/api/v1/bus/layouts', { name: 'Sleeper 2+1', template: 'sleeper-2x1-30' }, auth(t))).body;
    expect(layout.seatCount).toBe(30);
    let bus = (
      await app.srv.post(
        '/api/v1/bus/vehicles',
        { regNo: 'UP32 AB 7788', acType: 'AC', kind: 'SLEEPER', layoutId: layout.id, amenities: ['AC', 'WATER'] },
        auth(t),
      )
    ).body;
    expect(bus).toMatchObject({ regNo: 'UP32AB7788', status: 'DRAFT' });
    for (const kind of ['RC', 'PERMIT', 'INSURANCE', 'FITNESS']) {
      const f = await upload(t, 'bus-paper');
      expect(f.status).toBe(201);
      bus = (
        await app.srv.put(
          `/api/v1/bus/vehicles/${bus.id}/papers`,
          { kind, fileId: f.body.id, number: `${kind}-778`, expiresOn: '2027-09-30', expectedVersion: bus.version },
          auth(t),
        )
      ).body;
    }
    expect(bus.paperProblems).toEqual([]);
    expect((await app.srv.post(`/api/v1/bus/vehicles/${bus.id}/submit`, { expectedVersion: bus.version }, auth(t))).body.status).toBe(
      'SUBMITTED',
    );

    expect((await app.admin.get('/api/v1/admin/bus/vehicles', asStaff('s1:platform.kyc.read'))).status).toBe(403);
    const queue = (await app.admin.get('/api/v1/admin/bus/vehicles', asStaff('s1:platform.bus.review'))).body.data;
    expect(queue).toEqual([
      expect.objectContaining({ regNo: 'UP32AB7788', operatorName: expect.any(String), operatorRef: expect.stringMatching(/^MBBO-/) }),
    ]);
    const approved = await app.admin.post(
      `/api/v1/admin/bus/vehicles/${bus.id}/decide`,
      { move: 'approve' },
      asStaff('s1:platform.bus.review'),
    );
    expect(approved.body).toMatchObject({ status: 'APPROVED', sellable: true });
    await routesOverHttp(t, bus.id);

    const hotel = await app.hotelWithProperty('owner@notabus.in');
    expect((await app.srv.get('/api/v1/bus/vehicles', auth(hotel.token))).status).toBe(403);
    expect((await upload(hotel.token, 'bus-paper')).status).toBe(403); // a hotel can't upload bus papers
  });
});
