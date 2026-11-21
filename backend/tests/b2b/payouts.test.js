// @ts-check
/** Recorded hotel payouts and statements (S09-T11): locked payables, amount = ready to pay, two people, ledger payable → bank once, never paid twice; the hotel's statement and CSV. */
import { describe, expect, it } from 'vitest';

import { BookingRecord, completeStays } from '../../src/b2b/modules/hotel-booking/index.js';
import { UserRecord } from '../../src/b2b/modules/identity/index.js';
import { MemberRecord } from '../../src/b2b/modules/organizations/index.js';
import { balancesOf, PayableRecord, rollUpBalances, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { payablesFor } from '../../src/b2b/routes/payables-wiring.js';
import { asStaff, auth } from './helpers/inventory-app.js';
import { useOrderEngine } from './helpers/order-engine.js';

const E = useOrderEngine();
const { app, clock, S, payuSays, engine, bookedOrder, newOrder, stored, ctx, signed, logger } = E;
const F1 = asStaff('f1:wallet.payout.record');
const F2 = asStaff('f2:wallet.payout.record,wallet.payout.approve');

/** Two paid stays at the same hotel, completed, payables ready to pay. */
async function twoReady() {
  const { h, order } = await bookedOrder();
  const second = await newOrder(h, 'second-guest-session-0000002');
  for (const o of [order, second]) {
    const e = await engine();
    const form = await e.orderPay.start(ctx(), await stored(o.ref), { returnUrl: 'https://x' });
    payuSays.set(form.txnId, { status: 'SUCCESS', amountPaise: o.totalPaise });
    await e.payments.handleCallback(signed(form));
    await e.deliver(form.txnId);
  }
  E.nowMs = Date.parse('2026-12-04T09:00:00+05:30');
  await completeStays({ clock });
  const payables = payablesFor({ clock, logger });
  const bookings = await BookingRecord.find({ hotelOrgId: h.orgId }).setOptions(S).lean();
  for (const b of bookings) await payables.sync(String(b._id));
  const ready = await PayableRecord.find({ hotelOrgId: h.orgId, status: 'ELIGIBLE' }).setOptions(S).lean();
  const m = /** @type {any} */ (await MemberRecord.findOne({ orgId: h.orgId }).setOptions(S).lean());
  const token = await app.login(/** @type {any} */ (await UserRecord.findById(m.userId).lean()).email);
  return { h, ready, token, sum: ready.reduce((s, p) => s + p.amountPaise, 0) };
}

describe('recorded payouts', () => {
  it('amount must equal the ready payables; they lock; a second person approves → payable → bank once; paid never twice', async () => {
    const { h, ready, sum } = await twoReady();
    expect(ready).toHaveLength(2);
    const body = {
      hotelOrgId: h.orgId,
      payableIds: ready.map((p) => String(p._id)),
      amountPaise: sum,
      utr: 'HDFC000123456',
      paidOn: '2026-12-05',
    };
    expect((await app.admin.post('/api/v1/admin/manual-payouts', { ...body, amountPaise: sum + 1 }, F1)).body.code).toBe(
      'PAYOUT_AMOUNT_MISMATCH',
    );
    const p = await app.admin.post('/api/v1/admin/manual-payouts', body, F1);
    expect(p.status).toBe(201);
    expect(await PayableRecord.countDocuments({ payoutId: p.body.id }).setOptions(S)).toBe(2);
    expect((await app.admin.post('/api/v1/admin/manual-payouts', body, F1)).body.code).toBe('PAYABLES_NOT_READY');
    expect((await app.admin.post(`/api/v1/admin/manual-payouts/${p.body.id}/approve`, {}, F1)).status).toBe(403); // no approve permission
    expect(
      (await app.admin.post(`/api/v1/admin/manual-payouts/${p.body.id}/approve`, {}, asStaff('f1:wallet.payout.approve'))).body.code,
    ).toBe('SECOND_PERSON_REQUIRED');
    const ok = await app.admin.post(`/api/v1/admin/manual-payouts/${p.body.id}/approve`, { note: 'Matches bank statement' }, F2);
    expect(ok.body).toMatchObject({ status: 'APPROVED', decidedBy: 'staff:f2' });
    expect((await app.admin.post(`/api/v1/admin/manual-payouts/${p.body.id}/approve`, {}, F2)).body.code).toBe('PAYOUT_ALREADY_DECIDED');
    expect((await PayableRecord.find({ hotelOrgId: h.orgId }).setOptions(S).lean()).map((x) => x.status)).toEqual(['PAID', 'PAID']);
    expect(await TransactionRecord.countDocuments({ 'reference.type': 'hotel-payout' })).toBe(1);
    await rollUpBalances({ clock });
    expect((await balancesOf()).find((a) => a.type === 'PAYABLE' && a.ownerOrgId === h.orgId)?.balancePaise).toBe(0); // owed = paid
    expect((await app.admin.get('/api/v1/admin/payables/due', F1)).body.data).toEqual([]);
  });

  it('a rejected payout unlocks the payables; the hotel statement and its CSV', async () => {
    const { h, ready, sum, token } = await twoReady();
    const body = {
      hotelOrgId: h.orgId,
      payableIds: ready.map((p) => String(p._id)),
      amountPaise: sum,
      utr: 'ICIC000999888',
      paidOn: '2026-12-06',
    };
    const p = await app.admin.post('/api/v1/admin/manual-payouts', body, F1);
    await app.admin.post(`/api/v1/admin/manual-payouts/${p.body.id}/reject`, { note: 'Wrong UTR' }, F2);
    expect(await PayableRecord.countDocuments({ hotelOrgId: h.orgId, status: 'ELIGIBLE', payoutId: null }).setOptions(S)).toBe(2);
    const due = (await app.admin.get('/api/v1/admin/payables/due', F1)).body.data;
    expect(due).toEqual([expect.objectContaining({ _id: h.orgId, amountPaise: sum, bookings: 2 })]);
    const s = (await app.srv.get('/api/v1/hotel/statements?from=2026-12-01&to=2026-12-31', auth(token))).body;
    expect(s).toMatchObject({ totals: { readyPaise: sum, paidPaise: 0 }, payouts: [] });
    expect(s.lines).toHaveLength(2);
    const csv = await fetch(`${app.srv.base}/api/v1/hotel/statements.csv?from=2026-12-01&to=2026-12-31`, { headers: auth(token) });
    expect(csv.headers.get('content-type')).toMatch(/text\/csv/);
    const text = await csv.text();
    expect(text.split('\n')[0]).toBe('type,reference,order,date,amount_inr,status,utr');
    expect(text.split('\n')).toHaveLength(3);
    expect((await app.srv.get('/api/v1/hotel/statements?from=2026-12-01&to=2026-12-31', {})).status).toBe(401);
  });
});
