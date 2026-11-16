// @ts-check
/**
 * Several GST registrations for one business (S03-T03a). A company has one PAN but needs a GSTIN in every
 * state where it runs a hotel, so besides the main GSTIN in its details it can add further GSTINs — one per
 * state, each with its GST certificate. Same checks as the main one (valid GSTIN, the PAN inside it is the
 * business's PAN), duplicates on other organisations flagged, and each is verified by MusafirBaba on its own:
 * adding one after approval never takes the business offline. Businesses with a different PAN register as a
 * separate organisation under the same login. Properties use `verifiedGstins` (the GSTIN for their state).
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { isValidGstin, normaliseTaxId, panOfGstin } from './domain/tax-ids.js';
import { EVENTS } from './events.js';
import { ApplicationRecord } from './models/application.model.js';
import { revealSealed } from './sensitive.js';

const CROSS_ORG = systemScope('kyc: GSTIN used by another organisation / review of a GST registration');
const ID = /^[a-f0-9]{24}$/;
const KYC_FILE_PURPOSE = 'kyc-document';

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, fieldKey?: string,
 *   files?: { describe: (orgId: string, fileId: string) => Promise<{ purpose: string } | null> },
 *   isOwnOrg?: (staffId: string, orgId: string) => Promise<boolean> }} GstDeps
 */

/** @param {import('../../core/context.js').RequestContext} ctx */
function memberOf(ctx) {
  if (ctx.actor.type !== 'member') throw new ForbiddenError('ORG_NOT_SELECTED');
  return { orgId: ctx.actor.orgId, by: `user:${ctx.actor.userId}` };
}

/** @param {string} orgId */
async function load(orgId) {
  const doc = await ApplicationRecord.findOne({ orgId }).lean();
  if (!doc) throw new NotFoundError('KYC_APPLICATION_NOT_FOUND');
  return /** @type {any} */ (doc);
}

/** @param {string} gstin @param {string} orgId */
async function usedElsewhere(gstin, orgId) {
  const filter = { orgId: { $ne: orgId }, $or: [{ gstin }, { 'gstRegistrations.gstin': gstin }] };
  return (await ApplicationRecord.exists(filter).setOptions(CROSS_ORG)) !== null;
}

/**
 * The GSTIN must be valid, belong to this business's PAN, and be for a state not covered yet.
 * @param {GstDeps} deps
 * @param {any} doc
 * @param {string} raw
 */
function checkGstin(deps, doc, raw) {
  if (!doc.details?.gstRegistered) throw new DomainError('KYC_NOT_GST_REGISTERED');
  const gstin = normaliseTaxId(raw);
  if (!isValidGstin(gstin)) throw new DomainError('GSTIN_INVALID');
  const { pan } = revealSealed(doc.sensitive ?? {}, { orgId: doc.orgId, key: deps.fieldKey });
  if (pan && panOfGstin(gstin) !== pan) throw new DomainError('PAN_NOT_IN_GSTIN');
  const stateCode = gstin.slice(0, 2);
  const taken = [doc.gstin?.slice(0, 2), ...(doc.gstRegistrations ?? []).map((/** @type {any} */ g) => g.stateCode)];
  if (taken.includes(stateCode)) throw new ConflictError('GST_STATE_ALREADY_ADDED');
  return { gstin, stateCode };
}

/**
 * MusafirBaba verifies or rejects one GST registration (never for their own organisation).
 * @param {GstDeps} deps
 * @param {{ who: { staffId: string }, applicationId: string, registrationId: string, input: { decision: 'VERIFY' | 'REJECT', note: string | null } }} a
 */
async function decideRegistration(deps, { who, applicationId, registrationId, input }) {
  const doc = ID.test(applicationId) ? await ApplicationRecord.findOne({ _id: applicationId }).setOptions(CROSS_ORG).lean() : null;
  const reg = doc?.gstRegistrations?.find((g) => String(g._id) === registrationId);
  if (!doc || !reg) throw new NotFoundError('GST_REGISTRATION_NOT_FOUND');
  if (deps.isOwnOrg && (await deps.isOwnOrg(who.staffId, doc.orgId))) throw new ForbiddenError('KYC_OWN_ORGANISATION');
  if (input.decision === 'REJECT' && !input.note) throw new DomainError('KYC_REJECTION_NOTE_REQUIRED');
  const status = input.decision === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
  const by = `staff:${who.staffId}`;
  const event = newEvent(
    EVENTS.gstRegistrationDecided,
    { orgId: doc.orgId, applicationId, registrationId, stateCode: reg.stateCode, decision: status },
    deps,
  );
  const res = await ApplicationRecord.updateOne(
    { _id: doc._id, orgId: doc.orgId, gstRegistrations: { $elemMatch: { _id: reg._id, status: 'PENDING' } } },
    {
      $set: {
        'gstRegistrations.$.status': status,
        'gstRegistrations.$.note': input.note,
        'gstRegistrations.$.decidedBy': by,
        'gstRegistrations.$.decidedAt': deps.clock.now(),
        hasPendingEvents: true,
      },
      $push: { pendingEvents: event },
    },
  );
  if (res.modifiedCount !== 1) throw new ConflictError('GST_REGISTRATION_ALREADY_DECIDED');
  return { orgId: doc.orgId };
}

/**
 * The GSTINs a property may invoice under: the main one once the business is verified, plus each verified
 * extra registration. `[]` for a business below the GST threshold.
 * @param {string} orgId
 * @returns {Promise<{ stateCode: string, gstin: string }[]>}
 */
async function verifiedGstins(orgId) {
  const doc = /** @type {any} */ (await ApplicationRecord.findOne({ orgId }).lean());
  if (!doc || !doc.details?.gstRegistered) return [];
  const main = doc.status === 'APPROVED' && doc.gstin ? [{ stateCode: doc.gstin.slice(0, 2), gstin: doc.gstin }] : [];
  const extra = (doc.gstRegistrations ?? []).filter((/** @type {any} */ g) => g.status === 'VERIFIED');
  return [...main, ...extra.map((/** @type {any} */ g) => ({ stateCode: g.stateCode, gstin: g.gstin }))];
}

/**
 * For properties: is the business GST-registered, and which GSTINs (per state) are verified.
 * @param {string} orgId
 * @returns {Promise<{ registered: boolean, verified: { stateCode: string, gstin: string }[] }>}
 */
async function gstStatus(orgId) {
  const doc = /** @type {any} */ (await ApplicationRecord.findOne({ orgId }, { details: 1 }).lean());
  return { registered: Boolean(doc?.details?.gstRegistered), verified: await verifiedGstins(orgId) };
}

/** @param {GstDeps} deps */
export function createGstRegistrations(deps) {
  return {
    /** @param {import('../../core/context.js').RequestContext} ctx @param {{ gstin: string, fileId: string }} input */
    async add(ctx, input) {
      const { orgId, by } = memberOf(ctx);
      const doc = await load(orgId);
      const { gstin, stateCode } = checkGstin(deps, doc, input.gstin);
      const file = deps.files ? await deps.files.describe(orgId, input.fileId) : null;
      if (!file || file.purpose !== KYC_FILE_PURPOSE) throw new NotFoundError('FILE_NOT_FOUND');
      const reg = {
        stateCode,
        gstin,
        fileId: input.fileId,
        status: 'PENDING',
        duplicate: await usedElsewhere(gstin, orgId),
        addedBy: by,
        addedAt: deps.clock.now(),
      };
      const res = await ApplicationRecord.updateOne(
        { orgId, 'gstRegistrations.stateCode': { $ne: stateCode } },
        { $push: { gstRegistrations: reg } },
      );
      if (res.modifiedCount !== 1) throw new ConflictError('GST_STATE_ALREADY_ADDED'); // added from another tab meanwhile
      const fresh = await load(orgId);
      const added = fresh.gstRegistrations.find((/** @type {any} */ g) => g.stateCode === stateCode);
      const event = newEvent(
        EVENTS.gstRegistrationAdded,
        { orgId, applicationId: String(fresh._id), registrationId: String(added._id), stateCode },
        deps,
      );
      await ApplicationRecord.updateOne({ orgId }, { $set: { hasPendingEvents: true }, $push: { pendingEvents: event } });
      return load(orgId);
    },

    /** Only one that is not verified yet. @param {import('../../core/context.js').RequestContext} ctx @param {string} id */
    async remove(ctx, id) {
      const { orgId } = memberOf(ctx);
      const res = ID.test(id)
        ? await ApplicationRecord.updateOne(
            // the condition sits in the filter, so a verified registration is never removed
            { orgId, gstRegistrations: { $elemMatch: { _id: id, status: { $in: ['PENDING', 'REJECTED'] } } } },
            { $pull: { gstRegistrations: { _id: id } } },
          )
        : null;
      if (!res || res.modifiedCount !== 1) throw new NotFoundError('GST_REGISTRATION_NOT_FOUND');
      return load(orgId);
    },

    /** @param {{ staffId: string }} who @param {string} applicationId @param {string} registrationId @param {{ decision: 'VERIFY' | 'REJECT', note: string | null }} input */
    decide: (who, applicationId, registrationId, input) => decideRegistration(deps, { who, applicationId, registrationId, input }),

    verifiedGstins,
    gstStatus,
  };
}
