// @ts-check
/**
 * Stage 08 wiring: the booking engine — orders with the hotel item handler (hotel-booking, through hotel-inventory
 * holds, the Stage 06 booking quote and the catalogue / plan copies) and the PayU payment mode (Stage 07).
 */
import express from 'express';

import { createHotelItemHandler } from '../modules/hotel-booking/index.js';
import { createHoldService } from '../modules/hotel-inventory/index.js';
import { createGatewayMode, createItemHandlers, createOrderService, createPaymentModes, orderView } from '../modules/orders/index.js';
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
  const ordersDeps = { clock, logger, handlers, modes };
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
  const engine = bookingEngine(env, clock, logger, identity);
  router.use(
    orderRoutes({
      gate: engine.parts.gate,
      orders: engine.orders,
      view: (o) => orderView(engine.ordersDeps, o, 'BUYER'),
      linkSecret: env.B2B_AUTH_SECRET ?? '',
      clock,
    }),
  );
  return router;
}
