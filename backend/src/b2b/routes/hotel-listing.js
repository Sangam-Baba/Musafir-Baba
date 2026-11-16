// @ts-check
/**
 * The hotel's side of listing approval (plan Stage 03 §3.5).
 * GET  /hotel/properties/:id/readiness  — what still stops a submit (empty list = ready)
 * POST /hotel/properties/:id/submit     — submit / resubmit; header `If-Match: <version>` (428 / 412); 422 PROPERTY_NOT_READY lists everything missing
 * POST /hotel/properties/:id/withdraw   — back to draft before MusafirBaba decides; `If-Match` required
 */
import express from 'express';
import { z } from 'zod';

import { AppError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as CATALOG } from '../modules/hotel-catalog/index.js';

const Params = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });

/** @param {import('express').Request} req */
function versionOf(req) {
  const raw = String(req.get('if-match') ?? '')
    .replace(/^W\//, '')
    .replace(/"/g, '');
  if (!/^\d+$/.test(raw)) throw new AppError('VERSION_REQUIRED', 428, 'Send the version you loaded in the If-Match header');
  return Number(raw);
}

/** @param {{ listing: ReturnType<typeof import('../modules/hotel-catalog/index.js').createListingService> }} deps */
export function listingRoutes({ listing }) {
  const router = express.Router();
  const manage = requirePermission(CATALOG.propertyManage);
  router.get(
    '/hotel/properties/:id/readiness',
    requirePermission(CATALOG.propertyRead),
    validate({ params: Params }),
    (_req, res, next) => {
      listing.readiness(contextOf(res), res.locals.input.params.id).then((r) => res.json(r), next);
    },
  );
  for (const action of /** @type {const} */ (['submit', 'withdraw'])) {
    router.post(`/hotel/properties/:id/${action}`, manage, validate({ params: Params, body: z.strictObject({}) }), (req, res, next) => {
      (async () => {
        const p = await listing[action](contextOf(res), res.locals.input.params.id, versionOf(req));
        res.set('ETag', `"${p.version}"`).json(p);
      })().catch(next);
    });
  }
  return router;
}
