// @ts-check
/**
 * Hotel payout statements and disputes (S15-T04): a paid payout's statement lists its bookings, deductions and net;
 * a hotel disputes one of its own payables (another hotel's → 404; twice → 409); an open dispute holds its next
 * payout line; resolving lets it through.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import {
  createLedger,
  createPayoutRuns,
  createStatementDisputes,
  openDisputes,
  PayableRecord,
  PayoutLineRecord,
  PayoutRunRecord,
  seedPlatformAccounts,
  StatementDisputeRecord,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-23T06:30:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H1 = '65f000000000000000000bb1';
const H2 = '65f000000000000000000bb2';
/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedPlatformAccounts();
});
afterAll(async () => mongo.stop());
beforeEach(async () => {
  for (const m of [PayableRecord, PayoutLineRecord, StatementDisputeRecord]) await /** @type {any} */ (m).deleteMany({}).setOptions(S);
  await PayoutRunRecord.deleteMany({});
  await TransactionRecord.deleteMany({});
});

/** @param {string} hotelOrgId @param {number} amountPaise @param {string} ref */
const payable = (hotelOrgId, amountPaise, ref) =>
  PayableRecord.create({
    bookingId: ref,
    bookingRef: ref,
    orderRef: `O-${ref}`,
    hotelOrgId,
    propertyId: 'p',
    checkOut: '2026-11-15',
    amountPaise,
    status: 'ELIGIBLE',
    eligibleAt: new Date('2026-11-16T00:00:00Z'),
  });

function runs() {
  return createPayoutRuns({
    clock,
    ledger: createLedger({ clock }),
    hotel: async (id) => ({
      name: id,
      kycApproved: true,
      hasBank: true,
      bankChangedAt: null,
      openDisputes: await openDisputes(id),
      holderName: 'Hotel',
      ifsc: 'HDFC0000001',
    }),
    account: async () => '50100012345678',
  });
}

describe('statements and disputes', () => {
  it('paid statement; dispute holds the next payout; resolved → paid next time', async () => {
    const r = runs();
    const disputes = createStatementDisputes({ clock });
    await payable(H1, 100_000, 'MBH-A1');
    await payable(H1, 40_000, 'MBH-A2');
    const run = await r.propose('staff:f1', { cycleEnd: '2026-11-22' });
    await r.approve('staff:f2', run.id);
    await r.bankFile('staff:f2', run.id);
    await r.markPaid('staff:f2', run.id, 'NEFT-1');
    const [line] = await r.forHotel(H1);
    const st = await disputes.payoutStatement(H1, /** @type {any} */ (line).id);
    expect(st).toMatchObject({ ref: run.ref, bankReference: 'NEFT-1', grossPaise: 140_000, netPaise: 140_000 });
    expect(st.lines.map((l) => l.bookingRef)).toEqual(['MBH-A1', 'MBH-A2']);
    await expect(disputes.payoutStatement(H2, /** @type {any} */ (line).id)).rejects.toMatchObject({ code: 'PAYOUT_NOT_FOUND' });

    const next = await payable(H1, 60_000, 'MBH-A3');
    const other = await payable(H2, 10_000, 'MBH-B1');
    await expect(disputes.raise(H1, 'user:u1', { payableId: String(other._id), message: 'not ours' })).rejects.toMatchObject({
      code: 'PAYABLE_NOT_FOUND',
    });
    const d = await disputes.raise(H1, 'user:u1', {
      payableId: String(next._id),
      message: 'Amount should be ₹700 — late checkout charge missing',
    });
    await expect(disputes.raise(H1, 'user:u1', { payableId: String(next._id), message: 'again' })).rejects.toMatchObject({
      code: 'DISPUTE_ALREADY_OPEN',
    });
    const run2 = await r.propose('staff:f1', { cycleEnd: '2026-11-22' });
    expect((await r.read(run2.id)).lines.find((l) => l.hotelOrgId === H1)).toMatchObject({
      status: 'HELD',
      holdReasons: ['STATEMENT_DISPUTE_OPEN'],
    });
    await r.cancel('staff:f2', run2.id, 'dispute first');
    await disputes.resolve('staff:f2', d.id, { accept: false, note: 'Late checkout was not charged to the guest' });
    expect((await disputes.mine(H1))[0]).toMatchObject({ status: 'REJECTED' });
    const run3 = await r.propose('staff:f1', { cycleEnd: '2026-11-22' });
    expect((await r.read(run3.id)).lines.find((l) => l.hotelOrgId === H1)).toMatchObject({ status: 'INCLUDED', grossPaise: 60_000 });
  });
});
