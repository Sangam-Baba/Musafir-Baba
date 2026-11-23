// @ts-check
/**
 * Admin reports (S15-T06): sales by month / channel, clients, hotels, destinations, margin (paid after refunds − owed
 * to the hotel), cancellations, payments, wallets & credit ageing, payables ageing, plan revenue, usage; an order's
 * refund counted once; never-sold bookings left out; ranges checked; CSV safe for spreadsheets; the start-up wiring
 * runs every report against the real collections.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  ADMIN_REPORTS,
  ageBucket,
  BookingSummaryRecord,
  createAdminReports,
  groupLines,
  toCsv,
} from '../../src/b2b/modules/reporting/index.js';
import { PayableRecord } from '../../src/b2b/modules/wallet/index.js';
import { adminReportsFor } from '../../src/b2b/routes/reports-wiring.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-23T06:30:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const C1 = '65f000000000000000000d01';
const H1 = '65f000000000000000000e01';
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
let n = 0;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  await BookingSummaryRecord.deleteMany({}).setOptions(S);
  await PayableRecord.deleteMany({}).setOptions(S);
});

/** @param {Partial<Record<string, any>>} o */
const summary = (o) => {
  n += 1;
  return BookingSummaryRecord.create({
    bookingRef: `MBH-R${n}`,
    orderRef: `MBO-R${n}`,
    orderId: `ord${n}`,
    productType: 'HOTEL',
    channel: 'WEBSITE',
    clientOrgId: null,
    hotelOrgId: H1,
    destination: 'Rishikesh',
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

/** @param {Partial<import('../../src/b2b/modules/reporting/admin-reports.service.js').ReportDeps>} [over] */
const reports = (over = {}) =>
  createAdminReports({
    clock,
    costs: async () => new Map([['MBH-COST', 80_000]]),
    openPayables: async () => [],
    payments: async () => [],
    wallets: async () => [],
    saasInvoices: async () => [],
    usage: async () => [],
    names: async (ids) => new Map(ids.map((id) => [id, `Org ${id.slice(-2)}`])),
    ...over,
  });

describe('booking reports', () => {
  it('sales, clients, destinations, margin, cancellations — refunds once per order; HELD / EXPIRED left out', async () => {
    await summary({ bookingRef: 'MBH-COST', channel: 'B2B_PORTAL', clientOrgId: C1, orderId: 'two', refundedPaise: 150_000 }); // the order's refund is on each of its rows
    await summary({ channel: 'B2B_PORTAL', clientOrgId: C1, orderId: 'two', bookingStatus: 'CANCELLED', refundedPaise: 150_000 });
    await summary({ destination: 'Goa', orderCreatedAt: new Date('2026-10-31T19:00:00Z') }); // 1 Nov in India
    await summary({ bookingStatus: 'HELD' });
    await summary({ bookingStatus: 'EXPIRED' });
    await summary({ orderCreatedAt: new Date('2026-12-02T06:00:00Z') }); // outside the range
    const r = reports();
    const f = { from: '2026-11-01', to: '2026-11-30' };

    const sales = await r.run('sales', f);
    expect(sales.rows).toEqual([
      expect.objectContaining({
        period: '2026-11',
        channel: 'B2B_PORTAL',
        bookings: 2,
        cancelled: 1,
        grossPaise: 200_000,
        refundedPaise: 150_000,
        netPaise: 50_000,
      }),
      expect.objectContaining({ period: '2026-11', channel: 'WEBSITE', bookings: 1, netPaise: 100_000 }),
    ]);
    expect((await r.run('clients', f)).rows[0]).toMatchObject({ key: '—', name: 'Website customers / none', netPaise: 100_000 });
    expect((await r.run('clients', f)).rows[1]).toMatchObject({ key: C1, name: 'Org 01', bookings: 2 });
    expect((await r.run('destinations', f)).rows.map((x) => x.key)).toEqual(['Goa', 'Rishikesh']);
    expect((await r.run('hotels', f)).rows).toEqual([expect.objectContaining({ key: H1, bookings: 3, netPaise: 150_000 })]);
    const margin = await r.run('margin', { ...f, groupBy: 'client' });
    expect(margin.rows.find((x) => x.key === C1)).toMatchObject({
      netPaise: 50_000,
      costPaise: 80_000,
      marginPaise: -30_000,
      marginPct: -60,
    });
    expect((await r.run('cancellations', f)).rows.find((x) => x.key === 'B2B_PORTAL')).toMatchObject({ cancelPct: 50 });
    expect((await r.run('sales', { ...f, by: 'day' })).rows.map((x) => x.period)).toEqual(
      ['2026-11-01', '2026-11-05'], // 1 Nov website (Goa, booked 00:30 India time), 5 Nov business
    );
    expect((await r.run('sales', { ...f, channel: 'WEBSITE' })).rows).toHaveLength(1);
  });

  it('bad ranges and names refused', async () => {
    const r = reports();
    await expect(r.run('sales', { from: '2026-11-30', to: '2026-11-01' })).rejects.toMatchObject({ code: 'REPORT_RANGE_INVALID' });
    await expect(r.run('sales', { from: '2025-01-01', to: '2026-11-01' })).rejects.toMatchObject({ code: 'REPORT_RANGE_TOO_LONG' });
    await expect(r.run('nope', { from: '2026-11-01', to: '2026-11-02' })).rejects.toMatchObject({ code: 'REPORT_UNKNOWN' });
  });
});

describe('money reports', () => {
  it('payments, wallets & credit ageing, payables ageing, plan revenue, usage', async () => {
    const r = reports({
      payments: async () => [
        { purpose: 'ORDER', status: 'SUCCEEDED', mode: 'UPI', amountPaise: 50_000, refundedPaise: 10_000 },
        { purpose: 'ORDER', status: 'SUCCEEDED', mode: 'UPI', amountPaise: 20_000, refundedPaise: 0 },
        { purpose: 'TOPUP', status: 'FAILED', mode: null, amountPaise: 900_000, refundedPaise: 0 },
      ],
      wallets: async () => [
        {
          orgId: C1,
          balancePaise: -40_000,
          heldPaise: 0,
          creditLimitPaise: 100_000,
          negativeSince: new Date('2026-10-01T00:00:00Z'),
          creditDueDays: 30,
        },
        {
          orgId: '65f000000000000000000d02',
          balancePaise: 250_000,
          heldPaise: 5_000,
          creditLimitPaise: 0,
          negativeSince: null,
          creditDueDays: 0,
        },
      ],
      openPayables: async () => [
        { hotelOrgId: H1, amountPaise: 10_000, status: 'PENDING', eligibleAt: null },
        { hotelOrgId: H1, amountPaise: 20_000, status: 'ELIGIBLE', eligibleAt: new Date('2026-11-20T00:00:00Z') },
        { hotelOrgId: H1, amountPaise: 30_000, status: 'ELIGIBLE', eligibleAt: new Date('2026-10-01T00:00:00Z') },
      ],
      saasInvoices: async () => [
        {
          period: '2026-11',
          status: 'PAID',
          lines: [{ kind: 'PLAN_FEE', amountPaise: 299_900 }],
          totals: { taxablePaise: 299_900, gstPaise: 53_982, totalPaise: 353_882 },
        },
        {
          period: '2026-11',
          status: 'UNPAID',
          lines: [{ kind: 'OVERAGE', amountPaise: 10_000 }],
          totals: { taxablePaise: 10_000, gstPaise: 1_800, totalPaise: 11_800 },
        },
      ],
      usage: async (months) => months.map((m) => ({ orgId: C1, metric: 'hotel.search', month: m, count: 120, billable: 100 })),
    });
    const f = { from: '2026-10-15', to: '2026-11-30' };
    expect((await r.run('payments', f)).rows[1]).toMatchObject({
      purpose: 'ORDER',
      method: 'UPI',
      count: 2,
      amountPaise: 70_000,
      refundedPaise: 10_000,
    });
    const w = (await r.run('wallets', f)).rows;
    expect(w[0]).toMatchObject({ key: C1, creditUsedPaise: 40_000, dueOn: '2026-10-31', ageing: 'D16_30' });
    expect(w[1]).toMatchObject({ creditUsedPaise: 0, ageing: null });
    expect((await r.run('payables-ageing', f)).rows[0]).toMatchObject({
      totalPaise: 60_000,
      NOT_DUEPaise: 10_000,
      D0_7Paise: 20_000,
      D31_PLUSPaise: 30_000,
    });
    expect((await r.run('plan-revenue', f)).rows).toEqual([
      expect.objectContaining({
        period: '2026-11',
        invoices: 2,
        planFeesPaise: 299_900,
        overagePaise: 10_000,
        totalPaise: 365_682,
        unpaidPaise: 11_800,
      }),
    ]);
    expect((await r.run('usage', f)).rows.map((x) => x.month)).toEqual(['2026-10', '2026-11']);
    const csv = await r.csv('payments', f);
    expect(csv.filename).toBe('payments-2026-10-15-to-2026-11-30.csv');
    expect(csv.csv.split('\n')[0]).toBe('purpose,status,method,count,amount_inr,refunded_inr');
  });
});

describe('pure parts', () => {
  it('random orders: net = gross − refunds, refunds never above an order’s refund or the gross', () => {
    for (let t = 0; t < 300; t += 1) {
      const rows = [];
      let refundsGiven = 0;
      for (let o = 0; o < 1 + (t % 5); o += 1) {
        const items = 1 + ((t + o) % 3);
        const totals = Array.from({ length: items }, (_, i) => 1_000 + ((t * 7919 + o * 104_729 + i * 13) % 200_000));
        const refunded = Math.floor(totals.reduce((s, x) => s + x, 0) * (((t + o) % 4) / 3));
        refundsGiven += Math.min(
          refunded,
          totals.reduce((s, x) => s + x, 0),
        );
        for (const [i, total] of totals.entries())
          rows.push({
            bookingRef: `b${o}-${i}`,
            orderId: `o${o}`,
            channel: i % 2 ? 'A' : 'B',
            clientOrgId: null,
            hotelOrgId: null,
            destination: null,
            bookingStatus: 'CONFIRMED',
            totalPaise: total,
            refundedPaise: refunded,
            orderCreatedAt: new Date(),
          });
      }
      const lines = groupLines(rows, (r) => r.channel);
      const sum = (/** @type {'grossPaise' | 'refundedPaise' | 'netPaise'} */ k) => lines.reduce((s, l) => s + l[k], 0);
      expect(sum('netPaise')).toBe(sum('grossPaise') - sum('refundedPaise'));
      expect(sum('refundedPaise')).toBe(refundsGiven);
      expect(lines.every((l) => l.netPaise >= 0)).toBe(true);
    }
  });

  it('ageing buckets; CSV cells never run as formulas', () => {
    const now = new Date('2026-11-23T00:00:00Z');
    expect(ageBucket(null, now)).toBe('NOT_DUE');
    expect(ageBucket(new Date('2026-11-24T00:00:00Z'), now)).toBe('NOT_DUE');
    expect(ageBucket(new Date('2026-11-10T00:00:00Z'), now)).toBe('D8_15');
    expect(ageBucket(new Date('2026-09-01T00:00:00Z'), now)).toBe('D31_PLUS');
    expect(toCsv(['name', 'amountPaise'], [{ name: '=HYPERLINK("x")', amountPaise: -1250 }])).toBe(
      'name,amount_inr\n"\'=HYPERLINK(""x"")",-12.50',
    );
  });
});

describe('start-up wiring', () => {
  it('every report runs against the real collections; cost from the hotel payable', async () => {
    await summary({ bookingRef: 'MBH-W1', clientOrgId: C1 });
    await PayableRecord.create({
      bookingId: 'w1',
      bookingRef: 'MBH-W1',
      orderRef: 'MBO-W1',
      hotelOrgId: H1,
      propertyId: 'p',
      checkOut: '2026-11-08',
      amountPaise: 85_000,
      status: 'ELIGIBLE',
      eligibleAt: new Date('2026-11-09T00:00:00Z'),
    });
    const r = adminReportsFor({ clock });
    const f = { from: '2026-11-01', to: '2026-11-30' };
    for (const name of ADMIN_REPORTS) expect(Array.isArray((await r.run(name, f)).rows)).toBe(true);
    expect((await r.run('margin', { ...f, groupBy: 'hotel' })).rows[0]).toMatchObject({
      key: H1,
      netPaise: 100_000,
      costPaise: 85_000,
      marginPaise: 15_000,
    });
    expect((await r.run('payables-ageing', f)).rows[0]).toMatchObject({ key: H1, D8_15Paise: 85_000 });
  });
});
