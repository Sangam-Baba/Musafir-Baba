// @ts-check
/**
 * Bus pricing, search and seat map (S18-T08).

 * - search: Delhi → Jaipur and the part route Gurugram → Jaipur; seats left drop when seats are blocked; seat classes
 *   without a fare aren't offered; hidden when sale is stopped, papers expired, route suspended or operator inactive;
 * - seat map: a seat sold Delhi → Gurugram is free Gurugram → Jaipur; ladies seat flagged; departed stop refused.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createBusSearch } from '../../src/b2b/modules/bus-booking/index.js';
import { FareRecord, RouteRecord, VehicleRecord } from '../../src/b2b/modules/bus-catalog/index.js';
import { createClaims, TripRecord, TripSeatRecord } from '../../src/b2b/modules/bus-inventory/index.js';
import { MarginRuleRecord, seedPricingSettings, TaxRuleRecord } from '../../src/b2b/modules/pricing/index.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-12-10T10:00:00Z');
const clock = { now: () => now };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const OP = '65f0000000000000000b1851';
const [DEL, GGN, JAI] = ['65f0000000000000000d0101', '65f0000000000000000d0102', '65f0000000000000000d0103'];
const STATE = { [DEL]: '07', [GGN]: '06', [JAI]: '08' };
const STOPS = [
  {
    stopId: '65f0000000000000000e0001',
    cityId: DEL,
    name: 'Kashmere Gate',
    at: new Date('2026-12-12T16:30:00Z'),
    boarding: true,
    dropping: false,
  },
  {
    stopId: '65f0000000000000000e0002',
    cityId: GGN,
    name: 'IFFCO Chowk',
    at: new Date('2026-12-12T17:15:00Z'),
    boarding: true,
    dropping: true,
  },
  {
    stopId: '65f0000000000000000e0003',
    cityId: JAI,
    name: 'Sindhi Camp',
    at: new Date('2026-12-12T23:00:00Z'),
    boarding: false,
    dropping: true,
  },
];
const [KG, IF, SC] = /** @type {[string, string, string]} */ (STOPS.map((s) => s.stopId));
let operatorActive = true;
const search = createBusSearch({
  clock,
  operators: async (ids) => new Map(ids.map((id) => [id, { name: 'Shree Travels', active: operatorActive }])),
  stateOf: async (id) => /** @type {Record<string, string>} */ (STATE)[id] ?? null,
});
const WEB = { channel: /** @type {const} */ ('WEBSITE'), clientOrgId: null, clientCategory: null };
const CLIENT = { channel: /** @type {const} */ ('B2B_PORTAL'), clientOrgId: '65f0000000000000000a1851', clientCategory: null };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {string} */
let tripId;
/** @type {string} */
let busId;
/** @type {string} */
let routeId;

const taxRule = {
  key: 'bus-test-5',
  appliesTo: /** @type {const} */ ('BUS_TRANSPORT'),
  sac: '996421',
  slabMinPaise: 0,
  slabMaxPaise: null,
  rateBps: 500,
  itcAllowed: false,
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  sourceNote: 'test rate',
};

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPricingSettings();
  await MarginRuleRecord.create({
    name: 'Bus default',
    priority: 0,
    match: { productType: 'BUS' },
    adjustment: { type: 'FIXED_PER_NIGHT', value: 5_000 },
    status: 'ACTIVE',
    createdBy: 'test',
  });
  await TaxRuleRecord.create({ ...taxRule, status: 'ACTIVE', proposedBy: 'test', approvedBy: 'test2' });
  const route = await RouteRecord.create({
    operatorOrgId: OP,
    name: 'Delhi → Jaipur',
    stops: STOPS.map(({ stopId, cityId, boarding, dropping }, i) => ({
      stopId,
      cityId,
      boarding,
      dropping,
      dayOffset: 0,
      time: `2${i}:00`,
    })),
    fromCityId: DEL,
    toCityId: JAI,
    status: 'APPROVED',
    createdBy: 'test',
  });
  routeId = String(route._id);
  const papers = ['RC', 'PERMIT', 'INSURANCE', 'FITNESS'].map((kind) => ({
    kind,
    fileId: 'f',
    number: 'n',
    expiresOn: '2027-06-30',
    addedAt: now,
  }));
  const bus = await VehicleRecord.create({
    operatorOrgId: OP,
    regNo: 'RJ14PA1234',
    acType: 'AC',
    kind: 'SLEEPER',
    layoutId: 'l1',
    papers,
    status: 'APPROVED',
    createdBy: 'test',
  });
  busId = String(bus._id);
  await FareRecord.create({
    operatorOrgId: OP,
    routeId,
    rows: [
      { fromIdx: 0, toIdx: 2, seatType: 'SLEEPER', deck: 'LOWER', netPaise: 90_000 },
      { fromIdx: 0, toIdx: 2, seatType: 'SLEEPER', deck: 'UPPER', netPaise: 80_000 },
      { fromIdx: 1, toIdx: 2, seatType: 'SLEEPER', deck: 'LOWER', netPaise: 75_000 },
    ],
  });
  const trip = await TripRecord.create({
    operatorOrgId: OP,
    scheduleId: 's1',
    routeId,
    vehicleId: busId,
    layoutId: 'l1',
    date: '2026-12-12',
    stops: STOPS,
    fromCityId: DEL,
    toCityId: JAI,
    departAt: STOPS[0]?.at,
    arriveAt: STOPS[2]?.at,
    legs: 2,
    decks: [
      { deck: 'LOWER', rows: 2, cols: 2 },
      { deck: 'UPPER', rows: 1, cols: 2 },
    ],
    seatCount: 6,
    seatsReady: true,
  });
  tripId = String(trip._id);
  await TripSeatRecord.insertMany([
    ...['L1', 'L2', 'L3', 'L4'].map((no, i) => ({
      operatorOrgId: OP,
      tripId,
      no,
      deck: 'LOWER',
      type: 'SLEEPER',
      row: Math.floor(i / 2),
      col: i % 2,
      ladies: no === 'L4',
    })),
    ...['U1', 'U2'].map((no, i) => ({ operatorOrgId: OP, tripId, no, deck: 'UPPER', type: 'SLEEPER', row: 0, col: i })),
  ]);
});
afterAll(async () => mongo.stop());

describe('bus search and seat map', () => {
  it('full and part route; seats left; classes without fares; hidden when not sellable', async () => {
    const [full] = await search.search({ fromCityId: DEL, toCityId: JAI, date: '2026-12-12', caller: WEB });
    expect(full).toMatchObject({
      tripId,
      operatorName: 'Shree Travels',
      acType: 'AC',
      seatsLeft: 6,
      seatTypes: ['SLEEPER'],
      fromPricePaise: 89_250,
      durationMinutes: 390,
    }); // (800 + 50) × 1.05
    expect(full?.boardingPoints.map((p) => p.name)).toEqual(['Kashmere Gate']);
    const [part] = await search.search({ fromCityId: GGN, toCityId: JAI, date: '2026-12-12', caller: CLIENT });
    expect(part).toMatchObject({ seatsLeft: 4, fromPricePaise: 84_000 }); // only lower berths have a Gurugram fare: (750 + 50) × 1.05
    expect(await search.search({ fromCityId: JAI, toCityId: DEL, date: '2026-12-12', caller: WEB })).toEqual([]);
    expect(
      await search.search({ fromCityId: DEL, toCityId: JAI, date: '2026-12-12', caller: WEB, filters: { maxPricePaise: 80_000 } }),
    ).toEqual([]);
    await expect(search.search({ fromCityId: DEL, toCityId: DEL, date: '2026-12-12', caller: WEB })).rejects.toMatchObject({
      code: 'FROM_TO_SAME_CITY',
    });
    await expect(search.search({ fromCityId: DEL, toCityId: JAI, date: '2026-12-01', caller: WEB })).rejects.toMatchObject({
      code: 'TRAVEL_DATE_INVALID',
    });

    const claims = createClaims({ clock });
    const blk = await claims.block({ orgId: OP, userId: 'u' }, tripId, { seats: ['U1', 'U2'] });
    expect((await search.search({ fromCityId: DEL, toCityId: JAI, date: '2026-12-12', caller: WEB }))[0]).toMatchObject({
      seatsLeft: 4,
      fromPricePaise: 99_750,
    });
    await claims.releaseBlock({ orgId: OP, userId: 'u' }, blk.id);

    const hidden = async (/** @type {() => Promise<unknown>} */ change, /** @type {() => Promise<unknown>} */ undo) => {
      await change();
      expect(await search.search({ fromCityId: DEL, toCityId: JAI, date: '2026-12-12', caller: WEB })).toEqual([]);
      await undo();
    };
    await hidden(
      () => TripRecord.updateOne({ _id: tripId }, { $set: { saleStopped: true } }).setOptions(S),
      () => TripRecord.updateOne({ _id: tripId }, { $set: { saleStopped: false } }).setOptions(S),
    );
    await hidden(
      () => VehicleRecord.updateOne({ _id: busId }, { $set: { 'papers.0.expiresOn': '2026-12-01' } }).setOptions(S),
      () => VehicleRecord.updateOne({ _id: busId }, { $set: { 'papers.0.expiresOn': '2027-06-30' } }).setOptions(S),
    );
    await hidden(
      () => RouteRecord.updateOne({ _id: routeId }, { $set: { status: 'SUSPENDED' } }).setOptions(S),
      () => RouteRecord.updateOne({ _id: routeId }, { $set: { status: 'APPROVED' } }).setOptions(S),
    );
    await hidden(
      async () => (operatorActive = false),
      async () => (operatorActive = true),
    );
    expect(await search.search({ fromCityId: DEL, toCityId: JAI, date: '2026-12-12', caller: WEB })).toHaveLength(1);
  });

  it('seat map per journey: part-route seats, ladies seat, prices per audience, departed', async () => {
    const claims = createClaims({ clock });
    await claims.block({ orgId: OP, userId: 'u' }, tripId, { seats: ['L1'], fromStopId: KG, toStopId: IF }); // sold Delhi → Gurugram
    const whole = await search.seatMap({ tripId, fromStopId: KG, toStopId: SC, caller: WEB });
    const seat = (/** @type {any} */ m, /** @type {string} */ no) =>
      m.decks.flatMap((/** @type {any} */ d) => d.seats).find((/** @type {any} */ s) => s.no === no);
    expect(seat(whole, 'L1')).toMatchObject({ available: false });
    expect(seat(whole, 'L4')).toMatchObject({
      available: true,
      ladies: true,
      price: { totalPaise: 99_750, gstPaise: 4_750, currency: 'INR' },
    });
    expect(seat(whole, 'L4').price).not.toHaveProperty('sellPaise');
    const tail = await search.seatMap({ tripId, fromStopId: IF, toStopId: SC, caller: CLIENT });
    expect(seat(tail, 'L1')).toMatchObject({ available: true, price: { totalPaise: 84_000, sellPaise: 80_000 } });
    expect(seat(tail, 'U1')).toMatchObject({ available: false, price: null }); // no Gurugram fare for upper berths
    await expect(search.seatMap({ tripId, fromStopId: SC, toStopId: KG, caller: WEB })).rejects.toMatchObject({ code: 'STOPS_WRONG_WAY' });
    now = new Date('2026-12-12T16:45:00Z');
    await expect(search.seatMap({ tripId, fromStopId: KG, toStopId: SC, caller: WEB })).rejects.toMatchObject({ code: 'TRIP_DEPARTED' });
    expect((await search.seatMap({ tripId, fromStopId: IF, toStopId: SC, caller: WEB })).from.name).toBe('IFFCO Chowk');
    now = new Date('2026-12-10T10:00:00Z');
  });
});
