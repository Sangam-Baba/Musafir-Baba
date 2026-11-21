// @ts-check
/**
 * Bank-transfer top-ups (S11-T06, plan §8 "manual top-up needs two finance users"): the client submits (UTR in use once,
 * no future bank date), one finance person checks, a different one approves → the wallet credited once (bank → wallet);
 * the checker can't approve; rejected frees the UTR; an approval whose credit was cut short is finished by the job;
 * other clients never see it.
 */
import { describe, expect, it } from 'vitest';

import { AccountRecord, ManualTopUpRecord, seedPlatformAccounts, TransactionRecord } from '../../src/b2b/modules/wallet/index.js';
import { walletParts } from '../../src/b2b/routes/wallet-wiring.js';
import { asStaff, auth, useInventoryApp } from './helpers/inventory-app.js';
import { clientOwner } from './helpers/search-setup.js';

const clock = { now: () => new Date('2026-11-21T10:00:00Z') };
const S = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const app = useInventoryApp({
  clock,
  models: [ManualTopUpRecord, TransactionRecord],
  env: { B2B_WALLET_ENABLED: 'true', B2B_TOPUP_BANK_DETAILS: 'HDFC 0000 IFSC HDFC0000001' },
});
const checker = asStaff('f1:wallet.topup.check');
const approver = asStaff('f2:wallet.topup.check,wallet.topup.approve');
const checkerAlsoApprover = asStaff('f1:wallet.topup.check,wallet.topup.approve');
let n = 0;

async function client() {
  await seedPlatformAccounts();
  return clientOwner(app, `bank${(n += 1)}@trips.example`);
}
/** @param {string} token @param {Record<string, unknown>} [over] */
const submit = (token, over = {}) =>
  app.srv.post(
    '/api/v1/wallet/manual-top-ups',
    { amountPaise: 2_500_000, method: 'NEFT', utr: `HDFC${(n += 1)}0000123`, paidOn: '2026-11-20', ...over },
    auth(token),
  );
/** @param {string} orgId */
const balance = async (orgId) =>
  /** @type {any} */ (await AccountRecord.findOne({ ownerOrgId: orgId, type: 'WALLET' }).setOptions(S).lean())?.balancePaise ?? 0;

describe('bank-transfer top-ups', () => {
  it('submitted → checked → approved by someone else → credited once; the books: bank → wallet', async () => {
    const c = await client();
    const t = (await submit(c.token)).body;
    expect(t).toMatchObject({ status: 'SUBMITTED', amountPaise: 2_500_000, credited: false });
    const mine = (await app.srv.get('/api/v1/wallet/manual-top-ups', auth(c.token))).body;
    expect(mine).toMatchObject({ bankDetails: 'HDFC 0000 IFSC HDFC0000001', data: [expect.objectContaining({ id: t.id })] });

    expect((await app.admin.post(`/api/v1/admin/wallet/manual-top-ups/${t.id}/decide`, { approve: true }, approver)).status).toBe(409); // not checked yet
    expect((await app.admin.post(`/api/v1/admin/wallet/manual-top-ups/${t.id}/check`, { ok: true }, checker)).body.status).toBe('CHECKED');
    expect((await app.admin.post(`/api/v1/admin/wallet/manual-top-ups/${t.id}/decide`, { approve: true }, checker)).status).toBe(403); // no permission
    expect(
      (await app.admin.post(`/api/v1/admin/wallet/manual-top-ups/${t.id}/decide`, { approve: true }, checkerAlsoApprover)).status,
    ).toBe(403); // same person
    const done = await app.admin.post(`/api/v1/admin/wallet/manual-top-ups/${t.id}/decide`, { approve: true }, approver);
    expect(done.body).toMatchObject({ status: 'APPROVED', credited: true, checkedBy: 'staff:f1', decidedBy: 'staff:f2' });
    expect((await app.admin.post(`/api/v1/admin/wallet/manual-top-ups/${t.id}/decide`, { approve: true }, approver)).status).toBe(409);
    expect(await balance(c.orgId)).toBe(2_500_000);
    const entry = /** @type {any} */ (await TransactionRecord.findOne({ 'reference.type': 'manual-topup', 'reference.id': t.id }).lean());
    expect(entry.purpose).toBe('wallet-topup-bank');
    expect(entry.memo).toContain('UTR');
  });

  it('a UTR in use is refused (any case); rejected frees it; future bank dates and bad amounts are refused', async () => {
    const c = await client();
    const t = (await submit(c.token, { utr: 'AXIS77665544' })).body;
    expect((await submit(c.token, { utr: 'axis77665544' })).status).toBe(409);
    await app.admin.post(`/api/v1/admin/wallet/manual-top-ups/${t.id}/check`, { ok: false, note: 'Not on the statement' }, checker);
    expect((await submit(c.token, { utr: 'AXIS77665544' })).status).toBe(201);
    expect((await submit(c.token, { paidOn: '2026-11-23' })).status).toBe(422);
    expect((await submit(c.token, { amountPaise: 9_999 })).status).toBe(400);
    expect(await balance(c.orgId)).toBe(0);
  });

  it('approved but the credit cut short → the job credits it once; other clients see only their own', async () => {
    const c = await client();
    const other = await client();
    const t = (await submit(c.token)).body;
    await ManualTopUpRecord.updateOne(
      { _id: t.id },
      { $set: { status: 'APPROVED', checkedBy: 'staff:f1', decidedBy: 'staff:f2' } },
    ).setOptions(S);
    const job = walletParts(clock).schedule;
    await job.run();
    await job.run();
    expect(await balance(c.orgId)).toBe(2_500_000);
    expect((await app.srv.get('/api/v1/wallet/manual-top-ups', auth(other.token))).body.data).toEqual([]);
  });
});
