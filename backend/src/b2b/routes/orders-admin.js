// @ts-check
/**
 * MusafirBaba admin: the order explorer (plan Stage 08 §3.11, §5).
 *   GET  /admin/orders?q&status&hotelOrgId&from&to       (`orders.admin.read`) — newest 100
 *   GET  /admin/orders/:ref                               (`orders.admin.read`) — everything + the timeline
 *   POST /admin/orders/:ref/actions {action, reason}      (`orders.admin.act`) — propose RELEASE / REFUND
 *   POST /admin/order-actions/:id/approve | /reject       (`orders.admin.act`, a different person)
 *   GET  /admin/hotel-ack                                 (`hotel-booking.admin.read`) — hotels not answering for 1 h
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as HBK } from '../modules/hotel-booking/index.js';
import { ADMIN_ACTIONS, ORDER_STATUSES, PERMISSIONS as ORD } from '../modules/orders/index.js';

const Ref = z.strictObject({ ref: z.string().min(5).max(32) });
const Id = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });
const DateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Search = z.strictObject({
  q: z.string().trim().max(80).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  hotelOrgId: z
    .string()
    .regex(/^[a-f0-9]{24}$/)
    .optional(),
  from: DateText.optional(),
  to: DateText.optional(),
});

/** @param {import('express').Response} res */
function staff(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
}
/** @param {(req: import('express').Request, res: import('express').Response) => Promise<unknown>} fn @param {number} [status] */
const handle = (fn, status = 200) =>
  /** @type {import('express').RequestHandler} */ (
    (req, res, next) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .then((body) => res.status(status).set('Cache-Control', 'private, no-store').json(body), next);
    }
  );

/**
 * @param {{
 *   admin: ReturnType<typeof import('../modules/orders/index.js').createOrderAdmin>,
 *   detail: (order: Record<string, any>) => Promise<Record<string, unknown>>,
 *   overdue: () => Promise<unknown[]>,
 * }} deps
 */
export function orderAdminRoutes(deps) {
  const router = express.Router();
  const read = requirePermission(ORD.adminRead);
  const act = requirePermission(ORD.adminAct);
  router.get(
    '/admin/orders',
    read,
    validate({ query: Search }),
    handle(async (_q, res) => ({ data: await deps.admin.search(res.locals.input.query) })),
  );
  router.get(
    '/admin/orders/:ref',
    read,
    validate({ params: Ref }),
    handle(async (_q, res) => deps.detail(await deps.admin.byRef(res.locals.input.params.ref))),
  );
  router.post(
    '/admin/orders/:ref/actions',
    act,
    validate({ params: Ref, body: z.strictObject({ action: z.enum(ADMIN_ACTIONS), reason: z.string().trim().min(5).max(500) }) }),
    handle(async (_q, res) => deps.admin.propose(staff(res), res.locals.input.params.ref, res.locals.input.body), 201),
  );
  for (const decision of /** @type {const} */ (['approve', 'reject']))
    router.post(
      `/admin/order-actions/:id/${decision}`,
      act,
      validate({ params: Id, body: z.strictObject({ note: z.string().trim().max(500).nullish() }) }),
      handle(async (_q, res) =>
        deps.admin.decide(staff(res), res.locals.input.params.id, {
          approve: decision === 'approve',
          note: res.locals.input.body.note ?? null,
        }),
      ),
    );
  router.get(
    '/admin/hotel-ack',
    requirePermission(HBK.adminRead),
    handle(async () => ({ data: await deps.overdue() })),
  );
  return router;
}
