// @ts-check
/**
 * Stage 08 wiring: the booking engine — orders with the hotel item handler (hotel-booking, through hotel-inventory
 * holds, the Stage 06 booking quote and the catalogue / plan copies) and the PayU payment mode (Stage 07).
 */
import express from 'express';

import { ServiceUnavailableError } from '../core/errors.js';

import { createHotelItemHandler } from '../modules/hotel-booking/index.js';
import { createHoldService } from '../modules/hotel-inventory/index.js';
import {
  createGatewayMode,
  createItemHandlers,
  createOrderPayments,
  createOrderService,
  createPaymentModes,
  orderView,
} from '../modules/orders/index.js';
import { documentsFor } from './documents-wiring.js';
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
  return router;
}
