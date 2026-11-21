// @ts-check
/**
 * MusafirBaba admin: change requests (plan Stage 09 §3.5, §3.11).
 *   GET  /admin/amendments?status            (`hotel-booking.admin.read`) — open ones, oldest due first
 *   GET  /admin/amendments/:id               (`hotel-booking.admin.read`)
 *   POST /admin/amendments/:id/messages      (`hotel-booking.admin.handle`) {text, waitForCustomer}
 *   POST /admin/amendments/:id/close         (`hotel-booking.admin.handle`) {status: RESOLVED | CLOSED, resolution}
 *   POST /admin/amendments/:id/apply-guest-names (`hotel-booking.admin.handle`) — the requested lead guest names
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { AMENDMENT_STATUSES, PERMISSIONS as HBK } from '../modules/hotel-booking/index.js';

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

/** @param {{ amendments: ReturnType<typeof import('../modules/hotel-booking/index.js').createAmendments> }} deps */
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
  return router;
}
