// @ts-check
/**
 * Booking requests (D37) — B2B clients ask, MusafirBaba arranges the stay offline. No rooms taken, no money moved.
 * Client:  POST /booking-requests {priceToken, customer, notes}   (`hotel-booking.request.create` + search access)
 *          GET  /booking-requests?status · GET /booking-requests/:id   (`hotel-booking.request.read`)
 *          POST /booking-requests/:id/cancel   `If-Match`              (`hotel-booking.request.create`)
 * Admin:   GET  /admin/booking-requests?status · GET /admin/booking-requests/:id   (`hotel-booking.admin.read`)
 *          POST /admin/booking-requests/:id/take | /confirm | /decline   `If-Match` (`hotel-booking.admin.handle`)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as HBK, REQUEST_STATUSES } from '../modules/hotel-booking/index.js';
import { versionOf } from './inventory-http.js';

const Id = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });
const Status = z.strictObject({ status: z.enum(REQUEST_STATUSES).optional() });
const CreateBody = z.strictObject({
  priceToken: z.string().min(10).max(4096),
  customer: z.strictObject({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().max(20).nullish(),
    email: z.string().trim().email().max(254).nullish(),
    reference: z.string().trim().max(60).nullish(),
    guestNames: z.array(z.string().trim().min(1).max(120)).max(40).optional(),
  }),
  notes: z.string().trim().max(1000).nullish(),
});
const ActBody = z.strictObject({ note: z.string().trim().max(500).nullish(), hotelConfirmation: z.string().trim().max(60).nullish() });

/** @param {import('express').Response} res */
function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return { staffId: actor.staffId };
}

/**
 * @param {{ gate: ReturnType<typeof import('./search-gateway.js').createSearchGate>,
 *   requests: ReturnType<typeof import('../modules/hotel-booking/index.js').createBookingRequestService> }} deps
 */
export function bookingRequestRoutes({ gate, requests }) {
  const router = express.Router();
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  router.post(
    '/booking-requests',
    requirePermission(HBK.requestCreate),
    validate({ body: CreateBody }),
    gate('hotel.request', 'heavy'),
    (_req, res, next) => {
      requests.create(contextOf(res), res.locals.searchCaller, res.locals.input.body).then((r) => res.status(201).json(r), next);
    },
  );
  router.get('/booking-requests', requirePermission(HBK.requestRead), validate({ query: Status }), (_req, res, next) => {
    requests.list(contextOf(res), res.locals.input.query).then((data) => noStore(res).json({ data }), next);
  });
  router.get('/booking-requests/:id', requirePermission(HBK.requestRead), validate({ params: Id }), (_req, res, next) => {
    requests.get(contextOf(res), res.locals.input.params.id).then((r) => noStore(res).json(r), next);
  });
  router.post(
    '/booking-requests/:id/cancel',
    requirePermission(HBK.requestCreate),
    validate({ params: Id, body: z.strictObject({}) }),
    (req, res, next) => {
      Promise.resolve()
        .then(() => requests.cancel(contextOf(res), res.locals.input.params.id, versionOf(req)))
        .then((r) => res.json(r), next);
    },
  );
  router.get('/admin/booking-requests', requirePermission(HBK.adminRead), validate({ query: Status }), (_req, res, next) => {
    requests.adminList(res.locals.input.query).then((data) => noStore(res).json({ data }), next);
  });
  router.get('/admin/booking-requests/:id', requirePermission(HBK.adminRead), validate({ params: Id }), (_req, res, next) => {
    requests.adminGet(res.locals.input.params.id).then((r) => noStore(res).json(r), next);
  });
  for (const action of /** @type {const} */ (['take', 'confirm', 'decline'])) {
    router.post(
      `/admin/booking-requests/:id/${action}`,
      requirePermission(HBK.adminHandle),
      validate({ params: Id, body: ActBody }),
      (req, res, next) => {
        Promise.resolve()
          .then(() =>
            requests.adminAct(staffOf(res), res.locals.input.params.id, { action, version: versionOf(req), ...res.locals.input.body }),
          )
          .then((r) => res.json(r), next);
      },
    );
  }
  return router;
}
