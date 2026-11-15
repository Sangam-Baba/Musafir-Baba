// @ts-check
/**
 * MusafirBaba's KYC review (plan Stage 02 §3.6, §3.9, security §8):
 * - queue: oldest submitted first, filters for status, org type and risk;
 * - take: SUBMITTED → UNDER_REVIEW with a 30-minute lock for one reviewer. An expired lock is free again:
 *   any reviewer can take it over (the status stays UNDER_REVIEW, so nothing has to run to "release" it);
 * - a verdict per document file (VERIFIED / MISMATCH / UNREADABLE) — tied to the file, so a resubmitted
 *   document needs a new verdict while unchanged ones keep theirs;
 * - decision: reject (with a note; the reasons are the documents not verified) or approve (every required
 *   document verified). High risk needs two people: the first approval is recorded and the lock let go;
 *   a second reviewer with `platform.kyc.approve` — never the same person — gives the final approval;
 * - a reviewer can never decide an application of an organisation they belong to themselves.
 * Every step is one conditional update that only goes through while the reviewer still holds the lock.
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { missingDocuments, requiredDocuments } from './domain/document-sets.js';
import { transition } from './domain/workflow.js';
import { EVENTS } from './events.js';
import { applicationDto } from './kyc.service.js';
import { ApplicationRecord } from './models/application.model.js';
import { PERMISSIONS } from './permissions.js';

export const REVIEW_LOCK_MS = 30 * 60_000;
const ADMIN_READ = systemScope('kyc: MusafirBaba review queue');
const ID = /^[a-f0-9]{24}$/;

/** @typedef {{ staffId: string, permissions: readonly string[] }} Reviewer */
/**
 * @typedef {{ clock: import('../../core/clock.js').Clock,
 *   isOwnOrg?: (staffId: string, orgId: string) => Promise<boolean> }} ReviewDeps
 */

/** @param {any} a */
const reviewDto = (a) => ({
  reviewerId: a.review?.reviewerId ?? null,
  lockedUntil: a.review?.lockedUntil ?? null,
  verdicts: (a.review?.verdicts ?? []).map((/** @type {any} */ v) => ({
    key: v.key,
    fileId: v.fileId,
    verdict: v.verdict,
    note: v.note,
    by: v.by,
    at: v.at,
  })),
  firstApproval: a.review?.firstApproval
    ? { by: a.review.firstApproval.by, at: a.review.firstApproval.at, note: a.review.firstApproval.note }
    : null,
  decisionNote: a.review?.decisionNote ?? null,
});

/** @param {any} a */
const queueItem = (a) => ({
  id: String(a._id),
  orgId: a.orgId,
  orgType: a.orgType,
  legalName: a.details?.legalName ?? null,
  status: a.status,
  round: a.round ?? 0,
  risk: { flags: a.risk?.flags ?? [], highRisk: a.risk?.highRisk ?? false },
  submittedAt: a.submittedAt,
  reviewerId: a.review?.reviewerId ?? null,
  lockedUntil: a.review?.lockedUntil ?? null,
  awaitingSecondApproval: Boolean(a.review?.firstApproval),
});

/** @param {string} id */
async function loadById(id) {
  const doc = ID.test(id) ? await ApplicationRecord.findOne({ _id: id }).setOptions(ADMIN_READ).lean() : null;
  if (!doc) throw new NotFoundError('KYC_APPLICATION_NOT_FOUND');
  return /** @type {any} */ (doc);
}

/** The verdict of the file currently attached under each key @param {any} doc */
function currentVerdicts(doc) {
  const verdicts = doc.review?.verdicts ?? [];
  return doc.documents.map((/** @type {any} */ d) => ({
    key: d.key,
    verdict: verdicts.find((/** @type {any} */ v) => v.key === d.key && v.fileId === d.fileId) ?? null,
  }));
}

/** @param {any} doc */
function notVerified(doc) {
  const required = requiredDocuments(doc.orgType, { gstRegistered: doc.gstRegistered ?? true }).filter((d) => d.required);
  const verified = currentVerdicts(doc).filter((/** @type {any} */ c) => c.verdict?.verdict === 'VERIFIED');
  return missingDocuments(required, verified);
}

/** Filter matching only while this reviewer holds a live lock @param {any} doc @param {string} staffId @param {Date} now */
const heldBy = (doc, staffId, now) => ({
  _id: doc._id,
  status: 'UNDER_REVIEW',
  'review.reviewerId': staffId,
  'review.lockedUntil': { $gt: now },
});

/** @param {any} doc @param {string} staffId @param {Date} now */
function assertHolds(doc, staffId, now) {
  if (doc.status !== 'UNDER_REVIEW') throw new ConflictError('KYC_NOT_UNDER_REVIEW');
  if (doc.review?.reviewerId !== staffId || !(doc.review?.lockedUntil > now)) throw new ConflictError('KYC_NOT_ASSIGNED_TO_YOU');
}

/**
 * @param {any} doc
 * @param {Record<string, unknown>} filter
 * @param {Record<string, unknown>} update
 */
async function apply(doc, filter, update) {
  const res = await ApplicationRecord.updateOne(filter, update).setOptions(ADMIN_READ);
  if (res.modifiedCount !== 1) throw new ConflictError('KYC_APPLICATION_CHANGED');
  return loadById(String(doc._id));
}

/** @param {any} doc @param {string} type @param {Record<string, unknown>} extra @param {ReviewDeps} deps */
const eventFor = (doc, type, extra, deps) =>
  newEvent(type, { orgId: doc.orgId, applicationId: String(doc._id), orgType: doc.orgType, ...extra }, deps);

/** @param {string} action @param {string} status @param {{ by: string, at: Date, note?: string | null }} who */
const historyEntry = (action, status, { by, at, note = null }) => ({ at, action, status, by, note });

/**
 * Take an application: from the queue, a lock that expired, one waiting for its second approval, or
 * renew your own lock.
 * @param {ReviewDeps} deps
 * @param {Reviewer} who
 * @param {string} id
 */
async function take(deps, who, id) {
  const doc = await loadById(id);
  const now = deps.clock.now();
  const by = `staff:${who.staffId}`;
  const lock = { 'review.reviewerId': who.staffId, 'review.lockedUntil': new Date(now.getTime() + REVIEW_LOCK_MS) };
  if (doc.status === 'SUBMITTED') {
    const status = transition('SUBMITTED', 'take');
    return apply(
      doc,
      { _id: doc._id, status: 'SUBMITTED' },
      {
        $set: { status, ...lock, hasPendingEvents: true },
        $push: {
          history: historyEntry('take', status, { by, at: now }),
          pendingEvents: eventFor(doc, EVENTS.applicationAssigned, { reviewer: by }, deps),
        },
      },
    );
  }
  if (doc.status !== 'UNDER_REVIEW') throw new ConflictError('KYC_NOT_IN_QUEUE');
  const free = { $or: [{ 'review.lockedUntil': null }, { 'review.lockedUntil': { $lte: now } }, { 'review.reviewerId': who.staffId }] };
  const res = await ApplicationRecord.updateOne({ _id: doc._id, status: 'UNDER_REVIEW', ...free }, { $set: lock }).setOptions(ADMIN_READ);
  if (res.matchedCount !== 1) throw new ConflictError('KYC_LOCKED_BY_ANOTHER_REVIEWER');
  return loadById(id);
}

/**
 * Let go: back to the queue, or — after a first approval — waiting for the second approver.
 * @param {ReviewDeps} deps
 * @param {Reviewer} who
 * @param {string} id
 */
async function release(deps, who, id) {
  const doc = await loadById(id);
  const now = deps.clock.now();
  assertHolds(doc, who.staffId, now);
  const unlock = { 'review.reviewerId': null, 'review.lockedUntil': null };
  if (doc.review?.firstApproval) return apply(doc, heldBy(doc, who.staffId, now), { $set: unlock });
  const status = transition('UNDER_REVIEW', 'release');
  return apply(doc, heldBy(doc, who.staffId, now), {
    $set: { status, ...unlock },
    $push: { history: historyEntry('release', status, { by: `staff:${who.staffId}`, at: now }) },
  });
}

/**
 * @param {ReviewDeps} deps
 * @param {Reviewer} who
 * @param {string} id
 * @param {{ key: string, verdict: 'VERIFIED' | 'MISMATCH' | 'UNREADABLE', note: string | null }} input
 */
async function setVerdict(deps, who, id, input) {
  const doc = await loadById(id);
  const now = deps.clock.now();
  assertHolds(doc, who.staffId, now);
  const attached = doc.documents.find((/** @type {any} */ d) => d.key === input.key);
  if (!attached) throw new NotFoundError('KYC_DOCUMENT_NOT_ATTACHED');
  const others = (doc.review?.verdicts ?? []).filter((/** @type {any} */ v) => v.key !== input.key);
  const verdict = {
    key: input.key,
    fileId: attached.fileId,
    verdict: input.verdict,
    note: input.note,
    by: `staff:${who.staffId}`,
    at: now,
  };
  return apply(doc, heldBy(doc, who.staffId, now), { $set: { 'review.verdicts': [...others, verdict] } });
}

/**
 * @param {ReviewDeps} deps
 * @param {{ who: Reviewer, doc: any, note: string }} input
 */
async function reject(deps, { who, doc, note }) {
  const now = deps.clock.now();
  const by = `staff:${who.staffId}`;
  const reasons = currentVerdicts(doc)
    .filter((/** @type {any} */ c) => c.verdict && c.verdict.verdict !== 'VERIFIED')
    .map((/** @type {any} */ c) => ({ key: c.key, verdict: c.verdict.verdict, note: c.verdict.note }));
  const status = transition('UNDER_REVIEW', 'reject');
  return apply(doc, heldBy(doc, who.staffId, now), {
    $set: {
      status,
      decidedAt: now,
      'review.decisionNote': note,
      'review.firstApproval': null,
      'review.reviewerId': null,
      'review.lockedUntil': null,
      hasPendingEvents: true,
    },
    $push: {
      history: historyEntry('reject', status, { by, at: now, note }),
      pendingEvents: eventFor(doc, EVENTS.applicationRejected, { rejectedBy: by, reasons }, deps),
    },
  });
}

/**
 * @param {ReviewDeps} deps
 * @param {{ who: Reviewer, doc: any, note: string | null }} input
 */
async function approve(deps, { who, doc, note }) {
  const now = deps.clock.now();
  const by = `staff:${who.staffId}`;
  const unverified = notVerified(doc);
  if (unverified.length > 0) throw new DomainError('KYC_DOCUMENTS_NOT_VERIFIED', { keys: unverified });
  const first = doc.review?.firstApproval;
  if (doc.risk?.highRisk && !first) {
    return apply(doc, heldBy(doc, who.staffId, now), {
      $set: { 'review.firstApproval': { by, at: now, note }, 'review.reviewerId': null, 'review.lockedUntil': null },
      $push: { history: historyEntry('first-approval', 'UNDER_REVIEW', { by, at: now, note }) },
    });
  }
  if (first && first.by === by) throw new ForbiddenError('KYC_SECOND_APPROVER_MUST_DIFFER');
  if (first && !who.permissions.includes(PERMISSIONS.platformSecondApproval)) throw new ForbiddenError('KYC_SECOND_APPROVER_REQUIRED');
  const status = transition('UNDER_REVIEW', 'approve');
  const approvedBy = first ? [first.by, by] : [by];
  return apply(doc, heldBy(doc, who.staffId, now), {
    $set: {
      status,
      decidedAt: now,
      'review.decisionNote': note,
      'review.reviewerId': null,
      'review.lockedUntil': null,
      hasPendingEvents: true,
    },
    $push: {
      history: historyEntry('approve', status, { by, at: now, note }),
      pendingEvents: eventFor(doc, EVENTS.applicationApproved, { approvedBy, legalName: doc.details?.legalName ?? null }, deps),
    },
  });
}

/** @param {ReviewDeps} deps */
export function createKycReviewService(deps) {
  /** @param {any} doc */
  const detail = (doc) => ({
    ...applicationDto(doc),
    review: reviewDto(doc),
    documentSet: requiredDocuments(doc.orgType, { gstRegistered: doc.gstRegistered ?? true }),
    notVerified: notVerified(doc),
  });

  return {
    /** @param {{ status?: string[], orgType?: string, highRisk?: boolean, limit?: number }} f */
    async queue(f) {
      /** @type {Record<string, unknown>} */
      const filter = { status: { $in: f.status ?? ['SUBMITTED', 'UNDER_REVIEW'] } };
      if (f.orgType) filter.orgType = f.orgType;
      if (f.highRisk !== undefined) filter['risk.highRisk'] = f.highRisk;
      const docs = await ApplicationRecord.find(filter)
        .sort({ submittedAt: 1, _id: 1 })
        .limit(Math.min(f.limit ?? 50, 200))
        .setOptions(ADMIN_READ)
        .lean();
      return docs.map(queueItem);
    },
    /** @param {string} id */
    get: async (id) => detail(await loadById(id)),
    /** @param {Reviewer} who @param {string} id */
    take: async (who, id) => detail(await take(deps, who, id)),
    /** @param {Reviewer} who @param {string} id */
    release: async (who, id) => detail(await release(deps, who, id)),
    /** @param {Reviewer} who @param {string} id @param {Parameters<typeof setVerdict>[3]} input */
    setVerdict: async (who, id, input) => detail(await setVerdict(deps, who, id, input)),

    /**
     * @param {Reviewer} who
     * @param {string} id
     * @param {{ decision: 'APPROVE' | 'REJECT', note: string | null }} input
     */
    async decide(who, id, input) {
      const doc = await loadById(id);
      assertHolds(doc, who.staffId, deps.clock.now());
      if (deps.isOwnOrg && (await deps.isOwnOrg(who.staffId, doc.orgId))) throw new ForbiddenError('KYC_OWN_ORGANISATION');
      if (input.decision === 'REJECT') {
        if (!input.note) throw new DomainError('KYC_REJECTION_NOTE_REQUIRED');
        return detail(await reject(deps, { who, doc, note: input.note }));
      }
      return detail(await approve(deps, { who, doc, note: input.note }));
    },
  };
}
