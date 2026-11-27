// @ts-check
/**
 * B2B client orders (plan Stage 12 §3.4–3.5, §5) — the company's own orders through the same engine as the website:
 *   POST /client/orders              (`orders.order.create`) Idempotency-Key; {priceToken (B2B price from the dashboard),
 *                                    rooms, contact, specialRequests, customerReference, branchId, confirmDuplicate}
 *                                    → 201 the order (rooms held)
 *   GET  /client/orders/:ref         (`orders.order.read`) the company's order (branch / own limits apply)
 *   POST /client/orders/:ref/pay     (`orders.order.create`) Idempotency-Key; {method: WALLET | GATEWAY} → wallet: paid and
 *                                    confirmed at once; PayU: the form to post
 *   GET  /client/orders/:ref/documents[/:id] (`orders.order.read`) voucher, invoice, receipt
 * Branch-limited people book for (and see) their branches only; "own bookings only" people see what they booked.
 * Other companies' orders → 404.
 */
import express from 'express';
import { z } from 'zod';

import { hashRequest, withIdempotency } from '../core/db/idempotency.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { clientIp } from '../core/rate-limit.js';
import { CLIENT_ORDER_LIMITS, PERMISSIONS as ORD } from '../modules/orders/index.js';

const KEY = /^[A-Za-z0-9_-]{16,64}$/;
const Name = z.string().trim().min(1).max(60);
const Id = z.string().regex(/^[a-f0-9]{24}$/);
const CreateBody = z.strictObject({
  priceToken: z.string().min(10).max(4096),
  rooms: z
    .array(z.strictObject({ leadGuest: Name, guests: z.array(Name).max(8).optional() }))
    .min(1)
    .max(9),
  contact: z.strictObject({ name: Name, email: z.string().trim().max(254), phone: z.string().trim().max(20) }),
  specialRequests: z.string().trim().max(500).nullish(),
  customerReference: z.string().trim().max(60).nullish(),
  branchId: Id.nullish(),
  confirmDuplicate: z.boolean().optional(),
});
const Ref = z.strictObject({ ref: z.string().min(5).max(32) });

/** @param {import('express').Response} res */
export function member(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'CLIENT') throw new ForbiddenError();
  return { orgId: actor.orgId, userId: actor.userId, branchIds: actor.branchIds ?? [], ownOnly: actor.ownOnly === true };
}
/** @param {import('express').Response} res */
const noStore = (res) => res.set('Cache-Control', 'private, no-store');
/** @param {import('express').Request} req */
export function idemKey(req) {
  const key = req.get('idempotency-key') ?? '';
  if (!KEY.test(key)) throw new ValidationError({ problems: [{ field: 'Idempotency-Key', code: 'REQUIRED' }] });
  return key;
}

/** The branch an order is booked for: a branch-limited person's own (the first if not given). @param {ReturnType<typeof member>} m @param {string | null | undefined} asked */
export function branchFor(m, asked) {
  if (m.branchIds.length === 0) return asked ?? null;
  if (asked && !m.branchIds.includes(asked)) throw new ForbiddenError('BRANCH_NOT_ALLOWED');
  return asked ?? m.branchIds[0] ?? null;
}

/** May this member see the order? @param {ReturnType<typeof member>} m @param {Record<string, any>} o */
export const memberSees = (m, o) =>
  o.clientOrgId === m.orgId &&
  (!m.ownOnly || o.createdBy === `user:${m.userId}`) &&
  (m.branchIds.length === 0 || (o.branchId !== null && m.branchIds.includes(o.branchId)));

/**
 * @param {{
 *   gate: ReturnType<typeof import('./search-gateway.js').createSearchGate>,
 *   orders: ReturnType<typeof import('../modules/orders/index.js').createOrderService>,
 *   payments: ReturnType<typeof import('../modules/orders/index.js').createOrderPayments>,
 *   documents: { list: (orderId: string) => Promise<unknown[]>, read: (orderId: string, id: string) => Promise<{ html: string }> },
 *   view: (order: Record<string, any>) => Promise<Record<string, unknown>>,
 *   publicUrl: string,
 *   clock: import('../core/clock.js').Clock,
 * }} deps
 */
export function clientOrderRoutes(deps) {
  const router = express.Router();
  /** The company's order, or 404. @param {import('express').Response} res */
  const mine = async (res) => {
    const m = member(res);
    const o = await deps.orders.read(res.locals.input.params.ref, { clientOrgId: m.orgId });
    if (!memberSees(m, o)) throw new NotFoundError('ORDER_NOT_FOUND');
    return o;
  };
  createRoute(router, deps);
  router.get('/client/orders/:ref', requirePermission(ORD.orderRead), validate({ params: Ref }), (_req, res, next) => {
    mine(res).then(async (o) => noStore(res).json(await deps.view(o)), next);
  });
  router.post(
    '/client/orders/:ref/pay',
    requirePermission(ORD.orderCreate),
    validate({ params: Ref, body: z.strictObject({ method: z.enum(['WALLET', 'GATEWAY']) }) }),
    (req, res, next) => {
      (async () => {
        const key = idemKey(req);
        const o = await mine(res);
        const r = await withIdempotency(
          {
            scope: `order:${o.ref}`,
            key,
            requestHash: hashRequest({ method: 'POST', path: `/client/orders/${o.ref}/pay`, body: res.locals.input.body }),
            clock: deps.clock,
          },
          async () => ({
            statusCode: 201,
            body: await deps.payments.start(contextOf(res), o, {
              returnUrl: `${deps.publicUrl}/business/orders/${o.ref}`,
              mode: res.locals.input.body.method,
            }),
          }),
        );
        noStore(res).status(r.statusCode).json(r.body);
      })().catch(next);
    },
  );
  documentRoutes(router, deps, mine);
  return router;
}

/** POST /client/orders. @param {import('express').Router} router @param {Parameters<typeof clientOrderRoutes>[0]} deps */
function createRoute(router, deps) {
  router.post(
    '/client/orders',
    requirePermission(ORD.orderCreate),
    validate({ body: CreateBody }),
    deps.gate('hotel.order', 'heavy'),
    (req, res, next) => {
      (async () => {
        const key = idemKey(req);
        const m = member(res);
        const body = res.locals.input.body;
        const scope = `client:${m.orgId}`;
        const r = await withIdempotency(
          { scope, key, requestHash: hashRequest({ method: 'POST', path: '/client/orders', body }), clock: deps.clock },
          async () => {
            const order = await deps.orders.create(contextOf(res), {
              channel:
                contextOf(res).actor.type === 'member' && /** @type {any} */ (contextOf(res).actor).apiKeyId ? 'B2B_API' : 'B2B_PORTAL', // Stage 14: API keys
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
            return { statusCode: 201, body: await deps.view(order) };
          },
        );
        noStore(res).status(r.statusCode).set('Idempotent-Replayed', String(r.replayed)).json(r.body);
      })().catch(next);
    },
  );
}

/**
 * @param {import('express').Router} router
 * @param {Parameters<typeof clientOrderRoutes>[0]} deps
 * @param {(res: import('express').Response) => Promise<Record<string, any>>} mine
 */
function documentRoutes(router, deps, mine) {
  router.get('/client/orders/:ref/documents', requirePermission(ORD.orderRead), validate({ params: Ref }), (_req, res, next) => {
    mine(res).then(async (o) => noStore(res).json({ data: await deps.documents.list(String(o._id)) }), next);
  });
  router.get(
    '/client/orders/:ref/documents/:id',
    requirePermission(ORD.orderRead),
    validate({ params: Ref.extend({ id: Id }) }),
    (_req, res, next) => {
      (async () => {
        const o = await mine(res);
        const doc = await deps.documents.read(String(o._id), res.locals.input.params.id);
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
