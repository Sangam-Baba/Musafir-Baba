// @ts-check
/**
 * Paying and confirming (S08-T04, T05): the PayU path end to end with a stand-in PayU — verified payment → rooms
 * booked → ledger entry matching the expected table → CONFIRMED; repeats change nothing; pending, failed, extra
 * payment; paid after the hold expired (rooms free → held again and confirmed; rooms gone → FAILED + refund once).
 */
import { describe, expect, it } from 'vitest';

import { systemContext } from '../../src/b2b/core/context.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { BookingRecord, BookingStatusRecord, createHotelItemHandler } from '../../src/b2b/modules/hotel-booking/index.js';
import {
  CancellationPolicyRecord,
  ChangeLogRecord,
  createHoldService,
  HoldRecord,
  InventoryDayRecord,
  RateDayRecord,
  RatePlanRecord,
  sweepHolds,
} from '../../src/b2b/modules/hotel-inventory/index.js';
import {
  createGatewayMode,
  createItemHandlers,
  createOrderPayments,
  createPaymentModes,
  orderConsumers,
  OrderRecord,
} from '../../src/b2b/modules/orders/index.js';
import {
  createPayments,
  expectedResponseHash,
  EVENTS as PAY,
  IntentRecord,
  PaymentInboxRecord,
  pollPayments,
  RefundRecord,
} from '../../src/b2b/modules/payments/index.js';
import { MarginRuleRecord, SigningKeyRecord } from '../../src/b2b/modules/pricing/index.js';
import { AccountRecord, createLedger, seedPlatformAccounts, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { useInventoryApp } from './helpers/inventory-app.js';
import { seedPricing, sellableHotel } from './helpers/search-setup.js';

let nowMs = Date.parse('2026-11-19T10:00:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const app = useInventoryApp({
  clock,
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
    AccountRecord,
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
  const deps = { clock, logger, handlers, modes, ledger };
  const consumers = orderConsumers(deps, PAY);
  /** Deliver the intent's stored events to the order consumers (what the relay + inbox do). @param {string} txnId */
  const deliver = async (txnId) => {
    const i = /** @type {any} */ (await IntentRecord.findOne({ txnId }).lean());
    for (const e of i.pendingEvents ?? []) for (const c of consumers) if (c.types.includes(e.type)) await c.handler({ payload: e.payload });
  };
  return { deps, payments, paymentsDeps, orderPay: createOrderPayments(deps), deliver };
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

describe('pay with PayU', () => {
  it('verified → rooms booked → one ledger entry as the table says → CONFIRMED; repeats change nothing', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://musafirbaba.com/hotels/booking/x' });
    expect(form).toMatchObject({
      action: 'https://test.payu.in/_payment',
      txnId: expect.stringMatching(/^B2BH/),
      fields: { amount: (order.totalPaise / 100).toFixed(2) },
    });
    expect(new Date(form.windowEndsAt).getTime()).toBe(nowMs + 12 * 60_000); // min(12 min, 15 − 2)
    expect((await IntentRecord.findOne({ txnId: form.txnId }).lean())?.windowEndsAt?.getTime()).toBe(nowMs + 12 * 60_000);
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    expect((await e.payments.handleCallback(signed(form))).status).toBe('SUCCEEDED');
    await e.deliver(form.txnId);
    const o = await stored(order.ref);
    expect(o).toMatchObject({ status: 'CONFIRMED', journalPosted: true, payment: { verified: true } });
    const b = /** @type {any} */ (
      await BookingRecord.findOne({ orderId: String(o._id) })
        .setOptions(S)
        .lean()
    );
    expect(b.status).toBe('CONFIRMED');
    expect((await HoldRecord.findOne({ _id: b.holdId }).setOptions(S).lean())?.status).toBe('CONFIRMED');
    // the expected postings: PayU → customer advances; confirmation → hotel payable + GST payable + margin
    const [entry] = await TransactionRecord.find({ 'reference.type': 'order' }).lean();
    const t = b.price.totals;
    const accounts = new Map((await AccountRecord.find({}).setOptions(S).lean()).map((a) => [String(a._id), a.type]));
    const byType = Object.fromEntries(
      (entry?.lines ?? []).map((l) => [accounts.get(l.accountId), [l.debitPaise ?? 0, l.creditPaise ?? 0]]),
    );
    expect(byType.CUSTOMER_ADVANCES).toEqual([order.totalPaise, 0]);
    expect(byType.PAYABLE).toEqual([0, t.hotelPayablePaise]);
    expect((byType.TAX_PAYABLE_CGST?.[1] ?? 0) + (byType.TAX_PAYABLE_SGST?.[1] ?? 0) + (byType.TAX_PAYABLE_IGST?.[1] ?? 0)).toBe(
      t.gstPaise,
    );
    expect(byType.REVENUE_MARGIN).toEqual([0, order.totalPaise - t.hotelPayablePaise - t.gstPaise]);
    expect(await TransactionRecord.countDocuments({ purpose: 'payment-received' })).toBe(1);
    await e.deliver(form.txnId);
    await e.payments.handleCallback(signed(form));
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'order' })).toBe(1);
    expect((await stored(order.ref)).history.filter((/** @type {any} */ h) => h.status === 'CONFIRMED')).toHaveLength(1);
  });

  it('a payment starts only while waiting and with enough hold left: < 5 min → extended once first; then too late', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    nowMs += 11 * 60_000; // 4 minutes of hold left
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    const o = await stored(order.ref);
    expect(o.holdExtended).toBe(true);
    expect(new Date(o.holdExpiresAt).getTime()).toBe(Date.parse('2026-11-19T10:25:00Z'));
    expect(new Date(form.windowEndsAt).getTime()).toBe(Date.parse('2026-11-19T10:23:00Z')); // hold end − 2 min
    nowMs += 11 * 60_000; // 3 minutes left, already extended
    await OrderRecord.updateOne({ ref: order.ref }, { $set: { status: 'AWAITING_PAYMENT' } }).setOptions(S);
    await expect(e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' })).rejects.toThrow(/HOLD_ENDING/);
  });

  it('PayU pending → PAYMENT_PENDING with the hold extended once; failed → back to waiting (pay again)', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'PENDING' });
    nowMs += 2 * 60_000;
    await pollPayments(e.paymentsDeps);
    await e.deliver(form.txnId);
    expect(await stored(order.ref)).toMatchObject({ status: 'PAYMENT_PENDING', holdExtended: true });
    payuSays.set(form.txnId, { status: 'FAILURE' });
    nowMs += 2 * 60_000;
    await pollPayments(e.paymentsDeps);
    await e.deliver(form.txnId);
    expect((await stored(order.ref)).status).toBe('AWAITING_PAYMENT');
    const again = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    expect(again.txnId).not.toBe(form.txnId);
  });

  it('two payments both succeed → the order confirmed once, the second refunded to its source', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const first = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    const second = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    for (const f of [first, second]) {
      payuSays.set(f.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
      await e.payments.handleCallback(signed(f));
    }
    await e.deliver(first.txnId);
    await e.deliver(second.txnId);
    await e.deliver(second.txnId);
    expect((await stored(order.ref)).status).toBe('CONFIRMED');
    expect(await RefundRecord.find({}).lean()).toEqual([
      expect.objectContaining({ txnId: second.txnId, key: `extra:${second.txnId}`, amountPaise: order.totalPaise }),
    ]);
    expect(refundCalls).toHaveLength(1);
  });
});

describe('paid after the hold expired', () => {
  it('rooms still free → held again and confirmed', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    nowMs += 16 * 60_000;
    await sweepHolds({ clock, logger }); // the hold expires and its rooms go back
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
    const o = await stored(order.ref);
    expect(o.status).toBe('CONFIRMED');
    const b = /** @type {any} */ (
      await BookingRecord.findOne({ orderId: String(o._id) })
        .setOptions(S)
        .lean()
    );
    expect(b).toMatchObject({ status: 'CONFIRMED', holdIds: [expect.any(String), expect.any(String)] });
    expect(refundCalls).toHaveLength(0);
  });

  it('rooms gone → order FAILED, booking FAILED, payment refunded to the source once', async () => {
    const { h, order } = await bookedOrder(1);
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    nowMs += 16 * 60_000;
    await sweepHolds({ clock, logger });
    await newOrder(h, 'someone-else-session-00000002'); // the last room goes to someone else
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
    await e.deliver(form.txnId);
    const o = await stored(order.ref);
    expect(o).toMatchObject({ status: 'FAILED', failure: { code: 'ROOMS_LOST' }, payment: { verified: true, refundKey: 'rooms-lost' } });
    expect(
      (
        await BookingRecord.findOne({ orderId: String(o._id) })
          .setOptions(S)
          .lean()
      )?.status,
    ).toBe('FAILED');
    expect(await RefundRecord.find({}).lean()).toEqual([
      expect.objectContaining({ txnId: form.txnId, key: 'rooms-lost', amountPaise: order.totalPaise }),
    ]);
    expect(refundCalls).toHaveLength(1);
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'order' })).toBe(0); // nothing confirmed
  });

  it('PayU confirms after the payment window (abandoned) → the order still decides: held again and confirmed', async () => {
    const { order } = await bookedOrder();
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(order.ref), { returnUrl: 'https://x' });
    nowMs += 13 * 60_000;
    await pollPayments(e.paymentsDeps); // not found at PayU after the window → abandoned
    expect((await IntentRecord.findOne({ txnId: form.txnId }).lean())?.failureReason).toBe('ABANDONED');
    nowMs += 61 * 60_000;
    await sweepHolds({ clock, logger });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: order.totalPaise });
    await pollPayments(e.paymentsDeps); // late success → `paid-late`
    await e.deliver(form.txnId);
    expect((await stored(order.ref)).status).toBe('CONFIRMED');
    expect(refundCalls).toHaveLength(0);
  });
});
