// @ts-check
/**
 * Change requests for website buyers (plan Stage 09 §3.5, §5) and B2B clients' people (Stage 12B — same rules as
 * customer-bookings.js) — through their booking (buyer only; others 404):
 *   GET  /bookings/hotels/:ref/amendments
 *   POST /bookings/hotels/:ref/amendments {type, message, guestNames?}
 *   POST /bookings/hotels/:ref/amendments/:id/messages {text}
 *   GET  /bookings/hotels/:ref/no-show · POST /bookings/hotels/:ref/no-show-dispute {message} (within 72 hours)
 */
import express from 'express';
import { z } from 'zod';

import { publicRoute } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { AMENDMENT_TYPES } from '../modules/hotel-booking/index.js';
import { actorId, ownBooking } from './customer-bookings.js';

const Ref = z.strictObject({ ref: z.string().min(5).max(32) });
const RefId = z.strictObject({ ref: z.string().min(5).max(32), id: z.string().regex(/^[a-f0-9]{24}$/) });
const KeyQuery = z.strictObject({
  key: z
    .string()
    .regex(/^[A-Za-z0-9_-]{16,64}$/)
    .optional(),
});
const Text = z.string().trim().min(2).max(2000);
const OpenBody = z.strictObject({
  type: z.enum(AMENDMENT_TYPES),
  message: Text,
  guestNames: z
    .array(z.strictObject({ room: z.number().int().min(1).max(9), leadGuest: z.string().trim().min(1).max(60) }))
    .max(9)
    .optional(),
});

const buyerId = actorId;

/**
 * @param {Parameters<typeof ownBooking>[2] & {
 *   amendments: ReturnType<typeof import('../modules/hotel-booking/index.js').createAmendments>,
 *   noShows: ReturnType<typeof import('../modules/hotel-booking/index.js').createNoShows>,
 *   bookingByRef: (ref: string) => Promise<Record<string, any>>,
 * }} deps
 */
export function customerAmendmentRoutes(deps) {
  const router = express.Router();
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  router.get('/bookings/hotels/:ref/amendments', publicRoute(), validate({ params: Ref, query: KeyQuery }), (req, res, next) => {
    (async () => {
      await ownBooking(req, res, deps);
      const b = await deps.bookingByRef(res.locals.input.params.ref);
      noStore(res).json({ data: await deps.amendments.forBooking(String(b._id)) });
    })().catch(next);
  });
  router.post(
    '/bookings/hotels/:ref/amendments',
    publicRoute(),
    validate({ params: Ref, query: KeyQuery, body: OpenBody }),
    (req, res, next) => {
      (async () => {
        await ownBooking(req, res, deps, true);
        const b = await deps.bookingByRef(res.locals.input.params.ref);
        noStore(res)
          .status(201)
          .json(await deps.amendments.open(b, { by: buyerId(res), ...res.locals.input.body }));
      })().catch(next);
    },
  );
  router.post(
    '/bookings/hotels/:ref/amendments/:id/messages',
    publicRoute(),
    validate({ params: RefId, query: KeyQuery, body: z.strictObject({ text: Text }) }),
    (req, res, next) => {
      (async () => {
        await ownBooking(req, res, deps, true);
        const b = await deps.bookingByRef(res.locals.input.params.ref);
        noStore(res).json(
          await deps.amendments.buyerReply(String(b._id), res.locals.input.params.id, buyerId(res), res.locals.input.body.text),
        );
      })().catch(next);
    },
  );
  router.get('/bookings/hotels/:ref/no-show', publicRoute(), validate({ params: Ref, query: KeyQuery }), (req, res, next) => {
    (async () => {
      await ownBooking(req, res, deps);
      const b = await deps.bookingByRef(res.locals.input.params.ref);
      noStore(res).json({ noShow: await deps.noShows.forBooking(String(b._id)) });
    })().catch(next);
  });
  router.post(
    '/bookings/hotels/:ref/no-show-dispute',
    publicRoute(),
    validate({ params: Ref, query: KeyQuery, body: z.strictObject({ message: Text }) }),
    (req, res, next) => {
      (async () => {
        await ownBooking(req, res, deps, true);
        const b = await deps.bookingByRef(res.locals.input.params.ref);
        noStore(res).json(await deps.noShows.dispute(String(b._id), buyerId(res), res.locals.input.body.message));
      })().catch(next);
    },
  );
  return router;
}
