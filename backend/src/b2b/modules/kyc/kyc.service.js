// @ts-check
/**
 * KYC applications (plan Stage 02). This task: create the draft at registration (with risk flags),
 * make sure every onboarding org has one (repeat-safe — registration has several steps and no
 * transaction), and read it for the org. Editing, documents and submission come in S02-T06.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ForbiddenError, NotFoundError } from '../../core/errors.js';
import { assessRisk } from './domain/hotel-details.js';
import { ApplicationRecord } from './models/application.model.js';

const DUPLICATE_CHECK = systemScope('kyc: is this GSTIN already used by another organisation');

/** @param {any} a */
export const applicationDto = (a) => ({
  id: String(a._id),
  orgId: a.orgId,
  orgType: a.orgType,
  status: a.status,
  details: a.details,
  documents: a.documents.map((/** @type {any} */ d) => ({ key: d.key, fileId: d.fileId, attachedAt: d.attachedAt })),
  risk: { flags: a.risk?.flags ?? [], highRisk: a.risk?.highRisk ?? false },
  submittedAt: a.submittedAt,
  decidedAt: a.decidedAt,
  updatedAt: a.updatedAt,
});

/** @param {{ clock: import('../../core/clock.js').Clock }} _deps the clock is used from S02-T06 (submit/decide times) */
export function createKycService(_deps) {
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
      const risk = details
        ? assessRisk(details, { duplicateGstin: await gstinUsedElsewhere(details.gstin, input.orgId) })
        : { flags: [], highRisk: false };
      try {
        const doc = await ApplicationRecord.create({
          orgId: input.orgId,
          orgType: input.orgType,
          details,
          gstRegistered: details?.gstRegistered ?? null,
          gstin: details?.gstin ?? null,
          risk,
          createdBy: input.createdBy,
        });
        return applicationDto(doc);
      } catch (error) {
        if (/** @type {{ code?: number }} */ (error).code !== 11000) throw error;
        return applicationDto(await ApplicationRecord.findOne({ orgId: input.orgId }).lean()); // created meanwhile
      }
    },

    /** The selected org's application. @param {import('../../core/context.js').RequestContext} ctx */
    async mine(ctx) {
      if (ctx.actor.type !== 'member') throw new ForbiddenError('ORG_NOT_SELECTED');
      const doc = await ApplicationRecord.findOne({ orgId: ctx.actor.orgId }).lean();
      if (!doc) throw new NotFoundError('KYC_APPLICATION_NOT_FOUND');
      return applicationDto(doc);
    },
  };
}
