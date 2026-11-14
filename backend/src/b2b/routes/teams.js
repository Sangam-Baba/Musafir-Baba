// @ts-check
/**
 * Team management for the selected org: roles (access module), invitations, member roles and the
 * organisation endpoints (organizations module), plus accepting invitations (needs identity too).
 * Built here so the modules never import each other's internals.
 */
import express from 'express';

import { queueEmail } from '../core/email.js';
import { createRolesService, roleRoutes } from '../modules/access/index.js';
import { createInvitationsService, createMemberRolesService, isRoleInUse, organizationRoutes } from '../modules/organizations/index.js';
import { PERMISSION_CATALOGUE } from '../permission-catalogue.js';
import { invitationRoutes } from './invitations.js';

/** @param {import('../core/clock.js').Clock} clock */
export const createRoles = (clock) => createRolesService({ clock, catalogue: PERMISSION_CATALOGUE, isRoleInUse });

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 * @param {ReturnType<typeof createRoles>} roles
 * @param {ReturnType<typeof import('./identity.js').createIdentity>} identity
 */
export function createTeamRoutes(env, clock, roles, identity) {
  const deps = {
    clock,
    secret: env.B2B_AUTH_SECRET,
    publicUrl: env.B2B_PUBLIC_URL || 'https://musafirbaba.com',
    permissionsOf: roles.permissionsOf,
    isKnownRole: roles.isKnownRole,
    sendEmail: (/** @type {import('../core/email.js').EmailMessage} */ message) =>
      queueEmail(message, { secret: String(env.B2B_AUTH_SECRET), clock }),
  };
  const invitations = createInvitationsService(deps);
  const router = express.Router();
  router.use(invitationRoutes({ invitations, users: identity.users, sessions: identity.sessions, secureCookies: identity.secureCookies }));
  router.use(organizationRoutes(identity.orgs, invitations, createMemberRolesService(deps)));
  router.use(roleRoutes(roles));
  return router;
}
