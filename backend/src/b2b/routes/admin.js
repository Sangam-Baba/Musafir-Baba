// @ts-check
/**
 * MusafirBaba admin endpoints under /api/v1/admin (plan Stage 01 §3.6, §3.10, §5). They need the
 * B2B admin pass (routes/admin-auth.js) — the platform permissions below are only ever held by staff.
 * GET  /admin/orgs · GET /admin/orgs/:id · POST /admin/orgs · POST /admin/orgs/:id/suspend · POST /admin/orgs/:id/reactivate
 * GET  /admin/users · GET /admin/users/:id
 * GET  /admin/staff · GET /admin/staff/lookup?email= · GET /admin/staff/:staffId/roles · PUT /admin/staff/:staffId/roles
 *   (staff are read from the existing admin accounts through legacy-read — never written)
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
import { findStaffByEmail, findStaffById } from '../legacy-read/index.js';

const Id = z.string().regex(/^[a-f0-9]{24}$/);
const OrgList = z.strictObject({
  type: z.enum(['CLIENT', 'HOTEL', 'BUS_OPERATOR']).optional(),
  status: z.enum(['ONBOARDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
const NewOrg = z.strictObject({
  type: z.enum(['CLIENT', 'HOTEL', 'BUS_OPERATOR']),
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
  router.use(staffRoutes(deps));
  return router;
}

/** Who has B2B admin access, and giving it (Super Admins). @param {Parameters<typeof adminRoutes>[0]} deps */
function staffRoutes(deps) {
  const router = express.Router();
  router.get(
    '/admin/staff',
    requirePermission(ACCESS.platformStaffManage),
    run(async (_req, res) => {
      const list = await deps.staffRoles.list();
      const people = await Promise.all(list.map((s) => findStaffById(s.staffId)));
      res.json({
        data: list.map((s, i) => ({
          ...s,
          name: people[i]?.name ?? null,
          email: people[i]?.email ?? null,
          isActive: people[i]?.isActive ?? false,
        })),
      });
    }),
  );
  router.get(
    '/admin/staff/lookup',
    requirePermission(ACCESS.platformStaffManage),
    validate({ query: z.strictObject({ email: z.string().trim().min(3).max(254) }) }),
    run(async (_req, res) => {
      const staff = await findStaffByEmail(res.locals.input.query.email);
      if (!staff) throw new NotFoundError('STAFF_NOT_FOUND');
      res.json({
        staffId: staff.id,
        name: staff.name,
        email: staff.email,
        isActive: staff.isActive,
        roles: (await deps.staffRoles.get(staff.id))?.roles ?? [],
      });
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
