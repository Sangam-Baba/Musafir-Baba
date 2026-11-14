// @ts-check
/**
 * Organisations, members and branches (plan Stage 01 §3.2).
 * - createOrganization(): org + owner membership; `organizations.org.created` and
 *   `organizations.member.joined` are stored with the documents (P5). Used by admins (S01-T14) and by
 *   registration in Stage 02 / 10. Two documents, each written once with its event — if the second
 *   write fails the org simply has no owner yet and an admin can invite one (no partial money/state).
 * - membershipsOf / usableMembership / defaultOrgFor: what the sign-in and the authenticator need.
 * - Branch and member reads take ctx: the org comes from ctx, never from input.
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { newReference } from '../../core/ids.js';
import { EVENTS } from './events.js';
import { BranchRecord } from './models/branch.model.js';
import { MemberRecord } from './models/member.model.js';
import { OrganizationRecord, USABLE_ORG_STATUSES } from './models/organization.model.js';

/** @typedef {'CLIENT' | 'HOTEL'} BusinessOrgType */
/** @typedef {{ orgId: string, reference: string, displayName: string, type: string, status: string, roles: string[] }} MembershipSummary */
/** @typedef {{ orgId: string, orgType: 'PLATFORM' | 'CLIENT' | 'HOTEL', roles: string[], branchIds: string[], propertyIds: string[], ownOnly: boolean }} UsableMembership */

const OWNER_ROLE = /** @type {const} */ ({ CLIENT: 'client.owner', HOTEL: 'hotel.owner' });
const ID = /^[a-f0-9]{24}$/;
const BY_MEMBER_ORGS = systemScope('organizations: org details for a member', { routine: true });

/** @param {import('../../core/context.js').RequestContext} ctx */
function orgOf(ctx) {
  if (ctx.actor.type !== 'member') throw new ForbiddenError('ORG_NOT_SELECTED');
  return ctx.actor.orgId;
}

/** @param {any} b */
const branchDto = (b) => ({ id: String(b._id), name: b.name, city: b.city, stateCode: b.stateCode, status: b.status });

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createOrganizationsService(deps) {
  return {
    /**
     * @param {{ type: BusinessOrgType, legalName: string, displayName?: string, ownerUserId?: string, status?: 'ONBOARDING' | 'ACTIVE', createdBy: string }} input
     * @returns {Promise<{ id: string, reference: string }>}
     */
    async createOrganization(input) {
      const org = new OrganizationRecord({
        type: input.type,
        reference: newReference(input.type === 'CLIENT' ? 'MBC' : 'MBHO'),
        legalName: input.legalName.trim(),
        displayName: (input.displayName ?? input.legalName).trim(),
        status: input.status ?? 'ONBOARDING',
      });
      org.set({
        pendingEvents: [newEvent(EVENTS.orgCreated, { orgId: String(org._id), type: input.type, createdBy: input.createdBy }, deps)],
        hasPendingEvents: true,
      });
      await org.save();
      if (input.ownerUserId)
        await this.addMember({
          orgId: String(org._id),
          userId: input.ownerUserId,
          roles: [OWNER_ROLE[input.type]],
          addedBy: input.createdBy,
        });
      return { id: String(org._id), reference: org.reference };
    },

    /**
     * Adds (or re-activates) a member. Repeat-safe: the unique {orgId, userId} index keeps one membership.
     * @param {{ orgId: string, userId: string, roles: string[], branchIds?: string[], propertyIds?: string[], addedBy: string }} input
     */
    async addMember(input) {
      const now = deps.clock.now();
      const event = newEvent(
        EVENTS.memberJoined,
        { orgId: input.orgId, userId: input.userId, roles: input.roles, addedBy: input.addedBy },
        deps,
      );
      await MemberRecord.updateOne(
        { orgId: input.orgId, userId: input.userId, status: { $ne: 'ACTIVE' } },
        {
          $set: {
            status: 'ACTIVE',
            roles: input.roles,
            branchIds: input.branchIds ?? [],
            propertyIds: input.propertyIds ?? [],
            joinedAt: now,
            removedAt: null,
            hasPendingEvents: true,
          },
          $push: { pendingEvents: event },
        },
        { upsert: true },
      ).catch((/** @type {any} */ error) => {
        if (error?.code !== 11000) throw error; // already an active member — nothing to do
      });
    },

    ...memberFunctions(),
    ...branchFunctions(),
  };
}

/** Membership reads used by sign-in, the authenticator and the team page. */
function memberFunctions() {
  /** @param {string} userId @returns {Promise<MembershipSummary[]>} orgs the user can sign in to, oldest membership first */
  async function membershipsOf(userId) {
    const members = await MemberRecord.find({ userId, status: 'ACTIVE' }).sort({ joinedAt: 1 }).lean();
    if (members.length === 0) return [];
    const orgs = await OrganizationRecord.find({ _id: { $in: members.map((m) => m.orgId) }, status: { $in: USABLE_ORG_STATUSES } })
      .setOptions(BY_MEMBER_ORGS)
      .lean();
    const byId = new Map(orgs.map((o) => [String(o._id), o]));
    return members.flatMap((m) => {
      const o = byId.get(m.orgId);
      return o
        ? [{ orgId: m.orgId, reference: o.reference, displayName: o.displayName, type: o.type, status: o.status, roles: m.roles }]
        : [];
    });
  }
  return {
    membershipsOf,
    /** @param {string} userId @returns {Promise<string | null>} the org to open at sign-in when there is exactly one */
    async defaultOrgFor(userId) {
      const list = await membershipsOf(userId);
      return list.length === 1 ? /** @type {MembershipSummary} */ (list[0]).orgId : null;
    },

    /**
     * The membership behind a session's selected org — only if the member is active and the org usable.
     * @param {string} orgId @param {string} userId @returns {Promise<UsableMembership | null>}
     */
    async usableMembership(orgId, userId) {
      if (!ID.test(orgId)) return null;
      const [m, org] = await Promise.all([
        MemberRecord.findOne({ orgId, userId, status: 'ACTIVE' }).lean(),
        OrganizationRecord.findOne({ _id: orgId, status: { $in: USABLE_ORG_STATUSES } }, { type: 1 }).lean(),
      ]);
      if (!m || !org) return null;
      return { orgId, orgType: org.type, roles: m.roles, branchIds: m.branchIds, propertyIds: m.propertyIds, ownOnly: m.ownOnly };
    },

    /** @param {import('../../core/context.js').RequestContext} ctx */
    async listMembers(ctx) {
      const members = await MemberRecord.find({ orgId: orgOf(ctx), status: 'ACTIVE' })
        .sort({ joinedAt: 1 })
        .lean();
      return members.map((m) => ({
        userId: m.userId,
        roles: m.roles,
        branchIds: m.branchIds,
        propertyIds: m.propertyIds,
        ownOnly: m.ownOnly,
        joinedAt: m.joinedAt,
      }));
    },
  };
}

/** Branches exist only for B2B clients. */
function branchFunctions() {
  /** @param {import('../../core/context.js').RequestContext} ctx */
  async function clientOrg(ctx) {
    const orgId = orgOf(ctx);
    const org = await OrganizationRecord.findOne({ _id: orgId }, { type: 1 }).lean();
    if (org?.type !== 'CLIENT') throw new DomainError('BRANCHES_ONLY_FOR_CLIENTS');
    return orgId;
  }
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx */
    async listBranches(ctx) {
      return (
        await BranchRecord.find({ orgId: orgOf(ctx) })
          .sort({ name: 1 })
          .lean()
      ).map(branchDto);
    },
    /** @param {import('../../core/context.js').RequestContext} ctx @param {{ name: string, city?: string | undefined, stateCode?: string | undefined }} input */
    async createBranch(ctx, input) {
      const doc = await BranchRecord.create({
        orgId: await clientOrg(ctx),
        name: input.name.trim(),
        city: input.city ?? null,
        stateCode: input.stateCode ?? null,
      });
      return branchDto(doc);
    },
    /**
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {string} id
     * @param {{ name?: string | undefined, city?: string | undefined, stateCode?: string | undefined, status?: 'ACTIVE' | 'CLOSED' | undefined }} input
     */
    async updateBranch(ctx, id, input) {
      if (!ID.test(id)) throw new NotFoundError('BRANCH_NOT_FOUND');
      const set = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
      const doc = await BranchRecord.findOneAndUpdate({ _id: id, orgId: orgOf(ctx) }, { $set: set }, { new: true }).lean();
      if (!doc) throw new NotFoundError('BRANCH_NOT_FOUND'); // other orgs' branches look like missing ones
      return branchDto(doc);
    },
  };
}
