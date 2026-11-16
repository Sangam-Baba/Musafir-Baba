// @ts-check
/**
 * Public hotel content and where a listing is sold (plan Stage 03 §3.6, §3.9).
 * GET /hotels/:ref                  — public: a LIVE listing by public reference (MBHT-…) or slug, for the caller's channel:
 *                                     members of a B2B client org see the B2B view, everyone else the website view;
 *                                     MusafirBaba staff may preview either (`?channel=B2B`). Hidden = 404 (like missing).
 * PUT /hotel/properties/:id/visibility   — {website, b2b, sellFrom} (`hotel-catalog.property.manage`; `If-Match`)
 * PUT /admin/properties/:id/visibility   — also {clientCategories} (`hotel-catalog.listing.review`; `If-Match`)
 */
import express from 'express';
import { z } from 'zod';

import { isStayDate } from '../core/dates.js';
import { AppError, ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { publicRoute, requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { CHANNELS, PERMISSIONS as CATALOG } from '../modules/hotel-catalog/index.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const HotelVisibility = z.strictObject({
  website: z.boolean(),
  b2b: z.boolean(),
  sellFrom: z.string().refine(isStayDate, 'use YYYY-MM-DD').nullable(),
});
const AdminVisibility = HotelVisibility.extend({ clientCategories: z.array(z.string().regex(/^[a-z][a-z0-9-]{1,40}$/)).max(20) });

/** @param {import('express').Request} req */
function versionOf(req) {
  const raw = String(req.get('if-match') ?? '')
    .replace(/^W\//, '')
    .replace(/"/g, '');
  if (!/^\d+$/.test(raw)) throw new AppError('VERSION_REQUIRED', 428, 'Send the version you loaded in the If-Match header');
  return Number(raw);
}

/** @param {import('../core/context.js').Actor} actor @param {string | undefined} asked */
function channelOf(actor, asked) {
  if (actor.type === 'staff') return asked === 'B2B' ? 'B2B' : 'WEBSITE';
  return actor.type === 'member' && actor.orgType === 'CLIENT' ? 'B2B' : 'WEBSITE';
}

/**
 * @param {{ content: ReturnType<typeof import('../modules/hotel-catalog/index.js').createContentService>,
 *   visibility: ReturnType<typeof import('../modules/hotel-catalog/index.js').createVisibilityService> }} deps
 */
export function hotelContentRoutes({ content, visibility }) {
  const router = express.Router();
  router.get(
    '/hotels/:ref',
    publicRoute(),
    validate({
      params: z.strictObject({ ref: z.string().min(3).max(100) }),
      query: z.strictObject({ channel: z.enum(CHANNELS).optional() }),
    }),
    (_req, res, next) => {
      const { actor } = contextOf(res);
      content.publicProperty(res.locals.input.params.ref, { channel: channelOf(actor, res.locals.input.query.channel) }).then((p) => {
        res.set('Cache-Control', actor.type === 'anonymous' ? 'public, max-age=60' : 'private, no-store').json(p);
      }, next);
    },
  );
  router.put(
    '/hotel/properties/:id/visibility',
    requirePermission(CATALOG.propertyManage),
    validate({ params: z.strictObject({ id: Id }), body: HotelVisibility }),
    (req, res, next) => {
      (async () => {
        const p = await visibility.setByHotel(contextOf(res), res.locals.input.params.id, res.locals.input.body, versionOf(req));
        res.set('ETag', `"${p.version}"`).json(p);
      })().catch(next);
    },
  );
  router.put(
    '/admin/properties/:id/visibility',
    requirePermission(CATALOG.listingReview),
    validate({ params: z.strictObject({ id: Id }), body: AdminVisibility }),
    (req, res, next) => {
      (async () => {
        const { actor } = contextOf(res);
        if (actor.type !== 'staff') throw new ForbiddenError();
        const p = await visibility.setByAdmin(
          { staffId: actor.staffId },
          res.locals.input.params.id,
          res.locals.input.body,
          versionOf(req),
        );
        res.set('ETag', `"${p.version}"`).json(p);
      })().catch(next);
    },
  );
  return router;
}
