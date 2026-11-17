// @ts-check
/**
 * Cancellation policies of a property (plan Stage 04 §3.2, §5). Scoped to the property (not the whole hotel
 * company) so a Manager limited to some properties only sees and changes theirs.
 * GET    /hotel/properties/:id/cancellation-policies
 * POST   /hotel/properties/:id/cancellation-policies
 * PUT    /hotel/properties/:id/cancellation-policies/:policyId   — header `If-Match: <version>` required (428 / 412)
 * DELETE /hotel/properties/:id/cancellation-policies/:policyId   — archives it
 */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { MAX_RULES, PENALTY_TYPES, PERMISSIONS as INV } from '../modules/hotel-inventory/index.js';
import { Id, versionOf } from './inventory-http.js';

const Params = z.strictObject({ id: Id });
const OneParams = z.strictObject({ id: Id, policyId: Id });
const Penalty = z.strictObject({ type: z.enum(PENALTY_TYPES), value: z.number().int().min(0).max(1_000_000_00) });

export const PolicyBody = z.strictObject({
  name: z.string().trim().min(2).max(60),
  nonRefundable: z.boolean(),
  rules: z.array(z.strictObject({ hoursBefore: z.number().int().min(0).max(8760), penalty: Penalty })).max(MAX_RULES),
  noShow: Penalty,
});

/** @param {{ policies: ReturnType<typeof import('../modules/hotel-inventory/index.js').createCancellationPolicyService> }} deps */
export function cancellationPolicyRoutes({ policies }) {
  const router = express.Router();
  const read = requirePermission(INV.calendarRead);
  const manage = requirePermission(INV.calendarManage);
  const base = '/hotel/properties/:id/cancellation-policies';

  router.get(base, read, validate({ params: Params }), (_req, res, next) => {
    policies.list(contextOf(res), res.locals.input.params.id).then((data) => res.json({ data }), next);
  });
  router.post(base, manage, validate({ params: Params, body: PolicyBody }), (_req, res, next) => {
    policies
      .create(contextOf(res), res.locals.input.params.id, res.locals.input.body)
      .then((r) => res.status(201).set('ETag', `"${r.version}"`).json(r), next);
  });
  router.put(`${base}/:policyId`, manage, validate({ params: OneParams, body: PolicyBody }), (req, res, next) => {
    (async () => {
      const { id, policyId } = res.locals.input.params;
      const r = await policies.update(contextOf(res), {
        propertyId: id,
        id: policyId,
        data: res.locals.input.body,
        version: versionOf(req),
      });
      res.set('ETag', `"${r.version}"`).json(r);
    })().catch(next);
  });
  router.delete(`${base}/:policyId`, manage, validate({ params: OneParams }), (_req, res, next) => {
    const { id, policyId } = res.locals.input.params;
    policies.archive(contextOf(res), id, policyId).then(() => res.status(204).end(), next);
  });
  return router;
}
