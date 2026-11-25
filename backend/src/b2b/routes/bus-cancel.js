// @ts-check
/**
 * Stage 18 B7 — cancelling bus seats (behind `B2B_ORDERS_ENABLED` + `B2B_BUS_ENABLED`; selling may already be off):
 *   GET  /bookings/buses/:ref/cancel-quote?seats=L1,L2[&key]   the buyer: charge and refund of cancelling those seats now
 *   POST /bookings/buses/:ref/cancel?[key]  {seats, expectedRefundPaise}   Idempotency-Key — the buyer cancels them
 *        Buyers: the website customer, the guest (browser session or the order link key), or a client member who may
 *        see the order (cancelling needs `orders.order.create`). Anyone else → 404. A changed refund → REFUND_CHANGED.
 *   GET  /bookings/buses/:ref/review?[key] · POST /bookings/buses/:ref/review {rating, text}   the buyer, once, after the trip
 *   GET  /admin/bus/cancellations?status · POST /admin/bus/cancellations {scope, bookingRef | tripId, reason}
 *   POST /admin/bus/cancellations/:id/decide {approve}   ops full-refund cancellation — a second person approves
 *        (`orders.admin.read` to see, `orders.admin.act` to propose / decide)
 */
import express from 'express';
import { z } from 'zod';

import { hashRequest, withIdempotency } from '../core/db/idempotency.js';
import { ConflictError, ForbiddenError, NotFoundError, ServiceUnavailableError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute, requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { createBusCancellations, createBusReviews } from '../modules/bus-booking/index.js';
import { createPartCancellations, ORDERS, OrderRecord, PERMISSIONS as ORD } from '../modules/orders/index.js';
import { Id, input } from './bus-http.js';
import { memberSees } from './client-orders.js';
import { actorId } from './customer-bookings.js';
import { handle, staffOf } from './payout-finance-admin.js';

const Ref = z.strictObject({ ref: z.string().min(5).max(32) });
const Key = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,64}$/)
  .optional();
const Seats = z.array(z.string().trim().min(1).max(6)).min(1).max(10);

/** @typedef {{ env: NodeJS.ProcessEnv, clock: import('../core/clock.js').Clock, engine: ReturnType<typeof import('./orders-wiring.js').bookingEngine> }} BusCancelDeps */

/**
 * The buyer's bus booking and its order — or 404 (and 403 when they may see but not act).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{ deps: BusCancelDeps, cancels: ReturnType<typeof createBusCancellations> }} env
 * @param {boolean} act
 */
async function ownBusBooking(req, res, { deps, cancels }, act) {
  const { actor } = contextOf(res);
  const b = await cancels.byRef(input(res).params.ref);
  if (actor.type === 'member') {
    if (actor.orgType !== 'CLIENT' || !actor.permissions.includes(ORD.orderRead)) throw new NotFoundError('BUS_BOOKING_NOT_FOUND');
    const order = await deps.engine.orders.read(b.orderRef, { clientOrgId: actor.orgId });
    const m = { orgId: actor.orgId, userId: actor.userId, branchIds: actor.branchIds ?? [], ownOnly: actor.ownOnly === true };
    if (!memberSees(m, order)) throw new NotFoundError('BUS_BOOKING_NOT_FOUND');
    if (act && (!actor.permissions.includes(ORD.orderCreate) || actor.viewAs)) throw new ForbiddenError();
    return { b, order };
  }
  const order = await deps.engine.orders.read(b.orderRef, {
    customerId: actor.type === 'customer' ? actor.customerId : null,
    guestKey: req.get('x-guest-session') ?? null,
    accessKey: input(res).query.key ?? null,
    linkSecret: deps.env.B2B_AUTH_SECRET ?? '',
  });
  return { b, order };
}

/** @param {express.Router} router @param {BusCancelDeps} deps @param {ReturnType<typeof createBusCancellations>} cancels */
function buyerRoutes(router, deps, cancels) {
  const parts = createPartCancellations(deps.engine.ordersDeps);
  router.get(
    '/bookings/buses/:ref/cancel-quote',
    publicRoute(),
    validate({ params: Ref, query: z.strictObject({ seats: z.string().max(80), key: Key }) }),
    (req, res, next) => {
      (async () => {
        const { b } = await ownBusBooking(req, res, { deps, cancels }, false);
        const q = cancels.quote(
          b,
          input(res)
            .query.seats.split(',')
            .map((/** @type {string} */ s) => s.trim())
            .filter(Boolean),
        );
        res
          .set('Cache-Control', 'private, no-store')
          .json({ seats: q.seats, percent: q.percent, chargePaise: q.chargePaise, refundPaise: q.refundPaise, policy: q.policy });
      })().catch(next);
    },
  );
  router.post(
    '/bookings/buses/:ref/cancel',
    publicRoute(),
    validate({
      params: Ref,
      query: z.strictObject({ key: Key }),
      body: z.strictObject({ seats: Seats, expectedRefundPaise: z.number().int().min(0) }),
    }),
    (req, res, next) => {
      (async () => {
        const key = req.get('idempotency-key') ?? '';
        if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) throw new ValidationError({ problems: [{ field: 'Idempotency-Key', code: 'REQUIRED' }] });
        const { b, order } = await ownBusBooking(req, res, { deps, cancels }, true);
        const body = input(res).body;
        const r = await withIdempotency(
          {
            scope: `bus-booking:${b.ref}`,
            key,
            requestHash: hashRequest({ method: 'POST', path: `/bookings/buses/${b.ref}/cancel`, body }),
            clock: deps.clock,
          },
          async () => {
            const part = cancels.buyerPart(b, body.seats, actorId(res));
            if (part.refundPaise !== body.expectedRefundPaise) throw new ConflictError('REFUND_CHANGED', { refundPaise: part.refundPaise });
            await parts.cancelPart({ order, bookingRef: b.ref, part });
            return {
              statusCode: 200,
              body: { bookingRef: b.ref, seats: part.seats, chargePaise: part.chargePaise, refundPaise: part.refundPaise },
            };
          },
        );
        res.set('Cache-Control', 'private, no-store').status(r.statusCode).json(r.body);
      })().catch(next);
    },
  );
}

/** The buyer's review (B8). @param {express.Router} router @param {BusCancelDeps} deps @param {ReturnType<typeof createBusCancellations>} cancels */
function reviewRoutes(router, deps, cancels) {
  const reviews = createBusReviews({ clock: deps.clock });
  router.get(
    '/bookings/buses/:ref/review',
    publicRoute(),
    validate({ params: Ref, query: z.strictObject({ key: Key }) }),
    (req, res, next) => {
      ownBusBooking(req, res, { deps, cancels }, false).then(
        async ({ b }) => res.set('Cache-Control', 'private, no-store').json({ review: await reviews.mine(b) }),
        next,
      );
    },
  );
  router.post(
    '/bookings/buses/:ref/review',
    publicRoute(),
    validate({
      params: Ref,
      query: z.strictObject({ key: Key }),
      body: z.strictObject({ rating: z.number().int().min(1).max(5), text: z.string().trim().max(1000).nullish() }),
    }),
    (req, res, next) => {
      ownBusBooking(req, res, { deps, cancels }, true).then(
        async ({ b }) => res.status(201).json(await reviews.submit(b, actorId(res), input(res).body)),
        next,
      );
    },
  );
}

/** @param {express.Router} router @param {ReturnType<typeof createBusCancellations>} cancels */
function opsRoutes(router, cancels) {
  router.get(
    '/admin/bus/cancellations',
    requirePermission(ORD.adminRead),
    validate({ query: z.strictObject({ status: z.enum(['PROPOSED', 'DONE', 'REJECTED']).optional() }) }),
    handle(async (_q, res) => ({ data: await cancels.list(input(res).query) })),
  );
  router.post(
    '/admin/bus/cancellations',
    requirePermission(ORD.adminAct),
    validate({
      body: z.strictObject({
        scope: z.enum(['BOOKING', 'TRIP']),
        bookingRef: z.string().min(5).max(32).nullish(),
        tripId: Id.nullish(),
        reason: z.string().trim().min(5).max(500),
      }),
    }),
    handle(async (_q, res) => {
      const body = input(res).body;
      if (body.scope === 'BOOKING' ? !body.bookingRef : !body.tripId)
        throw new ValidationError({ problems: [{ field: body.scope === 'BOOKING' ? 'bookingRef' : 'tripId', code: 'REQUIRED' }] });
      return cancels.propose(staffOf(res), body);
    }, 201),
  );
  router.post(
    '/admin/bus/cancellations/:id/decide',
    requirePermission(ORD.adminAct),
    validate({ params: z.strictObject({ id: Id }), body: z.strictObject({ approve: z.boolean() }) }),
    handle(async (_q, res) => cancels.decide(staffOf(res), input(res).params.id, input(res).body.approve)),
  );
}

/** @param {BusCancelDeps} deps */
export function busCancelRoutes(deps) {
  const router = express.Router();
  if (deps.env.B2B_ORDERS_ENABLED !== 'true' || deps.env.B2B_BUS_ENABLED !== 'true') {
    router.use(['/bookings/buses', '/admin/bus/cancellations'], (_req, _res, next) => next(new ServiceUnavailableError('BUS_NOT_ENABLED')));
    return router;
  }
  const parts = createPartCancellations(deps.engine.ordersDeps);
  const cancels = createBusCancellations({
    clock: deps.clock,
    cancelPart: async (orderId, bookingRef, part) => {
      const order = await OrderRecord.findOne({ _id: orderId }).setOptions(ORDERS).lean();
      if (!order) throw new NotFoundError('ORDER_NOT_FOUND');
      return parts.cancelPart({ order: /** @type {any} */ (order), bookingRef, part: /** @type {any} */ (part) });
    },
  });
  buyerRoutes(router, deps, cancels);
  reviewRoutes(router, deps, cancels);
  opsRoutes(router, cancels);
  return router;
}
