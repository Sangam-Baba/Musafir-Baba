// @ts-check
/**
 * Unfinished hotel registrations (plan Stage 02 §3.10; days from B2B_KYC_REMIND_DAYS / B2B_KYC_PURGE_DAYS).
 * Flows = background steps that cross modules (kyc, files, organizations, identity), composed here
 * like the routes layer does for requests.
 * - after `remindAfterDays`: one reminder (bell + email to the Owners, via the notifications module);
 * - after `purgeAfterDays` still unfinished: the org closed, its memberships and sessions
 *   ended, its documents deleted, then the draft (with the sealed PAN / bank number) deleted. No transaction: each
 *   step is repeat-safe and the draft goes last, so an interrupted purge is simply finished on the next run.
 *   An org that is not onboarding any more (activated, suspended) is never touched.
 * The user account stays (it may belong to other orgs, and the person can register again).
 */
import { createSessionService } from '../modules/identity/index.js';
import { createKycHousekeeping } from '../modules/kyc/index.js';
import { createOrganizationsService } from '../modules/organizations/index.js';
import { createAccessChangeNotifier } from '../routes/access-cache.js';

export const RETENTION_EVERY_MS = 6 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
export const PURGE_REASON = 'UNFINISHED_REGISTRATION';

/**
 * @param {{ clock: import('../core/clock.js').Clock, logger: import('../core/logger.js').Logger,
 *   files: { removeAll: (orgId: string) => Promise<number> }, secret?: string,
 *   remindAfterDays: number, purgeAfterDays: number }} deps
 */
export function createKycRetention(deps) {
  const kyc = createKycHousekeeping(deps);
  const orgs = createOrganizationsService(deps);
  const sessions = createSessionService({ secret: deps.secret, clock: deps.clock });
  const accessChanged = createAccessChangeNotifier(deps);
  const daysAgo = (/** @type {number} */ days) => new Date(deps.clock.now().getTime() - days * DAY_MS);

  /** @param {string} orgId @returns {Promise<boolean>} purged */
  async function purge(orgId) {
    const info = await orgs.basicInfo(orgId);
    if (info && info.status !== 'ONBOARDING' && info.status !== 'CLOSED') return false;
    if (info) {
      const { closed } = await orgs.closeUnfinished({ orgId, reason: PURGE_REASON });
      if (!closed) return false; // activated or suspended meanwhile — keep everything
      await sessions.revokeForOrg(orgId, 'ORG_CLOSED');
      accessChanged(orgId);
    }
    await deps.files.removeAll(orgId);
    return kyc.deleteDraft(orgId);
  }

  return {
    purge,
    /** One pass: reminders, then removals. @returns {Promise<{ reminded: number, purged: number }>} */
    async runOnce() {
      const reminded = await kyc.remindUnfinished({ startedBefore: daysAgo(deps.remindAfterDays) });
      let purged = 0;
      for (const { orgId } of await kyc.unfinishedBefore({ startedBefore: daysAgo(deps.purgeAfterDays) })) {
        try {
          if (await purge(orgId)) purged += 1;
        } catch (error) {
          deps.logger.error({ err: error, orgId }, 'kyc retention: purge failed (next run tries again)');
        }
      }
      return { reminded, purged };
    },
  };
}
