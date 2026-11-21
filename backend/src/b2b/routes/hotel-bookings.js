// @ts-check
/**
 * The hotel's bookings (plan Stage 08 §5):
 *   GET  /hotel/bookings?view=arrivals|departures|upcoming|cancellations|no-shows|waiting|all&date&propertyId
 *                                                  (`hotel-booking.booking.read`) — own properties only
 *   GET  /hotel/bookings/:ref                      (`hotel-booking.booking.read`)
 *   POST /hotel/bookings/:ref/acknowledge          (`hotel-booking.booking.acknowledge`) — stops the reminders
 *   POST /hotel/bookings/:ref/no-show              (`hotel-booking.booking.markNoShow`) — from 12:00 on the check-in day
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as HBK } from '../modules/hotel-booking/index.js';

const Ref = z.strictObject({ ref: z.string().min(5).max(32) });
const ListQuery = z.strictObject({
  propertyId: z
    .string()
    .regex(/^[a-f0-9]{24}$/)
    .optional(),
  waiting: z.enum(['true', 'false']).optional(),
  view: z.enum(['all', 'waiting', 'arrivals', 'departures', 'upcoming', 'cancellations', 'no-shows']).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** @param {{ bookings: ReturnType<typeof import('../modules/hotel-booking/index.js').createHotelBookingsService>, noShows: ReturnType<typeof import('../modules/hotel-booking/index.js').createNoShows> }} deps */
export function hotelBookingRoutes(deps) {
  const router = express.Router();
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  router.get('/hotel/bookings', requirePermission(HBK.bookingRead), validate({ query: ListQuery }), (_req, res, next) => {
    const q = res.locals.input.query;
    deps.bookings
      .list(contextOf(res), { propertyId: q.propertyId, waiting: q.waiting === 'true', view: q.view, date: q.date })
      .then((data) => noStore(res).json({ data }), next);
  });
  router.get('/hotel/bookings/:ref', requirePermission(HBK.bookingRead), validate({ params: Ref }), (_req, res, next) => {
    deps.bookings.read(contextOf(res), res.locals.input.params.ref).then((b) => noStore(res).json(b), next);
  });
  router.post(
    '/hotel/bookings/:ref/acknowledge',
    requirePermission(HBK.bookingAcknowledge),
    validate({ params: Ref, body: z.strictObject({}) }),
    (_req, res, next) => {
      deps.bookings.acknowledge(contextOf(res), res.locals.input.params.ref).then((b) => noStore(res).json(b), next);
    },
  );
  router.post(
    '/hotel/bookings/:ref/no-show',
    requirePermission(HBK.bookingMarkNoShow),
    validate({ params: Ref, body: z.strictObject({}) }),
    (_req, res, next) => {
      deps.noShows.mark(contextOf(res), res.locals.input.params.ref).then((n) => noStore(res).status(201).json(n), next);
    },
  );
  return router;
}
