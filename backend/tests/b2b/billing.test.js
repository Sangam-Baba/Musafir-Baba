// @ts-check
/**
 * SaaS invoices and collection (S13-T06): a plan fee → invoice S2627DL000001 → paid from the wallet (revenue + GST in
 * the books), never billed twice; not enough money → UNPAID and the subscription past due → after a top-up, paid and
 * active again; a finished month's overage billed once, only 24 h after the month ends; paying by PayU settles once.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createBilling, InvoiceRecord } from '../../src/b2b/modules/billing/index.js';
import { NumberSeriesRecord } from '../../src/b2b/modules/documents/index.js';
import { UsageMonthlyRecord } from '../../src/b2b/modules/metering/index.js';
import { createSubscriptions, PlanVersionRecord, seedPlans, SubscriptionRecord } from '../../src/b2b/modules/subscriptions/index.js';
import {
  AccountRecord,
  createLedger,
  createLiveWallets,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { runBilling } from '../../src/b2b/routes/subscriptions-wiring.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-10T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let n = 0;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPlatformAccounts();
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-10T06:30:00Z');
  for (const m of [InvoiceRecord, SubscriptionRecord, UsageMonthlyRecord]) await m.deleteMany({}).setOptions(S);
  await PlanVersionRecord.deleteMany({});
  await NumberSeriesRecord.deleteMany({});
  await seedPlans();
});

function parts() {
  const ledger = createLedger({ clock });
  const wallets = createLiveWallets({ clock, ledger });
  const subs = createSubscriptions({ clock });
  const billing = createBilling({
    clock,
    ledger,
    wallets,
    subscriptions: subs,
    issuer: async () => ({ stateCode: '07', gstin: '07AAAAA0000A1Z5' }),
    client: async () => ({ name: 'Trips Co', gstin: null }),
  });
  return { ledger, wallets, subs, billing };
}
/** A client on Plan A (paid from 10 Nov) with `topUp` in its wallet. @param {number} topUp @param {string} [plan] */
async function client(topUp, plan = 'A') {
  const p = parts();
  const c = `65f0000000000000000e${String((n += 1)).padStart(4, '0')}`;
  await p.wallets.open(c);
  if (topUp > 0) await top(p, c, topUp);
  const s = await p.subs.start(c);
  await p.subs.change({ clientOrgId: c, planKey: plan, expectedVersion: s.version, by: 'u' });
  return { ...p, c };
}
/** @param {ReturnType<typeof parts>} p @param {string} c @param {number} amount */
async function top(p, c, amount) {
  await p.wallets.apply({
    clientOrgId: c,
    opId: `top-${c}-${(n += 1)}`,
    type: 'TOPUP',
    amountPaise: amount,
    journal: {
      reference: { type: 'test-top', id: `${c}-${n}` },
      purpose: 'wallet-topup',
      lines: [{ accountId: await p.ledger.accountId('platform', 'BANK'), debitPaise: amount }],
    },
    by: 'test',
  });
}
/** @param {string} c */
const wallet = async (c) => /** @type {any} */ (await AccountRecord.findOne({ ownerOrgId: c, type: 'WALLET' }).setOptions(S).lean());

describe('invoices from the wallet', () => {
  it('prorated plan fee → invoice S2627DL000001 paid from the wallet; revenue + GST in the books; a second run bills nothing', async () => {
    const { subs, billing, c } = await client(10_000_000);
    expect(await runBilling(subs, billing)).toMatchObject({ invoices: 1 });
    expect(await runBilling(subs, billing)).toMatchObject({ invoices: 0 });
    const [inv] = await billing.list(c);
    const fee = Math.round((299_900 * 21) / 30);
    expect(inv).toMatchObject({ number: 'S2627DL000001', status: 'PAID', period: '2026-11', payment: { method: 'WALLET' } });
    expect(inv?.totals).toMatchObject({ taxablePaise: fee, totalPaise: fee + Math.round(fee * 0.18) });
    expect((await wallet(c)).balancePaise).toBe(10_000_000 - /** @type {any} */ (inv).totals.totalPaise);
    const entry = /** @type {any} */ (
      await TransactionRecord.findOne({ 'reference.type': 'saas-invoice', 'reference.id': inv?.id }).lean()
    );
    expect(entry.purpose).toBe('saas-invoice-paid');
    expect(entry.lines).toHaveLength(4); // wallet, SaaS revenue, CGST, SGST
  });

  it('not enough in the wallet → UNPAID, subscription PAST_DUE; after a top-up → paid, ACTIVE again', async () => {
    const p = await client(1_000);
    await runBilling(p.subs, p.billing);
    expect((await p.billing.list(p.c))[0]?.status).toBe('UNPAID');
    expect(await p.subs.current(p.c)).toMatchObject({ status: 'PAST_DUE' });
    await top(p, p.c, 10_000_000);
    expect(await p.billing.retryUnpaid()).toMatchObject({ unpaidPaid: 1 });
    expect((await p.billing.list(p.c))[0]?.status).toBe('PAID');
    expect(await p.subs.current(p.c)).toMatchObject({ status: 'ACTIVE' });
  });

  it('paying an unpaid invoice by PayU settles it once', async () => {
    const p = await client(0);
    await runBilling(p.subs, p.billing);
    const [inv] = await p.billing.list(p.c);
    expect(await p.billing.paidByPayu(/** @type {any} */ (inv).id, 'B2BSTEST1')).toBe('PAID');
    expect(await p.billing.paidByPayu(/** @type {any} */ (inv).id, 'B2BSTEST1')).toBe('PAID');
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'saas-invoice', 'reference.id': inv?.id })).toBe(1);
    expect(await p.subs.current(p.c)).toMatchObject({ status: 'ACTIVE' });
  });
});

describe('month close', () => {
  it('OVERAGE plan: the finished month’s extra queries billed once, only 24 h after the month ends', async () => {
    const p = await client(50_000_000, 'B');
    await runBilling(p.subs, p.billing); // November's prorated fee
    const allowance = /** @type {any} */ (await p.subs.current(p.c)).includedQueries;
    await UsageMonthlyRecord.create({
      orgId: p.c,
      metric: 'hotel.search',
      month: '2026-11',
      count: allowance + 250,
      billable: allowance + 250,
    });
    nowMs = Date.parse('2026-12-01T00:10:00Z');
    await runBilling(p.subs, p.billing); // renewed: December fee; November closed but not yet billable
    expect((await p.billing.list(p.c)).filter((i) => i.lines[0].kind === 'OVERAGE')).toHaveLength(0);
    nowMs = Date.parse('2026-12-02T00:10:00Z');
    await runBilling(p.subs, p.billing);
    await runBilling(p.subs, p.billing);
    const over = (await p.billing.list(p.c)).filter((i) => i.lines[0].kind === 'OVERAGE');
    expect(over).toHaveLength(1);
    expect(over[0]?.lines[0]).toMatchObject({ quantity: 250, unitPaise: 100, amountPaise: 25_000 });
    expect(over[0]?.status).toBe('PAID');
    expect((await p.billing.list(p.c)).map((i) => i.number).sort()).toEqual(['S2627DL000001', 'S2627DL000002', 'S2627DL000003']);
  });
});
