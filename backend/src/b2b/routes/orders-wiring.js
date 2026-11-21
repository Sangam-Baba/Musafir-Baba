// @ts-check
/**
 * Stage 08 wiring: the booking engine — orders with the hotel item handler (hotel-booking, through hotel-inventory
 * holds, the Stage 06 booking quote and the catalogue / plan copies) and the PayU payment mode (Stage 07).
 */
import express from 'express';

import { ServiceUnavailableError } from '../core/errors.js';

import { createHotelBookingsService, createHotelItemHandler, overdueAcknowledgements } from '../modules/hotel-booking/index.js';
import { IntentRecord, RefundRecord } from '../modules/payments/index.js';
import { createHoldService } from '../modules/hotel-inventory/index.js';
import {
  createGatewayMode,
  createOrderAdmin,
  createItemHandlers,
  createOrderPayments,
  createOrderService,
  createPaymentModes,
  orderView,
} from '../modules/orders/index.js';
import { documentsFor } from './documents-wiring.js';
import { hotelBookingRoutes } from './hotel-bookings.js';
import { orderAdminRoutes } from './orders-admin.js';
import { orderRoutes } from './orders.js';
import { paymentsFromEnv } from './payments-wiring.js';
import { searchParts } from './search-wiring.js';

/**
 * The engine for this process (routes, and later the background consumers).
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {import('../core/logger.js').Logger} logger
 * @param {ReturnType<typeof import('./identity.js').createIdentity>} identity
 */
export function bookingEngine(env, clock, logger, identity) {
  const parts = searchParts(env, clock, identity);
  const { deps: paymentsDeps, payments } = paymentsFromEnv(env, clock, logger);
  const handlers = createItemHandlers();
  handlers.register(
    'HOTEL',
    createHotelItemHandler({
      clock,
      logger,
      holds: createHoldService({ clock }),
      quote: (caller, token) => parts.offers.bookingQuote(caller, token),
      facts: (id) => parts.catalog.bookingFacts(id),
      policyOf: (id) => parts.terms.policyOf(id),
      ledger: paymentsDeps.ledger,
    }),
  );
  const modes = createPaymentModes();
  modes.register('GATEWAY', createGatewayMode({ payments, paymentsDeps, ledger: paymentsDeps.ledger }));
  const ordersDeps = { clock, logger, handlers, modes, ledger: paymentsDeps.ledger };
  return { parts, handlers, modes, payments, paymentsDeps, ordersDeps, orders: createOrderService(ordersDeps) };
}

/**
 * Everything about one order for MusafirBaba admins: the full view, payments and refunds, documents, proposed actions,
 * and one timeline (order steps, booking steps, PayU steps, refund steps) in time order.
 * @param {ReturnType<typeof bookingEngine>} engine
 * @param {ReturnType<typeof createOrderAdmin>} admin
 * @param {Record<string, any>} order
 */
async function adminDetail(engine, admin, order) {
  const id = String(order._id);
  const intents = await IntentRecord.find({ 'reference.type': 'order', 'reference.id': id }, { pendingEvents: 0 }).lean();
  const refunds = await RefundRecord.find({ intentId: { $in: intents.map((i) => String(i._id)) } }, { pendingEvents: 0 }).lean();
  /** @type {{ at: Date | string | null | undefined, what: string, by: string, note: string | null }[]} */
  const steps = (order.history ?? []).map((/** @type {any} */ h) => ({
    at: h.at,
    what: `order → ${h.status}`,
    by: h.by,
    note: h.note ?? null,
  }));
  for (const it of order.items ?? []) steps.push(...(await engine.handlers.get(it.type).timeline(it)));
  for (const i of intents)
    for (const h of i.history ?? [])
      steps.push({ at: h.at, what: `PayU ${i.txnId} → ${h.status}`, by: `payments:${h.source}`, note: h.note ?? null });
  for (const r of refunds)
    for (const h of r.history ?? [])
      steps.push({ at: h.at, what: `refund ${r.refundId} → ${h.status}`, by: 'payments', note: h.note ?? null });
  steps.sort((a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime());
  return {
    order: await orderView(engine.ordersDeps, order, 'ADMIN'),
    payments: intents.map((i) => ({
      txnId: i.txnId,
      status: i.status,
      amountPaise: i.amountPaise,
      failureReason: i.failureReason ?? null,
      gatewayPaymentId: i.gatewayPaymentId ?? null,
      refundedPaise: i.refundedPaise ?? 0,
    })),
    refunds: refunds.map((r) => ({ refundId: r.refundId, key: r.key, status: r.status, amountPaise: r.amountPaise, reason: r.reason })),
    documents: await documentsFor(engine.ordersDeps).list(id),
    actions: await admin.actions(id),
    timeline: steps,
  };
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {import('../core/logger.js').Logger} logger
 * @param {ReturnType<typeof import('./identity.js').createIdentity>} identity
 */
export function stage08Routes(env, clock, logger, identity) {
  const router = express.Router();
  // Online booking stays switched off on a server until the owner turns it on (`B2B_ORDERS_ENABLED=true`):
  // the rest of the system can go live first, and nobody can hold rooms before checkout and limits are ready.
  if (env.B2B_ORDERS_ENABLED !== 'true')
    router.use('/orders', (_req, _res, next) => next(new ServiceUnavailableError('ORDERS_NOT_ENABLED')));
  const engine = bookingEngine(env, clock, logger, identity);
  router.use(
    orderRoutes({
      gate: engine.parts.gate,
      orders: engine.orders,
      payments: createOrderPayments(engine.ordersDeps),
      documents: documentsFor(engine.ordersDeps),
      publicUrl: (env.B2B_PUBLIC_URL || 'https://musafirbaba.com').replace(/\/$/, ''),
      view: (o) => orderView(engine.ordersDeps, o, 'BUYER'),
      linkSecret: env.B2B_AUTH_SECRET ?? '',
      clock,
    }),
  );
  router.use(hotelBookingRoutes({ bookings: createHotelBookingsService({ clock }) }));
  const admin = createOrderAdmin(engine.ordersDeps);
  router.use(orderAdminRoutes({ admin, detail: (o) => adminDetail(engine, admin, o), overdue: () => overdueAcknowledgements({ clock }) }));
  return router;
}
