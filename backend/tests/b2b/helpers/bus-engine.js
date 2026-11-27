// @ts-check
/**
 * A bus trip ready to sell and the order engine with the BUS handler and wallet payments, on the service layer
 * (Stage 18 B6–B7 tests). Delhi → Jaipur on 12 Dec 2026 (boarding 22:00 IST), seats L1–L4 (L4 ladies), net ₹900, a
 * ₹50 BUS margin and 5 % bus GST; a client wallet with ₹10,000.
 */
import { systemContext } from '../../../src/b2b/core/context.js';
import { runMigrations } from '../../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../../src/b2b/core/logger.js';
import { MIGRATIONS } from '../../../src/b2b/migrations/index.js';
import { createBusItemHandler, createBusSearch } from '../../../src/b2b/modules/bus-booking/index.js';
import { createCancellationPolicies, FareRecord, RouteRecord, VehicleRecord } from '../../../src/b2b/modules/bus-catalog/index.js';
import { createClaims, TripRecord, TripSeatRecord } from '../../../src/b2b/modules/bus-inventory/index.js';
import {
  createItemHandlers,
  createOrderPayments,
  createOrderService,
  createPaymentModes,
  createWalletMode,
} from '../../../src/b2b/modules/orders/index.js';
import { MarginRuleRecord, seedPricingSettings, TaxRuleRecord } from '../../../src/b2b/modules/pricing/index.js';
import { createHolds, createLedger, createLiveWallets, seedPlatformAccounts } from '../../../src/b2b/modules/wallet/index.js';

export const OP = '65f0000000000000000b1871';
export const CLIENT = '65f0000000000000000a1871';
export const STOPS = [
  {
    stopId: '65f0000000000000000e0201',
    cityId: '65f0000000000000000d0301',
    name: 'Kashmere Gate',
    at: new Date('2026-12-12T16:30:00Z'),
    boarding: true,
    dropping: false,
  },
  {
    stopId: '65f0000000000000000e0203',
    cityId: '65f0000000000000000d0303',
    name: 'Sindhi Camp',
    at: new Date('2026-12-12T23:00:00Z'),
    boarding: false,
    dropping: true,
  },
];

/** @param {{ now: () => Date }} clock */
export async function busEngine(clock) {
  const logger = createLogger({ write: () => {} });
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPricingSettings();
  await seedPlatformAccounts();
  await MarginRuleRecord.create({
    name: 'Bus',
    priority: 0,
    match: { productType: 'BUS' },
    adjustment: { type: 'FIXED_PER_NIGHT', value: 5_000 },
    status: 'ACTIVE',
    createdBy: 't',
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
    sourceNote: 't',
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
    fromCityId: STOPS[0]?.cityId,
    toCityId: STOPS[1]?.cityId,
    status: 'APPROVED',
    createdBy: 't',
  });
  const papers = ['RC', 'PERMIT', 'INSURANCE', 'FITNESS'].map((kind) => ({
    kind,
    fileId: 'f',
    number: 'n',
    expiresOn: '2027-06-30',
    addedAt: clock.now(),
  }));
  const bus = await VehicleRecord.create({
    operatorOrgId: OP,
    regNo: 'RJ14PA7777',
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
    fromCityId: STOPS[0]?.cityId,
    toCityId: STOPS[1]?.cityId,
    departAt: STOPS[0]?.at,
    arriveAt: STOPS[1]?.at,
    legs: 1,
    decks: [{ deck: 'LOWER', rows: 2, cols: 2 }],
    seatCount: 4,
    seatsReady: true,
  });
  const tripId = String(trip._id);
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
  handlers.register(
    'BUS',
    createBusItemHandler({
      clock,
      logger,
      search,
      claims: createClaims({ clock }),
      ledger,
      policies: createCancellationPolicies({ clock }),
    }),
  );
  const modes = createPaymentModes();
  const walletDeps = { clock, ledger };
  const wallets = createLiveWallets(walletDeps);
  modes.register('WALLET', createWalletMode({ ...walletDeps, wallets, holds: createHolds(walletDeps) }));
  const deps = { clock, logger, handlers, modes, ledger };
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
  const ctx = () => systemContext('bus test', 'req-bus', logger, clock);
  const orders = createOrderService(deps);
  const pay = createOrderPayments(deps);
  let n = 0;
  /** A client order for some seats, paid from the wallet. @param {{ no: string, passenger: any }[]} seats */
  async function paidOrder(seats) {
    const o = await orders.create(ctx(), {
      channel: 'B2B_PORTAL',
      buyer: { clientOrgId: CLIENT, customerId: null, guestKey: null },
      createdBy: 'user:65f0000000000000000c1871',
      idempotency: { scope: `client:${CLIENT}`, key: `bus-test-${String((n += 1)).padStart(4, '0')}` },
      ip: null,
      paymentMode: 'WALLET',
      contact: { name: 'Asha Travels', email: 'desk@asha.in', phone: '9876543210' },
      item: {
        type: 'BUS',
        input: {
          caller: { channel: 'B2B_PORTAL', clientOrgId: CLIENT, clientCategory: null },
          tripId,
          fromStopId: STOPS[0]?.stopId,
          toStopId: STOPS[1]?.stopId,
          seats,
        },
      },
    });
    await pay.start(ctx(), o, { returnUrl: 'https://x.test', mode: 'WALLET' });
    return o;
  }
  return { deps, ctx, orders, pay, handlers, wallets, ledger, tripId, paidOrder };
}
