// @ts-check
/**
 * Bus booking through the order engine (S18-T09), on the service layer with the wallet payment mode:
 * - a B2B client books 2 seats Delhi → Jaipur (one ladies seat for a woman): order held with the seats (15-minute hold,
 *   booking HELD, price locked) → paid from the wallet → order CONFIRMED, booking CONFIRMED, seat entries BOOKING,
 *   one balanced journal entry: wallet debit = bus company payable (net fares) + GST + margin; manifest lists the
 *   passengers; the e-ticket view shows no net fare or margin;
 * - refused before anything is taken: bad passenger details, a man on a ladies seat, a changed price, a seat already
 *   blocked at the counter; cancellations are refused until B7;
 * - a hold that ran out: the order expires, the seats are given back; paid late → the same seats held again if free.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { systemContext } from '../../src/b2b/core/context.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  BusBookingRecord,
  createBusItemHandler,
  createBusSearch,
  createOperatorBookings,
} from '../../src/b2b/modules/bus-booking/index.js';
import { FareRecord, RouteRecord, VehicleRecord } from '../../src/b2b/modules/bus-catalog/index.js';
import { ClaimRecord, createClaims, TripRecord, TripSeatRecord } from '../../src/b2b/modules/bus-inventory/index.js';
import {
  createItemHandlers,
  createOrderPayments,
  createOrderService,
  createPaymentModes,
  createWalletMode,
  expireOrder,
  OrderRecord,
} from '../../src/b2b/modules/orders/index.js';
import { MarginRuleRecord, seedPricingSettings, TaxRuleRecord } from '../../src/b2b/modules/pricing/index.js';
import {
  AccountRecord,
  createHolds,
  createLedger,
  createLiveWallets,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

let now = new Date('2026-12-10T10:00:00Z');
const clock = { now: () => now };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const logger = createLogger({ write: () => {} });
const OP = '65f0000000000000000b1861';
const CLIENT = '65f0000000000000000a1861';
const [DEL, JAI] = ['65f0000000000000000d0201', '65f0000000000000000d0203'];
const STOPS = [
  {
    stopId: '65f0000000000000000e0101',
    cityId: DEL,
    name: 'Kashmere Gate',
    at: new Date('2026-12-12T16:30:00Z'),
    boarding: true,
    dropping: false,
  },
  {
    stopId: '65f0000000000000000e0103',
    cityId: JAI,
    name: 'Sindhi Camp',
    at: new Date('2026-12-12T23:00:00Z'),
    boarding: false,
    dropping: true,
  },
];
const [KG, SC] = /** @type {[string, string]} */ (STOPS.map((s) => s.stopId));
const caller = { channel: /** @type {const} */ ('B2B_PORTAL'), clientOrgId: CLIENT, clientCategory: null };
const ctx = () => systemContext('bus booking test', 'req-bus', logger, clock);
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {string} */
let tripId;
/** @type {any} */
let engine;
let n = 0;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPricingSettings();
  await seedPlatformAccounts();
  await MarginRuleRecord.create({
    name: 'Bus default',
    priority: 0,
    match: { productType: 'BUS' },
    adjustment: { type: 'FIXED_PER_NIGHT', value: 5_000 },
    status: 'ACTIVE',
    createdBy: 'test',
  });
  await TaxRuleRecord.create({
    key: 'bus-5',
    appliesTo: 'BUS_TRANSPORT',
    sac: '996421',
    slabMinPaise: 0,
    slabMaxPaise: null,
    rateBps: 500,
    itcAllowed: false,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    sourceNote: 'test',
    status: 'ACTIVE',
    proposedBy: 'a',
    approvedBy: 'b',
  });
  const route = await RouteRecord.create({
    operatorOrgId: OP,
    name: 'DEL-JAI',
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
    createdBy: 't',
  });
  const papers = ['RC', 'PERMIT', 'INSURANCE', 'FITNESS'].map((kind) => ({
    kind,
    fileId: 'f',
    number: 'n',
    expiresOn: '2027-06-30',
    addedAt: now,
  }));
  const bus = await VehicleRecord.create({
    operatorOrgId: OP,
    regNo: 'RJ14PA9999',
    acType: 'AC',
    kind: 'SLEEPER',
    layoutId: 'l1',
    papers,
    status: 'APPROVED',
    createdBy: 't',
  });
  await FareRecord.create({
    operatorOrgId: OP,
    routeId: String(route._id),
    rows: [{ fromIdx: 0, toIdx: 1, seatType: 'SLEEPER', deck: null, netPaise: 90_000 }],
  });
  const trip = await TripRecord.create({
    operatorOrgId: OP,
    scheduleId: 's1',
    routeId: String(route._id),
    vehicleId: String(bus._id),
    layoutId: 'l1',
    date: '2026-12-12',
    stops: STOPS,
    fromCityId: DEL,
    toCityId: JAI,
    departAt: STOPS[0]?.at,
    arriveAt: STOPS[1]?.at,
    legs: 1,
    decks: [{ deck: 'LOWER', rows: 2, cols: 2 }],
    seatCount: 4,
    seatsReady: true,
  });
  tripId = String(trip._id);
  await TripSeatRecord.insertMany(
    ['L1', 'L2', 'L3', 'L4'].map((no, i) => ({
      operatorOrgId: OP,
      tripId,
      no,
      deck: 'LOWER',
      type: 'SLEEPER',
      row: Math.floor(i / 2),
      col: i % 2,
      ladies: no === 'L4',
    })),
  );

  const ledger = createLedger({ clock });
  const handlers = createItemHandlers();
  const search = createBusSearch({
    clock,
    operators: async (ids) => new Map(ids.map((id) => [id, { name: 'Shree Travels', active: true }])),
    stateOf: async () => '07',
  });
  handlers.register('BUS', createBusItemHandler({ clock, logger, search, claims: createClaims({ clock }), ledger }));
  const modes = createPaymentModes();
  const walletDeps = { clock, ledger };
  const wallets = createLiveWallets(walletDeps);
  modes.register('WALLET', createWalletMode({ ...walletDeps, wallets, holds: createHolds(walletDeps) }));
  const deps = { clock, logger, handlers, modes, ledger };
  engine = { deps, orders: createOrderService(deps), pay: createOrderPayments(deps), handlers };
  await wallets.open(CLIENT);
  const bank = await ledger.accountId('platform', 'BANK');
  await wallets.apply({
    clientOrgId: CLIENT,
    opId: 'top-1',
    type: 'TOPUP',
    amountPaise: 1_000_000,
    journal: { reference: { type: 'test-top', id: CLIENT }, purpose: 'wallet-topup', lines: [{ accountId: bank, debitPaise: 1_000_000 }] },
    by: 'test',
  });
});
afterAll(async () => mongo.stop());

const passenger = (/** @type {string} */ name, /** @type {'F' | 'M'} */ gender) => ({ name, age: 30, gender });
/** @param {any[]} seats @param {Record<string, unknown>} [extra] */
const order = (seats, extra = {}) =>
  engine.orders.create(ctx(), {
    channel: 'B2B_PORTAL',
    buyer: { clientOrgId: CLIENT, customerId: null, guestKey: null },
    createdBy: 'user:65f0000000000000000c1861',
    idempotency: { scope: `client:${CLIENT}`, key: `bus-key-${String((n += 1)).padStart(4, '0')}` },
    ip: null,
    paymentMode: 'WALLET',
    contact: { name: 'Asha Travels', email: 'desk@asha.in', phone: '9876543210' },
    item: { type: 'BUS', input: { caller, tripId, fromStopId: KG, toStopId: SC, seats, ...extra } },
  });
const seat = async (/** @type {string} */ no) => /** @type {any} */ (await TripSeatRecord.findOne({ tripId, no }).setOptions(S).lean());

describe('bus booking', () => {
  it('held → paid from the wallet → confirmed; balanced journal; manifest; no net fare in the ticket', async () => {
    const o = await order(
      [
        { no: 'L1', passenger: passenger('Ravi Kumar', 'M') },
        { no: 'L4', passenger: passenger('Sita Devi', 'F') },
      ],
      { expectedTotalPaise: 199_500 },
    );
    expect(o).toMatchObject({ status: 'AWAITING_PAYMENT', totalPaise: 199_500, gstPaise: 9_500, hotelOrgIds: [] }); // 2 × (900 + 50) × 1.05
    expect(o.items[0]).toMatchObject({ type: 'BUS', supplierOrgId: OP, hotelOrgId: null });
    const held = /** @type {any} */ (
      await BusBookingRecord.findOne({ orderId: String(o._id) })
        .setOptions(S)
        .lean()
    );
    expect(held).toMatchObject({
      status: 'HELD',
      ref: expect.stringMatching(/^MBB-/),
      seats: [expect.objectContaining({ no: 'L1' }), expect.objectContaining({ no: 'L4' })],
    });
    expect((await seat('L4')).entries).toEqual([expect.objectContaining({ kind: 'HOLD', ref: held.claimId })]);

    const paid = await engine.pay.start(ctx(), o, { returnUrl: 'https://x.test', mode: 'WALLET' });
    expect(paid).toMatchObject({ status: 'CONFIRMED' });
    const done = /** @type {any} */ (await OrderRecord.findById(o._id).setOptions(S).lean());
    expect(done.status).toBe('CONFIRMED');
    const b = /** @type {any} */ (await BusBookingRecord.findById(held._id).setOptions(S).lean());
    expect(b).toMatchObject({ status: 'CONFIRMED', confirmedAt: expect.any(Date) });
    expect(b.pendingEvents.map((/** @type {any} */ e) => e.type)).toEqual(['bus-booking.booking.confirmed']);
    expect((await seat('L1')).entries).toEqual([expect.objectContaining({ kind: 'BOOKING' })]);

    const payable = /** @type {any} */ (await AccountRecord.findOne({ ownerOrgId: OP, type: 'OPERATOR_PAYABLE' }).setOptions(S).lean());
    expect(payable).toMatchObject({ ownerType: 'BUS_OPERATOR' });
    const txs = await TransactionRecord.find({ 'lines.accountId': String(payable._id) })
      .setOptions(S)
      .lean();
    expect(txs).toHaveLength(1);
    const lines = /** @type {any[]} */ (txs[0]?.lines);
    const total = (/** @type {'debitPaise' | 'creditPaise'} */ k) => lines.reduce((t, l) => t + (l[k] ?? 0), 0);
    expect(total('debitPaise')).toBe(total('creditPaise'));
    expect(lines.find((l) => l.accountId === String(payable._id))?.creditPaise).toBe(180_000);

    const view = await engine.handlers.get('BUS').view(o.items[0], 'BUYER');
    expect(view).toMatchObject({
      product: 'BUS',
      status: 'CONFIRMED',
      operatorName: 'Shree Travels',
      from: { name: 'Kashmere Gate' },
      price: { totalPaise: 199_500 },
    });
    expect(JSON.stringify(view)).not.toMatch(/netPaise|marginPaise|operatorPayable/);
    const m = await createOperatorBookings().manifest(OP, tripId);
    expect(m.rows.map((r) => [r.seat, r.name, r.gender, r.pnr])).toEqual([
      ['L1', 'Ravi Kumar', 'M', b.ref],
      ['L4', 'Sita Devi', 'F', b.ref],
    ]);
    expect(createOperatorBookings().manifestCsv(m).split('\n')[1]).toMatch(
      /^L1,LOWER,Ravi Kumar,30,M,Kashmere Gate,22:00,Sindhi Camp,MBB-/,
    );
    await expect(createOperatorBookings().manifest('65f0000000000000000b9999', tripId)).rejects.toMatchObject({ code: 'TRIP_NOT_FOUND' });
    await expect(
      engine.handlers.get('BUS').cancelStart(ctx(), o.items[0], { chargePaise: 0, refundPaise: 0, by: 'x' }),
    ).rejects.toMatchObject({ code: 'BUS_CANCELLATION_NOT_AVAILABLE' });
  });

  it('refused before anything is taken: passengers, ladies seat, changed price, seat taken', async () => {
    await expect(order([{ no: 'L2', passenger: { name: 'X', age: 0, gender: 'Z' } }])).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(order([{ no: 'L4', passenger: passenger('Ravi Kumar', 'M') }])).rejects.toMatchObject({ code: 'SEAT_UNAVAILABLE' }); // L4 is sold already
    await expect(order([{ no: 'L2', passenger: passenger('Ravi Kumar', 'M') }], { expectedTotalPaise: 90_000 })).rejects.toMatchObject({
      code: 'PRICE_CHANGED',
    });
    const claims = createClaims({ clock });
    await claims.block({ orgId: OP, userId: 'u' }, tripId, { seats: ['L3'] });
    await expect(order([{ no: 'L3', passenger: passenger('Ravi Kumar', 'M') }])).rejects.toMatchObject({ code: 'SEAT_UNAVAILABLE' });
    expect(await ClaimRecord.countDocuments({ kind: 'HOLD', status: 'ACTIVE' }).setOptions(S)).toBe(0);
  });

  it('hold runs out → order expired, seats back; paid late → held again', async () => {
    const o = await order([{ no: 'L2', passenger: passenger('Meera Shah', 'F') }]);
    now = new Date(now.getTime() + 20 * 60_000);
    await expireOrder(engine.deps, /** @type {any} */ (await OrderRecord.findById(o._id).setOptions(S).lean()));
    expect((await OrderRecord.findById(o._id).setOptions(S).lean())?.status).toBe('EXPIRED');
    expect((await seat('L2')).taken).toBe(0);
    const b = /** @type {any} */ (
      await BusBookingRecord.findOne({ orderId: String(o._id) })
        .setOptions(S)
        .lean()
    );
    expect(b.status).toBe('EXPIRED');
    const again = await engine.handlers.get('BUS').rehold(ctx(), { id: String(o._id) }, o.items[0]);
    expect(again).toMatchObject({ held: true, holdId: expect.any(String) });
    expect((await seat('L2')).taken).toBe(1);
  });
});
