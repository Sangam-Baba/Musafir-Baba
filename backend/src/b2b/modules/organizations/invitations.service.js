// @ts-check
/**
 * Invitations and member removal (plan Stage 01 §3.2, §7).
 * - Nobody can hand out more than they hold: the permissions of the invited roles must all be in
 *   the inviter's own permissions (an Admin can't invite an Owner). Same rule for removing someone.
 * - The link is `<invitationId>.<secret>`; a keyed hash of the secret is stored; 7 days; single use.
 * - claim(): PENDING → ACCEPTED with ONE conditional update (two clicks can't both win). If adding
 *   the membership then fails, release() puts the invitation back (P2-style undo).
 * - removeMember(): remove → count the remaining Owners → if none, undo. Two Owners removing each
 *   other at the same moment therefore can't leave the org without an Owner (at worst both undo).
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, ServiceUnavailableError } from '../../core/errors.js';
import { normaliseEmail } from '../identity/index.js';
import { invitationEmail } from './emails.js';
import { EVENTS } from './events.js';
import { BranchRecord } from './models/branch.model.js';
import { INVITATION_TTL_MS, InvitationRecord } from './models/invitation.model.js';
import { MemberRecord } from './models/member.model.js';
import { OrganizationRecord } from './models/organization.model.js';

const ID = /^[a-f0-9]{24}$/;
const OWNER_ROLES = ['client.owner', 'hotel.owner'];
const BY_LINK = systemScope('organizations: invitation lookup by emailed link', { routine: true });

/**
 * @typedef {{
 *   clock: import('../../core/clock.js').Clock,
 *   secret: string | undefined,
 *   publicUrl: string,
 *   permissionsOf: (roles: readonly string[], orgType: 'PLATFORM' | 'CLIENT' | 'HOTEL') => string[],
 *   isKnownRole: (role: string, orgType: 'PLATFORM' | 'CLIENT' | 'HOTEL') => boolean,
 *   sendEmail: (message: import('../../core/email.js').EmailMessage) => Promise<unknown>,
 * }} InvitationDeps
 */

/** @param {readonly string[]} roles */
const includesOwner = (roles) => roles.some((r) => OWNER_ROLES.includes(r));

/** @param {import('../../core/context.js').RequestContext} ctx */
function memberOf(ctx) {
  if (ctx.actor.type !== 'member' || !ctx.actor.orgType) throw new ForbiddenError('ORG_NOT_SELECTED');
  const roles = ctx.actor.roles ?? [];
  return {
    orgId: ctx.actor.orgId,
    orgType: ctx.actor.orgType,
    userId: ctx.actor.userId,
    permissions: new Set(ctx.actor.permissions),
    isOwner: includesOwner(roles),
  };
}

/** @param {any} i */
const invitationDto = (i) => ({
  id: String(i._id),
  email: i.email,
  roles: i.roles,
  branchIds: i.branchIds,
  propertyIds: i.propertyIds,
  status: i.status,
  expiresAt: i.expiresAt,
  invitedBy: i.invitedBy,
});

/** @typedef {{ deps: InvitationDeps, hash: (secretPart: string) => string }} Kit */

/**
 * The actor must hold every permission the roles would grant.
 * @param {InvitationDeps} deps @param {ReturnType<typeof memberOf>} me @param {readonly string[]} roles
 */
function assertCanGrant(deps, me, roles) {
  if (roles.length === 0) throw new DomainError('ROLE_REQUIRED');
  for (const role of roles) if (!deps.isKnownRole(role, me.orgType)) throw new DomainError('ROLE_UNKNOWN', { role });
  // only an Owner can make an Owner: the Owner role stays above every other role even while others hold the same permissions
  if (includesOwner(roles) && !me.isOwner) throw new ForbiddenError('CANNOT_GRANT_MORE_THAN_YOU_HAVE');
  if (deps.permissionsOf(roles, me.orgType).some((p) => !me.permissions.has(p)))
    throw new ForbiddenError('CANNOT_GRANT_MORE_THAN_YOU_HAVE');
}

/** @param {Kit} kit @param {unknown} token @returns {Promise<any | null>} the pending, unexpired invitation behind a link */
async function findByLink(kit, token) {
  if (typeof token !== 'string' || token.length > 200) return null;
  const [id, secretPart] = token.split('.');
  if (!id || !ID.test(id) || !secretPart || secretPart.length < 30) return null;
  const invite = await InvitationRecord.findOne({ _id: id, status: 'PENDING', expiresAt: { $gt: kit.deps.clock.now() } })
    .setOptions(BY_LINK)
    .lean();
  if (!invite) return null;
  const expected = Buffer.from(invite.secretHash);
  const given = Buffer.from(kit.hash(secretPart));
  return expected.length === given.length && timingSafeEqual(expected, given) ? invite : null;
}

/**
 * @param {Kit} kit
 * @param {import('../../core/context.js').RequestContext} ctx
 * @param {{ email: string, roles: string[], branchIds?: string[], propertyIds?: string[] }} input
 */
async function createInvitation(kit, ctx, input) {
  const { deps } = kit;
  const me = memberOf(ctx);
  assertCanGrant(deps, me, input.roles);
  const branchIds = input.branchIds ?? [];
  const activeBranches =
    branchIds.length === 0 ? 0 : await BranchRecord.countDocuments({ orgId: me.orgId, _id: { $in: branchIds }, status: 'ACTIVE' });
  if (activeBranches !== branchIds.length) throw new DomainError('BRANCH_NOT_FOUND');
  const email = normaliseEmail(input.email);
  // an expired invitation must not block a new one (one open invitation per org and email)
  await InvitationRecord.updateMany(
    { orgId: me.orgId, email, status: 'PENDING', expiresAt: { $lte: deps.clock.now() } },
    { $set: { status: 'REVOKED' } },
  );
  const org = await OrganizationRecord.findOne({ _id: me.orgId }, { displayName: 1 }).lean();
  const secretPart = randomBytes(32).toString('base64url');
  const doc = new InvitationRecord({
    orgId: me.orgId,
    email,
    roles: input.roles,
    branchIds,
    propertyIds: input.propertyIds ?? [],
    secretHash: kit.hash(secretPart),
    expiresAt: new Date(deps.clock.now().getTime() + INVITATION_TTL_MS),
    invitedBy: me.userId,
  });
  const event = newEvent(
    EVENTS.memberInvited,
    { orgId: me.orgId, invitationId: String(doc._id), roles: input.roles, invitedBy: me.userId },
    deps,
  );
  doc.set({ pendingEvents: [event], hasPendingEvents: true });
  try {
    await doc.save();
  } catch (error) {
    if (/** @type {{ code?: number }} */ (error).code === 11000) throw new ConflictError('INVITATION_ALREADY_PENDING');
    throw error;
  }
  const link = `${deps.publicUrl.replace(/\/$/, '')}/business/invite?token=${encodeURIComponent(`${doc._id}.${secretPart}`)}`;
  await deps.sendEmail(invitationEmail({ to: email, orgName: org?.displayName ?? 'an organisation', link, days: 7 }));
  return invitationDto(doc);
}

/**
 * Marks the invitation used by `userId` (one conditional update) and adds the membership; undoes the
 * claim if the membership can't be added. Single use.
 * @param {Kit} kit @param {unknown} token @param {string} userId @param {string} userEmail must match the invitation
 * @returns {Promise<{ orgId: string }>}
 */
async function acceptInvitation(kit, token, userId, userEmail) {
  const invite = await findByLink(kit, token);
  if (!invite) throw new NotFoundError('INVITATION_INVALID');
  if (invite.email !== normaliseEmail(userEmail)) throw new ForbiddenError('INVITATION_FOR_ANOTHER_EMAIL');
  const now = kit.deps.clock.now();
  const claimed = await InvitationRecord.updateOne(
    { _id: invite._id, orgId: invite.orgId, status: 'PENDING', expiresAt: { $gt: now } },
    { $set: { status: 'ACCEPTED', acceptedBy: userId, acceptedAt: now } },
  );
  if (claimed.modifiedCount !== 1) throw new NotFoundError('INVITATION_INVALID'); // used or revoked a moment ago
  try {
    await addMembership(invite, userId, kit.deps);
  } catch (error) {
    await InvitationRecord.updateOne(
      { _id: invite._id, orgId: invite.orgId, acceptedBy: userId },
      { $set: { status: 'PENDING', acceptedBy: null, acceptedAt: null } },
    );
    throw error;
  }
  return { orgId: invite.orgId };
}

/** @param {InvitationDeps} deps */
export function createInvitationsService(deps) {
  /** @type {Kit} */
  const kit = {
    deps,
    hash: (secretPart) => {
      if (!deps.secret || deps.secret.length < 32) throw new ServiceUnavailableError('BUSINESS_LOGIN_NOT_CONFIGURED');
      return createHmac('sha256', deps.secret).update(`invite:${secretPart}`).digest('base64url');
    },
  };
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {Parameters<typeof createInvitation>[2]} input */
    invite: (ctx, input) => createInvitation(kit, ctx, input),
    /** @param {unknown} token @param {string} userId @param {string} userEmail */
    accept: (token, userId, userEmail) => acceptInvitation(kit, token, userId, userEmail),
    /** The invited email for a link (to pre-fill the sign-up form). @param {unknown} token */
    emailFor: async (token) => (await findByLink(kit, token))?.email ?? null,

    /** @param {import('../../core/context.js').RequestContext} ctx */
    async list(ctx) {
      const { orgId } = memberOf(ctx);
      const docs = await InvitationRecord.find({ orgId, status: 'PENDING', expiresAt: { $gt: deps.clock.now() } })
        .sort({ createdAt: -1 })
        .lean();
      return docs.map(invitationDto);
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} id */
    async revoke(ctx, id) {
      const { orgId } = memberOf(ctx);
      if (!ID.test(id)) throw new NotFoundError('INVITATION_NOT_FOUND');
      const done = await InvitationRecord.updateOne({ _id: id, orgId, status: 'PENDING' }, { $set: { status: 'REVOKED' } });
      if (done.matchedCount !== 1) throw new NotFoundError('INVITATION_NOT_FOUND');
    },

    /** What the accept page shows. @param {unknown} token */
    async lookup(token) {
      const invite = await findByLink(kit, token);
      if (!invite) return null;
      const org = await OrganizationRecord.findOne({ _id: invite.orgId }, { displayName: 1, type: 1 }).lean();
      return {
        invitationId: String(invite._id),
        email: invite.email,
        orgName: org?.displayName ?? '',
        orgType: org?.type ?? null,
        roles: invite.roles,
      };
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} userId */
    async removeMember(ctx, userId) {
      const me = memberOf(ctx);
      const target = await MemberRecord.findOne({ orgId: me.orgId, userId, status: 'ACTIVE' }).lean();
      if (!target) throw new NotFoundError('MEMBER_NOT_FOUND');
      if (includesOwner(target.roles) && !me.isOwner) throw new ForbiddenError('CANNOT_REMOVE_MORE_POWERFUL_MEMBER');
      if (deps.permissionsOf(target.roles, me.orgType).some((p) => !me.permissions.has(p)))
        throw new ForbiddenError('CANNOT_REMOVE_MORE_POWERFUL_MEMBER');
      await removeKeepingAnOwner(target, me, deps);
    },
  };
}

/** @param {any} invite @param {string} userId @param {InvitationDeps} deps */
async function addMembership(invite, userId, deps) {
  const now = deps.clock.now();
  const event = newEvent(EVENTS.memberJoined, { orgId: invite.orgId, userId, roles: invite.roles, invitationId: String(invite._id) }, deps);
  try {
    await MemberRecord.updateOne(
      { orgId: invite.orgId, userId, status: { $ne: 'ACTIVE' } },
      {
        $set: {
          status: 'ACTIVE',
          roles: invite.roles,
          branchIds: invite.branchIds,
          propertyIds: invite.propertyIds,
          ownOnly: false,
          joinedAt: now,
          removedAt: null,
          hasPendingEvents: true,
        },
        $push: { pendingEvents: event },
      },
      { upsert: true },
    );
  } catch (error) {
    if (/** @type {{ code?: number }} */ (error).code === 11000) throw new ConflictError('ALREADY_A_MEMBER');
    throw error;
  }
}

/**
 * Remove → verify at least one Owner remains → otherwise undo (no transactions needed).
 * @param {any} target @param {ReturnType<typeof memberOf>} me @param {InvitationDeps} deps
 */
async function removeKeepingAnOwner(target, me, deps) {
  const now = deps.clock.now();
  const event = newEvent(EVENTS.memberRemoved, { orgId: me.orgId, userId: target.userId, removedBy: me.userId }, deps);
  const removed = await MemberRecord.updateOne(
    { _id: target._id, orgId: me.orgId, status: 'ACTIVE' },
    { $set: { status: 'REMOVED', removedAt: now, hasPendingEvents: true }, $push: { pendingEvents: event } },
  );
  if (removed.modifiedCount !== 1) throw new NotFoundError('MEMBER_NOT_FOUND');
  if (!target.roles.some((/** @type {string} */ r) => OWNER_ROLES.includes(r))) return;
  const owners = await MemberRecord.countDocuments({ orgId: me.orgId, status: 'ACTIVE', roles: { $in: OWNER_ROLES } });
  if (owners > 0) return;
  await MemberRecord.updateOne(
    { _id: target._id, orgId: me.orgId, status: 'REMOVED' },
    { $set: { status: 'ACTIVE', removedAt: null }, $pull: { pendingEvents: { eventId: event.eventId } } },
  );
  throw new ConflictError('LAST_OWNER');
}
