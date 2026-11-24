// @ts-check
/**
 * Stage 15 wiring: payout runs get each hotel's facts from KYC (approved, bank holder / IFSC, when bank details last
 * changed) and its open statement disputes; the bank file reads the account number through KYC's `revealSensitive`
 * (every view recorded in the audit log). Mounted next to the Stage 11 / 13 routes.
 */
import express from 'express';

import { ApplicationRecord, createKycService } from '../modules/kyc/index.js';
import { OrganizationRecord } from '../modules/organizations/index.js';
import { createLedger, createPayoutRuns, createStatementDisputes, openDisputes } from '../modules/wallet/index.js';
import { stage15AdminRoutes } from './payout-finance-admin.js';
import { financePortalRoutes } from './finance-portal.js';
import { createFiles } from './files.js';
import { adminReportsFor, clientReportsFor } from './reports-wiring.js';
import { systemHealthRoutes } from './system-health.js';
import { privacyRoutes } from './privacy.js';

const SCOPE = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'payouts: hotel facts' };

/** @param {string} orgId @returns {Promise<import('../modules/wallet/payout-runs.service.js').HotelFacts>} */
export async function hotelFacts(orgId) {
  const [org, app] = await Promise.all([
    OrganizationRecord.findOne({ _id: orgId }, { displayName: 1 }).setOptions(SCOPE).lean(),
    ApplicationRecord.findOne({ orgId }, { status: 1, bank: 1, bankChangedAt: 1 }).setOptions(SCOPE).lean(),
  ]);
  const a = /** @type {any} */ (app);
  return {
    name: String(/** @type {any} */ (org)?.displayName ?? orgId),
    kycApproved: a?.status === 'APPROVED',
    hasBank: Boolean(a?.bank?.ifsc),
    bankChangedAt: a?.bankChangedAt ?? null,
    openDisputes: await openDisputes(orgId),
    holderName: a?.bank?.holderName ?? null,
    ifsc: a?.bank?.ifsc ?? null,
  };
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 */
export function payoutRunsFor(env, clock) {
  const kyc = createKycService({ clock, files: createFiles(env, clock), fieldKey: env.B2B_FILE_KEY ?? env.B2B_AUTH_SECRET });
  return createPayoutRuns({
    clock,
    ledger: createLedger({ clock }),
    hotel: hotelFacts,
    account: async (orgId, viewer) => (await kyc.revealSensitive(orgId, viewer)).accountNumber,
  });
}

/**
 * Stage 15 routes: payout runs, deductions, disputes, GST registers, period locks, reports, exports; hotel payouts;
 * client reports and branding.
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/clock.js').Clock} clock
 */
export function stage15Routes(env, clock) {
  const router = express.Router();
  const runs = payoutRunsFor(env, clock);
  const disputes = createStatementDisputes({ clock });
  router.use(stage15AdminRoutes({ clock, runs, disputes, reports: adminReportsFor({ clock }) }));
  router.use(financePortalRoutes({ runs, disputes, clientReports: clientReportsFor() }));
  router.use(systemHealthRoutes({ clock })); // Stage 16
  router.use(privacyRoutes({ clock })); // Stage 16: DPDP consents and data requests
  return router;
}
