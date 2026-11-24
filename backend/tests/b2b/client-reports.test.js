// @ts-check
/**
 * Client reports and the accounting export (S15-T07): a client sees only its own company's bookings, limited to the
 * viewer's branches or own bookings; never MusafirBaba's cost / margin; usage only for viewers who see the whole
 * company; the journal export lists every line of the days asked (India time), debits = credits, ≤ 31 days.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { BookingSummaryRecord, createClientReports } from '../../src/b2b/modules/reporting/index.js';
import {
  createLedger,
  createLiveWallets,
  journalExport,
  seedPlatformAccounts,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { clientReportsFor } from '../../src/b2b/routes/reports-wiring.js';
import { startMongo } from './helpers/mongo.js';

let nowMs = Date.parse('2026-11-23T06:30:00Z');
const clock = { now: () => new Date(nowMs) };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const C1 = '65f000000000000000000f11';
const C2 = '65f000000000000000000f12';
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
  nowMs = Date.parse('2026-11-23T06:30:00Z');
  await BookingSummaryRecord.deleteMany({}).setOptions(S);
  await TransactionRecord.deleteMany({});
});

/** @param {Partial<Record<string, any>>} o */
const summary = (o) => {
  n += 1;
  return BookingSummaryRecord.create({
    bookingRef: `MBH-C${n}`,
    orderRef: `MBO-C${n}`,
    orderId: `cord${n}`,
    productType: 'HOTEL',
    channel: 'B2B_PORTAL',
    clientOrgId: C1,
    branchId: 'b1',
    createdBy: 'u1',
    hotelOrgId: '65f000000000000000000e01',
    destination: 'Goa',
    bookingStatus: 'CONFIRMED',
    orderStatus: 'CONFIRMED',
    paymentState: 'PAID',
    totalPaise: 100_000,
    refundedPaise: 0,
    orderCreatedAt: new Date('2026-11-05T06:00:00Z'),
    projectedAt: clock.now(),
    ...o,
  });
};

const reports = () =>
  createClientReports({
    usage: async (_org, month) => ({ billable: month === '2026-11' ? 90 : 0, byMetric: { 'hotel.search': { count: 120, billable: 90 } } }),
  });
const ALL = { clientOrgId: C1, branchIds: [], ownUser: null };
const f = { from: '2026-10-01', to: '2026-11-30' };

describe('client reports', () => {
  it('own company only; branch and own-booking limits; no cost or margin', async () => {
    await summary({});
    await summary({ branchId: 'b2', createdBy: 'u2', destination: 'Manali', orderCreatedAt: new Date('2026-10-10T06:00:00Z') });
    await summary({ branchId: 'b2', createdBy: 'u2', bookingStatus: 'CANCELLED', refundedPaise: 100_000 });
    await summary({ clientOrgId: C2, totalPaise: 999_999 });
    await summary({ bookingStatus: 'EXPIRED' });
    const r = reports();

    expect((await r.run(ALL, 'bookings', f)).rows).toEqual([
      expect.objectContaining({ month: '2026-10', bookings: 1, netPaise: 100_000 }),
      expect.objectContaining({ month: '2026-11', bookings: 2, cancelled: 1, refundedPaise: 100_000, netPaise: 100_000 }),
    ]);
    const spend = await r.run(ALL, 'spend', { ...f, groupBy: 'branch' });
    expect(spend.rows.map((x) => [x.key, x.bookings])).toEqual([
      ['b1', 1],
      ['b2', 2],
    ]); // same net (b2's cancelled one fully refunded) → by name
    expect(spend.columns).not.toContain('costPaise');
    expect(spend.rows.every((x) => !('costPaise' in x) && !('marginPaise' in x))).toBe(true);
    expect((await r.run({ clientOrgId: C1, branchIds: ['b1'], ownUser: null }, 'spend', f)).rows).toEqual([
      expect.objectContaining({ key: 'Goa', bookings: 1 }),
    ]);
    expect((await r.run({ clientOrgId: C1, branchIds: [], ownUser: 'u2' }, 'spend', { ...f, groupBy: 'booker' })).rows).toEqual([
      expect.objectContaining({ key: 'u2', bookings: 2 }),
    ]);
    expect((await r.run({ clientOrgId: C2, branchIds: [], ownUser: null }, 'bookings', f)).rows[0]).toMatchObject({ netPaise: 999_999 });
  });

  it('usage by month for whole-company viewers only; CSV; unknown report refused', async () => {
    const r = reports();
    const u = await r.run(ALL, 'usage', f);
    expect(u.columns).toEqual(['month', 'billable', 'hotel.search']);
    expect(u.rows.map((x) => [x.month, x.billable])).toEqual([
      ['2026-10', 0],
      ['2026-11', 90],
    ]);
    await expect(r.run({ clientOrgId: C1, branchIds: ['b1'], ownUser: null }, 'usage', f)).rejects.toMatchObject({
      code: 'REPORT_NOT_AVAILABLE',
    });
    await expect(r.run(ALL, 'margin', f)).rejects.toMatchObject({ code: 'REPORT_UNKNOWN' });
    expect((await r.csv(ALL, 'usage', f)).csv.split('\n')[0]).toBe('month,billable,hotel.search');
    expect((await clientReportsFor().run(ALL, 'usage', f)).rows).toHaveLength(2); // real counters (none yet)
  });
});

describe('accounting export', () => {
  it('every line of the days asked (India time); debits = credits; range limits', async () => {
    const ledger = createLedger({ clock });
    const wallets = createLiveWallets({ clock, ledger });
    await wallets.open(C1);
    /** @param {string} id @param {number} amount */
    const top = async (id, amount) =>
      wallets.apply({
        clientOrgId: C1,
        opId: `exp-${id}`,
        type: 'TOPUP',
        amountPaise: amount,
        journal: {
          reference: { type: 'test-top', id },
          purpose: 'wallet-topup',
          memo: '=cmd|calc',
          lines: [{ accountId: await ledger.accountId('platform', 'BANK'), debitPaise: amount }],
        },
        by: 'test',
      });
    nowMs = Date.parse('2026-11-20T18:45:00Z'); // 21 Nov 00:15 in India
    await top('a', 50_000);
    nowMs = Date.parse('2026-11-21T10:00:00Z');
    await top('b', 25_000);
    nowMs = Date.parse('2026-11-22T10:00:00Z');
    await top('c', 1_000); // outside

    const x = await journalExport({ from: '2026-11-21', to: '2026-11-21' });
    expect(x).toMatchObject({
      entries: 2,
      debitPaise: 75_000,
      creditPaise: 75_000,
      truncated: false,
      filename: 'journal-2026-11-21-to-2026-11-21.csv',
    });
    const lines = x.csv.split('\n');
    expect(lines).toHaveLength(1 + 4); // header + two lines per entry
    expect(lines[0]).toBe(
      'date_ist,entry_id,reference_type,reference_id,purpose,account_owner,account_type,account_name,owner_org,debit_inr,credit_inr,memo',
    );
    expect(lines.slice(1).every((l) => l.startsWith('2026-11-21,'))).toBe(true);
    expect(lines.some((l) => l.includes(`CLIENT,WALLET`) && l.includes(C1) && l.includes(',500.00,'))).toBe(true);
    expect(lines[1]?.endsWith(",'=cmd|calc")).toBe(true);
    await expect(journalExport({ from: '2026-10-01', to: '2026-11-21' })).rejects.toMatchObject({ code: 'EXPORT_RANGE_TOO_LONG' });
    await expect(journalExport({ from: '2026-11-22', to: '2026-11-21' })).rejects.toMatchObject({ code: 'EXPORT_RANGE_INVALID' });
  });
});
