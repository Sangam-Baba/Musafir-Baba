// @ts-check
/**
 * MusafirBaba admin: property calendars (plan Stage 04 §3.13, §5).
 * GET  /admin/properties/:id/calendar?from&to        — read-only (`hotel-inventory.admin.read`)
 * GET  /admin/properties/:id/calendar/changes        — recent changes, who and why (`hotel-inventory.admin.read`)
 * POST /admin/properties/:id/calendar/override       — a bulk change with a reason (`hotel-inventory.admin.override`)
 *   (plan §5 named it `calendar-override`; a one-segment name would be caught by Stage 03's `/admin/properties/:id/:action`)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { DATE, PERMISSIONS as INV } from '../modules/hotel-inventory/index.js';
import { CalendarEditBody } from './hotel-calendar.js';
import { Id } from './inventory-http.js';

const Params = z.strictObject({ id: Id });
const Range = z.strictObject({ from: z.string().regex(DATE), to: z.string().regex(DATE) });
const OverrideBody = CalendarEditBody.extend({ reason: z.string().trim().min(5).max(500) });

/** @param {import('express').Response} res */
function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return { staffId: actor.staffId };
}

/** @param {{ adminCalendar: ReturnType<typeof import('../modules/hotel-inventory/index.js').createAdminCalendarService> }} deps */
export function adminCalendarRoutes({ adminCalendar }) {
  const router = express.Router();
  const read = requirePermission(INV.adminRead);
  router.get('/admin/properties/:id/calendar', read, validate({ params: Params, query: Range }), (_req, res, next) => {
    const { params, query } = res.locals.input;
    adminCalendar.read(params.id, query).then((body) => res.set('Cache-Control', 'private, no-store').json(body), next);
  });
  router.get('/admin/properties/:id/calendar/changes', read, validate({ params: Params }), (_req, res, next) => {
    adminCalendar.history(res.locals.input.params.id).then((data) => res.json({ data }), next);
  });
  router.post(
    '/admin/properties/:id/calendar/override',
    requirePermission(INV.adminOverride),
    validate({ params: Params, body: OverrideBody }),
    (_req, res, next) => {
      (async () => {
        const { reason, ...req } = res.locals.input.body;
        res.json(await adminCalendar.override(staffOf(res), res.locals.input.params.id, req, reason));
      })().catch(next);
    },
  );
  return router;
}
