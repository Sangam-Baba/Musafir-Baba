// @ts-check
/**
 * Website customers' hotel bookings (plan Stage 09 §3.2–3.3, §5) — owner, 21 Nov 2026: shown on a new website page,
 * the existing bookings page is not touched.
 *   GET /bookings/hotels        the signed-in customer's bookings (existing website login), or this browser's (guest id)
 *   GET /bookings/hotels/:ref   one booking (MBH-…): the buyer only — signed-in customer, same guest id, or the order
 *                               link key (`?key=`); others 404. Terms with deadlines, payments, refunds, documents.
 *   POST /bookings/hotels/:ref/cancellation-quote   the buyer: charge and refund now, signed, valid 5 minutes
 * Public routes (guests have no login); every read is checked against the order's buyer.
 */
import express from 'express';
import { z } from 'zod';

import { UnauthorizedError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { fingerprint } from '../modules/orders/index.js';

const Ref = z.strictObject({ ref: z.string().min(5).max(32) });
const KeyQuery = z.strictObject({
  key: z
    .string()
    .regex(/^[A-Za-z0-9_-]{16,64}$/)
    .optional(),
});
const SESSION = /^[A-Za-z0-9_-]{20,100}$/;

/** @param {Record<string, any>} r a summary row */
const listRow = (r) => ({
  bookingRef: r.bookingRef,
  orderRef: r.orderRef,
  propertyName: r.propertyName,
  destination: r.destination,
  leadGuest: r.leadGuest,
  checkIn: r.checkIn,
  checkOut: r.checkOut,
  bookingStatus: r.bookingStatus,
  orderStatus: r.orderStatus,
  paymentState: r.paymentState,
  totalPaise: r.totalPaise,
  refundedPaise: r.refundedPaise,
  orderCreatedAt: r.orderCreatedAt,
});

/**
 * The booking and its order, if the caller is the buyer (signed-in customer, same guest id, or the order link key) —
 * otherwise 404, so a booking's existence isn't revealed.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {Parameters<typeof customerBookingRoutes>[0]} deps
 */
async function ownBooking(req, res, deps) {
  const { actor } = contextOf(res);
  const d = await deps.bookings.detail(res.locals.input.params.ref);
  const order = await deps.orders.read(d.orderRef, {
    customerId: actor.type === 'customer' ? actor.customerId : null,
    guestKey: req.get('x-guest-session') ?? null,
    accessKey: res.locals.input.query.key ?? null,
    linkSecret: deps.linkSecret,
  });
  return { d, order };
}

/**
 * @param {{
 *   summaries: ReturnType<typeof import('../modules/reporting/index.js').createBookingSummaries>,
 *   bookings: ReturnType<typeof import('../modules/hotel-booking/index.js').createCustomerBookings>,
 *   orders: ReturnType<typeof import('../modules/orders/index.js').createOrderService>,
 *   money: (orderId: string) => Promise<{ payments: unknown[], refunds: unknown[] }>,
 *   documents: { list: (orderId: string) => Promise<unknown[]> },
 *   linkSecret: string,
 * }} deps
 */
export function customerBookingRoutes(deps) {
  const router = express.Router();
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  router.get('/bookings/hotels', publicRoute(), (req, res, next) => {
    (async () => {
      const { actor } = contextOf(res);
      const session = req.get('x-guest-session') ?? '';
      if (actor.type !== 'customer' && !SESSION.test(session)) throw new UnauthorizedError('SIGN_IN_OR_GUEST_SESSION_REQUIRED');
      const rows = await deps.summaries.forBuyer(
        actor.type === 'customer' ? { customerId: actor.customerId } : { guestKey: fingerprint(session) },
      );
      noStore(res).json({ data: rows.map(listRow) });
    })().catch(next);
  });
  router.get('/bookings/hotels/:ref', publicRoute(), validate({ params: Ref, query: KeyQuery }), (req, res, next) => {
    (async () => {
      const { d, order } = await ownBooking(req, res, deps);
      const money = await deps.money(String(order._id));
      noStore(res).json({
        booking: d.booking,
        terms: d.terms,
        order: {
          ref: order.ref,
          status: order.status,
          totalPaise: order.totalPaise,
          gstPaise: order.gstPaise,
          createdAt: order.createdAt,
          confirmedAt: order.confirmedAt ?? null,
        },
        ...money,
        documents: await deps.documents.list(String(order._id)),
      });
    })().catch(next);
  });
  router.post(
    '/bookings/hotels/:ref/cancellation-quote',
    publicRoute(),
    validate({ params: Ref, query: KeyQuery, body: z.strictObject({}) }),
    (req, res, next) => {
      (async () => {
        await ownBooking(req, res, deps);
        noStore(res).json(await deps.bookings.quote(res.locals.input.params.ref, deps.linkSecret));
      })().catch(next);
    },
  );
  return router;
}
