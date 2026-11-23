// @ts-check
/**
 * MusafirBaba admin: change requests (plan Stage 09 §3.5, §3.11).
 *   GET  /admin/amendments?status            (`hotel-booking.admin.read`) — open ones, oldest due first
 *   GET  /admin/amendments/:id               (`hotel-booking.admin.read`)
 *   POST /admin/amendments/:id/messages      (`hotel-booking.admin.handle`) {text, waitForCustomer}
 *   POST /admin/amendments/:id/close         (`hotel-booking.admin.handle`) {status: RESOLVED | CLOSED, resolution}
 *   POST /admin/amendments/:id/apply-guest-names (`hotel-booking.admin.handle`) — the requested lead guest names
 *   GET  /admin/no-show-disputes             (`hotel-booking.admin.read`) · POST /admin/no-shows/:id/resolve {decision, note} (`…handle`)
 *   GET  /admin/hotel-failures?status        (`hotel-booking.admin.read`)
 *   GET  /admin/cancellations                (`hotel-booking.admin.read`) — the latest cancellations
 *   POST /admin/bookings/:ref/hotel-failed   (`hotel-booking.admin.handle`) {reason} — reported by MusafirBaba
 *   POST /admin/hotel-failures/:id/resolve   (`hotel-booking.admin.handle`) {action: REFUND | RELOCATE, note, alternativeRef}
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { AMENDMENT_STATUSES, PERMISSIONS as HBK, recentCancellations } from '../modules/hotel-booking/index.js';

const Id = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });

/** @param {import('express').Response} res */
function staff(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
}
/** @param {(req: import('express').Request, res: import('express').Response) => Promise<unknown>} fn */
const handle = (fn) =>
  /** @type {import('express').RequestHandler} */ (
    (req, res, next) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .then((body) => res.set('Cache-Control', 'private, no-store').json(body), next);
    }
  );

/**
 * @param {{ amendments: ReturnType<typeof import('../modules/hotel-booking/index.js').createAmendments>, noShows: ReturnType<typeof import('../modules/hotel-booking/index.js').createNoShows>,
 *   failures: ReturnType<typeof import('../modules/hotel-booking/index.js').createHotelFailures>,
 *   settleFailure: (orderId: string, bookingId: string, action: 'REFUND' | 'RELOCATE') => Promise<void> }} deps */
export function amendmentAdminRoutes(deps) {
  const router = express.Router();
  const read = requirePermission(HBK.adminRead);
  const act = requirePermission(HBK.adminHandle);
  router.get(
    '/admin/amendments',
    read,
    validate({ query: z.strictObject({ status: z.enum(AMENDMENT_STATUSES).optional() }) }),
    handle(async (_q, res) => ({ data: await deps.amendments.queue(res.locals.input.query) })),
  );
  router.get(
    '/admin/amendments/:id',
    read,
    validate({ params: Id }),
    handle(async (_q, res) => deps.amendments.read(res.locals.input.params.id)),
  );
  router.post(
    '/admin/amendments/:id/messages',
    act,
    validate({
      params: Id,
      body: z.strictObject({ text: z.string().trim().min(2).max(2000), waitForCustomer: z.boolean().default(false) }),
    }),
    handle(async (_q, res) => deps.amendments.staffReply(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
  router.post(
    '/admin/amendments/:id/close',
    act,
    validate({
      params: Id,
      body: z.strictObject({ status: z.enum(['RESOLVED', 'CLOSED']), resolution: z.string().trim().min(3).max(1000) }),
    }),
    handle(async (_q, res) => deps.amendments.close(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
  router.post(
    '/admin/amendments/:id/apply-guest-names',
    act,
    validate({ params: Id, body: z.strictObject({}) }),
    handle(async (_q, res) => deps.amendments.applyGuestNames(staff(res), res.locals.input.params.id)),
  );
  router.get(
    '/admin/cancellations',
    read,
    handle(async () => ({ data: await recentCancellations() })),
  );
  router.get(
    '/admin/no-show-disputes',
    read,
    handle(async () => ({ data: await deps.noShows.disputes() })),
  );
  router.post(
    '/admin/no-shows/:id/resolve',
    act,
    validate({ params: Id, body: z.strictObject({ decision: z.enum(['UPHOLD', 'REVERSE']), note: z.string().trim().min(3).max(500) }) }),
    handle(async (_q, res) => deps.noShows.resolve(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
  hotelFailureRoutes(router, deps, { read, act });
  return router;
}

/**
 * @param {import('express').Router} router
 * @param {Parameters<typeof amendmentAdminRoutes>[0]} deps
 * @param {{ read: import('express').RequestHandler, act: import('express').RequestHandler }} guards
 */
function hotelFailureRoutes(router, deps, { read, act }) {
  const Ref = z.strictObject({ ref: z.string().min(5).max(32) });
  router.get(
    '/admin/hotel-failures',
    read,
    validate({ query: z.strictObject({ status: z.enum(['OPEN', 'REFUNDED', 'RELOCATED']).optional() }) }),
    handle(async (_q, res) => ({ data: await deps.failures.list(res.locals.input.query) })),
  );
  router.post(
    '/admin/bookings/:ref/hotel-failed',
    act,
    validate({ params: Ref, body: z.strictObject({ reason: z.string().trim().min(5).max(500) }) }),
    handle(async (_q, res) => deps.failures.report(contextOf(res), res.locals.input.params.ref, res.locals.input.body.reason)),
  );
  router.post(
    '/admin/hotel-failures/:id/resolve',
    act,
    validate({
      params: Id,
      body: z.strictObject({
        action: z.enum(['REFUND', 'RELOCATE']),
        note: z.string().trim().min(3).max(500),
        alternativeRef: z.string().trim().max(60).nullish(),
      }),
    }),
    handle(async (_q, res) => {
      const f = await deps.failures.resolve(staff(res), res.locals.input.params.id, res.locals.input.body);
      const full = /** @type {any} */ ((await deps.failures.dueToSettle()).find((x) => String(x._id) === f.id));
      let settled = false;
      if (full)
        settled = await deps
          .settleFailure(full.orderId, full.bookingId, res.locals.input.body.action)
          .then(() => deps.failures.markSettled(f.id))
          .then(
            () => true,
            () => false, // the decision stands; the 10-minute job moves the money
          );
      return { ...f, settled };
    }),
  );
}
