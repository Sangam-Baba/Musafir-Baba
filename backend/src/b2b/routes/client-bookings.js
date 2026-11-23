// @ts-check
/**
 * My Bookings for B2B clients (plan Stage 12 §3.7) — read from the booking summaries:
 *   GET /client/bookings?q&status&payment&branchId&createdBy&destination&checkInFrom&checkInTo&checkOutFrom&checkOutTo
 *       &bookedFrom&bookedTo&before&limit                                  (`orders.order.read`) newest first, 50 a page
 *   GET /client/bookings.csv?(same filters)                                (`orders.export.read`) up to 5 000 rows
 * Branch-limited people see their branches only; "own bookings only" people see what they booked. Never another
 * company's rows, never internal amounts (the row has the buyer's total and refunds only). Each export is logged.
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as ORD } from '../modules/orders/index.js';
import { PAYMENT_STATES } from '../modules/reporting/index.js';

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const IST_MS = 330 * 60_000;
export const EXPORT_MAX_ROWS = 5000;
const Query = z.strictObject({
  q: z.string().trim().min(2).max(60).optional(),
  status: z
    .string()
    .regex(/^[A-Z_]{3,30}$/)
    .optional(),
  payment: z.enum(PAYMENT_STATES).optional(),
  branchId: z
    .string()
    .regex(/^[a-f0-9]{24}$/)
    .optional(),
  createdBy: z
    .string()
    .regex(/^user:[a-f0-9]{24}$/)
    .optional(),
  destination: z.string().trim().min(2).max(60).optional(),
  checkInFrom: Day.optional(),
  checkInTo: Day.optional(),
  checkOutFrom: Day.optional(),
  checkOutTo: Day.optional(),
  bookedFrom: Day.optional(),
  bookedTo: Day.optional(),
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/** Indian midnight of a day as an instant. @param {string} day @param {number} [plusDays] */
const istDay = (day, plusDays = 0) => new Date(Date.parse(`${day}T00:00:00Z`) - IST_MS + plusDays * 86_400_000);

/** @param {import('express').Response} res */
function viewer(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'member' || actor.orgType !== 'CLIENT') throw new ForbiddenError();
  return { clientOrgId: actor.orgId, branchIds: actor.branchIds ?? [], ownUser: actor.ownOnly ? `user:${actor.userId}` : null };
}

/** @param {z.infer<typeof Query>} q */
const filterOf = (q) => ({
  ...q,
  bookedFrom: q.bookedFrom ? istDay(q.bookedFrom) : undefined,
  bookedTo: q.bookedTo ? istDay(q.bookedTo, 1) : undefined,
  before: q.before ? new Date(q.before) : undefined,
});

/** @param {Record<string, any>[]} rows */
export function bookingsCsv(rows) {
  const rupees = (/** @type {number} */ p) => (p / 100).toFixed(2);
  const text = (/** @type {unknown} */ v) => {
    const c = v === null || v === undefined ? '' : String(v);
    const safe = /^[=+\-@\t\r]/.test(c) ? `'${c}` : c; // never a spreadsheet formula
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = [
    'booking',
    'order',
    'hotel',
    'destination',
    'lead_guest',
    'check_in',
    'check_out',
    'booking_status',
    'payment',
    'total_inr',
    'refunded_inr',
    'booked_at',
  ];
  const lines = rows.map((r) =>
    [
      r.bookingRef,
      r.orderRef,
      r.propertyName,
      r.destination,
      r.leadGuest,
      r.checkIn,
      r.checkOut,
      r.bookingStatus,
      r.paymentState,
      rupees(r.totalPaise),
      rupees(r.refundedPaise ?? 0),
      new Date(r.orderCreatedAt).toISOString(),
    ]
      .map(text)
      .join(','),
  );
  return [head.join(','), ...lines].join('\n');
}

/** @param {{ summaries: ReturnType<typeof import('../modules/reporting/index.js').createBookingSummaries> }} deps */
export function clientBookingRoutes(deps) {
  const router = express.Router();
  router.get('/client/bookings', requirePermission(ORD.orderRead), validate({ query: Query }), (_req, res, next) => {
    const q = res.locals.input.query;
    deps.summaries
      .forClient(viewer(res), filterOf(q), { limit: q.limit ?? 50 })
      .then((data) => res.set('Cache-Control', 'private, no-store').json({ data }), next);
  });
  router.get(
    '/client/bookings.csv',
    requirePermission(ORD.exportRead),
    validate({ query: Query.omit({ limit: true, before: true }) }),
    (_req, res, next) => {
      const v = viewer(res);
      const ctx = contextOf(res);
      deps.summaries.forClient(v, filterOf(res.locals.input.query), { limit: EXPORT_MAX_ROWS }).then((rows) => {
        ctx.logger.info({ orgId: v.clientOrgId, rows: rows.length }, 'client bookings exported'); // who: the request's actor
        res.set('Cache-Control', 'private, no-store').type('text/csv').attachment('musafirbaba-bookings.csv').send(bookingsCsv(rows));
      }, next);
    },
  );
  return router;
}
