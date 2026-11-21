// @ts-check
/**
 * Website orders (plan Stage 08 §5). Signed-in website customers and **guests** (no account) book:
 *   POST /orders            Idempotency-Key required; guests also send X-Guest-Session (their browser's random id)
 *                           {priceToken, rooms: [{leadGuest, guests}], contact, specialRequests, confirmDuplicate}
 *                           → 201 the order (rooms held 15 min) + its private link key
 *   GET  /orders/:ref       the buyer only: signed-in customer, the same guest session, or the link key (`?key=`)
 *   POST /orders/:ref/payments     the buyer; Idempotency-Key → the PayU form (window ends before the hold)
 *   POST /orders/:ref/extend-hold  the buyer; once, +10 minutes
 *   GET  /orders/:ref/documents    the buyer; voucher, tax invoice, receipt (latest versions)
 *   GET  /orders/:ref/documents/:id  the buyer; the page itself (printable HTML, strict Content-Security-Policy)
 * Both are public routes (guests have no login); the search gateway limits them per IP, and every read is checked
 * against the order's owner — anyone else gets 404. B2B members use booking requests until Stage 12 part B.
 */
import express from 'express';
import { z } from 'zod';

import { hashRequest, withIdempotency } from '../core/db/idempotency.js';
import { ForbiddenError, RateLimitError, UnauthorizedError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { clientIp, createRateLimiter } from '../core/rate-limit.js';
import { fingerprint, linkKey } from '../modules/orders/index.js';

const KEY = /^[A-Za-z0-9_-]{16,64}$/;
const SESSION = /^[A-Za-z0-9_-]{20,100}$/;
const Name = z.string().trim().min(1).max(60);
const CreateBody = z.strictObject({
  priceToken: z.string().min(10).max(4096),
  rooms: z
    .array(z.strictObject({ leadGuest: Name, guests: z.array(Name).max(8).optional() }))
    .min(1)
    .max(9),
  contact: z.strictObject({ name: Name, email: z.string().trim().max(254), phone: z.string().trim().max(20) }),
  specialRequests: z.string().trim().max(500).nullish(),
  confirmDuplicate: z.boolean().optional(),
});
const Ref = z.strictObject({ ref: z.string().min(5).max(32) });
/** Per-IP limits on the calls that take rooms or start payments (plan §3.7), per hour. */
export const ORDER_RATE_LIMITS = Object.freeze({ create: 20, pay: 30 });

/**
 * @param {import('../core/clock.js').Clock} clock
 * @param {'create' | 'pay'} what
 * @returns {import('express').RequestHandler}
 */
function perIpLimit(clock, what) {
  const limiter = createRateLimiter({ name: `orders-${what}-ip`, points: ORDER_RATE_LIMITS[what], windowMs: 60 * 60_000, clock });
  return (req, res, next) => {
    limiter.consume(clientIp(req)).then((r) => {
      res.set({ 'RateLimit-Limit': String(r.limit), 'RateLimit-Remaining': String(r.remaining) });
      next(r.allowed ? undefined : new RateLimitError(r.retryAfterSeconds));
    }, next);
  };
}

const LinkQuery = z.strictObject({
  key: z
    .string()
    .regex(/^[A-Za-z0-9_-]{16,64}$/)
    .optional(),
});

/**
 * Who is buying: a signed-in website customer or a guest with a browser session id.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function buyerOf(req, res) {
  const { actor } = contextOf(res);
  if (actor.type === 'customer')
    return {
      buyer: { clientOrgId: null, customerId: actor.customerId, guestKey: null },
      scope: `customer:${actor.customerId}`,
      createdBy: `customer:${actor.customerId}`,
    };
  if (actor.type === 'anonymous') {
    const session = req.get('x-guest-session') ?? '';
    if (!SESSION.test(session)) throw new UnauthorizedError('GUEST_SESSION_REQUIRED');
    const guestKey = fingerprint(session);
    return { buyer: { clientOrgId: null, customerId: null, guestKey }, scope: `guest:${guestKey}`, createdBy: 'guest' };
  }
  throw new ForbiddenError(actor.type === 'member' ? 'USE_BOOKING_REQUESTS' : 'NOT_A_BUYER');
}

/**
 * The caller as an order viewer (signed-in customer, guest session, or the order link key).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {string} linkSecret
 */
function viewerOf(req, res, linkSecret) {
  const { actor } = contextOf(res);
  return {
    customerId: actor.type === 'customer' ? actor.customerId : null,
    guestKey: req.get('x-guest-session') ?? null,
    accessKey: typeof req.query.key === 'string' ? req.query.key : null,
    linkSecret,
  };
}

/** The buyer's documents. @param {import('express').Router} router @param {Parameters<typeof orderRoutes>[0]} deps */
function documentRoutes(router, deps) {
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  router.get('/orders/:ref/documents', publicRoute(), validate({ params: Ref, query: LinkQuery }), (req, res, next) => {
    (async () => {
      const order = await deps.orders.read(res.locals.input.params.ref, viewerOf(req, res, deps.linkSecret));
      noStore(res).json({ data: await deps.documents.list(String(order._id)) });
    })().catch(next);
  });
  router.get(
    '/orders/:ref/documents/:id',
    publicRoute(),
    validate({ params: Ref.extend({ id: z.string().regex(/^[a-f0-9]{24}$/) }), query: LinkQuery }),
    (req, res, next) => {
      (async () => {
        const order = await deps.orders.read(res.locals.input.params.ref, viewerOf(req, res, deps.linkSecret));
        const doc = await deps.documents.read(String(order._id), res.locals.input.params.id);
        noStore(res)
          .set('Content-Type', 'text/html; charset=utf-8')
          .set(
            'Content-Security-Policy',
            "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
          )
          .set('X-Content-Type-Options', 'nosniff')
          .send(doc.html);
      })().catch(next);
    },
  );
}

/** POST /orders. @param {import('express').Router} router @param {Parameters<typeof orderRoutes>[0]} deps */
function createRoute(router, deps) {
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  router.post(
    '/orders',
    publicRoute(),
    perIpLimit(deps.clock, 'create'),
    validate({ body: CreateBody }),
    deps.gate('hotel.order', 'heavy'),
    (req, res, next) => {
      (async () => {
        const key = req.get('idempotency-key') ?? '';
        if (!KEY.test(key)) throw new ValidationError({ problems: [{ field: 'Idempotency-Key', code: 'REQUIRED' }] });
        const who = buyerOf(req, res);
        const body = res.locals.input.body;
        const r = await withIdempotency(
          { scope: who.scope, key, requestHash: hashRequest({ method: 'POST', path: '/orders', body }), clock: deps.clock },
          async () => {
            const order = await deps.orders.create(contextOf(res), {
              channel: 'WEBSITE',
              buyer: who.buyer,
              createdBy: who.createdBy,
              idempotency: { scope: who.scope, key },
              ip: clientIp(req),
              paymentMode: 'GATEWAY',
              contact: body.contact,
              confirmDuplicate: body.confirmDuplicate,
              item: {
                type: 'HOTEL',
                input: {
                  caller: res.locals.searchCaller,
                  priceToken: body.priceToken,
                  rooms: body.rooms,
                  specialRequests: body.specialRequests,
                },
              },
            });
            return { statusCode: 201, body: { ...(await deps.view(order)), linkKey: linkKey(deps.linkSecret, order.ref) } };
          },
        );
        noStore(res).status(r.statusCode).set('Idempotent-Replayed', String(r.replayed)).json(r.body);
      })().catch(next);
    },
  );
}

/**
 * @param {{
 *   gate: ReturnType<typeof import('./search-gateway.js').createSearchGate>,
 *   orders: ReturnType<typeof import('../modules/orders/index.js').createOrderService>,
 *   payments: ReturnType<typeof import('../modules/orders/index.js').createOrderPayments>,
 *   documents: { list: (orderId: string) => Promise<unknown[]>, read: (orderId: string, id: string) => Promise<{ html: string }> },
 *   publicUrl: string,
 *   view: (order: Record<string, any>) => Promise<Record<string, unknown>>,
 *   linkSecret: string,
 *   clock: import('../core/clock.js').Clock,
 * }} deps
 */
export function orderRoutes(deps) {
  const router = express.Router();
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  createRoute(router, deps);
  router.get('/orders/:ref', publicRoute(), validate({ params: Ref, query: LinkQuery }), (req, res, next) => {
    (async () => {
      const order = await deps.orders.read(res.locals.input.params.ref, viewerOf(req, res, deps.linkSecret));
      noStore(res).json(await deps.view(order));
    })().catch(next);
  });
  router.post(
    '/orders/:ref/payments',
    publicRoute(),
    perIpLimit(deps.clock, 'pay'),
    validate({ params: Ref, query: LinkQuery, body: z.strictObject({}) }),
    (req, res, next) => {
      (async () => {
        const key = req.get('idempotency-key') ?? '';
        if (!KEY.test(key)) throw new ValidationError({ problems: [{ field: 'Idempotency-Key', code: 'REQUIRED' }] });
        const order = await deps.orders.read(res.locals.input.params.ref, viewerOf(req, res, deps.linkSecret));
        const link = linkKey(deps.linkSecret, order.ref);
        const r = await withIdempotency(
          {
            scope: `order:${order.ref}`,
            key,
            requestHash: hashRequest({ method: 'POST', path: `/orders/${order.ref}/payments` }),
            clock: deps.clock,
          },
          async () => ({
            statusCode: 201,
            body: await deps.payments.start(contextOf(res), order, {
              returnUrl: `${deps.publicUrl}/hotels/booking/${order.ref}?key=${link}`,
            }),
          }),
        );
        noStore(res).status(r.statusCode).json(r.body);
      })().catch(next);
    },
  );
  router.post(
    '/orders/:ref/extend-hold',
    publicRoute(),
    validate({ params: Ref, query: LinkQuery, body: z.strictObject({}) }),
    (req, res, next) => {
      (async () => {
        const order = await deps.orders.read(res.locals.input.params.ref, viewerOf(req, res, deps.linkSecret));
        noStore(res).json(await deps.view(await deps.payments.extend(contextOf(res), order)));
      })().catch(next);
    },
  );
  documentRoutes(router, deps);
  return router;
}
