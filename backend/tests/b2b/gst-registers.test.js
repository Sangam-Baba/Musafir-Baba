// @ts-check
/**
 * GST registers and period locks (S15-T05): a month's register = hotel tax invoices − hotel credit notes + SaaS
 * invoices, split B2B / B2C, by place of supply and SAC; CSV; a month is locked once, only after it ends (never the
 * current month); nothing can be invoiced in a locked month.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  createBilling,
  gstRegister,
  gstRegisterCsv,
  InvoiceRecord,
  isLocked,
  lockPeriod,
  PeriodLockRecord,
} from '../../src/b2b/modules/billing/index.js';
import { DocumentRecord, NumberSeriesRecord } from '../../src/b2b/modules/documents/index.js';
import { createSubscriptions, PlanVersionRecord, seedPlans, SubscriptionRecord } from '../../src/b2b/modules/subscriptions/index.js';
import { createLedger, createLiveWallets, seedPlatformAccounts } from '../../src/b2b/modules/wallet/index.js';
import { runBilling } from '../../src/b2b/routes/subscriptions-wiring.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-10T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPlatformAccounts();
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  nowMs = Date.parse('2026-11-10T06:30:00Z');
  await InvoiceRecord.deleteMany({}).setOptions(S);
  await SubscriptionRecord.deleteMany({}).setOptions(S);
  await DocumentRecord.deleteMany({}).setOptions(S);
  await PeriodLockRecord.deleteMany({});
  await PlanVersionRecord.deleteMany({});
  await NumberSeriesRecord.deleteMany({});
  await seedPlans();
});

/**
 * @param {'TAX_INVOICE' | 'CREDIT_NOTE'} type
 * @param {string} number
 * @param {string} at
 * @param {{ taxablePaise: number, cgstPaise: number, sgstPaise: number, igstPaise: number, placeOfSupply: string, buyerGstin: string | null }} tax
 */
const doc = (type, number, at, tax) =>
  DocumentRecord.create({
    orderId: `o-${number}`,
    orderRef: `MBO-${number}`,
    type,
    version: 1,
    number,
    againstNumber: type === 'CREDIT_NOTE' ? 'H2627UK000001' : null,
    html: '<p>doc</p>',
    sha256: 'x'.repeat(64),
    hotelOrgId: '65f000000000000000000cc1',
    issuedAt: new Date(at),
    tax: { ...tax, sac: '996311' },
  });

function billingParts() {
  const ledger = createLedger({ clock });
  const wallets = createLiveWallets({ clock, ledger });
  const subs = createSubscriptions({ clock });
  const billing = createBilling({
    clock,
    ledger,
    wallets,
    subscriptions: subs,
    issuer: async () => ({ stateCode: '07', gstin: '07AAAAA0000A1Z5' }),
    client: async () => ({ name: 'Trips Co', gstin: '27BBBBB1111B1Z5' }),
  });
  return { wallets, subs, billing };
}

describe('the register', () => {
  it('hotel invoices − credit notes + SaaS invoices; B2B / B2C, place of supply, SAC; CSV', async () => {
    await doc('TAX_INVOICE', 'H2627UK000001', '2026-11-03T05:00:00Z', {
      taxablePaise: 100_000,
      cgstPaise: 6_000,
      sgstPaise: 6_000,
      igstPaise: 0,
      placeOfSupply: '05',
      buyerGstin: null,
    });
    await doc('CREDIT_NOTE', 'C2627UK000001', '2026-11-05T05:00:00Z', {
      taxablePaise: 40_000,
      cgstPaise: 2_400,
      sgstPaise: 2_400,
      igstPaise: 0,
      placeOfSupply: '05',
      buyerGstin: null,
    });
    await doc('TAX_INVOICE', 'H2627UK000002', '2026-10-28T05:00:00Z', {
      taxablePaise: 9_999,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      placeOfSupply: '05',
      buyerGstin: null,
    }); // October — not in November's register
    const p = billingParts();
    const c = '65f0000000000000000f0001';
    await p.wallets.open(c);
    const s = await p.subs.start(c);
    await p.subs.change({ clientOrgId: c, planKey: 'A', expectedVersion: s.version, by: 'u' });
    await runBilling(p.subs, p.billing); // an unpaid SaaS invoice still counts — it was issued

    const reg = await gstRegister('2026-11');
    expect(reg.rows.map((r) => r.kind)).toEqual(['HOTEL_INVOICE', 'HOTEL_CREDIT_NOTE', 'SAAS_INVOICE']);
    const saas = /** @type {any} */ (reg.rows[2]);
    expect(saas).toMatchObject({ b2b: true, buyerGstin: '27BBBBB1111B1Z5', placeOfSupply: '27', sac: '998314', cgstPaise: 0 });
    expect(saas.igstPaise).toBeGreaterThan(0); // Delhi → Maharashtra: IGST
    expect(reg.totals.taxablePaise).toBe(100_000 - 40_000 + saas.taxablePaise);
    expect(reg.totals.totalPaise).toBe(reg.rows.reduce((t, r) => t + r.totalPaise, 0));
    expect(reg.byKind.HOTEL_CREDIT_NOTE).toMatchObject({ taxablePaise: -40_000, gstPaise: -4_800, count: 1 });
    expect(reg.bySupplyType.B2C).toMatchObject({ taxablePaise: 60_000, count: 2 });
    expect(Object.keys(reg.byPlaceOfSupply).sort()).toEqual(['05', '27']);
    expect(Object.keys(reg.bySac).sort()).toEqual(['996311', '998314']);
    const csv = gstRegisterCsv(reg).split('\n');
    expect(csv).toHaveLength(4);
    expect(csv[2]).toContain('HOTEL_CREDIT_NOTE,C2627UK000001,2026-11-05,H2627UK000001,,B2C,05,996311,-400.00');
    await expect(gstRegister('2026-13')).rejects.toMatchObject({ code: 'MONTH_INVALID' });
  });
});

describe('period locks', () => {
  it('only a finished month, once; the totals kept; nothing invoiced in a locked month', async () => {
    await doc('TAX_INVOICE', 'H2627UK000003', '2026-10-12T05:00:00Z', {
      taxablePaise: 50_000,
      cgstPaise: 3_000,
      sgstPaise: 3_000,
      igstPaise: 0,
      placeOfSupply: '05',
      buyerGstin: null,
    });
    await expect(lockPeriod({ clock }, 'staff:f1', '2026-11', null)).rejects.toMatchObject({ code: 'PERIOD_NOT_FINISHED' });
    await expect(lockPeriod({ clock }, 'staff:f1', '2026-12', null)).rejects.toMatchObject({ code: 'PERIOD_NOT_FINISHED' });
    const locked = await lockPeriod({ clock }, 'staff:f1', '2026-10', 'GSTR-1 filed');
    expect(locked.totals).toMatchObject({ taxablePaise: 50_000, totalPaise: 56_000 });
    await expect(lockPeriod({ clock }, 'staff:f2', '2026-10', null)).rejects.toMatchObject({ code: 'PERIOD_ALREADY_LOCKED' });
    expect(await isLocked('2026-10')).toBe(true);
    expect(await isLocked('2026-11')).toBe(false);
    expect((await gstRegister('2026-10')).locked).toMatchObject({ by: 'staff:f1' });

    nowMs = Date.parse('2026-10-20T06:30:00Z'); // a clock that slipped back into the locked month
    const p = billingParts();
    const c = '65f0000000000000000f0002';
    await p.wallets.open(c);
    const s = await p.subs.start(c);
    await p.subs.change({ clientOrgId: c, planKey: 'A', expectedVersion: s.version, by: 'u' });
    await expect(runBilling(p.subs, p.billing)).rejects.toMatchObject({ code: 'PERIOD_LOCKED' });
    expect(await InvoiceRecord.countDocuments({}).setOptions(S)).toBe(0);
  });
});
