// @ts-check
/**
 * MusafirBaba admin endpoints under /api/v1/admin (plan Stage 01 §3.6, §3.10, §5). They need the
 * B2B admin pass (routes/admin-auth.js) — the platform permissions below are only ever held by staff.
 * GET  /admin/orgs · GET /admin/orgs/:id · POST /admin/orgs · POST /admin/orgs/:id/suspend · POST /admin/orgs/:id/reactivate
 * GET  /admin/users · GET /admin/users/:id
 * GET  /admin/staff/:staffId/roles · PUT /admin/staff/:staffId/roles
 */
import express from 'express';
import { z } from 'zod';

import { NotFoundError, UnauthorizedError } from '../core/errors.js';
import { contextOf } from '../core/http/context-middleware.js';
import { requirePermission } from '../core/http/permissions.js';
import { validate } from '../core/http/validate.js';
import { PERMISSIONS as ACCESS } from '../modules/access/index.js';
import { PERMISSIONS as IDENTITY } from '../modules/identity/index.js';
import { PERMISSIONS as ORGS } from '../modules/organizations/index.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const OrgList = z.strictObject({
  type: z.enum(['CLIENT', 'HOTEL']).optional(),
  status: z.enum(['ONBOARDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
const NewOrg = z.strictObject({
  type: z.enum(['CLIENT', 'HOTEL']),
  legalName: z.string().trim().min(2).max(200),
  displayName: z.string().trim().min(2).max(120).optional(),
  ownerEmail: z.string().trim().min(3).max(254).optional(),
});

/** @param {import('express').Response} res */
function staffId(res) {
  const { actor } = contextOf(res);
  if (actor.type !== 'staff') throw new UnauthorizedError();
  return actor.staffId;
}

/**
 * @param {import('express').RequestHandler} handler
 * @returns {import('express').RequestHandler}
 */
const run = (handler) => (req, res, next) => {
  Promise.resolve()
    .then(() => handler(req, res, next))
    .catch(next);
};

/**
 * @param {{
 *   orgAdmin: ReturnType<typeof import('../modules/organizations/index.js').createOrgAdminService>,
 *   users: ReturnType<typeof import('../modules/identity/index.js').createUserRepository>,
 *   staffRoles: ReturnType<typeof import('../modules/access/index.js').createStaffRolesService>,
 * }} deps
 */
export function adminRoutes(deps) {
  const router = express.Router();
  router.get(
    '/admin/orgs',
    requirePermission(ORGS.platformOrgRead),
    validate({ query: OrgList }),
    run(async (_req, res) => res.json({ data: await deps.orgAdmin.list(res.locals.input.query) })),
  );
  router.get(
    '/admin/orgs/:id',
    requirePermission(ORGS.platformOrgRead),
    validate({ params: z.strictObject({ id: Id }) }),
    run(async (_req, res) => res.json(await deps.orgAdmin.detail(res.locals.input.params.id))),
  );
  router.post(
    '/admin/orgs',
    requirePermission(ORGS.platformOrgManage),
    validate({ body: NewOrg }),
    run(async (_req, res) => res.status(201).json(await deps.orgAdmin.create({ ...res.locals.input.body, staffId: staffId(res) }))),
  );
  router.post(
    '/admin/orgs/:id/suspend',
    requirePermission(ORGS.platformOrgManage),
    validate({ params: z.strictObject({ id: Id }), body: z.strictObject({ reason: z.string().trim().min(5).max(500) }) }),
    run(async (_req, res) => res.json(await deps.orgAdmin.suspend(res.locals.input.params.id, res.locals.input.body.reason, staffId(res)))),
  );
  router.post(
    '/admin/orgs/:id/reactivate',
    requirePermission(ORGS.platformOrgManage),
    validate({ params: z.strictObject({ id: Id }) }),
    run(async (_req, res) => res.json(await deps.orgAdmin.reactivate(res.locals.input.params.id, staffId(res)))),
  );
  router.use(userAndStaffRoutes(deps));
  return router;
}

/** @param {Parameters<typeof adminRoutes>[0]} deps */
function userAndStaffRoutes(deps) {
  const router = express.Router();
  router.get(
    '/admin/users',
    requirePermission(IDENTITY.platformUserRead),
    validate({ query: z.strictObject({ q: z.string().trim().min(2).max(100) }) }),
    run(async (_req, res) => res.json({ data: await deps.users.search(res.locals.input.query.q) })),
  );
  router.get(
    '/admin/users/:id',
    requirePermission(IDENTITY.platformUserRead),
    validate({ params: z.strictObject({ id: Id }) }),
    run(async (_req, res) => {
      const user = await deps.users.findById(res.locals.input.params.id);
      if (!user) throw new NotFoundError('USER_NOT_FOUND');
      res.json({ user, memberships: await deps.orgAdmin.membershipsForAdmin(user.id) });
    }),
  );
  router.get(
    '/admin/staff/:staffId/roles',
    requirePermission(ACCESS.platformStaffManage),
    validate({ params: z.strictObject({ staffId: Id }) }),
    run(async (_req, res) =>
      res.json({
        staffId: res.locals.input.params.staffId,
        roles: (await deps.staffRoles.get(res.locals.input.params.staffId))?.roles ?? [],
      }),
    ),
  );
  router.put(
    '/admin/staff/:staffId/roles',
    requirePermission(ACCESS.platformStaffManage),
    validate({ params: z.strictObject({ staffId: Id }), body: z.strictObject({ roles: z.array(z.string().min(5).max(40)).max(5) }) }),
    run(async (_req, res) =>
      res.json(await deps.staffRoles.setRoles(res.locals.input.params.staffId, res.locals.input.body.roles, `staff:${staffId(res)}`)),
    ),
  );
  return router;
}
