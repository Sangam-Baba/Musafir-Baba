// @ts-check
/** Permissions of the organizations module (seeded into acl_permissions by the access module). */
import { definePermissions } from '../../core/permissions.js';

const ALL = /** @type {const} */ (['PLATFORM', 'CLIENT', 'HOTEL', 'BUS_OPERATOR']);

export const { codes: PERMISSIONS, catalogue: PERMISSION_CATALOGUE } = definePermissions('Team', {
  orgRead: { code: 'organizations.org.read', description: "See the organisation's profile", orgTypes: ALL },
  orgUpdate: {
    code: 'organizations.org.update',
    description: "Edit the organisation's profile",
    orgTypes: ['CLIENT', 'HOTEL', 'BUS_OPERATOR'],
  },
  memberRead: { code: 'organizations.member.read', description: 'See team members and open invitations', orgTypes: ALL },
  memberInvite: { code: 'organizations.member.invite', description: 'Invite people to the team', orgTypes: ALL },
  memberRemove: { code: 'organizations.member.remove', description: 'Remove people from the team', orgTypes: ALL },
  branchRead: { code: 'organizations.branch.read', description: 'See branches', orgTypes: ['CLIENT'] },
  branchManage: { code: 'organizations.branch.manage', description: 'Create, edit and close branches', orgTypes: ['CLIENT'] },
  platformOrgRead: {
    code: 'platform.org.read',
    description: 'MusafirBaba admin: see every client and hotel organisation',
    orgTypes: ['PLATFORM'],
  },
  platformOrgManage: {
    code: 'platform.org.manage',
    description: 'MusafirBaba admin: create organisations, suspend and reactivate them',
    orgTypes: ['PLATFORM'],
    sensitive: true,
  },
});
