// @ts-check
/**
 * MusafirBaba admin: GST rates and pricing settings (plan Stage 05 §5).
 * GET  /admin/tax-rules                         — all rates with status and history (`pricing.rules.read`)
 * POST /admin/tax-rules                         — propose a dated rate (`pricing.tax.manage`)
 * POST /admin/tax-rules/:id/approve | /reject   — `If-Match`, a different person (`pricing.tax.manage`)
 * GET  /admin/pricing/settings                  — issuing GSTINs, hotels without GST, model (`pricing.rules.read`)
 * PUT  /admin/pricing/settings                  — `If-Match`, with a note (`pricing.tax.manage`)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as PRC, PRICING_MODELS, TAX_KINDS } from '../modules/pricing/index.js';
import { Id, versionOf } from './inventory-http.js';

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Paise = z.number().int().min(0);
const TaxRuleBody = z.strictObject({
  appliesTo: z.enum(TAX_KINDS),
  sac: z.string().regex(/^\d{6}$/),
  slabMinPaise: Paise,
  slabMaxPaise: Paise.nullable(),
  rateBps: z.number().int(),
  itcAllowed: z.boolean(),
  effectiveFrom: Day,
  effectiveTo: Day.nullable(),
  sourceNote: z.string().trim().min(5).max(300),
  replaces: z.string().max(80).nullish(),
});
const SettingsBody = z.strictObject({
  model: z.enum(PRICING_MODELS),
  issuers: z
    .array(
      z.strictObject({ gstin: z.string().trim().toUpperCase().nullable(), stateCode: z.string().regex(/^\d{2}$/), isDefault: z.boolean() }),
    )
    .min(1)
    .max(40),
  sellUnregisteredHotels: z.boolean(),
  note: z.string().trim().min(5).max(500),
});
const Params = z.strictObject({ id: Id });
const Note = z.strictObject({ note: z.string().trim().max(500).nullish() });

/** @param {import('express').Response} res */
function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return { staffId: actor.staffId };
}

/** @param {{ taxes: ReturnType<typeof import('../modules/pricing/index.js').createTaxAdminService> }} deps */
export function pricingTaxAdminRoutes({ taxes }) {
  const router = express.Router();
  const read = requirePermission(PRC.rulesRead);
  const manage = requirePermission(PRC.taxManage);
  const noStore = (/** @type {import('express').Response} */ res) => res.set('Cache-Control', 'private, no-store');
  router.get('/admin/tax-rules', read, (_req, res, next) => {
    taxes.list().then((data) => noStore(res).json({ data }), next);
  });
  router.post('/admin/tax-rules', manage, validate({ body: TaxRuleBody }), (_req, res, next) => {
    taxes.propose(staffOf(res), res.locals.input.body).then((r) => res.status(201).set('ETag', `"${r.version}"`).json(r), next);
  });
  for (const action of /** @type {const} */ (['approve', 'reject'])) {
    router.post(`/admin/tax-rules/:id/${action}`, manage, validate({ params: Params, body: Note }), (req, res, next) => {
      (async () => {
        const { params, body } = res.locals.input;
        const r = await taxes.decide({
          who: staffOf(res),
          id: params.id,
          version: versionOf(req),
          approve: action === 'approve',
          note: body.note ?? null,
        });
        res.set('ETag', `"${r.version}"`).json(r);
      })().catch(next);
    });
  }
  router.get('/admin/pricing/settings', read, (_req, res, next) => {
    taxes.settings().then((s) => noStore(res).set('ETag', `"${s.version}"`).json(s), next);
  });
  router.put('/admin/pricing/settings', manage, validate({ body: SettingsBody }), (req, res, next) => {
    (async () => {
      const s = await taxes.updateSettings(staffOf(res), versionOf(req), res.locals.input.body);
      res.set('ETag', `"${s.version}"`).json(s);
    })().catch(next);
  });
  return router;
}
