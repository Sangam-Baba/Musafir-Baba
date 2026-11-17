// @ts-check
/**
 * Rate plans of a property (plan Stage 04 §3.1, §5).
 * GET    /hotel/properties/:id/rate-plans
 * POST   /hotel/properties/:id/rate-plans
 * PUT    /hotel/properties/:id/rate-plans/:ratePlanId   — header `If-Match: <version>` required (428 / 412)
 * DELETE /hotel/properties/:id/rate-plans/:ratePlanId   — archives it
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { ADJUST_TYPES, PERMISSIONS as INV, PRICING_MODELS } from '../modules/hotel-inventory/index.js';
import { Id, versionOf } from './inventory-http.js';

const Params = z.strictObject({ id: Id });
const OneParams = z.strictObject({ id: Id, ratePlanId: Id });

const Fields = {
  name: z.string().trim().min(2).max(60),
  roomTypeIds: z.array(Id).min(1).max(50),
  mealPlanKey: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
  cancellationPolicyId: Id,
  pricingModel: z.enum(PRICING_MODELS),
  minAdvanceDays: z.number().int().min(0).max(730),
  maxAdvanceDays: z.number().int().min(0).max(730),
  derived: z
    .strictObject({
      parentRatePlanId: Id,
      adjust: z.strictObject({ type: z.enum(ADJUST_TYPES), value: z.number().int().min(-10_000_000).max(10_000_000) }),
    })
    .nullable(),
  order: z.number().int().min(0).max(10_000).optional(),
};
export const RatePlanBody = z.strictObject(Fields);
const RatePlanUpdate = z.strictObject({ ...Fields, status: z.enum(['ACTIVE', 'INACTIVE']).optional() });

/** @param {{ ratePlans: ReturnType<typeof import('../modules/hotel-inventory/index.js').createRatePlanService> }} deps */
export function ratePlanRoutes({ ratePlans }) {
  const router = express.Router();
  const read = requirePermission(INV.calendarRead);
  const manage = requirePermission(INV.calendarManage);
  const base = '/hotel/properties/:id/rate-plans';

  router.get(base, read, validate({ params: Params }), (_req, res, next) => {
    ratePlans.list(contextOf(res), res.locals.input.params.id).then((data) => res.json({ data }), next);
  });
  router.post(base, manage, validate({ params: Params, body: RatePlanBody }), (_req, res, next) => {
    ratePlans
      .create(contextOf(res), res.locals.input.params.id, res.locals.input.body)
      .then((r) => res.status(201).set('ETag', `"${r.version}"`).json(r), next);
  });
  router.put(`${base}/:ratePlanId`, manage, validate({ params: OneParams, body: RatePlanUpdate }), (req, res, next) => {
    (async () => {
      const { id, ratePlanId } = res.locals.input.params;
      const r = await ratePlans.update(contextOf(res), {
        propertyId: id,
        id: ratePlanId,
        data: res.locals.input.body,
        version: versionOf(req),
      });
      res.set('ETag', `"${r.version}"`).json(r);
    })().catch(next);
  });
  router.delete(`${base}/:ratePlanId`, manage, validate({ params: OneParams }), (_req, res, next) => {
    const { id, ratePlanId } = res.locals.input.params;
    ratePlans.archive(contextOf(res), id, ratePlanId).then(() => res.status(204).end(), next);
  });
  return router;
}
