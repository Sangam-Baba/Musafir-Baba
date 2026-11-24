// @ts-check
/**
 * Shared setup for the booking-engine payment tests (S08-T04–T06): the test app, a stand-in PayU, the engine on the
 * service layer, and helpers to make a held order. Call `useOrderEngine()` once at the top of a test file.
 */

import { systemContext } from '../../../src/b2b/core/context.js';
import { createLogger } from '../../../src/b2b/core/logger.js';
import { BookingRecord, BookingStatusRecord, createHotelItemHandler } from '../../../src/b2b/modules/hotel-booking/index.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  createHoldService,
  HoldRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
} from '../../../src/b2b/modules/hotel-inventory/index.js';
import {
  createGatewayMode,
  createItemHandlers,
  createOrderPayments,
  createPaymentModes,
  createWalletMode,
  orderConsumers,
  OrderRecord,
} from '../../../src/b2b/modules/orders/index.js';
import {
  createPayments,
  expectedResponseHash,
  EVENTS as PAY,
  IntentRecord,
  PaymentInboxRecord,
  RefundRecord,
} from '../../../src/b2b/modules/payments/index.js';
import { MarginRuleRecord, PricingSettingsRecord, SigningKeyRecord } from '../../../src/b2b/modules/pricing/index.js';
import { DocumentRecord, NumberSeriesRecord } from '../../../src/b2b/modules/documents/index.js';
import { AdminActionRecord } from '../../../src/b2b/modules/orders/index.js';
import { BookingSummaryRecord } from '../../../src/b2b/modules/reporting/index.js';
import { AmendmentRecord, CancellationRecord, HotelFailureRecord, NoShowRecord } from '../../../src/b2b/modules/hotel-booking/index.js';
import {
  BalanceSnapshotRecord,
  createHolds,
  createLedger,
  createLiveWallets,
  ManualPayoutRecord,
  PayableRecord,
  seedPlatformAccounts,
  TransactionRecord,
  WalletHoldRecord,
} from '../../../src/b2b/modules/wallet/index.js';
import { useInventoryApp } from './inventory-app.js';
import { seedPricing, sellableHotel } from './search-setup.js';

/** @param {{ env?: Record<string, string> }} [options] @returns {any} */
export function useOrderEngine(options = {}) {
  let nowMs = Date.parse('2026-11-19T10:00:00Z');
  const clock = { now: () => new Date(nowMs) };
  const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
  const app = useInventoryApp({
    clock,
    env: options.env,
    models: [
      OrderRecord,
      BookingRecord,
      BookingStatusRecord,
      HoldRecord,
      MarginRuleRecord,
      SigningKeyRecord,
      CancellationPolicyRecord,
      RatePlanRecord,
      InventoryDayRecord,
      RateDayRecord,
      ChangeLogRecord,
      IntentRecord,
      PaymentInboxRecord,
      RefundRecord,
      TransactionRecord,
      DocumentRecord,
      NumberSeriesRecord,
      PricingSettingsRecord,
      AdminActionRecord,
      BookingSummaryRecord,
      CancellationRecord,
      AmendmentRecord,
      NoShowRecord,
      HotelFailureRecord,
      PayableRecord,
      ManualPayoutRecord,
      BalanceSnapshotRecord,
      WalletHoldRecord,
    ],
  });
  const logger = createLogger({ write: () => {} });
  const merchant = { key: 'gtKFFx', salt: 'eCwWELxi', env: /** @type {const} */ ('test') };
  /** @type {Map<string, { status: string, amountPaise?: number }>} */
  const payuSays = new Map();
  /** @type {any[]} */
  let refundCalls = [];
  const payu = /** @type {any} */ ({
    verify: async (/** @type {string} */ txnid) => {
      const a = payuSays.get(txnid) ?? { status: 'NOT_FOUND' };
      return {
        status: a.status,
        txnid,
        mihpayid: a.status === 'SUCCESS' ? `MIH${txnid}` : null,
        amountPaise: a.amountPaise ?? 0,
        mode: 'UPI',
      };
    },
    refund: async (/** @type {any} */ a) => (refundCalls.push(a), { accepted: true, requestId: `REQ-${a.refundId}`, message: 'queued' }),
    refundStatus: async () => ({ status: 'PENDING', raw: '' }),
  });
  const stay = { checkIn: '2026-12-01', checkOut: '2026-12-03', rooms: [{ adults: 2, childrenAges: [] }] };
  let n = 0;

  /** The engine with the stand-in PayU (routes are covered in orders-create; here the service layer). */
  async function engine() {
    const ledger = createLedger({ clock });
    const paymentsDeps = { clock, logger, merchant, payu, ledger, callbackUrl: 'https://api.test/api/v1/payments/payu/callback' };
    const payments = createPayments(paymentsDeps);
    const handlers = createItemHandlers();
    handlers.register('HOTEL', createHotelItemHandler(/** @type {any} */ ({ clock, logger, holds: createHoldService({ clock }), ledger })));
    const modes = createPaymentModes();
    modes.register('GATEWAY', createGatewayMode({ payments, paymentsDeps, ledger }));
    const walletDeps = { clock, ledger };
    const wallets = createLiveWallets(walletDeps);
    modes.register('WALLET', createWalletMode({ ...walletDeps, wallets, holds: createHolds(walletDeps) }));
    const deps = { clock, logger, handlers, modes, ledger };
    const consumers = orderConsumers(deps, PAY);
    /** Deliver the intent's stored events to the order consumers (what the relay + inbox do). @param {string} txnId */
    const deliver = async (txnId) => {
      const i = /** @type {any} */ (await IntentRecord.findOne({ txnId }).lean());
      for (const e of i.pendingEvents ?? [])
        for (const c of consumers) if (c.types.includes(e.type)) await c.handler({ payload: e.payload });
    };
    return { deps, payments, paymentsDeps, orderPay: createOrderPayments(deps), deliver, wallets };
  }

  /** @param {number} rooms */
  async function bookedOrder(rooms = 3) {
    nowMs = Date.parse('2026-11-19T10:00:00Z');
    payuSays.clear();
    refundCalls = [];
    await seedPricing(clock);
    await seedPlatformAccounts();
    const h = await sellableHotel(app, { rooms });
    return { h, order: await newOrder(h) };
  }

  /** @param {any} h @param {string} [session] */
  async function newOrder(h, session = 'guest-session-0000000000001') {
    const o = (await app.srv.post(`/api/v1/hotels/${h.ref}/offers`, stay)).body.offers[0];
    n += 1;
    const r = await app.srv.post(
      '/api/v1/orders',
      {
        priceToken: o.priceToken,
        rooms: [{ leadGuest: 'Asha Verma' }],
        contact: { name: 'Asha Verma', email: 'asha@example.com', phone: '9876543210' },
        confirmDuplicate: true,
      },
      { 'x-guest-session': session, 'idempotency-key': `pay-test-key-${String(n).padStart(6, '0')}` },
    );
    if (r.status !== 201) throw new Error(JSON.stringify(r.body));
    return r.body;
  }
  /** @param {string} ref */
  const stored = async (ref) => /** @type {any} */ (await OrderRecord.findOne({ ref }).setOptions(S).lean());
  const ctx = () => systemContext('test', 'r1', logger, clock);
  /** PayU's signed browser post. @param {any} form */
  const signed = (form) => {
    const p = { ...form.fields, status: 'success', mihpayid: `MIH${form.txnId}` };
    return { ...p, hash: expectedResponseHash(p, merchant) };
  };
  return {
    app,
    clock,
    S,
    logger,
    merchant,
    payuSays,
    payu,
    stay,
    engine,
    bookedOrder,
    newOrder,
    stored,
    ctx,
    signed,
    get nowMs() {
      return nowMs;
    },
    set nowMs(v) {
      nowMs = v;
    },
    get refundCalls() {
      return refundCalls;
    },
  };
}
