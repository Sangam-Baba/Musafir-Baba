// @ts-check
/**
 * Money for bookings that ended other than by a cancellation (plan Stage 09): a final no-show (the unused part back) and
 * a hotel that couldn't honour the booking (all back, or moved to another hotel). Each once — unique ledger references
 * and refund keys; repeat-safe.
 */
import { systemContext } from '../../core/context.js';
import { newEvent } from '../../core/db/events.js';
import { transition } from '../../core/db/transition.js';
import { EVENTS } from './events.js';
import { OrderRecord } from './models/order.model.js';
import { ORDERS, pushHistory } from './orders.service.js';

/** @typedef {import('./payment.service.js').PayDeps} PayDeps */

/** @param {PayDeps} deps @param {string} why */
const sys = (deps, why) => systemContext(`orders: ${why}`, `settle-${deps.clock.now().getTime()}`, deps.logger, deps.clock);

/**
 * A final no-show (plan Stage 09 §3.6): the unused part refunded to the source, the ledger settled pro rata (D5) —
 * once (reference `no-show/<booking>`, refund key `no-show:<booking>`). Rooms are past; nothing is given back.
 * @param {PayDeps} deps
 * @param {string} orderId
 * @param {string} bookingId
 * @param {{ chargePaise: number, refundPaise: number }} amounts
 */
export async function settleNoShow(deps, orderId, bookingId, amounts) {
  const order = /** @type {any} */ (await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean());
  const item = order?.items.find((/** @type {any} */ i) => i.bookingId === bookingId);
  if (!order || !item || amounts.refundPaise <= 0) return;
  const mode = deps.modes.get(order.paymentMode);
  const { lines } = await deps.handlers.get(item.type).cancelLedgerLines(item, amounts);
  await deps.ledger.post(
    {
      reference: { type: 'no-show', id: bookingId },
      purpose: 'no-show-settled',
      lines: [...lines, { accountId: await mode.debitAccount(order), creditPaise: amounts.refundPaise }],
      memo: `${order.ref} ${item.bookingRef}`,
    },
    'system:orders',
  );
  if (order.payment?.verifiedIntentId)
    await mode.refund(sys(deps, 'refund a no-show'), order, {
      intentId: order.payment.verifiedIntentId,
      key: `no-show:${bookingId}`,
      reason: `No-show ${item.bookingRef}: unused part`,
      amountPaise: amounts.refundPaise,
    });
}

/**
 * A hotel failure MusafirBaba resolved (plan Stage 09 §3.7), once (references `hotel-failure/<booking>`):
 * REFUND → the whole confirmation reversed, everything refunded to the source (`hotel-failed:<booking>`), the order
 * CANCELLED; RELOCATE → what the first hotel was owed moved to suspense (finance settles with the new hotel).
 * The failed hotel's rooms stay out of sale.
 * @param {PayDeps} deps
 * @param {string} orderId
 * @param {string} bookingId
 * @param {'REFUND' | 'RELOCATE'} action
 */
export async function settleHotelFailure(deps, orderId, bookingId, action) {
  const order = /** @type {any} */ (await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean());
  const item = order?.items.find((/** @type {any} */ i) => i.bookingId === bookingId);
  if (!order || !item) return;
  const handler = deps.handlers.get(item.type);
  const mode = deps.modes.get(order.paymentMode);
  const ref = { type: 'hotel-failure', id: bookingId };
  if (action === 'RELOCATE') {
    const v = /** @type {any} */ (await handler.view(item, 'ADMIN'));
    const owed = v.priceBreakdown?.totals?.hotelPayablePaise ?? 0;
    await deps.ledger.openHotelPayable(item.hotelOrgId);
    const lines = [
      { accountId: await deps.ledger.accountId(item.hotelOrgId, 'PAYABLE'), debitPaise: owed },
      { accountId: await deps.ledger.accountId('platform', 'SUSPENSE'), creditPaise: owed },
    ];
    if (owed > 0)
      await deps.ledger.post(
        { reference: ref, purpose: 'hotel-failed-moved', lines, memo: `${order.ref} ${item.bookingRef} moved to another hotel` },
        'system:orders',
      );
    return;
  }
  const amounts = { chargePaise: 0, refundPaise: item.totalPaise };
  const { lines } = await handler.cancelLedgerLines(item, amounts);
  await deps.ledger.post(
    {
      reference: ref,
      purpose: 'hotel-failed-refund',
      lines: [...lines, { accountId: await mode.debitAccount(order), creditPaise: item.totalPaise }],
      memo: `${order.ref} ${item.bookingRef} hotel couldn't honour`,
    },
    'system:orders',
  );
  if (order.payment?.verifiedIntentId)
    await mode.refund(sys(deps, 'refund a hotel failure'), order, {
      intentId: order.payment.verifiedIntentId,
      key: `hotel-failed:${bookingId}`,
      reason: `Hotel couldn't honour ${item.bookingRef}`,
      amountPaise: item.totalPaise,
    });
  const event = newEvent(
    EVENTS.orderCancelled,
    { orgId: order.hotelOrgIds?.[0] ?? 'platform', orderId: String(order._id), ref: order.ref, reason: 'HOTEL_FAILED' },
    deps,
  );
  const moved = await transition(OrderRecord, {
    id: order._id,
    from: 'CONFIRMED',
    to: 'CANCELLED',
    events: [event],
    clock: deps.clock,
    options: ORDERS,
  });
  if (moved)
    await pushHistory(deps, order._id, { status: 'CANCELLED', by: 'system:orders', note: "the hotel couldn't honour it — refunded" });
}
