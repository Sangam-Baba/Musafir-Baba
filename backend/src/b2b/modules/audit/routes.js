// @ts-check
/** GET /audit — the selected org's activity log · GET /admin/audit — every org (MusafirBaba admins). */
import express from 'express';
import { z } from 'zod';

import { contextOf } from '../../core/http/context-middleware.js';
import { requirePermission } from '../../core/http/permissions.js';
import { validate } from '../../core/http/validate.js';
import { PERMISSIONS } from './permissions.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const Page = {
  before: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  action: z
    .string()
    .regex(/^[a-z][a-z-]*\.[a-z][a-z-]*\.[a-z][a-z-]*$/)
    .optional(),
};

/** @param {ReturnType<typeof import('./audit.service.js').createAuditService>} audit */
export function auditRoutes(audit) {
  const router = express.Router();
  router.get('/audit', requirePermission(PERMISSIONS.eventRead), validate({ query: z.strictObject(Page) }), (_req, res, next) => {
    audit.listForOrg(contextOf(res), res.locals.input.query).then((page) => res.json(page), next);
  });
  router.get(
    '/admin/audit',
    requirePermission(PERMISSIONS.platformRead),
    validate({ query: z.strictObject({ ...Page, orgId: Id.optional(), userId: Id.optional() }) }),
    (_req, res, next) => {
      audit.listAll(contextOf(res), res.locals.input.query).then((page) => res.json(page), next);
    },
  );
  return router;
}
