// @ts-check
/**
 * The hotel's bookings (plan Stage 08 §5):
 *   GET  /hotel/bookings?propertyId&waiting=true   (`hotel-booking.booking.read`) — own properties only
 *   GET  /hotel/bookings/:ref                      (`hotel-booking.booking.read`)
 *   POST /hotel/bookings/:ref/acknowledge          (`hotel-booking.booking.acknowledge`) — stops the reminders
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
});

/** @param {{ bookings: ReturnType<typeof import('../modules/hotel-booking/index.js').createHotelBookingsService> }} deps */
export function hotelBookingRoutes(deps) {
  const router = express.Router();
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  router.get('/hotel/bookings', requirePermission(HBK.bookingRead), validate({ query: ListQuery }), (_req, res, next) => {
    const q = res.locals.input.query;
    deps.bookings
      .list(contextOf(res), { propertyId: q.propertyId, waiting: q.waiting === 'true' })
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
  return router;
}
