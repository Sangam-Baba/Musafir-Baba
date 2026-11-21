// @ts-check
/**
 * MusafirBaba admin: client wallets (plan Stage 11 §3.5–3.6, §3.9).
 *   GET  /admin/wallet/manual-top-ups?status&clientOrgId (`wallet.topup.check`)
 *   POST /admin/wallet/manual-top-ups/:id/check   (`wallet.topup.check`)   {ok, note} — matched against the bank
 *   POST /admin/wallet/manual-top-ups/:id/decide  (`wallet.topup.approve`) {approve, note} — a different person
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { MANUAL_TOPUP_STATUSES, PERMISSIONS as WAL } from '../modules/wallet/index.js';

const Id = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) });
const OrgId = z.string().regex(/^[a-f0-9]{24}$/);
const Note = z.string().trim().max(500).nullish();

/** @param {import('express').Response} res */
function staff(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
}
/** @param {(req: import('express').Request, res: import('express').Response) => Promise<unknown>} fn */
const handle = (fn) =>
  /** @type {import('express').RequestHandler} */ (
    (req, res, next) => {
      Promise.resolve()
        .then(() => fn(req, res))
        .then((body) => res.set('Cache-Control', 'private, no-store').json(body), next);
    }
  );

/** @param {{ manualTopUps: ReturnType<typeof import('../modules/wallet/index.js').createManualTopUps> }} deps */
export function walletAdminRoutes(deps) {
  const router = express.Router();
  router.get(
    '/admin/wallet/manual-top-ups',
    requirePermission(WAL.topUpCheck),
    validate({ query: z.strictObject({ status: z.enum(MANUAL_TOPUP_STATUSES).optional(), clientOrgId: OrgId.optional() }) }),
    handle(async (_q, res) => ({ data: await deps.manualTopUps.list(res.locals.input.query) })),
  );
  router.post(
    '/admin/wallet/manual-top-ups/:id/check',
    requirePermission(WAL.topUpCheck),
    validate({ params: Id, body: z.strictObject({ ok: z.boolean(), note: Note }) }),
    handle(async (_q, res) => deps.manualTopUps.check(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
  router.post(
    '/admin/wallet/manual-top-ups/:id/decide',
    requirePermission(WAL.topUpApprove),
    validate({ params: Id, body: z.strictObject({ approve: z.boolean(), note: Note }) }),
    handle(async (_q, res) => deps.manualTopUps.decide(staff(res), res.locals.input.params.id, res.locals.input.body)),
  );
  return router;
}
