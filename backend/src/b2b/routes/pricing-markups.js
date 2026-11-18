// @ts-check
/**
 * A B2B client's own markup for its customers (plan Stage 05 §5) — display only.
 * GET /markups   (`pricing.markup.read`)
 * PUT /markups   `If-Match: <version>` (0 = first save) (`pricing.markup.manage`)
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { MARKUP_TYPES, PERMISSIONS as PRC } from '../modules/pricing/index.js';
import { Id, versionOf } from './inventory-http.js';

const Paise = z.number().int().nullish();
const Adjustment = z.strictObject({ type: z.enum(MARKUP_TYPES), value: z.number().int(), minPaise: Paise, maxPaise: Paise });
const MarkupBody = z.strictObject({
  enabled: z.boolean(),
  adjustment: Adjustment,
  overrides: z
    .array(
      z.strictObject({
        match: z.strictObject({ cityId: Id.optional(), propertyId: Id.optional(), starRating: z.number().int().min(0).max(5).optional() }),
        adjustment: Adjustment,
      }),
    )
    .max(50)
    .default([]),
});

/** @param {{ markups: ReturnType<typeof import('../modules/pricing/index.js').createMarkupService> }} deps */
export function pricingMarkupRoutes({ markups }) {
  const router = express.Router();
  router.get('/markups', requirePermission(PRC.markupRead), (_req, res, next) => {
    markups.get(contextOf(res)).then((m) => res.set('ETag', `"${m.version}"`).set('Cache-Control', 'private, no-store').json(m), next);
  });
  router.put('/markups', requirePermission(PRC.markupManage), validate({ body: MarkupBody }), (req, res, next) => {
    (async () => {
      const m = await markups.put(contextOf(res), versionOf(req), res.locals.input.body);
      res.set('ETag', `"${m.version}"`).json(m);
    })().catch(next);
  });
  return router;
}
