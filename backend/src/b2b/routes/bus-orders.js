// @ts-check
/**
 * Stage 18 B6 — booking bus seats through the same order engine as hotels. Answers 503 unless `B2B_ORDERS_ENABLED`,
 * `B2B_BUS_ENABLED` and `B2B_BUS_SELLING_ENABLED` are all `true` (client companies also pass the pilot list).
 *   POST /client/bus-orders   B2B client (`orders.order.create` + `bus-booking.search.use`), Idempotency-Key
 *                             {tripId, fromStopId, toStopId, seats: [{no, passenger: {name, age, gender}}], contact,
 *                              expectedTotalPaise?, customerReference?, branchId?, confirmDuplicate?} → 201 the order
 *                             (seats held 15 min) — then pay with POST /client/orders/:ref/pay (wallet / credit / PayU)
 *   POST /bus-orders          website customer or guest (X-Guest-Session), Idempotency-Key, same body → 201 the order +
 *                             its private link key — then pay with POST /orders/:ref/payments (PayU)
 * Reading an order (and its e-ticket view) uses GET /client/orders/:ref and GET /orders/:ref as for hotels.
 * The server prices the seats itself; `expectedTotalPaise` (what the buyer saw) only guards against a changed price.
 */
import express from 'express';
import { z } from 'zod';

import { hashRequest, withIdempotency } from '../core/db/idempotency.js';
import { RateLimitError, ServiceUnavailableError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute, requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { clientIp, createRateLimiter } from '../core/rate-limit.js';
import { PERMISSIONS as BUS_BOOKING } from '../modules/bus-booking/index.js';
import { CLIENT_ORDER_LIMITS, linkKey, orderView, PERMISSIONS as ORD } from '../modules/orders/index.js';
import { Id } from './bus-http.js';
import { orgInfo } from './bus-search.js';
import { branchFor, idemKey, member } from './client-orders.js';
import { buyerOf } from './orders.js';
import { pilotGate } from './pilot.js';
import { createSearchGate } from './search-gateway.js';

const Name = z.string().trim().min(1).max(60);
const BusOrderBody = z.strictObject({
  tripId: Id,
  fromStopId: Id,
  toStopId: Id,
  seats: z
    .array(
      z.strictObject({
        no: z.string().trim().min(1).max(6),
        passenger: z.strictObject({ name: Name, age: z.number().int(), gender: z.enum(['F', 'M', 'O']) }),
      }),
    )
    .min(1)
    .max(10),
  contact: z.strictObject({ name: Name, email: z.string().trim().max(254), phone: z.string().trim().max(20) }),
  expectedTotalPaise: z.number().int().min(1).nullish(),
  customerReference: z.string().trim().max(60).nullish(),
  branchId: Id.nullish(),
  confirmDuplicate: z.boolean().optional(),
});

/**
 * @typedef {{ env: NodeJS.ProcessEnv, clock: import('../core/clock.js').Clock,
 *   engine: ReturnType<typeof import('./orders-wiring.js').bookingEngine> }} BusOrderDeps
 */

/** @param {import('express').Response} res @param {any} body */
const itemOf = (res, body) => ({
  type: /** @type {const} */ ('BUS'),
  input: {
    caller: res.locals.searchCaller,
    tripId: body.tripId,
    fromStopId: body.fromStopId,
    toStopId: body.toStopId,
    seats: body.seats,
    expectedTotalPaise: body.expectedTotalPaise ?? null,
  },
});

/** @param {import('express').Router} router @param {BusOrderDeps} deps @param {ReturnType<typeof createSearchGate>} gate */
function clientRoute(router, deps, gate) {
  router.post(
    '/client/bus-orders',
    requirePermission(ORD.orderCreate),
    validate({ body: BusOrderBody }),
    gate('bus.order', 'heavy'),
    (req, res, next) => {
      (async () => {
        const key = idemKey(req);
        const m = member(res);
        const body = res.locals.input.body;
        const scope = `client:${m.orgId}`;
        const r = await withIdempotency(
          { scope, key, requestHash: hashRequest({ method: 'POST', path: '/client/bus-orders', body }), clock: deps.clock },
          async () => {
            const order = await deps.engine.orders.create(contextOf(res), {
              channel: /** @type {any} */ (contextOf(res).actor).apiKeyId ? 'B2B_API' : 'B2B_PORTAL',
              buyer: { clientOrgId: m.orgId, customerId: null, guestKey: null },
              createdBy: `user:${m.userId}`,
              branchId: branchFor(m, body.branchId),
              customerReference: body.customerReference ?? null,
              idempotency: { scope, key },
              ip: clientIp(req),
              paymentMode: 'WALLET',
              limits: CLIENT_ORDER_LIMITS,
              contact: body.contact,
              confirmDuplicate: body.confirmDuplicate,
              item: itemOf(res, body),
            });
            return { statusCode: 201, body: await orderView(deps.engine.ordersDeps, order, 'BUYER') };
          },
        );
        res.set('Cache-Control', 'private, no-store').status(r.statusCode).set('Idempotent-Replayed', String(r.replayed)).json(r.body);
      })().catch(next);
    },
  );
}

/** @param {import('express').Router} router @param {BusOrderDeps} deps @param {ReturnType<typeof createSearchGate>} gate */
function websiteRoute(router, deps, gate) {
  const limiter = createRateLimiter({ name: 'bus-orders-create-ip', points: 20, windowMs: 60 * 60_000, clock: deps.clock });
  /** @param {import('express').Request} req @param {import('express').Response} _res @param {import('express').NextFunction} next */
  function perIp(req, _res, next) {
    limiter.consume(clientIp(req)).then((r) => next(r.allowed ? undefined : new RateLimitError(r.retryAfterSeconds)), next);
  }
  router.post('/bus-orders', publicRoute(), perIp, validate({ body: BusOrderBody }), gate('bus.order', 'heavy'), (req, res, next) => {
    (async () => {
      const key = req.get('idempotency-key') ?? '';
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) throw new ValidationError({ problems: [{ field: 'Idempotency-Key', code: 'REQUIRED' }] });
      const who = buyerOf(req, res);
      const body = res.locals.input.body;
      const r = await withIdempotency(
        { scope: who.scope, key, requestHash: hashRequest({ method: 'POST', path: '/bus-orders', body }), clock: deps.clock },
        async () => {
          const order = await deps.engine.orders.create(contextOf(res), {
            channel: 'WEBSITE',
            buyer: who.buyer,
            createdBy: who.createdBy,
            idempotency: { scope: who.scope, key },
            ip: clientIp(req),
            paymentMode: 'GATEWAY',
            contact: body.contact,
            confirmDuplicate: body.confirmDuplicate,
            item: itemOf(res, body),
          });
          const view = await orderView(deps.engine.ordersDeps, order, 'BUYER');
          return { statusCode: 201, body: { ...view, linkKey: linkKey(deps.env.B2B_AUTH_SECRET ?? '', order.ref) } };
        },
      );
      res.set('Cache-Control', 'private, no-store').status(r.statusCode).set('Idempotent-Replayed', String(r.replayed)).json(r.body);
    })().catch(next);
  });
}

/** @param {BusOrderDeps} deps */
export function busOrderRoutes(deps) {
  const router = express.Router();
  const e = deps.env;
  if (e.B2B_ORDERS_ENABLED !== 'true' || e.B2B_BUS_ENABLED !== 'true' || e.B2B_BUS_SELLING_ENABLED !== 'true') {
    router.use(['/bus-orders', '/client/bus-orders'], (_req, _res, next) => next(new ServiceUnavailableError('BUS_SELLING_NOT_ENABLED')));
    return router;
  }
  router.use('/client/bus-orders', pilotGate(e, 'ORDERS_NOT_ENABLED'));
  const gate = createSearchGate({ clock: deps.clock, orgInfo, permission: BUS_BOOKING.search, prefix: 'bus-search' });
  clientRoute(router, deps, gate);
  websiteRoute(router, deps, gate);
  return router;
}
