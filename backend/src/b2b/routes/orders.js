// @ts-check
/**
 * Website orders (plan Stage 08 §5). Signed-in website customers and **guests** (no account) book:
 *   POST /orders            Idempotency-Key required; guests also send X-Guest-Session (their browser's random id)
 *                           {priceToken, rooms: [{leadGuest, guests}], contact, specialRequests, confirmDuplicate}
 *                           → 201 the order (rooms held 15 min) + its private link key
 *   GET  /orders/:ref       the buyer only: signed-in customer, the same guest session, or the link key (`?key=`)
 * Both are public routes (guests have no login); the search gateway limits them per IP, and every read is checked
 * against the order's owner — anyone else gets 404. B2B members use booking requests until Stage 12 part B.
 */
import express from 'express';
import { z } from 'zod';

import { hashRequest, withIdempotency } from '../core/db/idempotency.js';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { clientIp } from '../core/rate-limit.js';
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
 * @param {{
 *   gate: ReturnType<typeof import('./search-gateway.js').createSearchGate>,
 *   orders: ReturnType<typeof import('../modules/orders/index.js').createOrderService>,
 *   view: (order: Record<string, any>) => Promise<Record<string, unknown>>,
 *   linkSecret: string,
 *   clock: import('../core/clock.js').Clock,
 * }} deps
 */
export function orderRoutes(deps) {
  const router = express.Router();
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  router.post('/orders', publicRoute(), validate({ body: CreateBody }), deps.gate('hotel.order', 'heavy'), (req, res, next) => {
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
  });
  router.get('/orders/:ref', publicRoute(), validate({ params: Ref, query: LinkQuery }), (req, res, next) => {
    (async () => {
      const { actor } = contextOf(res);
      const order = await deps.orders.read(res.locals.input.params.ref, {
        customerId: actor.type === 'customer' ? actor.customerId : null,
        guestKey: req.get('x-guest-session') ?? null,
        accessKey: res.locals.input.query.key ?? null,
        linkSecret: deps.linkSecret,
      });
      noStore(res).json(await deps.view(order));
    })().catch(next);
  });
  return router;
}
