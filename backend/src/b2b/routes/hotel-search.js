// @ts-check
/**
 * Hotel search for every channel (plan Stage 06 §3, `06-api-and-events.md` §3.2). Public for the website (per-IP
 * limits); B2B clients get B2B prices (search gateway decides the channel — never the request).
 * GET  /hotels/destinations?q=     — autocomplete (cities, areas, hotels)
 * POST /hotels/search              — LIVE hotels with rooms for the stay and a "from" price for the caller's channel
 * POST /hotels/offers/price-check  — before checkout: OK (fresh token) / PRICE_CHANGED / SOLD_OUT
 * POST /hotels/:ref/offers         — every room × plan for the stay, the caller's price, cancellation terms, a price token each
 */
import express from 'express';
import { z } from 'zod';

import { publicRoute } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { SORTS } from '../modules/hotel-search/index.js';

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Id = z.string().regex(/^[a-f0-9]{24}$/);
const Paise = z.number().int().min(0).max(100_000_000);
export const Rooms = z
  .array(
    z.strictObject({ adults: z.number().int().min(1).max(8), childrenAges: z.array(z.number().int().min(0).max(17)).max(4).default([]) }),
  )
  .min(1)
  .max(9);
const SearchBody = z
  .strictObject({
    destination: z
      .discriminatedUnion('type', [
        z.strictObject({ type: z.literal('CITY'), id: Id }),
        z.strictObject({ type: z.literal('AREA'), id: Id, cityId: Id }),
        z.strictObject({ type: z.literal('PROPERTY'), id: z.string().min(3).max(32) }),
      ])
      .optional(),
    propertyRefs: z.array(z.string().min(3).max(32)).min(1).max(50).optional(),
    near: z
      .strictObject({ lat: z.number().min(6).max(38), lng: z.number().min(68).max(98), radiusKm: z.number().min(0.5).max(50) })
      .optional(),
    checkIn: Day,
    checkOut: Day,
    rooms: Rooms,
    filters: z
      .strictObject({
        star: z.array(z.number().int().min(0).max(5)).max(6).optional(),
        priceRange: z.strictObject({ minPaise: Paise.optional(), maxPaise: Paise.optional() }).optional(),
        mealPlans: z.array(z.string().min(1).max(20)).max(10).optional(),
        refundableOnly: z.boolean().optional(),
        amenities: z.array(z.string().min(1).max(40)).max(20).optional(),
      })
      .default({}),
    sort: z.enum(SORTS).optional(),
    cursor: z.string().max(200).nullish(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .refine((b) => [b.destination, b.propertyRefs, b.near].filter(Boolean).length === 1, {
    message: 'Send exactly one of destination, propertyRefs or near',
  });

/**
 * @param {{ gate: ReturnType<typeof import('./search-gateway.js').createSearchGate>,
 *   destinations: ReturnType<typeof import('../modules/hotel-search/index.js').createDestinationsService>,
 *   search: ReturnType<typeof import('../modules/hotel-search/index.js').createSearchService>,
 *   offers: ReturnType<typeof import('../modules/hotel-search/index.js').createOffersService> }} deps
 */
export function hotelSearchRoutes(deps) {
  const router = express.Router();
  router.get(
    '/hotels/destinations',
    publicRoute(),
    validate({ query: z.strictObject({ q: z.string().trim().max(60) }) }),
    deps.gate('hotel.destinations', 'light'),
    (_req, res, next) => {
      const caller = res.locals.searchCaller;
      deps.destinations
        .suggest(caller.catalogChannel, res.locals.input.query.q)
        .then((data) => res.set('Cache-Control', 'public, max-age=60').json({ data }), next);
    },
  );
  router.post('/hotels/search', publicRoute(), validate({ body: SearchBody }), deps.gate('hotel.search', 'heavy'), (_req, res, next) => {
    deps.search
      .search(res.locals.searchCaller, res.locals.input.body)
      .then((r) => res.set('Cache-Control', 'private, no-store').json(r), next);
  });
  // registered before `/hotels/:ref/offers` so "offers" is never read as a hotel reference
  router.post(
    '/hotels/offers/price-check',
    publicRoute(),
    validate({ body: z.strictObject({ priceToken: z.string().min(10).max(4096) }) }),
    deps.gate('hotel.pricecheck', 'heavy'),
    (_req, res, next) => {
      deps.offers
        .priceCheck(res.locals.searchCaller, res.locals.input.body.priceToken)
        .then((r) => res.set('Cache-Control', 'private, no-store').json(r), next);
    },
  );
  router.post(
    '/hotels/:ref/offers',
    publicRoute(),
    validate({
      params: z.strictObject({ ref: z.string().min(3).max(32) }),
      body: z.strictObject({ checkIn: Day, checkOut: Day, rooms: Rooms }),
    }),
    deps.gate('hotel.offers', 'heavy'),
    (_req, res, next) => {
      const { params, body } = res.locals.input;
      deps.offers
        .offers(res.locals.searchCaller, params.ref, body)
        .then((r) => res.set('Cache-Control', 'private, no-store').json(r), next);
    },
  );
  return router;
}
