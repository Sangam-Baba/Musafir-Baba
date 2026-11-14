// @ts-check
/**
 * Changing a member's roles and limits (plan Stage 01 §3.3 "assign roles to members with scope"):
 * roles (system keys or `custom:<id>`), `branchIds` (empty = all branches), `propertyIds` (hotel
 * staff), `ownOnly` (only records they created). Same safety rules as invitations:
 * - you can only give roles whose permissions you hold, and only change someone not above you;
 * - only an Owner can give or take the Owner role;
 * - the last Owner can't lose it (update → count Owners → undo if none).
 * Recorded as `organizations.member.roles-changed` in the same update (S01-T11 clears cached permissions on it).
 */
import { newEvent } from '../../core/db/events.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { assertCanGrant, includesOwner, memberOf, OWNER_ROLES } from './invitations.service.js';
import { BranchRecord } from './models/branch.model.js';
import { MemberRecord } from './models/member.model.js';

/**
 * Is any active member holding this role? (a custom role in use can't be deleted)
 * @param {string} orgId @param {string} roleRef
 */
export async function isRoleInUse(orgId, roleRef) {
  return (await MemberRecord.exists({ orgId, status: 'ACTIVE', roles: roleRef })) !== null;
}

/** @param {import('./invitations.service.js').InvitationDeps} deps */
export function createMemberRolesService(deps) {
  return {
    /**
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {string} userId
     * @param {{ roles: string[], branchIds?: string[], propertyIds?: string[], ownOnly?: boolean }} input
     */
    async assignRoles(ctx, userId, input) {
      const me = memberOf(ctx);
      const target = await MemberRecord.findOne({ orgId: me.orgId, userId, status: 'ACTIVE' }).lean();
      if (!target) throw new NotFoundError('MEMBER_NOT_FOUND');
      if (includesOwner(target.roles) && !me.isOwner) throw new ForbiddenError('CANNOT_CHANGE_MORE_POWERFUL_MEMBER');
      if ((await deps.permissionsOf(target.roles, me.orgType, me.orgId)).some((p) => !me.permissions.has(p))) {
        throw new ForbiddenError('CANNOT_CHANGE_MORE_POWERFUL_MEMBER');
      }
      await assertCanGrant(deps, me, input.roles);
      const branchIds = [...new Set(input.branchIds ?? [])];
      const active =
        branchIds.length === 0 ? 0 : await BranchRecord.countDocuments({ orgId: me.orgId, _id: { $in: branchIds }, status: 'ACTIVE' });
      if (active !== branchIds.length) throw new DomainError('BRANCH_NOT_FOUND');

      const roles = [...new Set(input.roles)];
      const change = { roles, branchIds, propertyIds: [...new Set(input.propertyIds ?? [])], ownOnly: input.ownOnly ?? false };
      const event = newEvent(
        EVENTS.memberRolesChanged,
        { orgId: me.orgId, userId, before: target.roles, after: roles, changedBy: me.userId },
        deps,
      );
      const done = await MemberRecord.updateOne(
        { _id: target._id, orgId: me.orgId, status: 'ACTIVE', roles: target.roles },
        { $set: { ...change, hasPendingEvents: true }, $push: { pendingEvents: event } },
      );
      if (done.modifiedCount !== 1) throw new ConflictError('MEMBER_CHANGED_MEANWHILE'); // someone else changed the roles first — reload and retry
      try {
        if (includesOwner(target.roles) && !includesOwner(roles)) await keepAnOwner(target, me.orgId, event.eventId);
      } finally {
        deps.accessChanged?.(me.orgId, userId);
      }
      return { userId, ...change };
    },
  };
}

/**
 * After taking the Owner role from someone: if no Owner is left, put their roles back.
 * @param {any} target @param {string} orgId @param {string} eventId
 */
async function keepAnOwner(target, orgId, eventId) {
  const owners = await MemberRecord.countDocuments({ orgId, status: 'ACTIVE', roles: { $in: OWNER_ROLES } });
  if (owners > 0) return;
  await MemberRecord.updateOne(
    { _id: target._id, orgId },
    {
      $set: { roles: target.roles, branchIds: target.branchIds, propertyIds: target.propertyIds, ownOnly: target.ownOnly },
      $pull: { pendingEvents: { eventId } },
    },
  );
  throw new ConflictError('LAST_OWNER');
}
