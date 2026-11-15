// @ts-check
/**
 * Unfinished registrations (plan Stage 02 §3.10, D15 preliminary): applications still in DRAFT long after
 * they were started. The reminder is one conditional update that records it and carries
 * `kyc.application.reminded` (the notifications module sends the bell entry and the email), so it happens
 * once. The purge itself is driven by flows/kyc-retention.js; this module only finds and deletes its drafts.
 */
import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { EVENTS } from './events.js';
import { ApplicationRecord } from './models/application.model.js';

const HOUSEKEEPING = systemScope('kyc: unfinished registrations', { routine: true });

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createKycHousekeeping(deps) {
  return {
    /**
     * Sends (once) the reminder for drafts started before `startedBefore`.
     * @param {{ startedBefore: Date, limit?: number }} input
     * @returns {Promise<number>} reminders sent
     */
    async remindUnfinished(input) {
      const drafts = await ApplicationRecord.find({ status: 'DRAFT', remindedAt: null, createdAt: { $lt: input.startedBefore } })
        .sort({ createdAt: 1 })
        .limit(input.limit ?? 100)
        .setOptions(HOUSEKEEPING)
        .lean();
      let sent = 0;
      for (const d of drafts) {
        const event = newEvent(EVENTS.applicationReminded, { orgId: d.orgId, applicationId: String(d._id), orgType: d.orgType }, deps);
        const res = await ApplicationRecord.updateOne(
          { _id: d._id, orgId: d.orgId, status: 'DRAFT', remindedAt: null },
          { $set: { remindedAt: deps.clock.now(), hasPendingEvents: true }, $push: { pendingEvents: event } },
        );
        sent += res.modifiedCount;
      }
      return sent;
    },

    /**
     * Orgs whose draft was started before `startedBefore` (to purge).
     * @param {{ startedBefore: Date, limit?: number }} input
     * @returns {Promise<{ orgId: string, orgType: string }[]>}
     */
    async unfinishedBefore(input) {
      const drafts = await ApplicationRecord.find({ status: 'DRAFT', createdAt: { $lt: input.startedBefore } }, { orgId: 1, orgType: 1 })
        .sort({ createdAt: 1 })
        .limit(input.limit ?? 100)
        .setOptions(HOUSEKEEPING)
        .lean();
      return drafts.map((d) => ({ orgId: d.orgId, orgType: d.orgType }));
    },

    /** Deletes the org's application only while it is still a draft (sealed PAN / bank number go with it). @param {string} orgId */
    async deleteDraft(orgId) {
      return (await ApplicationRecord.deleteOne({ orgId, status: 'DRAFT' })).deletedCount === 1;
    },
  };
}
