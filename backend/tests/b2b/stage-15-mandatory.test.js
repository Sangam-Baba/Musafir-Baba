// @ts-check
/**
 * Stage 15 mandatory tests (plan §8). Where each one lives:
 * - payout totals = Σ lines, deduction rules (own before all, capped), holds (bank < 72 h, KYC, disputes), postings
 *   balanced, approved runs locked → payout-runs.test.js, payout-disputes.test.js, finance-api.test.js (over HTTP);
 * - GST register = Σ invoices − credit notes; period lock (finished month only, once; billing refused) → gst-registers.test.js;
 * - reports (refunds once per order, margin, ageing) → admin-reports.test.js; client reports and branding →
 *   client-reports.test.js, branding.test.js;
 * - **a seeded month ties to the ledger** → here: a month of plan invoices (one Delhi client — CGST + SGST, one
 *   Maharashtra client with a GSTIN — IGST) and a payout run with a TDS deduction: the GST register's plan-invoice
 *   totals equal what the journal credited to plan revenue and each GST account; the run's gross / deductions / net
 *   equal what the journal debited to the hotels' payables and credited to the bank and deductions payable; every
 *   entry balances, and the accounting export carries the same totals.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createBilling, gstRegister } from '../../src/b2b/modules/billing/index.js';
import { createSubscriptions, seedPlans } from '../../src/b2b/modules/subscriptions/index.js';
import {
  createLedger,
  createLiveWallets,
  createPayoutRuns,
  DeductionRuleRecord,
  journalExport,
  PayableRecord,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { runBilling } from '../../src/b2b/routes/subscriptions-wiring.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-10T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const DELHI = '65f0000000000000000c1501';
const MUMBAI = '65f0000000000000000c1502';
const HOTELS = /** @type {const} */ (['65f0000000000000000d1501', '65f0000000000000000d1502']);
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPlatformAccounts();
  await seedPlans();
});
afterAll(async () => mongo.stop());

/** Σ credits − debits a set of journal entries made to one account. @param {any[]} entries @param {string} accountId */
const creditsTo = (entries, accountId) =>
  entries
    .flatMap((e) => e.lines)
    .filter((l) => l.accountId === accountId)
    .reduce((s, l) => s + (l.creditPaise ?? 0) - (l.debitPaise ?? 0), 0);

describe('a seeded month ties to the ledger', () => {
  it('plan invoices: GST register = journal (revenue, CGST, SGST, IGST); payout run: gross / deductions / net = journal', async () => {
    const ledger = createLedger({ clock });
    const wallets = createLiveWallets({ clock, ledger });
    const subs = createSubscriptions({ clock });
    const billing = createBilling({
      clock,
      ledger,
      wallets,
      subscriptions: subs,
      issuer: async () => ({ stateCode: '07', gstin: '07AAAAA0000A1Z5' }),
      client: async (id) => (id === MUMBAI ? { name: 'Mumbai Trips', gstin: '27BBBBB1111B1Z5' } : { name: 'Delhi Trips', gstin: null }),
    });
    for (const [c, plan] of /** @type {const} */ ([
      [DELHI, 'A'],
      [MUMBAI, 'B'],
    ])) {
      await wallets.open(c);
      await wallets.apply({
        clientOrgId: c,
        opId: `seed-top-${c}`,
        type: 'TOPUP',
        amountPaise: 10_000_000,
        journal: {
          reference: { type: 'test-top', id: c },
          purpose: 'wallet-topup',
          lines: [{ accountId: await ledger.accountId('platform', 'BANK'), debitPaise: 10_000_000 }],
        },
        by: 'test',
      });
      const s = await subs.start(c);
      await subs.change({ clientOrgId: c, planKey: plan, expectedVersion: s.version, by: 'u' });
    }
    expect(await runBilling(subs, billing)).toMatchObject({ invoices: 2 });
    expect((await billing.list(DELHI)).concat(await billing.list(MUMBAI)).every((i) => i.status === 'PAID')).toBe(true); // paid → in the books

    const reg = await gstRegister('2026-11');
    const saas = reg.rows.filter((r) => r.kind === 'SAAS_INVOICE');
    expect(saas).toHaveLength(2);
    const sum = (/** @type {'taxablePaise' | 'cgstPaise' | 'sgstPaise' | 'igstPaise'} */ k) => saas.reduce((t, r) => t + r[k], 0);
    expect(saas.find((r) => r.b2b)).toMatchObject({ placeOfSupply: '27', cgstPaise: 0, sgstPaise: 0 });
    expect(saas.find((r) => !r.b2b)).toMatchObject({ placeOfSupply: '07', igstPaise: 0 });
    const paidEntries = await TransactionRecord.find({ purpose: 'saas-invoice-paid' }).lean();
    expect(creditsTo(paidEntries, await ledger.accountId('platform', 'REVENUE_SAAS'))).toBe(sum('taxablePaise'));
    expect(creditsTo(paidEntries, await ledger.accountId('platform', 'TAX_PAYABLE_CGST'))).toBe(sum('cgstPaise'));
    expect(creditsTo(paidEntries, await ledger.accountId('platform', 'TAX_PAYABLE_SGST'))).toBe(sum('sgstPaise'));
    expect(creditsTo(paidEntries, await ledger.accountId('platform', 'TAX_PAYABLE_IGST'))).toBe(sum('igstPaise'));
    expect(sum('igstPaise')).toBeGreaterThan(0);
    expect(sum('cgstPaise')).toBeGreaterThan(0);

    nowMs = Date.parse('2026-11-23T06:30:00Z');
    await DeductionRuleRecord.create({ hotelOrgId: null, label: 'TDS 194-O', type: 'PERCENT', valueBps: 100, createdBy: 'staff:f1' });
    let n = 0;
    for (const [h, amounts] of /** @type {const} */ ([
      [HOTELS[0], [123_456, 77_001]],
      [HOTELS[1], [250_000]],
    ]))
      for (const amountPaise of amounts)
        await PayableRecord.create({
          bookingId: `m${(n += 1)}`,
          bookingRef: `MBH-M${n}`,
          orderRef: `MBO-M${n}`,
          hotelOrgId: h,
          propertyId: 'p',
          checkOut: '2026-11-15',
          amountPaise,
          status: 'ELIGIBLE',
          eligibleAt: new Date('2026-11-16T00:00:00Z'),
        });
    const runs = createPayoutRuns({
      clock,
      ledger,
      hotel: async (id) => ({
        name: id,
        kycApproved: true,
        hasBank: true,
        bankChangedAt: null,
        openDisputes: 0,
        holderName: 'Hotel',
        ifsc: 'HDFC0000001',
      }),
      account: async () => '50100012345678',
    });
    const run = await runs.propose('staff:f1', { cycleEnd: '2026-11-22' });
    await runs.approve('staff:f2', run.id);
    await runs.bankFile('staff:f2', run.id);
    const paid = await runs.markPaid('staff:f2', run.id, 'NEFT-SEED-1');
    expect(paid.totals).toMatchObject({ lines: 2, held: 0, grossPaise: 450_457 });
    const payoutEntries = await TransactionRecord.find({ purpose: 'hotel-payout-run' }).lean();
    expect(payoutEntries).toHaveLength(2);
    expect(creditsTo(payoutEntries, await ledger.accountId('platform', 'BANK'))).toBe(paid.totals.netPaise);
    expect(creditsTo(payoutEntries, await ledger.accountId('platform', 'DEDUCTIONS_PAYABLE'))).toBe(paid.totals.deductionsPaise);
    let payableDebits = 0;
    for (const h of HOTELS) payableDebits -= creditsTo(payoutEntries, await ledger.accountId(h, 'PAYABLE'));
    expect(payableDebits).toBe(paid.totals.grossPaise);
    expect(paid.totals.grossPaise).toBe(paid.totals.netPaise + paid.totals.deductionsPaise);

    for (const e of await TransactionRecord.find({}).lean())
      expect(e.lines.reduce((s, l) => s + (l.debitPaise ?? 0), 0)).toBe(e.lines.reduce((s, l) => s + (l.creditPaise ?? 0), 0));
    const exported = await journalExport({ from: '2026-11-01', to: '2026-11-30' });
    expect(exported.entries).toBe(await TransactionRecord.countDocuments({}));
    expect(exported.debitPaise).toBe(exported.creditPaise);
  });
});
