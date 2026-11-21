// @ts-check
/**
 * Paying for an order and confirming it (plan Stage 08 §3.4–3.5, `05-…` §6).
 * Start: only `AWAITING_PAYMENT`; < 5 min of hold left → extended once first; the PayU window ends 2 minutes before
 * the hold. PayU's answers arrive as events (never from the browser): `payments.intent.succeeded` / `paid-late` →
 * order `CONFIRMING` (payment verified) → each item confirmed (rooms booked; if the hold is gone, held again once)
 * → one ledger entry (debit by the payment mode, credits by the items) → `CONFIRMED` (+ `orders.order.confirmed`).
 * Rooms truly gone → order `FAILED` and the payment refunded to the source (key `rooms-lost`). A second successful
 * payment for the same order → refunded (`extra:<txnId>`). `pending` → `PAYMENT_PENDING` and the hold extended once;
 * `failed` → back to `AWAITING_PAYMENT` (pay again while the rooms are held).
 * Every step is conditional and repeat-safe; the reconciler finishes `CONFIRMING` forward (`confirmingRule`).
 */
import { systemContext } from '../../core/context.js';
import { newEvent } from '../../core/db/events.js';
import { transition } from '../../core/db/transition.js';
import { ConflictError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { paymentPlan } from './domain/order.js';
import { OrderRecord } from './models/order.model.js';
import { failOrder, ORDERS, orderInfo, pushHistory } from './orders.service.js';

export const MAX_PAYMENT_ATTEMPTS = 5;
const PAYABLE_AGAIN = ['AWAITING_PAYMENT', 'PAYMENT_PENDING', 'EXPIRED'];

/**
 * @typedef {import('./orders.service.js').OrdersDeps & { ledger: ReturnType<typeof import('../wallet/index.js').createLedger> }} PayDeps
 * @typedef {import('../../core/context.js').RequestContext} Ctx
 * @typedef {{ intentId: string, txnId: string, purpose: string, reference: { type: string, id: string }, amountPaise: number }} PaymentEvent
 */

/** @param {PayDeps} deps @param {string} why */
const sys = (deps, why) => systemContext(`orders: ${why}`, `orders-${deps.clock.now().getTime()}`, deps.logger, deps.clock);

/** @param {unknown} id */
async function load(id) {
  return /** @type {Record<string, any> | null} */ (await OrderRecord.findOne({ _id: id }).setOptions(ORDERS).lean());
}

/**
 * The hold extended once (each item), only while waiting for payment.
 * @param {PayDeps} deps
 * @param {Ctx} ctx
 * @param {Record<string, any>} o
 */
async function extendOnce(deps, ctx, o) {
  const claimed = await OrderRecord.updateOne(
    { _id: o._id, holdExtended: false, status: { $in: ['AWAITING_PAYMENT', 'PAYMENT_PENDING'] } },
    { $set: { holdExtended: true } },
  ).setOptions(ORDERS);
  if (claimed.modifiedCount !== 1) throw new ConflictError('HOLD_NOT_EXTENDABLE', { orderStatus: o.status, extended: o.holdExtended });
  let until = o.holdExpiresAt;
  for (const item of o.items) until = await deps.handlers.get(item.type).extend(ctx, item);
  await OrderRecord.updateOne({ _id: o._id }, { $set: { holdExpiresAt: until } }).setOptions(ORDERS);
  await pushHistory(deps, o._id, { status: o.status, by: 'system:orders', note: 'hold extended by 10 minutes' });
  return /** @type {Record<string, any>} */ (await load(o._id));
}

/**
 * The PayU checkout for an order the caller may see (route checks the viewer).
 * @param {PayDeps} deps
 * @param {Ctx} ctx
 * @param {Record<string, any>} order
 * @param {{ returnUrl: string, mode?: string }} opts
 */
async function startPayment(deps, ctx, order, opts) {
  let o = order;
  if (o.status !== 'AWAITING_PAYMENT') throw new ConflictError('ORDER_NOT_PAYABLE', { orderStatus: o.status });
  if (opts.mode && opts.mode !== o.paymentMode) o = await switchMode(deps, o, opts.mode);
  if ((o.payment?.attempts ?? 0) >= MAX_PAYMENT_ATTEMPTS) throw new ConflictError('PAYMENT_ATTEMPTS_EXCEEDED');
  let plan = paymentPlan({ holdExpiresAt: new Date(o.holdExpiresAt), extendedOnce: o.holdExtended, now: deps.clock.now() });
  if (plan.action === 'EXTEND') {
    o = await extendOnce(deps, ctx, o);
    plan = paymentPlan({ holdExpiresAt: new Date(o.holdExpiresAt), extendedOnce: true, now: deps.clock.now() });
  }
  if (plan.action !== 'PAY') throw new ConflictError('HOLD_ENDING');
  const mode = deps.modes.get(o.paymentMode);
  if (mode.instant) return payInstantly(deps, ctx, o, mode);
  const pay = await mode.start(ctx, o, { windowMinutes: plan.windowMinutes, returnUrl: opts.returnUrl });
  const res = await OrderRecord.updateOne(
    { _id: o._id, status: 'AWAITING_PAYMENT' },
    {
      $set: { 'payment.intentId': pay.intentId, 'payment.txnId': pay.txnId, 'payment.windowEndsAt': plan.windowEndsAt },
      $inc: { 'payment.attempts': 1 },
      $push: {
        history: { at: deps.clock.now(), status: 'AWAITING_PAYMENT', by: o.createdBy, note: `payment started ${pay.txnId}` },
      },
    },
  ).setOptions(ORDERS);
  if (res.modifiedCount !== 1) throw new ConflictError('ORDER_NOT_PAYABLE');
  return { txnId: pay.txnId, action: pay.action, fields: pay.fields, windowEndsAt: plan.windowEndsAt };
}

/**
 * The buyer chose another way to pay before paying (e.g. wallet instead of PayU) — only while nothing is under way.
 * @param {PayDeps} deps
 * @param {Record<string, any>} o
 * @param {string} mode
 */
async function switchMode(deps, o, mode) {
  deps.modes.get(mode);
  const res = await OrderRecord.updateOne(
    { _id: o._id, status: 'AWAITING_PAYMENT', 'payment.verified': false },
    { $set: { paymentMode: mode } },
  ).setOptions(ORDERS);
  if (res.modifiedCount !== 1) throw new ConflictError('ORDER_NOT_PAYABLE');
  return /** @type {Record<string, any>} */ (await load(o._id));
}

/**
 * An instant payment mode (wallet): the money is held now → CONFIRMING → confirmed forward. Not enough money (or credit
 * overdue) → the rooms are given back and the order fails (plan §3.4 — the buyer tops up or pays by PayU next time).
 * @param {PayDeps} deps
 * @param {Ctx} ctx
 * @param {Record<string, any>} o
 * @param {import('./registry.js').PaymentMode} mode
 */
async function payInstantly(deps, ctx, o, mode) {
  let pay;
  try {
    pay = await mode.start(ctx, o, { windowMinutes: 0, returnUrl: '' });
  } catch (e) {
    const code = /** @type {any} */ (e)?.code;
    if (code === 'INSUFFICIENT_WALLET_BALANCE' || code === 'CREDIT_OVERDUE') {
      for (const item of o.items) await deps.handlers.get(item.type).release(ctx, orderInfo(o), item, 'FAILED');
      await failOrder(deps, o, 'AWAITING_PAYMENT', { code });
    }
    throw e;
  }
  const moved = await transition(OrderRecord, {
    id: o._id,
    from: 'AWAITING_PAYMENT',
    to: 'CONFIRMING',
    set: {
      'payment.intentId': pay.intentId,
      'payment.txnId': pay.txnId,
      'payment.verified': true,
      'payment.verifiedIntentId': pay.intentId,
    },
    clock: deps.clock,
    options: ORDERS,
  });
  if (!moved) {
    await mode.refund(ctx, o, { intentId: pay.intentId, key: 'not-payable', reason: 'order no longer payable' });
    throw new ConflictError('ORDER_NOT_PAYABLE');
  }
  await pushHistory(deps, o._id, { status: 'CONFIRMING', by: o.createdBy, note: `paid by ${o.paymentMode.toLowerCase()} ${pay.txnId}` });
  const status = await confirmForward(deps, /** @type {Record<string, any>} */ (await load(o._id)));
  return { txnId: pay.txnId, action: pay.action, fields: pay.fields, windowEndsAt: null, status };
}

/**
 * Rooms gone after the payment was taken: items failed, order FAILED (refund key recorded in the same update), refund.
 * @param {PayDeps} deps
 * @param {Ctx} ctx
 * @param {Record<string, any>} o
 * @param {string} reason
 */
async function roomsLost(deps, ctx, o, reason) {
  for (const item of o.items) await deps.handlers.get(item.type).release(ctx, orderInfo(o), item, 'FAILED');
  await OrderRecord.updateOne({ _id: o._id, 'payment.refundKey': null }, { $set: { 'payment.refundKey': 'rooms-lost' } }).setOptions(
    ORDERS,
  );
  await failOrder(deps, o, 'CONFIRMING', { code: 'ROOMS_LOST', detail: { reason } });
  await refundOrder(deps, ctx, { ...o, payment: { ...o.payment, refundKey: 'rooms-lost' } });
  return 'FAILED';
}

/**
 * The verified payment of a failed order back to the source (repeat-safe by the recorded key).
 * @param {PayDeps} deps
 * @param {Ctx} ctx
 * @param {Record<string, any>} o
 */
export async function refundOrder(deps, ctx, o) {
  if (!o.payment?.verifiedIntentId || !o.payment.refundKey) return;
  await deps.modes.get(o.paymentMode).refund(ctx, o, {
    intentId: o.payment.verifiedIntentId,
    key: o.payment.refundKey,
    reason: `Order ${o.ref}: rooms no longer available`,
  });
  await OrderRecord.updateOne({ _id: o._id }, { $set: { 'payment.refundRequested': true } }).setOptions(ORDERS);
}

/**
 * Ledger entry for a confirmed order (once — unique by reference), then CONFIRMED.
 * @param {PayDeps} deps
 * @param {Record<string, any>} o
 */
async function finish(deps, o) {
  const mode = deps.modes.get(o.paymentMode);
  if (mode.settle) await mode.settle(sys(deps, 'take the held money'), o);
  const debit = await mode.debitAccount(o);
  /** @type {import('./registry.js').LedgerLine[]} */
  const lines = [{ accountId: debit, debitPaise: o.totalPaise }];
  for (const item of o.items) lines.push(...(await deps.handlers.get(item.type).ledgerLines(orderInfo(o), item)));
  await deps.ledger.post(
    { reference: { type: 'order', id: String(o._id) }, purpose: 'order-confirmed', lines, memo: o.ref },
    'system:orders',
  );
  const event = newEvent(
    EVENTS.orderConfirmed,
    { orgId: o.hotelOrgIds?.[0] ?? 'platform', orderId: String(o._id), ref: o.ref, channel: o.channel },
    deps,
  );
  const moved = await transition(OrderRecord, {
    id: o._id,
    from: 'CONFIRMING',
    to: 'CONFIRMED',
    set: { confirmedAt: deps.clock.now(), journalPosted: true },
    events: [event],
    clock: deps.clock,
    options: ORDERS,
  });
  if (moved) await pushHistory(deps, o._id, { status: 'CONFIRMED', by: 'system:orders' });
  return 'CONFIRMED';
}

/**
 * Forward from CONFIRMING (also the reconciler's rule): rooms booked (held again once if the hold is gone) → entry → CONFIRMED.
 * @param {PayDeps} deps
 * @param {Record<string, any>} o
 */
export async function confirmForward(deps, o) {
  const ctx = sys(deps, 'confirm a paid order');
  const info = orderInfo(o);
  for (const item of o.items) {
    const handler = deps.handlers.get(item.type);
    let r = await handler.confirm(ctx, info, item);
    if (!r.confirmed && (await handler.rehold(ctx, info, item)).held) r = await handler.confirm(ctx, info, item);
    if (!r.confirmed) return roomsLost(deps, ctx, o, r.reason);
  }
  return finish(deps, o);
}

/**
 * PayU confirmed a payment for an order (on time or late).
 * @param {PayDeps} deps
 * @param {PaymentEvent} p
 */
async function paymentConfirmed(deps, p) {
  const o = /^[a-f0-9]{24}$/.test(p.reference?.id ?? '') ? await load(p.reference.id) : null;
  if (!o) return deps.logger.error({ txnId: p.txnId }, 'orders: PayU payment for an unknown order — finance to refund');
  if (o.payment?.verified && o.payment.verifiedIntentId !== p.intentId) return extraPayment(deps, o, p);
  const moved = await transition(OrderRecord, {
    id: o._id,
    from: PAYABLE_AGAIN,
    to: 'CONFIRMING',
    set: { 'payment.verified': true, 'payment.verifiedIntentId': p.intentId },
    clock: deps.clock,
    options: ORDERS,
  });
  if (moved) await pushHistory(deps, o._id, { status: 'CONFIRMING', by: 'system:payments', note: `PayU verified ${p.txnId}` });
  const now = /** @type {Record<string, any>} */ (await load(o._id));
  if (now.status === 'CONFIRMING' && now.payment.verifiedIntentId === p.intentId) return confirmForward(deps, now);
  if (now.status === 'FAILED') return paidButFailed(deps, now, p);
  return now.status;
}

/**
 * Paid for an order that had already failed (checkout abandoned, rooms lost): refunded once.
 * @param {PayDeps} deps
 * @param {Record<string, any>} o
 * @param {PaymentEvent} p
 */
async function paidButFailed(deps, o, p) {
  await OrderRecord.updateOne(
    { _id: o._id, 'payment.verified': false },
    { $set: { 'payment.verified': true, 'payment.verifiedIntentId': p.intentId, 'payment.refundKey': 'order-failed' } },
  ).setOptions(ORDERS);
  await refundOrder(deps, sys(deps, 'refund a failed order'), /** @type {Record<string, any>} */ (await load(o._id)));
  return 'FAILED';
}

/**
 * A second successful payment for an order already paid: refunded to its source.
 * @param {PayDeps} deps
 * @param {Record<string, any>} o
 * @param {PaymentEvent} p
 */
async function extraPayment(deps, o, p) {
  await deps.modes.get(o.paymentMode).refund(sys(deps, 'refund an extra payment'), o, {
    intentId: p.intentId,
    key: `extra:${p.txnId}`,
    reason: `Order ${o.ref} was already paid`,
  });
  await pushHistory(deps, o._id, { status: o.status, by: 'system:payments', note: `extra payment ${p.txnId} refunded` });
  return o.status;
}

/**
 * PayU says pending: the order waits (`PAYMENT_PENDING`) and its hold is extended once.
 * @param {PayDeps} deps
 * @param {PaymentEvent} p
 */
async function paymentPending(deps, p) {
  const o = await load(p.reference.id);
  if (!o || o.payment?.intentId !== p.intentId) return;
  const moved = await transition(OrderRecord, {
    id: o._id,
    from: 'AWAITING_PAYMENT',
    to: 'PAYMENT_PENDING',
    clock: deps.clock,
    options: ORDERS,
  });
  if (!moved) return;
  await pushHistory(deps, o._id, { status: 'PAYMENT_PENDING', by: 'system:payments', note: 'PayU: pending' });
  if (!o.holdExtended)
    await extendOnce(deps, sys(deps, 'extend for a pending payment'), { ...o, status: 'PAYMENT_PENDING' }).catch((e) =>
      deps.logger.warn({ err: e, ref: o.ref }, 'orders: hold not extended'),
    );
}

/**
 * The payment failed: back to `AWAITING_PAYMENT` (pay again while the rooms are held).
 * @param {PayDeps} deps
 * @param {PaymentEvent} p
 */
async function paymentFailed(deps, p) {
  const o = await load(p.reference.id);
  if (!o || o.payment?.intentId !== p.intentId) return;
  const moved = await transition(OrderRecord, {
    id: o._id,
    from: 'PAYMENT_PENDING',
    to: 'AWAITING_PAYMENT',
    clock: deps.clock,
    options: ORDERS,
  });
  await pushHistory(deps, o._id, {
    status: moved ? 'AWAITING_PAYMENT' : o.status,
    by: 'system:payments',
    note: `payment ${p.txnId} failed`,
  });
}

/** @param {PayDeps} deps */
export function createOrderPayments(deps) {
  return {
    /** @param {Ctx} ctx @param {Record<string, any>} order @param {{ returnUrl: string, mode?: string }} opts */
    start: (ctx, order, opts) => startPayment(deps, ctx, order, opts),
    /** @param {Ctx} ctx @param {Record<string, any>} order */
    extend: (ctx, order) => {
      if (order.status !== 'AWAITING_PAYMENT') throw new ConflictError('HOLD_NOT_EXTENDABLE', { orderStatus: order.status });
      return extendOnce(deps, ctx, order);
    },
    /** @param {PaymentEvent} p */
    confirmed: (p) => paymentConfirmed(deps, p),
    /** @param {PaymentEvent} p */
    pending: (p) => paymentPending(deps, p),
    /** @param {PaymentEvent} p */
    failed: (p) => paymentFailed(deps, p),
  };
}
