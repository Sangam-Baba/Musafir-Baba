// @ts-check
/**
 * Bus demo (Stage 18 B8, `demo.js full` only — local / test databases): a demo bus company with a 2+1 sleeper bus,
 * a Mumbai → Goa night route (Dadar, Panvel → Mapusa, Panaji next morning), fares, a daily schedule and 90 days of trips,
 * then a B2B client booking (wallet) and a counter block. Steps a company does go through the real API; staff steps
 * (approving the bus and the route, the papers' files) are written directly — they need a staff login.
 * A BUS margin rule and a BUS_TRANSPORT tax rule are added **for the demo only** (5 % — not a real rate; the CA
 * confirms the real one), marked `demo-bus-…`, and removed with the demo.
 */
import { todayIn } from '../core/dates.js';
import { createSchedules, RouteRecord, VehicleRecord } from '../modules/bus-catalog/index.js';
import { createTrips } from '../modules/bus-inventory/index.js';
import { CityRecord } from '../modules/hotel-catalog/index.js';
import { MarginRuleRecord, TaxRuleRecord } from '../modules/pricing/index.js';
import { auth, DEMO_MARK, ok, SYSTEM } from './demo-data.js';

export const DEMO_BUS_EMAIL = 'demo.bus@example.com';
const PAPERS = ['RC', 'PERMIT', 'INSURANCE', 'FITNESS'];

/** Demo-only pricing so buses can be searched (removed with the demo). */
async function demoPricing() {
  await MarginRuleRecord.updateOne(
    { key: 'demo-bus-margin' },
    {
      $setOnInsert: {
        key: 'demo-bus-margin',
        name: 'Demo — bus margin ₹50 per seat',
        priority: 0,
        match: { productType: 'BUS' },
        adjustment: { type: 'FIXED_PER_NIGHT', value: 5_000 },
        status: 'ACTIVE',
        createdBy: DEMO_MARK,
      },
    },
    { upsert: true },
  );
  await TaxRuleRecord.updateOne(
    { key: 'demo-bus-gst' },
    {
      $setOnInsert: {
        key: 'demo-bus-gst',
        appliesTo: 'BUS_TRANSPORT',
        sac: '996421',
        slabMinPaise: 0,
        slabMaxPaise: null,
        rateBps: 500,
        itcAllowed: false,
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        sourceNote: 'DEMO ONLY — not a real rate (CA to confirm bus GST)',
        status: 'ACTIVE',
        proposedBy: DEMO_MARK,
        approvedBy: DEMO_MARK,
      },
    },
    { upsert: true },
  );
}

/** The approved sleeper bus. @param {import('./demo-flows.js').FlowDeps} deps @param {Record<string, string>} h */
async function makeBus(deps, h) {
  const layout = ok(
    await deps.api.post('/api/v1/bus/layouts', { name: 'Volvo 2+1 sleeper (30)', template: 'sleeper-2x1-30' }, h),
    'layout',
  );
  const bus = ok(
    await deps.api.post(
      '/api/v1/bus/vehicles',
      {
        regNo: 'MH01 DM 2026',
        name: 'Demo Konkan Express',
        acType: 'AC',
        kind: 'SLEEPER',
        layoutId: layout.id,
        amenities: ['AC', 'CHARGING', 'BLANKET', 'WATER', 'GPS'],
      },
      h,
    ),
    'bus',
  );
  const papers = PAPERS.map((kind) => ({
    kind,
    fileId: `demo-${kind}`,
    number: `${kind}-DEMO-01`,
    expiresOn: '2027-12-31',
    addedAt: deps.clock.now(),
  }));
  await VehicleRecord.updateOne(
    { _id: bus.id },
    { $set: { papers, status: 'APPROVED', review: { by: DEMO_MARK, at: deps.clock.now(), note: 'Demo bus' } } },
  ).setOptions(SYSTEM);
  return String(bus.id);
}

/** Points, the night route (approved). @param {import('./demo-flows.js').FlowDeps} deps @param {Record<string, string>} h */
async function makeRoute(deps, h) {
  const [mumbai, goa] = await Promise.all(['mumbai', 'goa'].map((slug) => CityRecord.findOne({ slug }).lean()));
  if (!mumbai || !goa) throw new Error('demo bus: Mumbai / Goa missing from the city list');
  const stop = async (/** @type {any} */ city, /** @type {string} */ name) =>
    ok(await deps.api.post('/api/v1/bus/stops', { cityId: String(city._id), name }, h), 'stop').id;
  const ids = [
    await stop(mumbai, 'Dadar TT Circle'),
    await stop(mumbai, 'Panvel Bus Stand'),
    await stop(goa, 'Mapusa Bus Stand'),
    await stop(goa, 'Panaji Kadamba'),
  ];
  const times = [
    ['0', '20:00', true, false],
    ['0', '21:00', true, false],
    ['1', '07:00', false, true],
    ['1', '08:00', false, true],
  ];
  const route = ok(
    await deps.api.post(
      '/api/v1/bus/routes',
      {
        name: 'Mumbai → Goa (night)',
        stops: ids.map((stopId, i) => ({
          stopId,
          dayOffset: Number(times[i]?.[0]),
          time: String(times[i]?.[1]),
          boarding: Boolean(times[i]?.[2]),
          dropping: Boolean(times[i]?.[3]),
        })),
      },
      h,
    ),
    'route',
  );
  await RouteRecord.updateOne(
    { _id: route.id },
    { $set: { status: 'APPROVED', review: { by: DEMO_MARK, at: deps.clock.now(), note: 'Demo route' } } },
  ).setOptions(SYSTEM);
  return { routeId: String(route.id), stops: ids };
}

/** Fares (weekend +₹100), a daily schedule and its trips. @param {import('./demo-flows.js').FlowDeps} deps @param {Record<string, string>} h @param {{ routeId: string, busId: string }} a */
async function faresAndTrips(deps, h, { routeId, busId }) {
  const rows = [];
  for (const [fromIdx, toIdx, lower, upper] of [
    [0, 2, 1_200_00, 1_000_00],
    [0, 3, 1_300_00, 1_100_00],
    [1, 2, 1_100_00, 900_00],
    [1, 3, 1_200_00, 1_000_00],
  ])
    rows.push(
      { fromIdx, toIdx, seatType: 'SLEEPER', deck: 'LOWER', netPaise: lower },
      { fromIdx, toIdx, seatType: 'SLEEPER', deck: 'UPPER', netPaise: upper },
    );
  const today = todayIn(deps.clock, 'Asia/Kolkata');
  ok(
    await deps.api.put(
      `/api/v1/bus/routes/${routeId}/fares`,
      {
        rows,
        rules: [
          {
            label: 'Weekend',
            from: today,
            to: new Date(Date.parse(`${today}T00:00:00Z`) + 365 * 86_400_000).toISOString().slice(0, 10),
            weekdays: [5, 6, 0],
            addPaise: 100_00,
          },
        ],
        expectedVersion: 0,
      },
      h,
    ),
    'fares',
  );
  ok(
    await deps.api.post(
      '/api/v1/bus/schedules',
      { routeId, vehicleId: busId, weekdays: [0, 1, 2, 3, 4, 5, 6], validFrom: today, validTo: null },
      h,
    ),
    'schedule',
  );
  await createTrips({ today: () => today, catalog: createSchedules({ today: () => today }) }).generate();
}

/** @param {import('./demo-flows.js').FlowDeps} deps @param {Record<string, string>} h */
async function busAndRoute(deps, h) {
  const busId = await makeBus(deps, h);
  const { routeId, stops } = await makeRoute(deps, h);
  await faresAndTrips(deps, h, { routeId, busId });
  return { stops };
}

/**
 * @param {import('./demo-flows.js').FlowDeps} deps
 * @param {{ company: (deps: any, a: any) => Promise<{ orgId: string, token: string }>, clientToken: string }} a
 * @returns {Promise<string[]>} what was made (for the log)
 */
export async function addDemoBus(deps, a) {
  await demoPricing();
  const op = await a.company(deps, {
    email: DEMO_BUS_EMAIL,
    name: 'Demo Bus Owner',
    type: 'BUS_OPERATOR',
    legalName: 'Demo — Konkan Travels',
  });
  const h = auth(op.token);
  const { stops } = await busAndRoute(deps, h);
  const date = todayIn(deps.clock, 'Asia/Kolkata');
  const in3 = new Date(Date.parse(`${date}T00:00:00Z`) + 3 * 86_400_000).toISOString().slice(0, 10);
  const [mumbai, goa] = await Promise.all(['mumbai', 'goa'].map((slug) => CityRecord.findOne({ slug }).lean()));
  const found = ok(
    await deps.api.get(`/api/v1/buses/search?from=${mumbai?._id}&to=${goa?._id}&date=${in3}`, auth(a.clientToken)),
    'bus search',
  ).data;
  const trip = found[0];
  if (!trip) throw new Error('demo bus: no trip found in search');
  const seats = [
    { no: 'L1', passenger: { name: 'Rohan Mehta', age: 34, gender: 'M' } },
    { no: 'L2', passenger: { name: 'Kavya Mehta', age: 31, gender: 'F' } },
  ];
  const key = (/** @type {string} */ k) => ({ ...auth(a.clientToken), 'idempotency-key': `demo-bus-${k}-${date}` });
  const order = ok(
    await deps.api.post(
      '/api/v1/client/bus-orders',
      {
        tripId: trip.tripId,
        fromStopId: stops[0],
        toStopId: stops[3],
        seats,
        contact: { name: 'Asha Verma', email: 'asha.guest@example.com', phone: '9800000001' },
        expectedTotalPaise: null,
      },
      key('order'),
    ),
    'bus order',
  );
  ok(await deps.api.post(`/api/v1/client/orders/${order.ref}/pay`, { method: 'WALLET' }, key('pay')), 'bus pay');
  ok(
    await deps.api.post(`/api/v1/bus/trips/${trip.tripId}/blocks`, { seats: ['U1', 'U2'], note: 'Sold at the Dadar counter (demo)' }, h),
    'counter block',
  );
  return [
    `bus company "Demo — Konkan Travels" (${DEMO_BUS_EMAIL}): an approved sleeper bus, Mumbai → Goa night route, fares (weekend +₹100), 90 days of trips`,
    `a B2B bus booking ${order.ref} (2 seats, paid from the wallet) and a counter block of U1–U2 on the ${in3} trip`,
    'demo-only bus margin (₹50 per seat) and bus GST (5 % — NOT a real rate) so buses show in search',
  ];
}

/** Everything the bus demo made, for the demo bus companies only, and the demo-only pricing. @param {string[]} busIds */
export async function removeDemoBus(busIds) {
  const { BusBookingRecord, BusReviewRecord, OpsCancellationRecord } = await import('../modules/bus-booking/index.js');
  const { CancellationPolicyRecord, FareRecord, LayoutRecord, ScheduleRecord, StopRecord } = await import(
    '../modules/bus-catalog/index.js'
  );
  const { ClaimRecord, TripProblemRecord, TripRecord, TripSeatRecord } = await import('../modules/bus-inventory/index.js');
  const { BusPayableRecord, BusPayoutLineRecord } = await import('../modules/bus-payouts/index.js');
  const byOp = { operatorOrgId: { $in: busIds } };
  const models = [
    BusBookingRecord,
    BusReviewRecord,
    OpsCancellationRecord,
    CancellationPolicyRecord,
    FareRecord,
    LayoutRecord,
    ScheduleRecord,
    StopRecord,
    RouteRecord,
    VehicleRecord,
    ClaimRecord,
    TripProblemRecord,
    TripRecord,
    TripSeatRecord,
    BusPayableRecord,
    BusPayoutLineRecord,
  ];
  if (busIds.length) for (const m of models) await /** @type {import('mongoose').Model<any>} */ (m).deleteMany(byOp).setOptions(SYSTEM);
  await MarginRuleRecord.deleteMany({ key: 'demo-bus-margin' });
  await TaxRuleRecord.deleteMany({ key: 'demo-bus-gst' });
  return { busCompanies: busIds.length };
}
