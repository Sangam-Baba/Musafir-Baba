// @ts-check
/**
 * The calendar of a property (plan Stage 04 §3.5, §5).
 * GET /hotel/properties/:id/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD   — nights [from, to), at most 92
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { DATE, PERMISSIONS as INV } from '../modules/hotel-inventory/index.js';
import { Id } from './inventory-http.js';

const Params = z.strictObject({ id: Id });
const Range = z.strictObject({ from: z.string().regex(DATE), to: z.string().regex(DATE) });

/** @param {{ calendar: ReturnType<typeof import('../modules/hotel-inventory/index.js').createCalendarService> }} deps */
export function calendarRoutes({ calendar }) {
  const router = express.Router();
  router.get(
    '/hotel/properties/:id/calendar',
    requirePermission(INV.calendarRead),
    validate({ params: Params, query: Range }),
    (_req, res, next) => {
      const { params, query } = res.locals.input;
      calendar.read(contextOf(res), params.id, query).then((body) => res.set('Cache-Control', 'private, no-store').json(body), next);
    },
  );
  return router;
}
