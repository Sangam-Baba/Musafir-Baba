// @ts-check
/**
 * Payout runs (S15-T02, T03, plan §8): deductions (own rule before the all-hotels rule, never above the gross);
 * holds (bank changed < 72 h, KYC, disputes); totals = Σ included lines; one open run; the preparer cannot approve;
 * approved runs locked (edits refused, tampering caught by the hash); bank file (no formulas); paid → one balanced
 * entry per hotel (payable → bank + deductions), payables PAID once, remittance event; cancel frees the payables.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  AccountRecord,
  createLedger,
  createPayoutRuns,
  deductionsFor,
  DeductionRuleRecord,
  holdReasons,
  PayableRecord,
  PayoutLineRecord,
  PayoutRunRecord,
  runHash,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-23T06:30:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const HOTELS = /** @type {const} */ (['65f000000000000000000aa1', '65f000000000000000000aa2', '65f000000000000000000aa3']);
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Record<string, any>} */
const facts = {};
let accountViews = 0;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPlatformAccounts();
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await PayableRecord.deleteMany({}).setOptions(S);
  await PayoutRunRecord.deleteMany({});
  await PayoutLineRecord.deleteMany({}).setOptions(S);
  await DeductionRuleRecord.deleteMany({});
  await TransactionRecord.deleteMany({});
  accountViews = 0;
  for (const h of HOTELS)
    facts[h] = {
      name: `Hotel ${h.slice(-1)}`,
      kycApproved: true,
      hasBank: true,
      bankChangedAt: null,
      openDisputes: 0,
      holderName: `Hotel ${h.slice(-1)} Pvt Ltd`,
      ifsc: 'HDFC0000001',
    };
  let n = 0;
  for (const [h, amounts] of [
    [HOTELS[0], [100_000, 50_000]],
    [HOTELS[1], [200_000]],
    [HOTELS[2], [80_000]],
  ])
    for (const amountPaise of /** @type {number[]} */ (amounts))
      await PayableRecord.create({
        bookingId: `b${(n += 1)}`,
        bookingRef: `MBH-${n}`,
        orderRef: `MBO-${n}`,
        hotelOrgId: h,
        propertyId: 'p',
        checkOut: '2026-11-15',
        amountPaise,
        status: 'ELIGIBLE',
        eligibleAt: new Date('2026-11-16T00:00:00Z'),
      });
});

function runs() {
  const ledger = createLedger({ clock });
  return createPayoutRuns({ clock, ledger, hotel: async (id) => facts[id], account: async () => ((accountViews += 1), '50100012345678') });
}

describe('rules (pure)', () => {
  it('deductions: own rule first, never above the gross; holds', () => {
    const rules = [
      { id: 'all', hotelOrgId: null, label: 'TDS 194-O', type: /** @type {const} */ ('PERCENT'), valueBps: 100 },
      { id: 'own', hotelOrgId: 'h1', label: 'Marketing fee', type: /** @type {const} */ ('FIXED'), amountPaise: 9_500 },
    ];
    expect(deductionsFor(10_000, rules, 'h1')).toEqual([
      { ruleId: 'own', label: 'Marketing fee', amountPaise: 9_500 },
      { ruleId: 'all', label: 'TDS 194-O', amountPaise: 100 },
    ]);
    expect(deductionsFor(9_000, rules, 'h1').reduce((s, d) => s + d.amountPaise, 0)).toBe(9_000); // capped
    const now = new Date('2026-11-23T00:00:00Z');
    expect(
      holdReasons({ kycApproved: true, hasBank: true, bankChangedAt: new Date(now.getTime() - 3_600_000), openDisputes: 1 }, now),
    ).toEqual(['BANK_CHANGED_RECENTLY', 'STATEMENT_DISPUTE_OPEN']);
    expect(
      holdReasons({ kycApproved: true, hasBank: true, bankChangedAt: new Date(now.getTime() - 73 * 3_600_000), openDisputes: 0 }, now),
    ).toEqual([]);
  });
});

describe('a payout run', () => {
  it('propose (deductions, holds, totals) → approve by someone else → locked → bank file → paid once; journal balanced', async () => {
    const r = runs();
    await DeductionRuleRecord.create({ hotelOrgId: null, label: 'TDS 194-O', type: 'PERCENT', valueBps: 100, createdBy: 'staff:f1' });
    facts[HOTELS[2]].bankChangedAt = new Date('2026-11-22T12:00:00Z'); // 18 h ago
    const run = await r.propose('staff:f1', { cycleEnd: '2026-11-22' });
    await expect(r.propose('staff:f1', { cycleEnd: '2026-11-22' })).rejects.toMatchObject({ code: 'PAYOUT_RUN_OPEN' });
    const detail = await r.read(run.id);
    const byHotel = Object.fromEntries(detail.lines.map((l) => [l.hotelOrgId, l]));
    expect(byHotel[HOTELS[0]]).toMatchObject({ grossPaise: 150_000, netPaise: 148_500, status: 'INCLUDED' });
    expect(byHotel[HOTELS[2]]).toMatchObject({ status: 'HELD', holdReasons: ['BANK_CHANGED_RECENTLY'] });
    expect(run.totals).toMatchObject({ lines: 2, held: 1, grossPaise: 350_000, deductionsPaise: 3_500, netPaise: 346_500 });
    expect(await PayableRecord.countDocuments({ payoutId: { $ne: null } }).setOptions(S)).toBe(4);

    await expect(r.approve('staff:f1', run.id)).rejects.toMatchObject({ code: 'SECOND_PERSON_REQUIRED' });
    await r.approve('staff:f2', run.id);
    expect(await PayableRecord.countDocuments({ hotelOrgId: HOTELS[2], payoutId: null }).setOptions(S)).toBe(1); // held → back for next run
    await expect(r.setHold('staff:f1', byHotel[HOTELS[0]].id, { hold: true })).rejects.toMatchObject({ code: 'PAYOUT_RUN_LOCKED' });

    const file = await r.bankFile('staff:f2', run.id);
    expect(file.csv.split('\n')).toHaveLength(3); // header + 2 hotels
    expect(file.csv).toContain('1485.00');
    expect(accountViews).toBe(2);
    const paid = await r.markPaid('staff:f2', run.id, 'NEFT-BATCH-001');
    expect(paid.status).toBe('PAID');
    expect((await r.markPaid('staff:f2', run.id, 'NEFT-BATCH-001')).status).toBe('PAID');
    expect(await PayableRecord.countDocuments({ status: 'PAID' }).setOptions(S)).toBe(3);
    const entries = await TransactionRecord.find({ purpose: 'hotel-payout-run' }).lean();
    expect(entries).toHaveLength(2);
    for (const e of entries)
      expect(e.lines.reduce((s, l) => s + (l.debitPaise ?? 0), 0)).toBe(e.lines.reduce((s, l) => s + (l.creditPaise ?? 0), 0));
    const lines = await PayoutLineRecord.find({ paid: true }).setOptions(S).lean();
    expect(lines.every((l) => (l.pendingEvents ?? []).some((ev) => ev.type === 'wallet.payout.paid'))).toBe(true);
    expect(await AccountRecord.countDocuments({ type: 'DEDUCTIONS_PAYABLE' }).setOptions(S)).toBe(1);
  });

  it('a line changed after approval → the bank file is refused; cancel frees the payables', async () => {
    const r = runs();
    const run = await r.propose('staff:f1', { cycleEnd: '2026-11-22' });
    await r.approve('staff:f2', run.id);
    await PayoutLineRecord.updateOne({ runId: run.id, hotelOrgId: HOTELS[1] }, { $set: { netPaise: 999_999 } }).setOptions(S);
    await expect(r.bankFile('staff:f2', run.id)).rejects.toMatchObject({ code: 'PAYOUT_RUN_CHANGED_AFTER_APPROVAL' });
    await r.cancel('staff:f2', run.id, 'line changed');
    expect(await PayableRecord.countDocuments({ payoutId: null, status: 'ELIGIBLE' }).setOptions(S)).toBe(4);
    expect(runHash([])).toHaveLength(64);
  });
});
