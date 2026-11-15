// @ts-check
/**
 * KYC applications (plan Stage 02 §3.5): the draft created at registration (repeat-safe — registration
 * has several steps and no transaction), the hotel's edits (details, documents) while DRAFT or REJECTED,
 * and submit. Every change is one conditional update on the application's `revision`, so two tabs can't
 * lose each other's work and submit only goes through on exactly what it checked. Submit is repeat-safe:
 * once submitted, submitting again returns the application unchanged. Status table: domain/workflow.js.
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { missingDocuments, requiredDocuments } from './domain/document-sets.js';
import { assessRisk } from './domain/hotel-details.js';
import { EDITABLE_STATUSES, isEditable, submitActionFor, transition } from './domain/workflow.js';
import { EVENTS } from './events.js';
import { ApplicationRecord } from './models/application.model.js';
import { protectBank, protectDetails, revealSealed } from './sensitive.js';

const DUPLICATE_CHECK = systemScope('kyc: is this GSTIN already used by another organisation');
const KYC_FILE_PURPOSE = 'kyc-document';

/** @param {any} a */
export const applicationDto = (a) => ({
  id: String(a._id),
  orgId: a.orgId,
  orgType: a.orgType,
  status: a.status,
  details: a.details,
  documents: a.documents.map((/** @type {any} */ d) => ({ key: d.key, fileId: d.fileId, attachedAt: d.attachedAt })),
  risk: { flags: a.risk?.flags ?? [], highRisk: a.risk?.highRisk ?? false },
  bank: a.bank ? { holderName: a.bank.holderName, ifsc: a.bank.ifsc, accountLast4: a.bank.accountLast4 } : null,
  revision: a.revision ?? 0,
  round: a.round ?? 0,
  history: (a.history ?? []).map((/** @type {any} */ h) => ({ at: h.at, action: h.action, status: h.status, note: h.note ?? null })),
  submittedAt: a.submittedAt,
  decidedAt: a.decidedAt,
  updatedAt: a.updatedAt,
});

/**
 * What the hotel sees after a rejection (S02-T09): MusafirBaba's note and each document's problem.
 * A reason is `resolved` once the hotel has attached a new file for it. Reviewer names are not shown.
 * @param {any} a
 */
function rejectionOf(a) {
  if (a.status !== 'REJECTED') return null;
  const current = new Map(a.documents.map((/** @type {any} */ d) => [d.key, d.fileId]));
  const reasons = (a.review?.verdicts ?? [])
    .filter((/** @type {any} */ v) => v.verdict !== 'VERIFIED')
    .map((/** @type {any} */ v) => ({ key: v.key, verdict: v.verdict, note: v.note ?? null, resolved: current.get(v.key) !== v.fileId }));
  return { note: a.review?.decisionNote ?? null, decidedAt: a.decidedAt, reasons };
}

/** The application as the hotel sees it: document list, what is missing, whether it can change it, why it was rejected @param {any} doc */
function hotelView(doc) {
  const documentSet = documentSetOf(doc);
  return {
    ...applicationDto(doc),
    documentSet,
    missingDocuments: missingDocuments(documentSet, doc.documents),
    editable: isEditable(doc.status),
    rejection: rejectionOf(doc),
  };
}

/** The documents this application needs (from configuration: org type + GST registration) @param {any} a */
const documentSetOf = (a) => requiredDocuments(a.orgType, { gstRegistered: a.gstRegistered ?? true });

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, fieldKey?: string,
 *   files?: { describe: (orgId: string, fileId: string) => Promise<{ purpose: string } | null> } }} KycDeps
 */

/** @param {import('../../core/context.js').RequestContext} ctx */
function orgOf(ctx) {
  if (ctx.actor.type !== 'member') throw new ForbiddenError('ORG_NOT_SELECTED');
  return { orgId: ctx.actor.orgId, by: `user:${ctx.actor.userId}` };
}

/** @param {string} orgId */
async function loadApplication(orgId) {
  const doc = await ApplicationRecord.findOne({ orgId }).lean();
  if (!doc) throw new NotFoundError('KYC_APPLICATION_NOT_FOUND');
  return /** @type {any} */ (doc);
}

/** @param {any} doc */
function loadEditable(doc) {
  if (!isEditable(doc.status)) throw new DomainError('KYC_NOT_EDITABLE', { status: doc.status });
  return doc;
}

/**
 * One hotel edit, only on the revision that was read and only while editable.
 * @param {any} doc
 * @param {Record<string, unknown>} set
 */
async function saveEdit(doc, set) {
  const res = await ApplicationRecord.updateOne(
    { orgId: doc.orgId, revision: doc.revision ?? 0, status: { $in: EDITABLE_STATUSES } },
    { $set: set, $inc: { revision: 1 } },
  );
  if (res.modifiedCount !== 1) throw new ConflictError('KYC_APPLICATION_CHANGED');
  return applicationDto(await loadApplication(doc.orgId));
}

/** @param {any} doc @param {boolean} emailVerified */
function assertReadyToSubmit(doc, emailVerified) {
  if (!emailVerified) throw new DomainError('EMAIL_NOT_VERIFIED');
  if (!doc.details) throw new DomainError('KYC_DETAILS_MISSING');
  if (!doc.bank) throw new DomainError('KYC_BANK_DETAILS_MISSING');
  const missing = missingDocuments(documentSetOf(doc), doc.documents);
  if (missing.length > 0) throw new DomainError('KYC_DOCUMENTS_MISSING', { missing });
}

/**
 * @param {KycDeps} deps
 * @param {{ orgId: string, doc: any, by: string }} input
 */
async function submitDoc(deps, { orgId, doc, by }) {
  const action = submitActionFor(doc.status);
  const status = transition(doc.status, action);
  const now = deps.clock.now();
  const type = action === 'submit' ? EVENTS.applicationSubmitted : EVENTS.applicationResubmitted;
  const payload = {
    orgId,
    applicationId: String(doc._id),
    orgType: doc.orgType,
    round: (doc.round ?? 0) + 1,
    highRisk: doc.risk.highRisk,
  };
  const res = await ApplicationRecord.updateOne(
    { orgId, status: doc.status, revision: doc.revision ?? 0 },
    {
      $set: { status, submittedAt: now, hasPendingEvents: true },
      $inc: { round: 1, revision: 1 },
      $push: { history: { at: now, action, status, by, note: null }, pendingEvents: newEvent(type, payload, deps) },
    },
  );
  const fresh = await loadApplication(orgId);
  if (res.modifiedCount !== 1 && isEditable(fresh.status)) throw new ConflictError('KYC_APPLICATION_CHANGED');
  return applicationDto(fresh); // a submit from another tab won the race: same result
}

/**
 * The hotel's edits while DRAFT or REJECTED.
 * @param {KycDeps} deps
 * @param {(gstin: string | null, orgId: string) => Promise<boolean>} gstinUsedElsewhere
 */
function hotelEdits(deps, gstinUsedElsewhere) {
  return {
    /**
     * New details (already checked by `validateHotelDetails`): risk is assessed again, and documents that
     * no longer belong to the set (e.g. a GST certificate after switching to "not registered") are dropped.
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {import('./domain/hotel-details.js').HotelDetails} details
     */
    async saveDetails(ctx, details) {
      const { orgId } = orgOf(ctx);
      const doc = loadEditable(await loadApplication(orgId));
      const risk = assessRisk(details, { duplicateGstin: await gstinUsedElsewhere(details.gstin, orgId) });
      const allowed = new Set(documentSetOf({ ...doc, gstRegistered: details.gstRegistered }).map((d) => d.key));
      const stored = protectDetails(details, { orgId, key: deps.fieldKey });
      return saveEdit(doc, {
        details: stored.details,
        'sensitive.panSealed': stored.panSealed,
        gstRegistered: details.gstRegistered,
        gstin: details.gstin,
        risk,
        documents: doc.documents.filter((/** @type {any} */ d) => allowed.has(d.key)),
      });
    },

    /**
     * Attach an uploaded file (this org's, uploaded for KYC) as one document of the set; replaces an earlier one.
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {{ key: string, fileId: string }} input
     */
    async attachDocument(ctx, input) {
      const { orgId } = orgOf(ctx);
      const doc = loadEditable(await loadApplication(orgId));
      if (!documentSetOf(doc).some((d) => d.key === input.key)) throw new DomainError('KYC_DOCUMENT_KEY_UNKNOWN', { key: input.key });
      const file = deps.files ? await deps.files.describe(orgId, input.fileId) : null;
      if (!file || file.purpose !== KYC_FILE_PURPOSE) throw new NotFoundError('FILE_NOT_FOUND');
      const others = doc.documents.filter((/** @type {any} */ d) => d.key !== input.key);
      return saveEdit(doc, { documents: [...others, { key: input.key, fileId: input.fileId, attachedAt: deps.clock.now() }] });
    },

    /**
     * The payout bank account (already checked by `validateBankDetails`); the number is stored sealed.
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {import('./domain/bank-details.js').BankDetails} bank
     */
    async saveBank(ctx, bank) {
      const { orgId } = orgOf(ctx);
      const doc = loadEditable(await loadApplication(orgId));
      const stored = protectBank(bank, { orgId, key: deps.fieldKey });
      return saveEdit(doc, { bank: stored.bank, 'sensitive.accountSealed': stored.accountSealed });
    },

    /** @param {import('../../core/context.js').RequestContext} ctx @param {string} key */
    async detachDocument(ctx, key) {
      const doc = loadEditable(await loadApplication(orgOf(ctx).orgId));
      if (!doc.documents.some((/** @type {any} */ d) => d.key === key)) throw new NotFoundError('KYC_DOCUMENT_NOT_ATTACHED');
      return saveEdit(doc, { documents: doc.documents.filter((/** @type {any} */ d) => d.key !== key) });
    },
  };
}

/** @param {KycDeps} deps */
export function createKycService(deps) {
  /** @param {string | null} gstin @param {string} orgId */
  async function gstinUsedElsewhere(gstin, orgId) {
    if (!gstin) return false;
    return (await ApplicationRecord.exists({ gstin, orgId: { $ne: orgId } }).setOptions(DUPLICATE_CHECK)) !== null;
  }

  return {
    gstinUsedElsewhere,

    /**
     * Repeat-safe: one application per org (unique index); a second call returns the existing one.
     * @param {{ orgId: string, orgType: 'CLIENT' | 'HOTEL', createdBy: string, details?: import('./domain/hotel-details.js').HotelDetails | null }} input
     */
    async ensureApplication(input) {
      const existing = await ApplicationRecord.findOne({ orgId: input.orgId }).lean();
      if (existing) return applicationDto(existing);
      const details = input.details ?? null;
      const stored = details ? protectDetails(details, { orgId: input.orgId, key: deps.fieldKey }) : null;
      const risk = details
        ? assessRisk(details, { duplicateGstin: await gstinUsedElsewhere(details.gstin, input.orgId) })
        : { flags: [], highRisk: false };
      try {
        const doc = await ApplicationRecord.create({
          orgId: input.orgId,
          orgType: input.orgType,
          details: stored?.details ?? null,
          sensitive: { panSealed: stored?.panSealed ?? null, accountSealed: null },
          gstRegistered: details?.gstRegistered ?? null,
          gstin: details?.gstin ?? null,
          risk,
          history: [{ at: deps.clock.now(), action: 'created', status: 'DRAFT', by: `user:${input.createdBy}`, note: null }],
          createdBy: input.createdBy,
        });
        return applicationDto(doc);
      } catch (error) {
        if (/** @type {{ code?: number }} */ (error).code !== 11000) throw error;
        return applicationDto(await ApplicationRecord.findOne({ orgId: input.orgId }).lean()); // created meanwhile
      }
    },

    /** The selected org's application, with its document list and what is still missing. @param {import('../../core/context.js').RequestContext} ctx */
    async mine(ctx) {
      return hotelView(await loadApplication(orgOf(ctx).orgId));
    },

    ...hotelEdits(deps, gstinUsedElsewhere),

    /**
     * The full PAN and bank account number, for a MusafirBaba reviewer comparing them with the documents.
     * The caller checks the permission; every view is recorded (event → audit log).
     * @param {string} orgId
     * @param {string} viewer e.g. `staff:<id>`
     */
    async revealSensitive(orgId, viewer) {
      const doc = await loadApplication(orgId);
      const values = revealSealed(doc.sensitive ?? {}, { orgId, key: deps.fieldKey });
      const event = newEvent(EVENTS.sensitiveViewed, { orgId, applicationId: String(doc._id), viewer }, deps);
      await ApplicationRecord.updateOne({ orgId }, { $set: { hasPendingEvents: true }, $push: { pendingEvents: event } });
      return values;
    },

    /**
     * Submit (first time) or resubmit (after a rejection). Repeat-safe: an application that is already
     * submitted, under review or decided is returned unchanged.
     * @param {import('../../core/context.js').RequestContext} ctx
     * @param {{ emailVerified: boolean }} facts
     */
    async submit(ctx, facts) {
      const { orgId, by } = orgOf(ctx);
      const doc = await loadApplication(orgId);
      if (!isEditable(doc.status)) return applicationDto(doc);
      assertReadyToSubmit(doc, facts.emailVerified);
      return submitDoc(deps, { orgId, doc, by });
    },
  };
}
