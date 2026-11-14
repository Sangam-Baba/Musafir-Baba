// @ts-check
/**
 * Team management for the selected org: roles (access module), invitations, member roles and the
 * organisation endpoints (organizations module), plus accepting invitations (needs identity too).
 * Built here so the modules never import each other's internals.
 */
import express from 'express';

import { queueEmail } from '../core/email.js';
import { createRolesService, roleRoutes } from '../modules/access/index.js';
import { auditRoutes, createAuditService } from '../modules/audit/index.js';
import {
  createInvitationsService,
  createMemberRolesService,
  createOrgAdminService,
  isRoleInUse,
  organizationRoutes,
} from '../modules/organizations/index.js';
import { createRateLimiter } from '../core/rate-limit.js';
import { adminAuthRoutes } from './admin-auth.js';
import { adminRoutes } from './admin.js';
import { PERMISSION_CATALOGUE } from '../permission-catalogue.js';
import { invitationRoutes } from './invitations.js';

/** @param {import('../core/clock.js').Clock} clock @param {(orgId: string, userId?: string) => void} accessChanged */
export const createRoles = (clock, accessChanged) =>
  createRolesService({ clock, catalogue: PERMISSION_CATALOGUE, isRoleInUse, accessChanged });

/**
 * @param {{ env: NodeJS.ProcessEnv, clock: import('../core/clock.js').Clock, roles: ReturnType<typeof createRoles>,
 *   identity: ReturnType<typeof import('./identity.js').createIdentity>, accessChanged: (orgId: string, userId?: string) => void,
 *   staffRoles: ReturnType<typeof import('../modules/access/index.js').createStaffRolesService> }} wiring
 */
export function createTeamRoutes(wiring) {
  const { env, clock, roles, identity } = wiring;
  const deps = {
    clock,
    secret: env.B2B_AUTH_SECRET,
    publicUrl: env.B2B_PUBLIC_URL || 'https://musafirbaba.com',
    permissionsOf: roles.permissionsOf,
    isKnownRole: roles.isKnownRole,
    sendEmail: (/** @type {import('../core/email.js').EmailMessage} */ message) =>
      queueEmail(message, { secret: String(env.B2B_AUTH_SECRET), clock }),
    accessChanged: wiring.accessChanged,
  };
  const invitations = createInvitationsService(deps);
  const router = express.Router();
  router.use(invitationRoutes({ invitations, users: identity.users, sessions: identity.sessions, secureCookies: identity.secureCookies }));
  router.use(organizationRoutes(identity.orgs, invitations, createMemberRolesService(deps)));
  router.use(roleRoutes(roles));
  router.use(auditRoutes(createAuditService({ clock })));
  const orgAdmin = createOrgAdminService({
    clock,
    orgs: identity.orgs,
    invitations,
    endOrgSessions: identity.sessions.revokeForOrg,
    accessChanged: wiring.accessChanged,
  });
  const verifyLimiter = createRateLimiter({ name: 'admin-mfa', points: 10, windowMs: 15 * 60_000, clock });
  router.use(adminAuthRoutes({ secret: env.B2B_AUTH_SECRET, clock, staffRoles: wiring.staffRoles, mfa: identity.mfa, verifyLimiter }));
  router.use(adminRoutes({ orgAdmin, users: identity.users, staffRoles: wiring.staffRoles }));
  return router;
}
