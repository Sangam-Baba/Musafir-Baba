// @ts-check
/**
 * MusafirBaba admin: client categories (plan Stage 10 §3.4, §5).
 * GET   /admin/client-categories?includeInactive=true   — the list (`platform.org.read`)
 * POST  /admin/client-categories                        — add one (`platform.org.manage`)
 * PATCH /admin/client-categories/:key                   — rename, reorder, switch on / off (`platform.org.manage`)
 * PUT   /admin/orgs/:id/client-category {key}           — a client's category (`platform.org.manage`)
 */
import express from 'express';
import { z } from 'zod';

import { ForbiddenError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as ORG } from '../modules/organizations/index.js';

const Key = z.string().regex(/^[A-Z][A-Z0-9_]{1,39}$/);

/** @param {import('express').Response} res */
function staffOf(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new ForbiddenError();
  return `staff:${actor.staffId}`;
}

/** @param {{ categories: ReturnType<typeof import('../modules/organizations/index.js').createClientCategoriesService> }} deps */
export function clientCategoryRoutes({ categories }) {
  const router = express.Router();
  const read = requirePermission(ORG.platformOrgRead);
  const manage = requirePermission(ORG.platformOrgManage);
  router.get(
    '/admin/client-categories',
    read,
    validate({ query: z.strictObject({ includeInactive: z.enum(['true', 'false']).optional() }) }),
    (_req, res, next) => {
      categories.list({ includeInactive: res.locals.input.query.includeInactive === 'true' }).then((data) => res.json({ data }), next);
    },
  );
  router.post(
    '/admin/client-categories',
    manage,
    validate({
      body: z.strictObject({
        key: z.string().trim().min(2).max(40),
        name: z.string().trim().min(2).max(60),
        description: z.string().trim().max(300).nullish(),
        order: z.number().int().min(0).max(10_000).optional(),
      }),
    }),
    (_req, res, next) => {
      Promise.resolve()
        .then(() => categories.create(staffOf(res), res.locals.input.body))
        .then((c) => res.status(201).json(c), next);
    },
  );
  router.patch(
    '/admin/client-categories/:key',
    manage,
    validate({
      params: z.strictObject({ key: Key }),
      body: z.strictObject({
        name: z.string().trim().min(2).max(60).optional(),
        description: z.string().trim().max(300).nullish(),
        order: z.number().int().min(0).max(10_000).optional(),
        active: z.boolean().optional(),
      }),
    }),
    (_req, res, next) => {
      Promise.resolve()
        .then(() => categories.update(staffOf(res), res.locals.input.params.key, res.locals.input.body))
        .then((c) => res.json(c), next);
    },
  );
  router.put(
    '/admin/orgs/:id/client-category',
    manage,
    validate({ params: z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/) }), body: z.strictObject({ key: Key }) }),
    (_req, res, next) => {
      Promise.resolve()
        .then(() => categories.assign(staffOf(res), res.locals.input.params.id, res.locals.input.body.key))
        .then((r) => res.json(r), next);
    },
  );
  return router;
}
