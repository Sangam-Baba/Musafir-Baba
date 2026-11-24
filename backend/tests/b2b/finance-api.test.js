// @ts-check
/**
 * Stage 15 routes (S15-T09): admin payout run end to end over HTTP (hotel facts from KYC: no KYC → held; approver ≠
 * preparer; bank file with the account number read through KYC; paid); the hotel's payouts, statement and disputes
 * (another hotel → 404); GST register (JSON / CSV) and period lock; reports and the journal export; client reports
 * and branding; permissions refused where missing.
 */
import { describe, expect, it } from 'vitest';

import { InvoiceRecord, PeriodLockRecord } from '../../src/b2b/modules/billing/index.js';
import { DocumentRecord } from '../../src/b2b/modules/documents/index.js';
import { ApplicationRecord } from '../../src/b2b/modules/kyc/index.js';
import { BrandingRecord } from '../../src/b2b/modules/organizations/index.js';
import { BookingSummaryRecord } from '../../src/b2b/modules/reporting/index.js';
import {
  PayableRecord,
  PayoutLineRecord,
  PayoutRunRecord,
  seedPlatformAccounts,
  StatementDisputeRecord,
  TransactionRecord,
} from '../../src/b2b/modules/wallet/index.js';
import { asStaff, auth, SYSTEM, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-23T06:30:00Z') };
const app = useInventoryApp({
  clock,
  models: [
    PayableRecord,
    PayoutLineRecord,
    PayoutRunRecord,
    StatementDisputeRecord,
    ApplicationRecord,
    PeriodLockRecord,
    DocumentRecord,
    InvoiceRecord,
    BookingSummaryRecord,
    BrandingRecord,
  ],
});
const F1 = asStaff('f1:wallet.payout.record,reporting.reports.read');
const F2 = asStaff('f2:wallet.payout.record,wallet.payout.approve,reporting.reports.read,reporting.period.lock');
const ACCOUNT = '50100012345678';

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

/** A hotel with KYC approved and bank details saved through the KYC route 4 days ago. */
async function approvedHotel() {
  const h = await app.hotelWithProperty('owner@ganga.in');
  await ApplicationRecord.create({ orgId: h.orgId, orgType: 'HOTEL', createdBy: 'test' });
  const saved = await app.srv.put(
    '/api/v1/kyc/bank',
    { holderName: 'Ganga View', accountNumber: ACCOUNT, ifsc: 'HDFC0001234' },
    auth(h.token),
  );
  expect(saved.status).toBe(200);
  await ApplicationRecord.updateOne({ orgId: h.orgId }, { $set: { status: 'APPROVED', bankChangedAt: new Date('2026-11-19T00:00:00Z') } });
  return h;
}

describe('payout run over HTTP', () => {
  it('propose (no KYC → held) → second person approves → bank file → paid; hotel payouts, statement, disputes', async () => {
    await seedPlatformAccounts();
    await TransactionRecord.deleteMany({ purpose: 'hotel-payout-run' });
    const a = await approvedHotel();
    const b = await app.hotelWithProperty('owner@nokyc.in');
    await payable(a.orgId, 100_000, 'MBH-HA1');
    await payable(b.orgId, 50_000, 'MBH-HB1');

    const run = await app.admin.post('/api/v1/admin/payout-runs', { cycleEnd: '2026-11-22' }, F1);
    expect(run.status).toBe(201);
    const detail = (await app.admin.get(`/api/v1/admin/payout-runs/${run.body.id}`, F1)).body;
    const byHotel = Object.fromEntries(detail.lines.map((/** @type {any} */ l) => [l.hotelOrgId, l]));
    expect(byHotel[a.orgId]).toMatchObject({ status: 'INCLUDED', netPaise: 100_000 });
    expect(byHotel[b.orgId]).toMatchObject({ status: 'HELD', holdReasons: ['KYC_NOT_APPROVED', 'NO_BANK_DETAILS'] });

    expect((await app.admin.post(`/api/v1/admin/payout-runs/${run.body.id}/approve`, {}, F1)).status).toBe(403);
    const self = await app.admin.post(`/api/v1/admin/payout-runs/${run.body.id}/approve`, {}, asStaff('f1:wallet.payout.approve'));
    expect(self.body.code).toBe('SECOND_PERSON_REQUIRED');
    expect((await app.admin.post(`/api/v1/admin/payout-runs/${run.body.id}/approve`, {}, F2)).body.status).toBe('APPROVED');
    const file = await app.admin.post(`/api/v1/admin/payout-runs/${run.body.id}/bank-file`, {}, F2);
    expect(file.headers.get('content-type')).toContain('text/csv');
    expect(String(file.body)).toContain(`Ganga View,${ACCOUNT},HDFC0001234,1000.00`);
    const paid = await app.admin.post(`/api/v1/admin/payout-runs/${run.body.id}/paid`, { bankReference: 'NEFT-77' }, F2);
    expect(paid.body.status).toBe('PAID');

    const payouts = (await app.srv.get('/api/v1/hotel/payouts', auth(a.token))).body.data;
    expect(payouts).toEqual([expect.objectContaining({ netPaise: 100_000, paid: true })]);
    const st = await app.srv.get(`/api/v1/hotel/payouts/${payouts[0].id}/statement`, auth(a.token));
    expect(st.body).toMatchObject({ bankReference: 'NEFT-77', netPaise: 100_000 });
    expect((await app.srv.get(`/api/v1/hotel/payouts/${payouts[0].id}/statement`, auth(b.token))).status).toBe(404);
    expect((await app.srv.get('/api/v1/hotel/payouts', auth(b.token))).body.data).toEqual([]);

    const next = await payable(a.orgId, 30_000, 'MBH-HA2');
    const d = await app.srv.post(
      '/api/v1/hotel/statement-disputes',
      { payableId: String(next._id), message: 'Late checkout charge missing' },
      auth(a.token),
    );
    expect(d.status).toBe(201);
    expect((await app.admin.get('/api/v1/admin/statement-disputes?status=OPEN', F1)).body.data).toHaveLength(1);
    const resolved = await app.admin.post(
      `/api/v1/admin/statement-disputes/${d.body.id}/resolve`,
      { accept: true, note: 'Added next run' },
      F2,
    );
    expect(resolved.body.status).toBe('ACCEPTED');
    expect((await app.srv.get('/api/v1/hotel/statement-disputes', auth(a.token))).body.data[0]).toMatchObject({ status: 'ACCEPTED' });

    const journal = await app.admin.get('/api/v1/admin/exports/journal?from=2026-11-23&to=2026-11-23', F1);
    expect(journal.headers.get('content-disposition')).toContain('musafirbaba-journal-2026-11-23-to-2026-11-23.csv');
    expect(String(journal.body)).toContain('hotel-payout-run');
  });
});

describe('GST, reports, client side', () => {
  it('register JSON / CSV; lock only a finished month, once, with permission; reports; client reports and branding', async () => {
    expect((await app.admin.get('/api/v1/admin/gst-registers?month=2026-11', F1)).body).toMatchObject({ month: '2026-11', rows: [] });
    const csv = await app.admin.get('/api/v1/admin/gst-registers?month=2026-11&format=csv', F1);
    expect(String(csv.body).split('\n')[0]).toContain('kind,number,date');
    expect((await app.admin.post('/api/v1/admin/periods/2026-10/lock', { note: 'filed' }, F1)).status).toBe(403);
    expect((await app.admin.post('/api/v1/admin/periods/2026-11/lock', {}, F2)).body.code).toBe('PERIOD_NOT_FINISHED');
    expect((await app.admin.post('/api/v1/admin/periods/2026-10/lock', { note: 'GSTR-1 filed' }, F2)).status).toBe(200);
    expect((await app.admin.post('/api/v1/admin/periods/2026-10/lock', {}, F2)).status).toBe(409);

    expect((await app.admin.get('/api/v1/admin/reports', F1)).body.data).toContain('margin');
    expect((await app.admin.get('/api/v1/admin/reports/sales?from=2026-11-01&to=2026-11-30', F1)).body).toMatchObject({
      name: 'sales',
      rows: [],
    });
    expect((await app.admin.get('/api/v1/admin/reports/nope?from=2026-11-01&to=2026-11-30', F1)).status).toBe(400);
    expect(
      (await app.admin.get('/api/v1/admin/reports/sales?from=2026-11-01&to=2026-11-30', asStaff('x:wallet.payout.record'))).status,
    ).toBe(403);
    const rc = await app.admin.get('/api/v1/admin/reports/payments?from=2026-11-01&to=2026-11-30&format=csv', F1);
    expect(String(rc.body)).toBe('purpose,status,method,count,amount_inr,refunded_inr');

    const c = await clientOwner(app, 'reports@trips.in');
    expect((await app.srv.get('/api/v1/reports/bookings?from=2026-11-01&to=2026-11-30', auth(c.token))).body).toMatchObject({ rows: [] });
    expect((await app.srv.get('/api/v1/reports/usage?from=2026-11-01&to=2026-11-30', auth(c.token))).body.rows).toHaveLength(1);
    expect((await app.srv.get('/api/v1/branding', auth(c.token))).body.data).toBeNull();
    const brand = { name: 'Trips Co', contactPhone: null, contactEmail: 'help@trips.co', colour: '#0A6E5C', logoUrl: null };
    expect((await app.srv.put('/api/v1/branding', { ...brand, expectedVersion: 0 }, auth(c.token))).body).toMatchObject({ version: 1 });
    expect(
      (await app.srv.put('/api/v1/branding', { ...brand, logoUrl: 'javascript:x', expectedVersion: 1 }, auth(c.token))).body.code,
    ).toBe('BRAND_LOGO_INVALID');
    expect((await app.srv.put('/api/v1/branding', { ...brand, expectedVersion: 0 }, auth(c.token))).status).toBe(409);
    expect((await app.srv.get('/api/v1/branding', auth(c.token))).body.data).toMatchObject({ name: 'Trips Co', version: 1 });
    const h = await app.hotelWithProperty('owner@noreports.in');
    expect((await app.srv.get('/api/v1/reports/bookings?from=2026-11-01&to=2026-11-30', auth(h.token))).status).toBe(403);
    expect(await BrandingRecord.countDocuments({}).setOptions(SYSTEM)).toBe(1);
  });
});
