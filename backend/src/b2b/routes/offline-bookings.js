// @ts-check
/**
 * Offline bookings (plan Stage 12 §3.10): MusafirBaba books for a B2B client who asked by phone or email — the same
 * engine, rooms and price rules as the client's own booking, paid from the client's wallet / credit:
 *   POST /admin/offline-bookings/offers  (`orders.offline.book`) {clientOrgId, hotelRef, stay} → the client's own B2B prices
 *   POST /admin/offline-bookings         (`orders.offline.book`) Idempotency-Key; {clientOrgId, priceToken, rooms,
 *                                        contact, customerReference, note} → order (channel ADMIN, by the staff member)
 *                                        held, then paid from the client's wallet → confirmed (or the reason it wasn't)
 *   GET  /admin/offline-bookings         (`orders.offline.book`) the latest ones
 * Every booking records who made it and why (order history), and the client is told (bell + email to its owners).
 */
import express from 'express';
import { z } from 'zod';

import { newEvent } from '../core/db/events.js';
import { hashRequest, withIdempotency } from '../core/db/idempotency.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { CLIENT_ORDER_LIMITS, EVENTS as ORDER_EVENTS, ORDERS, OrderRecord, PERMISSIONS as ORD } from '../modules/orders/index.js';

const KEY = /^[A-Za-z0-9_-]{16,64}$/;
const Id = z.string().regex(/^[a-f0-9]{24}$/);
const Name = z.string().trim().min(1).max(60);
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Stay = z.strictObject({
  checkIn: Day,
  checkOut: Day,
  rooms: z
    .array(
      z.strictObject({ adults: z.number().int().min(1).max(8), childrenAges: z.array(z.number().int().min(0).max(17)).max(6).default([]) }),
    )
    .min(1)
    .max(9),
});

const OfflineBody = z.strictObject({
  clientOrgId: Id,
  priceToken: z.string().min(10).max(4096),
  rooms: z
    .array(z.strictObject({ leadGuest: Name, guests: z.array(Name).max(8).optional() }))
    .min(1)
    .max(9),
  contact: z.strictObject({ name: Name, email: z.string().trim().max(254), phone: z.string().trim().max(20) }),
  customerReference: z.string().trim().max(60).nullish(),
  specialRequests: z.string().trim().max(500).nullish(),
  note: z.string().trim().min(5).max(500), // why / how the client asked — kept on the order
});

/** @param {import('express').Response} res */
function staff(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
}

/**
 * @param {{
 *   offers: ReturnType<typeof import('../modules/hotel-search/index.js').createOffersService>,
 *   orgInfo: (orgId: string) => Promise<{ type: string, status: string, clientCategory?: string | null } | null>,
 *   orders: ReturnType<typeof import('../modules/orders/index.js').createOrderService>,
 *   payments: ReturnType<typeof import('../modules/orders/index.js').createOrderPayments>,
 *   view: (order: Record<string, any>) => Promise<Record<string, unknown>>,
 *   clock: import('../core/clock.js').Clock,
 * }} deps
 */
export function offlineBookingRoutes(deps) {
  const router = express.Router();
  const can = requirePermission(ORD.offlineBook);
  /** The client as a search caller (its own prices). @param {string} clientOrgId */
  const callerFor = async (clientOrgId) => {
    const org = await deps.orgInfo(clientOrgId);
    if (!org || org.type !== 'CLIENT') throw new NotFoundError('CLIENT_NOT_FOUND');
    if (org.status !== 'ACTIVE') throw new ForbiddenError('ORG_NOT_ACTIVE');
    return { channel: 'B2B_PORTAL', catalogChannel: 'B2B', clientOrgId, clientCategory: org.clientCategory ?? null, customerId: null };
  };
  router.post(
    '/admin/offline-bookings/offers',
    can,
    validate({ body: z.strictObject({ clientOrgId: Id, hotelRef: z.string().min(3).max(120), stay: Stay }) }),
    (_req, res, next) => {
      const b = res.locals.input.body;
      callerFor(b.clientOrgId)
        .then((caller) => deps.offers.offers(/** @type {any} */ (caller), b.hotelRef, b.stay))
        .then((r) => res.set('Cache-Control', 'private, no-store').json(r), next);
    },
  );
  router.get('/admin/offline-bookings', can, (_req, res, next) => {
    OrderRecord.find({ channel: 'ADMIN' })
      .setOptions(ORDERS)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .then(
        (rows) =>
          res.json({
            data: rows.map((o) => ({
              ref: o.ref,
              clientOrgId: o.clientOrgId,
              status: o.status,
              totalPaise: o.totalPaise,
              createdBy: o.createdBy,
              createdAt: o.createdAt,
              customerReference: o.customerReference ?? null,
            })),
          }),
        next,
      );
  });
  bookRoute(router, deps, callerFor);
  return router;
}

/**
 * @param {import('express').Router} router
 * @param {Parameters<typeof offlineBookingRoutes>[0]} deps
 * @param {(clientOrgId: string) => Promise<Record<string, unknown>>} callerFor
 */
function bookRoute(router, deps, callerFor) {
  router.post('/admin/offline-bookings', requirePermission(ORD.offlineBook), validate({ body: OfflineBody }), (req, res, next) => {
    (async () => {
      const key = req.get('idempotency-key') ?? '';
      if (!KEY.test(key)) throw new ValidationError({ problems: [{ field: 'Idempotency-Key', code: 'REQUIRED' }] });
      const by = staff(res);
      const b = res.locals.input.body;
      const caller = await callerFor(b.clientOrgId);
      const scope = `offline:${b.clientOrgId}`;
      const r = await withIdempotency(
        { scope, key, requestHash: hashRequest({ method: 'POST', path: '/admin/offline-bookings', body: b }), clock: deps.clock },
        async () => {
          const ctx = contextOf(res);
          const order = await deps.orders.create(ctx, {
            channel: 'ADMIN',
            buyer: { clientOrgId: b.clientOrgId, customerId: null, guestKey: null },
            createdBy: by,
            customerReference: b.customerReference ?? null,
            idempotency: { scope, key },
            ip: null,
            paymentMode: 'WALLET',
            limits: CLIENT_ORDER_LIMITS,
            contact: b.contact,
            confirmDuplicate: true,
            item: { type: 'HOTEL', input: { caller, priceToken: b.priceToken, rooms: b.rooms, specialRequests: b.specialRequests } },
          });
          await OrderRecord.updateOne(
            { _id: order._id },
            { $push: { history: { at: deps.clock.now(), status: order.status, by, note: `offline booking: ${b.note}`.slice(0, 500) } } },
          ).setOptions(ORDERS);
          let paid = null;
          if (order.status === 'AWAITING_PAYMENT')
            paid = await deps.payments
              .start(ctx, order, { returnUrl: '', mode: 'WALLET' })
              .catch((e) => ({ error: /** @type {any} */ (e)?.code ?? 'PAYMENT_FAILED' }));
          const event = newEvent(
            ORDER_EVENTS.orderBookedOffline,
            { orgId: b.clientOrgId, orderId: String(order._id), ref: order.ref },
            deps,
          );
          await OrderRecord.updateOne({ _id: order._id }, { $set: { hasPendingEvents: true }, $push: { pendingEvents: event } }).setOptions(
            ORDERS,
          );
          const now = /** @type {Record<string, any>} */ (await OrderRecord.findOne({ _id: order._id }).setOptions(ORDERS).lean());
          return { statusCode: 201, body: { order: await deps.view(now), payment: paid } };
        },
      );
      res.set('Cache-Control', 'private, no-store').status(r.statusCode).json(r.body);
    })().catch(next);
  });
}
