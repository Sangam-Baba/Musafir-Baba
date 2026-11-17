// @ts-check
/**
 * The calendar of a property (plan Stage 04 §3.5, §3.6, §3.12, §5).
 * GET  /hotel/properties/:id/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD   — nights [from, to), at most 92
 * PUT  /hotel/properties/:id/calendar            — bulk change (range + weekdays; rooms; prices / rules); `preview`
 * POST /hotel/properties/:id/calendar/undo       — undo the latest change { changeId }
 * GET  /hotel/properties/:id/calendar/changes    — recent changes (who, when, which nights)
 * Changes: 60 per 10 minutes per person (batch caps in the service).
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { createRateLimiter, rateLimit } from '../core/rate-limit.js';
import { DATE, PERMISSIONS as INV } from '../modules/hotel-inventory/index.js';
import { Id } from './inventory-http.js';

const Params = z.strictObject({ id: Id });
const Range = z.strictObject({ from: z.string().regex(DATE), to: z.string().regex(DATE) });
const Stay = z.number().int().min(1).max(30).nullable();

export const CalendarEditBody = z.strictObject({
  requestId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  from: z.string().regex(DATE),
  to: z.string().regex(DATE),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).nullable().default(null),
  rooms: z
    .array(z.strictObject({ roomTypeId: Id, total: z.number().int().min(0).max(999).optional(), stopSell: z.boolean().optional() }))
    .max(50)
    .default([]),
  rates: z
    .array(
      z.strictObject({
        ratePlanId: Id,
        roomTypeId: Id,
        prices: z
          .array(
            z.strictObject({ guests: z.number().int().min(0).max(30), amount: z.number().int().min(100).max(10_000_000_00).nullable() }),
          )
          .max(31)
          .optional(),
        minLos: Stay.optional(),
        maxLos: Stay.optional(),
        closedToArrival: z.boolean().optional(),
        closedToDeparture: z.boolean().optional(),
        stopSell: z.boolean().optional(),
      }),
    )
    .max(100)
    .default([]),
  preview: z.boolean().default(false),
  confirmBigChange: z.boolean().default(false),
});

/**
 * @param {{ calendar: ReturnType<typeof import('../modules/hotel-inventory/index.js').createCalendarService>,
 *   edits: ReturnType<typeof import('../modules/hotel-inventory/index.js').createCalendarEditService>,
 *   clock: import('../core/clock.js').Clock }} deps
 */
export function calendarRoutes({ calendar, edits, clock }) {
  const router = express.Router();
  const read = requirePermission(INV.calendarRead);
  const manage = requirePermission(INV.calendarManage);
  const limiter = createRateLimiter({ name: 'calendar-edit', points: 60, windowMs: 10 * 60_000, clock });
  const perPerson = rateLimit(limiter, (_req, res) => {
    const a = contextOf(res).actor;
    return a.type === 'member' ? a.userId : 'other';
  });
  const base = '/hotel/properties/:id/calendar';

  router.get(base, read, validate({ params: Params, query: Range }), (_req, res, next) => {
    const { params, query } = res.locals.input;
    calendar.read(contextOf(res), params.id, query).then((body) => res.set('Cache-Control', 'private, no-store').json(body), next);
  });
  router.put(base, manage, perPerson, validate({ params: Params, body: CalendarEditBody }), (_req, res, next) => {
    edits.edit(contextOf(res), res.locals.input.params.id, res.locals.input.body).then((body) => res.json(body), next);
  });
  router.post(
    `${base}/undo`,
    manage,
    perPerson,
    validate({ params: Params, body: z.strictObject({ changeId: Id }) }),
    (_req, res, next) => {
      edits.undo(contextOf(res), res.locals.input.params.id, res.locals.input.body.changeId).then((body) => res.json(body), next);
    },
  );
  router.get(`${base}/changes`, read, validate({ params: Params }), (_req, res, next) => {
    edits.history(contextOf(res), res.locals.input.params.id).then((data) => res.json({ data }), next);
  });
  return router;
}
