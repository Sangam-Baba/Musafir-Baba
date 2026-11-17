// @ts-check
/** PUBLIC interface of the organizations module — other modules import only from here. */
export { EVENTS } from './events.js';
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { ORGS_COLLECTION, OrganizationRecord } from './models/organization.model.js';
export { BRANCHES_COLLECTION } from './models/branch.model.js';
export { MEMBERS_COLLECTION, MemberRecord } from './models/member.model.js';
export { createOrganizationsService } from './organizations.service.js';
export { createInvitationsService } from './invitations.service.js';
export { createMemberRolesService, isRoleInUse } from './member-roles.service.js';
export { createOrgAdminService } from './admin.service.js';
export { INVITATIONS_COLLECTION, InvitationRecord } from './models/invitation.model.js';
export { organizationRoutes } from './routes.js';
