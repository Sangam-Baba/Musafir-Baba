// @ts-check
/**
 * Calendar files (plan Stage 04 §3.7, §5). Scoped to the property (same limits as the calendar).
 * GET  /hotel/properties/:id/calendar-imports/template      — a CSV with the property's room types and plans
 * POST /hotel/properties/:id/calendar-imports?dryRun=true|false&requestId=…&confirmBigChange=true
 *      body: the CSV (text/csv, ≤ 50 000 rows, ≤ 4 MB) — checked first; written only when clean and dryRun=false
 * 10 files per hour per person.
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { createRateLimiter, rateLimit } from '../core/rate-limit.js';
import { PERMISSIONS as INV } from '../modules/hotel-inventory/index.js';
import { Id } from './inventory-http.js';

const Params = z.strictObject({ id: Id });
const Flag = z.enum(['true', 'false']).default('false');
const Query = z.strictObject({
  dryRun: z.enum(['true', 'false']).default('true'),
  requestId: z
    .string()
    .regex(/^[A-Za-z0-9-]{8,64}$/)
    .optional(),
  confirmBigChange: Flag,
});
const csvBody = express.text({ type: ['text/csv', 'text/plain', 'application/csv'], limit: '4mb' });

/**
 * @param {{ imports: ReturnType<typeof import('../modules/hotel-inventory/index.js').createCalendarImportService>,
 *   clock: import('../core/clock.js').Clock }} deps
 */
export function calendarImportRoutes({ imports, clock }) {
  const router = express.Router();
  const limiter = createRateLimiter({ name: 'calendar-import', points: 10, windowMs: 60 * 60_000, clock });
  const perPerson = rateLimit(limiter, (_req, res) => {
    const a = contextOf(res).actor;
    return a.type === 'member' ? a.userId : 'other';
  });
  const base = '/hotel/properties/:id/calendar-imports';

  router.get(`${base}/template`, requirePermission(INV.calendarRead), validate({ params: Params }), (_req, res, next) => {
    imports.template(contextOf(res), res.locals.input.params.id).then((csv) => {
      res
        .set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="calendar-template.csv"',
          'Cache-Control': 'private, no-store',
        })
        .send(csv);
    }, next);
  });
  router.post(
    base,
    requirePermission(INV.calendarManage),
    perPerson,
    csvBody,
    validate({ params: Params, query: Query }),
    (req, res, next) => {
      const { params, query } = res.locals.input;
      const csv = typeof req.body === 'string' ? req.body : '';
      imports
        .importFile(contextOf(res), params.id, {
          csv,
          dryRun: query.dryRun === 'true',
          requestId: query.requestId ?? null,
          confirmBigChange: query.confirmBigChange === 'true',
        })
        .then((body) => res.json(body), next);
    },
  );
  return router;
}
