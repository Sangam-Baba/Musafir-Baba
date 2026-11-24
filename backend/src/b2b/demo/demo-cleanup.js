// @ts-check
/**
 * Removing what the full demo (demo-flows.js) made, for the demo companies only: wallets and their journal entries,
 * holds, payables, payout lines (and runs that only paid demo hotels), documents, plan subscriptions and invoices,
 * usage, API keys, webhook endpoints and deliveries, booking summaries, KYC applications, demo data requests,
 * notifications. Afterwards the platform accounts' balance snapshots are recomputed from the journal that is left, so
 * the ledger check stays clean; number series that only held demo invoices are removed (no gap left).
 * Audit events are kept (the audit log is never rewritten).
 */
import { systemScope } from '../core/db/tenant-plugin.js';
import { b2bMongoose } from '../core/db/connection.js';
import { ApiKeyRecord } from '../modules/api-access/index.js';
import { DunningRecord, InvoiceRecord } from '../modules/billing/index.js';
import { DocumentRecord, NumberSeriesRecord } from '../modules/documents/index.js';
import { ConsentRecord, DataRequestRecord } from '../modules/identity/index.js';
import { ApplicationRecord } from '../modules/kyc/index.js';
import { UsageDailyRecord, UsageEventRecord, UsageMonthlyRecord } from '../modules/metering/index.js';
import { InboxRecord } from '../modules/notifications/index.js';
import { BookingSummaryRecord } from '../modules/reporting/index.js';
import { OverrideRecord, SubscriptionRecord } from '../modules/subscriptions/index.js';
import {
  AccountRecord,
  BalanceSnapshotRecord,
  CreditLineRecord,
  JOURNAL_CURSOR,
  ManualTopUpRecord,
  PayableRecord,
  PayoutLineRecord,
  PayoutRunRecord,
  StatementDisputeRecord,
  TransactionRecord,
  WalletHoldRecord,
} from '../modules/wallet/index.js';
import { DeliveryRecord, EndpointRecord } from '../modules/webhooks/index.js';

const SYSTEM = systemScope('demo data cleanup (owner-approved demo)');

/** Recompute every balance snapshot from the journal up to its own point (after demo entries were removed). */
async function rebuildSnapshots() {
  const snaps = await BalanceSnapshotRecord.find({ accountId: { $ne: JOURNAL_CURSOR } }).lean();
  for (const s of snaps) {
    if (!s.asOfTransactionId) continue; // nothing read yet
    const [sum] = await TransactionRecord.aggregate([
      { $match: { 'lines.accountId': s.accountId, _id: { $lte: new b2bMongoose.Types.ObjectId(s.asOfTransactionId) } } },
      { $unwind: '$lines' },
      { $match: { 'lines.accountId': s.accountId } },
      { $group: { _id: null, d: { $sum: '$lines.debitPaise' }, c: { $sum: '$lines.creditPaise' } } },
    ]);
    const d = sum?.d ?? 0;
    const c = sum?.c ?? 0;
    if (d !== s.debitPaise || c !== s.creditPaise)
      await BalanceSnapshotRecord.updateOne({ _id: s._id }, { $set: { debitPaise: d, creditPaise: c } });
  }
}

/** Number series no remaining document or plan invoice uses → removed (so the next real invoice is number 1, no gap). */
async function dropEmptySeries() {
  for (const s of await NumberSeriesRecord.find({}).lean()) {
    const series = String(s._id);
    const used =
      (await DocumentRecord.exists({ series }).setOptions(SYSTEM)) || (await InvoiceRecord.exists({ series }).setOptions(SYSTEM));
    if (!used) await NumberSeriesRecord.deleteOne({ _id: s._id });
  }
}

/**
 * @param {{ ids: string[], hotelIds: string[], clientIds: string[], orderIds: string[], orderRefs: string[] }} demo
 */
export async function removeDemoFlows(demo) {
  const { ids, hotelIds, clientIds, orderIds, orderRefs } = demo;
  const accounts = (
    await AccountRecord.find({ ownerOrgId: { $in: ids } }, { _id: 1 })
      .setOptions(SYSTEM)
      .lean()
  ).map((a) => String(a._id));
  const tx = accounts.length ? (await TransactionRecord.deleteMany({ 'lines.accountId': { $in: accounts } })).deletedCount : 0;
  const lines = await PayoutLineRecord.find({ hotelOrgId: { $in: hotelIds } }, { runId: 1 })
    .setOptions(SYSTEM)
    .lean();
  const runIds = [...new Set(lines.map((l) => String(l.runId)))];
  await PayoutLineRecord.deleteMany({ hotelOrgId: { $in: hotelIds } }).setOptions(SYSTEM);
  for (const runId of runIds)
    if (!(await PayoutLineRecord.exists({ runId }).setOptions(SYSTEM))) await PayoutRunRecord.deleteOne({ _id: runId });
  const byClient = { clientOrgId: { $in: clientIds } };
  const byOrg = { orgId: { $in: ids } };
  await Promise.all([
    AccountRecord.deleteMany({ ownerOrgId: { $in: ids } }).setOptions(SYSTEM),
    BalanceSnapshotRecord.deleteMany({ accountId: { $in: accounts } }),
    WalletHoldRecord.deleteMany(byClient).setOptions(SYSTEM),
    ManualTopUpRecord.deleteMany(byClient).setOptions(SYSTEM),
    CreditLineRecord.deleteMany(byClient).setOptions(SYSTEM),
    PayableRecord.deleteMany({ hotelOrgId: { $in: hotelIds } }).setOptions(SYSTEM),
    StatementDisputeRecord.deleteMany({ hotelOrgId: { $in: hotelIds } }).setOptions(SYSTEM),
    DocumentRecord.deleteMany({ $or: [{ orderId: { $in: orderIds } }, { orderRef: { $in: orderRefs } }] }).setOptions(SYSTEM),
    InvoiceRecord.deleteMany(byClient).setOptions(SYSTEM),
    DunningRecord.deleteMany(byClient).setOptions(SYSTEM),
    SubscriptionRecord.deleteMany(byClient).setOptions(SYSTEM),
    OverrideRecord.deleteMany(byClient).setOptions(SYSTEM),
    UsageEventRecord.deleteMany(byOrg).setOptions(SYSTEM),
    UsageDailyRecord.deleteMany(byOrg).setOptions(SYSTEM),
    UsageMonthlyRecord.deleteMany(byOrg).setOptions(SYSTEM),
    ApiKeyRecord.deleteMany(byOrg).setOptions(SYSTEM),
    EndpointRecord.deleteMany(byOrg).setOptions(SYSTEM),
    DeliveryRecord.deleteMany(byOrg).setOptions(SYSTEM),
    BookingSummaryRecord.deleteMany({
      $or: [{ clientOrgId: { $in: clientIds } }, { hotelOrgId: { $in: hotelIds } }, { orderId: { $in: orderIds } }],
    }).setOptions(SYSTEM),
    ApplicationRecord.deleteMany(byOrg).setOptions(SYSTEM),
    InboxRecord.deleteMany({ $or: [{ orgId: { $in: ids } }, { recipientId: { $in: ids } }] }).setOptions(SYSTEM),
    DataRequestRecord.deleteMany({ email: /@example\.com$/ }),
    ConsentRecord.deleteMany({ subjectRef: { $in: orderRefs } }),
  ]);
  await rebuildSnapshots();
  await dropEmptySeries();
  return { journalEntries: tx, payoutRuns: runIds.length };
}
