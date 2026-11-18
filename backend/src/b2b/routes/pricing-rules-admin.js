// @ts-check
/**
 * MusafirBaba admin: margin rules (plan Stage 05 §5).
 * GET  /admin/margin-rules?status                  — list (`pricing.rules.read`)
 * GET  /admin/margin-rules/:id                     — one rule with its history (`pricing.rules.read`)
 * POST /admin/margin-rules                         — new DRAFT (`pricing.rules.propose`)
 * PUT  /admin/margin-rules/:id                     — edit a DRAFT, `If-Match: <version>` (`pricing.rules.propose`)
 * POST /admin/margin-rules/:id/submit | /discard   — `If-Match` (`pricing.rules.propose`)
 * POST /admin/margin-rules/:id/approve | /reject | /retire — `If-Match` (`pricing.rules.approve`, a second person)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { ADJUSTMENTS, CHANNELS, MARGIN_RULE_STATUSES, PERMISSIONS as PRC } from '../modules/pricing/index.js';
import { Id, versionOf } from './inventory-http.js';

const Ref = z.string().trim().min(1).max(64);
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Paise = z.number().int();
export const RuleBody = z.strictObject({
  name: z.string().trim().min(3).max(80),
  note: z.string().trim().max(500).nullish(),
  priority: z.number().int(),
  match: z
    .strictObject({
      channels: z.array(z.enum(CHANNELS)).max(3).optional(),
      clientCategory: Ref.optional(),
      clientOrgId: Id.optional(),
      hotelOrgId: Id.optional(),
      propertyId: Id.optional(),
      cityId: Id.optional(),
      starRating: z.number().int().optional(),
      stayFrom: Day.optional(),
      stayTo: Day.optional(),
    })
    .default({}),
  adjustment: z.strictObject({ type: z.enum(ADJUSTMENTS), value: Paise, minPaise: Paise.nullish(), maxPaise: Paise.nullish() }),
  allowBelowNet: z.boolean().optional(),
  effectiveFrom: z.coerce.date().nullish(),
  effectiveTo: z.coerce.date().nullish(),
  replaces: Id.nullish(),
});
const Params = z.strictObject({ id: Id });
const Note = z.strictObject({ note: z.string().trim().max(500).nullish() });
const ReasonRequired = z.strictObject({ note: z.string().trim().min(5).max(500) });

/** @param {import('express').Response} res */
function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return { staffId: actor.staffId };
}

/** @param {import('express').Response} res @param {{ version: number }} r */
const withTag = (res, r) => res.set('ETag', `"${r.version}"`);

/** @param {{ rules: ReturnType<typeof import('../modules/pricing/index.js').createRuleAdminService> }} deps */
export function pricingRuleAdminRoutes({ rules }) {
  const router = express.Router();
  const read = requirePermission(PRC.rulesRead);
  const propose = requirePermission(PRC.rulesPropose);
  const approve = requirePermission(PRC.rulesApprove);
  router.get(
    '/admin/margin-rules',
    read,
    validate({ query: z.strictObject({ status: z.enum(MARGIN_RULE_STATUSES).optional() }) }),
    (_req, res, next) => {
      rules.list(res.locals.input.query).then((data) => res.set('Cache-Control', 'private, no-store').json({ data }), next);
    },
  );
  router.get('/admin/margin-rules/:id', read, validate({ params: Params }), (_req, res, next) => {
    rules.get(res.locals.input.params.id).then((r) => withTag(res, r).set('Cache-Control', 'private, no-store').json(r), next);
  });
  router.post('/admin/margin-rules', propose, validate({ body: RuleBody }), (_req, res, next) => {
    rules.create(staffOf(res), res.locals.input.body).then((r) => withTag(res.status(201), r).json(r), next);
  });
  router.put('/admin/margin-rules/:id', propose, validate({ params: Params, body: RuleBody }), (req, res, next) => {
    (async () => {
      const r = await rules.update(staffOf(res), res.locals.input.params.id, versionOf(req), res.locals.input.body);
      withTag(res, r).json(r);
    })().catch(next);
  });
  /** @type {[import('../modules/pricing/domain/rule-lifecycle.js').RuleAction, import('express').RequestHandler, z.ZodTypeAny][]} */
  const actions = [
    ['submit', propose, Note],
    ['discard', propose, Note],
    ['approve', approve, Note],
    ['reject', approve, ReasonRequired],
    ['retire', approve, ReasonRequired],
  ];
  for (const [action, guard, body] of actions) {
    router.post(`/admin/margin-rules/:id/${action}`, guard, validate({ params: Params, body }), (req, res, next) => {
      (async () => {
        const input = {
          who: staffOf(res),
          id: res.locals.input.params.id,
          version: versionOf(req),
          note: res.locals.input.body.note ?? null,
        };
        const r = await rules.act({ ...input, action: /** @type {Exclude<typeof action, 'edit'>} */ (action) });
        withTag(res, r).json(r);
      })().catch(next);
    });
  }
  return router;
}
