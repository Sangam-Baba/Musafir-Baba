// @ts-check
/**
 * Stage 15 wiring for the admin reports: what the hotels are owed per booking and unpaid payables (wallet), payments
 * (payments), client wallets (wallet), SaaS invoices (billing), monthly usage (metering) and organisation names.
 * Read-only queries; capped so a report can never load more than a bounded number of rows.
 */
import { systemScope } from '../core/db/tenant-plugin.js';
import { InvoiceRecord } from '../modules/billing/index.js';
import { UsageMonthlyRecord } from '../modules/metering/index.js';
import { OrganizationRecord } from '../modules/organizations/index.js';
import { IntentRecord } from '../modules/payments/index.js';
import { createAdminReports } from '../modules/reporting/index.js';
import { AccountRecord, PayableRecord } from '../modules/wallet/index.js';

const SCOPE = systemScope('reports: admin read', { routine: true });
const CAP = 50_000;

/** @param {string[]} refs */
async function costs(refs) {
  /** @type {Map<string, number>} */
  const out = new Map();
  for (let i = 0; i < refs.length; i += 1000) {
    const part = await PayableRecord.find(
      { bookingRef: { $in: refs.slice(i, i + 1000) }, status: { $ne: 'VOID' } },
      { bookingRef: 1, amountPaise: 1 },
    )
      .setOptions(SCOPE)
      .lean();
    for (const p of part) out.set(p.bookingRef, (out.get(p.bookingRef) ?? 0) + p.amountPaise);
  }
  return out;
}

/** @param {string[]} ids */
async function names(ids) {
  const unique = [...new Set(ids)].filter((id) => /^[a-f0-9]{24}$/.test(id));
  const docs = unique.length
    ? await OrganizationRecord.find({ _id: { $in: unique } }, { name: 1 })
        .setOptions(SCOPE)
        .lean()
    : [];
  return new Map(docs.map((d) => [String(d._id), String(/** @type {any} */ (d).name ?? '')]));
}

/** @param {{ clock: import('../core/clock.js').Clock }} deps */
export function adminReportsFor(deps) {
  return createAdminReports({
    clock: deps.clock,
    costs,
    names,
    openPayables: async () =>
      /** @type {any[]} */ (
        await PayableRecord.find({ status: { $in: ['PENDING', 'ELIGIBLE'] } }, { hotelOrgId: 1, amountPaise: 1, status: 1, eligibleAt: 1 })
          .setOptions(SCOPE)
          .limit(CAP)
          .lean()
      ),
    payments: async (from, to) =>
      /** @type {any[]} */ (
        await IntentRecord.find(
          { createdAt: { $gte: from, $lt: to } },
          { purpose: 1, status: 1, mode: 1, amountPaise: 1, refundedPaise: 1 },
        )
          .limit(CAP)
          .lean()
      ),
    wallets: async () =>
      (
        await AccountRecord.find(
          { type: 'WALLET' },
          { ownerOrgId: 1, balancePaise: 1, heldPaise: 1, creditLimitPaise: 1, negativeSince: 1, creditDueDays: 1 },
        )
          .setOptions(SCOPE)
          .limit(CAP)
          .lean()
      ).map((/** @type {any} */ a) => ({
        orgId: a.ownerOrgId,
        balancePaise: a.balancePaise ?? 0,
        heldPaise: a.heldPaise ?? 0,
        creditLimitPaise: a.creditLimitPaise ?? 0,
        negativeSince: a.negativeSince ?? null,
        creditDueDays: a.creditDueDays ?? 0,
      })),
    saasInvoices: async (from, to) =>
      /** @type {any[]} */ (
        await InvoiceRecord.find(
          { issuedAt: { $gte: from, $lt: to }, status: { $ne: 'VOID' } },
          { period: 1, status: 1, lines: 1, totals: 1 },
        )
          .setOptions(SCOPE)
          .limit(CAP)
          .lean()
      ),
    usage: async (months) =>
      /** @type {any[]} */ (
        await UsageMonthlyRecord.find({ month: { $in: months } }, { orgId: 1, metric: 1, month: 1, count: 1, billable: 1 })
          .setOptions(SCOPE)
          .limit(CAP)
          .lean()
      ),
  });
}
