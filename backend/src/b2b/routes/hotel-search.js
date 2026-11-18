// @ts-check
/**
 * Hotel search for every channel (plan Stage 06 §3, `06-api-and-events.md` §3.2). Public for the website (per-IP
 * limits); B2B clients get B2B prices (search gateway decides the channel — never the request).
 * GET  /hotels/destinations?q=     — autocomplete (cities, areas, hotels)
 */
import express from 'express';
import { z } from 'zod';

import { publicRoute } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';

/**
 * @param {{ gate: ReturnType<typeof import('./search-gateway.js').createSearchGate>,
 *   destinations: ReturnType<typeof import('../modules/hotel-search/index.js').createDestinationsService> }} deps
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
  return router;
}
