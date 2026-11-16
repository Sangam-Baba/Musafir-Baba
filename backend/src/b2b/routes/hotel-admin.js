// @ts-check
/**
 * MusafirBaba's listing tools (plan Stage 03 §3.5, §3.7). This task: decide a live listing's pending revision.
 * POST /admin/properties/:id/revision/decision — {revisionId, decision: APPROVE | REJECT, note} (`hotel-catalog.listing.review`)
 * The approval queue, checklist, suspend and archive come with S03-T08.
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as CATALOG } from '../modules/hotel-catalog/index.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);

/** @param {import('express').Response} res */
function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return { staffId: actor.staffId };
}

/** @param {{ revisions: ReturnType<typeof import('../modules/hotel-catalog/index.js').createRevisionService> }} deps */
export function hotelAdminRoutes({ revisions }) {
  const router = express.Router();
  router.post(
    '/admin/properties/:id/revision/decision',
    requirePermission(CATALOG.listingReview),
    validate({
      params: z.strictObject({ id: Id }),
      body: z.strictObject({ revisionId: Id, decision: z.enum(['APPROVE', 'REJECT']), note: z.string().trim().min(1).max(2000).nullish() }),
    }),
    (_req, res, next) => {
      (async () => {
        const { params, body } = res.locals.input;
        res.json(
          await revisions.decide(staffOf(res), params.id, {
            revisionId: body.revisionId,
            decision: body.decision,
            note: body.note ?? null,
          }),
        );
      })().catch(next);
    },
  );
  return router;
}
