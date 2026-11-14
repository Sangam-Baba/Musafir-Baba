// @ts-check
/**
 * MusafirBaba admin view of organisations (plan Stage 01 §3.6, §3.10): list / search, detail with
 * members, create (+ owner invitation), suspend with a reason, reactivate.
 * Suspension ends every session opened in that org (passed in: `endOrgSessions`) and clears cached
 * permissions (`accessChanged`) — its members are out on their very next request.
 * Reads cross every org, so they use systemScope with a reason (logged).
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, NotFoundError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { MemberRecord } from './models/member.model.js';
import { OrganizationRecord } from './models/organization.model.js';

const ID = /^[a-f0-9]{24}$/;
const ADMIN_READ = systemScope('organizations: MusafirBaba admin view');

/** @param {string} s */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @param {any} o */
const orgDto = (o) => ({
  id: String(o._id),
  type: o.type,
  reference: o.reference,
  legalName: o.legalName,
  displayName: o.displayName,
  status: o.status,
  statusReason: o.statusReason ?? null,
  createdAt: o.createdAt,
});

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   orgs: ReturnType<typeof import('./organizations.service.js').createOrganizationsService>,
 *   invitations: ReturnType<typeof import('./invitations.service.js').createInvitationsService>,
 *   endOrgSessions: (orgId: string, reason: string) => Promise<number>,
 *   accessChanged?: (orgId: string, userId?: string) => void }} OrgAdminDeps
 */

/**
 * Suspends or reactivates an org (one conditional update with its event), then ends the org's sessions.
 * @param {OrgAdminDeps} deps
 * @param {string} orgId
 * @param {'SUSPENDED' | 'ACTIVE'} to
 * @param {{ reason: string | null, staffId: string }} change
 */
async function setStatus(deps, orgId, to, change) {
  const { reason, staffId } = change;
  if (!ID.test(orgId)) throw new NotFoundError('ORG_NOT_FOUND');
  const from = to === 'SUSPENDED' ? ['ONBOARDING', 'ACTIVE'] : ['SUSPENDED'];
  const event = newEvent(
    to === 'SUSPENDED' ? EVENTS.orgSuspended : EVENTS.orgReactivated,
    { orgId, reason, changedBy: `staff:${staffId}` },
    deps,
  );
  const done = await OrganizationRecord.updateOne(
    { _id: orgId, status: { $in: from } },
    { $set: { status: to, statusReason: reason, hasPendingEvents: true }, $push: { pendingEvents: event } },
  );
  if (done.matchedCount !== 1) {
    const exists = await OrganizationRecord.exists({ _id: orgId });
    throw exists ? new ConflictError(to === 'SUSPENDED' ? 'ORG_NOT_ACTIVE' : 'ORG_NOT_SUSPENDED') : new NotFoundError('ORG_NOT_FOUND');
  }
  const sessionsEnded = to === 'SUSPENDED' ? await deps.endOrgSessions(orgId, 'ORG_SUSPENDED') : 0;
  deps.accessChanged?.(orgId);
  return { orgId, status: to, sessionsEnded };
}

/** @param {{ type?: string | undefined, status?: string | undefined, q?: string | undefined, limit?: number | undefined }} f */
async function listOrgs(f) {
  /** @type {Record<string, unknown>} */
  const filter = {};
  if (f.type) filter.type = f.type;
  if (f.status) filter.status = f.status;
  if (f.q) {
    const re = new RegExp(escapeRegex(f.q.trim()), 'i');
    filter.$or = [{ legalName: re }, { displayName: re }, { reference: f.q.trim().toUpperCase() }];
  }
  const docs = await OrganizationRecord.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(f.limit ?? 50, 200))
    .setOptions(ADMIN_READ)
    .lean();
  return docs.map(orgDto);
}

/** Every membership of a user (any status), for the admin user page. @param {string} userId */
async function membershipsOfUser(userId) {
  const members = await MemberRecord.find({ userId }).lean();
  const orgs = await OrganizationRecord.find({ _id: { $in: members.map((m) => m.orgId) } }, { displayName: 1, type: 1, status: 1 })
    .setOptions(ADMIN_READ)
    .lean();
  const byId = new Map(orgs.map((o) => [String(o._id), o]));
  return members.map((m) => ({
    orgId: m.orgId,
    orgName: byId.get(m.orgId)?.displayName ?? null,
    orgType: byId.get(m.orgId)?.type ?? null,
    orgStatus: byId.get(m.orgId)?.status ?? null,
    status: m.status,
    roles: m.roles,
  }));
}

/**
 * @param {{ clock: import('../../core/clock.js').Clock,
 *   orgs: ReturnType<typeof import('./organizations.service.js').createOrganizationsService>,
 *   invitations: ReturnType<typeof import('./invitations.service.js').createInvitationsService>,
 *   endOrgSessions: (orgId: string, reason: string) => Promise<number>,
 *   accessChanged?: (orgId: string, userId?: string) => void }} deps
 */
export function createOrgAdminService(deps) {
  return {
    /** @param {Parameters<typeof listOrgs>[0]} f */
    list: (f) => listOrgs(f),

    /** @param {string} orgId */
    async detail(orgId) {
      if (!ID.test(orgId)) throw new NotFoundError('ORG_NOT_FOUND');
      const org = await OrganizationRecord.findOne({ _id: orgId }).lean();
      if (!org) throw new NotFoundError('ORG_NOT_FOUND');
      const members = await MemberRecord.find({ orgId }).sort({ joinedAt: 1 }).lean();
      return {
        ...orgDto(org),
        members: members.map((m) => ({
          userId: m.userId,
          status: m.status,
          roles: m.roles,
          branchIds: m.branchIds,
          propertyIds: m.propertyIds,
          joinedAt: m.joinedAt,
        })),
      };
    },

    /**
     * Creates a client or hotel org (onboarding) and, if given, emails its future owner an invitation.
     * @param {{ type: 'CLIENT' | 'HOTEL', legalName: string, displayName?: string | undefined, ownerEmail?: string | undefined, staffId: string }} input
     */
    async create(input) {
      const org = await deps.orgs.createOrganization({
        type: input.type,
        legalName: input.legalName,
        displayName: input.displayName,
        createdBy: `staff:${input.staffId}`,
      });
      const invitation = input.ownerEmail
        ? await deps.invitations.inviteOwnerAsAdmin({ orgId: org.id, orgType: input.type, email: input.ownerEmail, staffId: input.staffId })
        : null;
      return { ...org, invitation };
    },

    /** @param {string} orgId @param {string} reason @param {string} staffId */
    suspend: (orgId, reason, staffId) => setStatus(deps, orgId, 'SUSPENDED', { reason, staffId }),
    /** @param {string} orgId @param {string} staffId */
    reactivate: (orgId, staffId) => setStatus(deps, orgId, 'ACTIVE', { reason: null, staffId }),

    /** @param {string} userId */
    membershipsForAdmin: (userId) => membershipsOfUser(userId),
  };
}
