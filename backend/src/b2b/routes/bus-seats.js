// @ts-check
/**
 * Stage 18 B4 seat routes (mounted by `busCatalogRoutes`, 503 while `B2B_BUS_ENABLED` is off):
 *   GET  /bus/trips/:id/blocks                         active counter blocks            (`bus-inventory.trip.read`)
 *   POST /bus/trips/:id/blocks {seats, fromStopId?, toStopId?, note?}   block seats    (`bus-inventory.seat.block`)
 *   POST /bus/blocks/:id/release                        give a block's seats back       (`bus-inventory.seat.block`)
 *   PUT  /bus/trips/:id/sale {stopped}                  stop / restart online sale      (`bus-inventory.trip.manage`)
 *   GET  /bus/bookings?date&tripId                      confirmed bookings (B6)         (`bus-booking.booking.read`)
 *   GET  /bus/trips/:id/manifest[?format=csv]           passenger list for the conductor (`bus-booking.booking.read`)
 *   GET  /bus/reviews · POST /bus/reviews/:id/reply {text}   reviews of the company's trips (read · `bus-booking.review.reply`)
 *   GET  /admin/bus/reviews?status · POST /admin/bus/reviews/:id/moderate {visible, note}   (`platform.bus.review`)
 */
import { z } from 'zod';

import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { createBusReviews, createOperatorBookings, PERMISSIONS as BOOKINGS } from '../modules/bus-booking/index.js';
import { PERMISSIONS as BUS } from '../modules/bus-catalog/index.js';
import { createClaims, PERMISSIONS as SEATS } from '../modules/bus-inventory/index.js';
import { DateStr, Id, input, operatorOf, Params } from './bus-http.js';
import { staffOf } from './payout-finance-admin.js';
import { handle } from './payout-finance-admin.js';

const SeatNo = z.string().trim().min(1).max(6);

/** @param {import('express').Router} router @param {{ clock: import('../core/clock.js').Clock }} deps */
export function addBusSeatRoutes(router, deps) {
  const claims = createClaims({ clock: deps.clock });
  const block = requirePermission(SEATS.seatBlock);
  router.get(
    '/bus/trips/:id/blocks',
    requirePermission(SEATS.tripRead),
    validate({ params: Params }),
    handle(async (_q, res) => ({ data: await claims.blocksOf(operatorOf(res).orgId, input(res).params.id) })),
  );
  router.post(
    '/bus/trips/:id/blocks',
    block,
    validate({
      params: Params,
      body: z.strictObject({
        seats: z.array(SeatNo).min(1).max(80),
        fromStopId: Id.nullish(),
        toStopId: Id.nullish(),
        note: z.string().trim().max(200).nullish(),
      }),
    }),
    handle(async (_q, res) => claims.block(operatorOf(res), input(res).params.id, input(res).body), 201),
  );
  router.post(
    '/bus/blocks/:id/release',
    block,
    validate({ params: Params }),
    handle(async (_q, res) => claims.releaseBlock(operatorOf(res), input(res).params.id)),
  );
  router.put(
    '/bus/trips/:id/sale',
    requirePermission(SEATS.tripManage),
    validate({ params: Params, body: z.strictObject({ stopped: z.boolean() }) }),
    handle(async (_q, res) => claims.setSale(operatorOf(res), input(res).params.id, input(res).body.stopped)),
  );
}

/** Bookings and manifests for the bus company (B6). @param {import('express').Router} router */
export function addBusBookingRoutes(router) {
  const bookings = createOperatorBookings();
  const read = requirePermission(BOOKINGS.bookingRead);
  router.get(
    '/bus/bookings',
    read,
    validate({ query: z.strictObject({ date: DateStr.optional(), tripId: Id.optional() }) }),
    handle(async (_q, res) => ({ data: await bookings.list(operatorOf(res).orgId, input(res).query) })),
  );
  router.get(
    '/bus/trips/:id/manifest',
    read,
    validate({ params: Params, query: z.strictObject({ format: z.enum(['json', 'csv']).optional() }) }),
    (_req, res, next) => {
      bookings.manifest(operatorOf(res).orgId, input(res).params.id).then((m) => {
        res.set('Cache-Control', 'private, no-store');
        if (input(res).query.format !== 'csv') return res.json(m);
        res
          .set('Content-Type', 'text/csv; charset=utf-8')
          .set('Content-Disposition', `attachment; filename="manifest-${m.trip.date}.csv"`)
          .send(bookings.manifestCsv(m));
      }, next);
    },
  );
}

/** Reviews: the company reads and replies; staff hide / show (B8). @param {import('express').Router} router @param {{ clock: import('../core/clock.js').Clock }} deps */
export function addBusReviewRoutes(router, deps) {
  const reviews = createBusReviews({ clock: deps.clock });
  router.get(
    '/bus/reviews',
    requirePermission(BOOKINGS.bookingRead),
    handle(async (_q, res) => ({ data: await reviews.forOperator(operatorOf(res).orgId) })),
  );
  router.post(
    '/bus/reviews/:id/reply',
    requirePermission(BOOKINGS.reviewReply),
    validate({ params: Params, body: z.strictObject({ text: z.string().trim().min(2).max(1000) }) }),
    handle(async (_q, res) => reviews.reply(operatorOf(res), input(res).params.id, input(res).body.text)),
  );
  const review = requirePermission(BUS.platformReview);
  router.get(
    '/admin/bus/reviews',
    review,
    validate({ query: z.strictObject({ status: z.enum(['PUBLISHED', 'HIDDEN']).optional() }) }),
    handle(async (_q, res) => ({ data: await reviews.queue(input(res).query) })),
  );
  router.post(
    '/admin/bus/reviews/:id/moderate',
    review,
    validate({ params: Params, body: z.strictObject({ visible: z.boolean(), note: z.string().trim().max(500).nullish() }) }),
    handle(async (_q, res) => reviews.moderate(staffOf(res), input(res).params.id, input(res).body)),
  );
}
