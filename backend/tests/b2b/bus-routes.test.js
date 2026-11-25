// @ts-check
/**
 * Bus points, routes, schedules and trips (S18-T06).
 * - rules: every route problem at once; leg masks; schedule dates by weekday; stop moments in Indian time (next day);
 * - flow: points need a known city; route stops from own active points, first / last city different; stops locked
 *   once sent; staff approve; a schedule needs an approved route and an approved bus; the trip job makes 90 days of
 *   trips with one seat per layout seat, runs again without changes, finishes a trip half-made by a crash;
 * - ending a schedule cancels unsold trips only; a route with an active schedule can't be retired; other operators
 *   see nothing; a seat taken for some legs can still be taken for other legs (int32 `$bit` on stored seats).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  checkRoute,
  createBusReview,
  createLayouts,
  createRouteReview,
  createRoutes,
  createSchedules,
  createStops,
  createVehicles,
  instantOf,
  LayoutRecord,
  legMask,
  RouteRecord,
  ScheduleRecord,
  StopRecord,
  tripDates,
  VehicleRecord,
} from '../../src/b2b/modules/bus-catalog/index.js';
import { createTrips, TripRecord, TripSeatRecord } from '../../src/b2b/modules/bus-inventory/index.js';
import { startMongo } from './helpers/mongo.js';

const today = '2026-12-01';
const clock = { now: () => new Date(`${today}T06:30:00Z`) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const OP = { orgId: '65f0000000000000000b1821', userId: '65f0000000000000000c1821' };
const OTHER = { orgId: '65f0000000000000000b1822', userId: '65f0000000000000000c1822' };
const DELHI = '65f0000000000000000d0001';
const GURUGRAM = '65f0000000000000000d0002';
const JAIPUR = '65f0000000000000000d0003';
const cityExists = async (/** @type {string} */ id) => [DELHI, GURUGRAM, JAIPUR].includes(id);
const files = { describe: async () => ({ purpose: 'bus-paper' }) };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  for (const M of [LayoutRecord, VehicleRecord, StopRecord, RouteRecord, ScheduleRecord, TripRecord, TripSeatRecord])
    await /** @type {any} */ (M).deleteMany({}).setOptions(S);
});

const stops = createStops({ cityExists });
const routes = createRoutes({ clock, stops });
const review = createRouteReview({ clock });
const schedules = createSchedules({ today: () => today });
const trips = createTrips({ today: () => today, catalog: schedules });

/** Every seat of a trip. @param {{ decks: { seats: any[] }[] }} t */
const seatsOf = (t) => t.decks.flatMap((d) => d.seats);

/** An approved 2+1 sleeper bus (30 berths). */
async function approvedBus() {
  const vehicles = createVehicles({ clock, today: () => today, files });
  const layout = await createLayouts().create(OP, { name: 'Sleeper', template: 'sleeper-2x1-30' });
  let bus = await vehicles.create(OP, { regNo: 'RJ14PA1234', acType: 'AC', kind: 'SLEEPER', layoutId: layout.id });
  for (const kind of /** @type {const} */ (['RC', 'PERMIT', 'INSURANCE', 'FITNESS']))
    bus = await vehicles.setPaper(OP, bus.id, {
      kind,
      fileId: `f-${kind}`,
      number: 'N-1',
      expiresOn: '2028-01-01',
      expectedVersion: bus.version,
    });
  bus = await vehicles.submit(OP, bus.id, bus.version);
  return createBusReview({ clock, today: () => today }).decide('staff:s1', bus.id, 'approve', null);
}

/** Delhi 22:00 → Gurugram 22:45 → Jaipur 04:30 next day, approved. */
async function approvedRoute() {
  const d = await stops.create(OP, { cityId: DELHI, name: 'Kashmere Gate' });
  const g = await stops.create(OP, { cityId: GURUGRAM, name: 'IFFCO Chowk' });
  const j = await stops.create(OP, { cityId: JAIPUR, name: 'Sindhi Camp' });
  const r = await routes.create(OP, {
    name: 'Delhi → Jaipur',
    stops: [
      { stopId: d.id, dayOffset: 0, time: '22:00', boarding: true, dropping: false },
      { stopId: g.id, dayOffset: 0, time: '22:45', boarding: true, dropping: true },
      { stopId: j.id, dayOffset: 1, time: '04:30', boarding: false, dropping: true },
    ],
  });
  const sent = await routes.submit(OP, r.id, r.version);
  return {
    route: await review.decide('staff:s1', sent.id, 'approve', null),
    stopIds: /** @type {[string, string, string]} */ ([d.id, g.id, j.id]),
  };
}

describe('route rules', () => {
  it('problems at once; leg masks; weekdays; Indian time', () => {
    const codes = checkRoute([
      { stopId: 'a', dayOffset: 0, time: '22:00', boarding: false, dropping: false },
      { stopId: 'a', dayOffset: 0, time: '21:00', boarding: true, dropping: false },
    ]).map((p) => p.code);
    expect(codes).toEqual(
      expect.arrayContaining(['STOP_REPEATED', 'STOP_UNUSED', 'TIMES_NOT_IN_ORDER', 'FIRST_STOP_MUST_BOARD', 'LAST_STOP_MUST_DROP']),
    );
    expect(checkRoute([{ stopId: 'a', dayOffset: 0, time: '25:00', boarding: true, dropping: false }]).map((p) => p.code)).toEqual([
      'STOPS_TWO_TO_31',
    ]);
    expect([legMask(0, 1), legMask(1, 3), legMask(0, 30)]).toEqual([1, 6, 2 ** 30 - 1]);
    expect(() => legMask(0, 31)).toThrow();
    expect(tripDates({ weekdays: [5, 6, 0], validFrom: '2026-12-01', validTo: '2026-12-10' }, today, 90)).toEqual([
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ]);
    expect(instantOf('2026-12-12', { dayOffset: 0, time: '22:00' }).toISOString()).toBe('2026-12-12T16:30:00.000Z');
    expect(instantOf('2026-12-12', { dayOffset: 1, time: '04:30' }).toISOString()).toBe('2026-12-12T23:00:00.000Z');
  });
});

describe('routes, schedules, trips', () => {
  it('route checks, approval, schedule, 90 days of trips, repeat-safe, crash-safe', async () => {
    await expect(stops.create(OP, { cityId: '65f0000000000000000d0999', name: 'Nowhere' })).rejects.toMatchObject({
      code: 'CITY_NOT_FOUND',
    });
    const bus = await approvedBus();
    const { route, stopIds } = await approvedRoute();
    expect(route).toMatchObject({ status: 'APPROVED', fromCityId: DELHI, toCityId: JAIPUR });
    await expect(routes.update(OP, route.id, { stops: [], expectedVersion: route.version })).rejects.toBeTruthy();
    const back = [
      { stopId: stopIds[0], dayOffset: 0, time: '08:00', boarding: true, dropping: false },
      { stopId: stopIds[1], dayOffset: 0, time: '09:00', boarding: true, dropping: true },
    ];
    await expect(routes.update(OP, route.id, { stops: back, expectedVersion: route.version })).rejects.toMatchObject({
      code: 'ROUTE_NOT_EDITABLE',
    });
    await expect(
      routes.create(OP, { name: 'Loop', stops: [/** @type {any} */ (back[0]), { .../** @type {any} */ (back[1]), stopId: stopIds[0] }] }),
    ).rejects.toMatchObject({
      code: 'ROUTE_INVALID',
    });
    await expect(routes.create(OTHER, { name: 'Theirs', stops: back })).rejects.toMatchObject({ code: 'ROUTE_INVALID' }); // not their points

    const draft = await routes.create(OP, { name: 'Draft', stops: back });
    await expect(
      schedules.create(OP, { routeId: draft.id, vehicleId: bus.id, weekdays: [1], validFrom: today, validTo: null }),
    ).rejects.toMatchObject({ code: 'ROUTE_NOT_APPROVED' });
    await expect(
      schedules.create(OP, { routeId: route.id, vehicleId: bus.id, weekdays: [1], validFrom: '2026-11-01', validTo: null }),
    ).rejects.toMatchObject({ code: 'START_DATE_INVALID' });
    const s = await schedules.create(OP, {
      routeId: route.id,
      vehicleId: bus.id,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      validFrom: today,
      validTo: null,
    });

    expect(await trips.generate()).toEqual({ made: 90, cancelled: 0 });
    expect(await TripSeatRecord.countDocuments({}).setOptions(S)).toBe(90 * 30);
    expect(await trips.generate()).toEqual({ made: 0, cancelled: 0 });
    const list = await trips.list(OP.orgId, { from: '2026-12-12', to: '2026-12-12' });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ date: '2026-12-12', seatCount: 30, status: 'SCHEDULED' });
    expect(new Date(/** @type {any} */ (list[0]).arriveAt).toISOString()).toBe('2026-12-12T23:00:00.000Z');

    // crash between the trip and its seats → the next run finishes it
    const half = /** @type {any} */ (list[0]);
    await TripSeatRecord.deleteMany({ tripId: half.id, no: { $in: ['L1', 'U5'] } }).setOptions(S);
    await TripRecord.updateOne({ _id: half.id }, { $set: { seatsReady: false } }).setOptions(S);
    await trips.generate();
    const full = await trips.get(OP.orgId, half.id);
    expect(seatsOf(full)).toHaveLength(30);
    // the trip keeps its own seat map (grid + positions), so later layout edits never move sold seats
    expect(full.decks.map((d) => [d.deck, d.rows, d.cols, d.seats.length])).toEqual([
      ['LOWER', 5, 4, 15],
      ['UPPER', 5, 4, 15],
    ]);
    expect(full.decks[0]?.seats.find((x) => x.no === 'L1')).toMatchObject({ row: 0, col: 0, type: 'SLEEPER', taken: 0 });

    await expect(routes.retire(OP, route.id, route.version)).rejects.toMatchObject({ code: 'ROUTE_IN_USE' });
    await expect(trips.get(OTHER.orgId, half.id)).rejects.toMatchObject({ code: 'TRIP_NOT_FOUND' });
    expect(await trips.list(OTHER.orgId, { from: today, to: '2026-12-31' })).toEqual([]);
    expect(await routes.list(OTHER.orgId)).toEqual([]);
    expect(s.status).toBe('ACTIVE');
  });

  it('a seat sold for some legs stays free for the others; ending a schedule cancels unsold trips only', async () => {
    const bus = await approvedBus();
    const { route } = await approvedRoute();
    const s = await schedules.create(OP, {
      routeId: route.id,
      vehicleId: bus.id,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      validFrom: today,
      validTo: '2026-12-20',
    });
    await trips.generate();
    const [sold, unsold] = await trips.list(OP.orgId, { from: '2026-12-15', to: '2026-12-16' });

    const take = (/** @type {number} */ mask) =>
      TripSeatRecord.updateOne(
        { tripId: sold?.id, no: 'L5', taken: { $bitsAllClear: mask } },
        { $bit: { taken: { or: mask } } },
      ).setOptions(S);
    expect((await take(legMask(0, 1))).modifiedCount).toBe(1); // Delhi → Gurugram
    expect((await take(legMask(1, 2))).modifiedCount).toBe(1); // Gurugram → Jaipur: other leg, same seat
    expect((await take(legMask(0, 2))).modifiedCount).toBe(0); // whole route: taken
    expect(seatsOf(await trips.get(OP.orgId, /** @type {string} */ (sold?.id))).find((x) => x.no === 'L5')?.taken).toBe(3);

    const ended = await schedules.end(OP, s.id, { from: '2026-12-15', expectedVersion: s.version });
    expect(ended).toMatchObject({ status: 'ENDED', endedFrom: '2026-12-15' });
    expect(await trips.cancelUnsold(s.id, '2026-12-15')).toBe(5); // 16–20 Dec; the 15th has a sold seat
    expect((await trips.get(OP.orgId, /** @type {string} */ (unsold?.id))).status).toBe('CANCELLED');
    expect((await trips.get(OP.orgId, /** @type {string} */ (sold?.id))).status).toBe('SCHEDULED');
    expect(await trips.generate()).toEqual({ made: 0, cancelled: 0 });
    await expect(schedules.end(OP, s.id, { from: '2026-12-15', expectedVersion: ended.version })).rejects.toMatchObject({
      code: 'SCHEDULE_ENDED',
    });
  });
});
