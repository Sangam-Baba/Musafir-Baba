// @ts-check
/** PAN and bank account number: sealed per field, shown as last 4, opened only for reviewers and recorded (S02-T07). */
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createKycService, lastFour, validateBankDetails, validateHotelDetails } from '../../src/b2b/modules/kyc/index.js';
import { protectBank, protectDetails, revealSealed } from '../../src/b2b/modules/kyc/sensitive.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'kyc', 'sensitive', 'test', 'secret', 'long-enough'].join('-');
const clock = { now: () => new Date('2026-11-15T10:00:00Z') };
const PAN = 'AAPFU0939F';
const ACCOUNT = '50100123456789';
const details = {
  legalName: 'Sea View Hotels Private Limited',
  contactName: 'Asha Rao',
  mobile: '98765 43210',
  email: 'owner@seaview.in',
  gstRegistered: false,
  pan: PAN,
  address: { line1: '12 Marine Drive', city: 'Mumbai', stateCode: '27', pin: '400020' },
  propertyCount: 2,
  termsAccepted: true,
  termsVersion: '2026-11',
};

describe('bank details', () => {
  it('normalises; reports every problem at once', () => {
    expect(validateBankDetails({ holderName: '  Sea  View ', accountNumber: '5010 0123-456789', ifsc: 'hdfc0001234' })).toEqual({
      holderName: 'Sea View',
      accountNumber: ACCOUNT,
      ifsc: 'HDFC0001234',
    });
    try {
      validateBankDetails({ holderName: 'x', accountNumber: '12ab', ifsc: 'HDFC1001234' });
      expect.unreachable();
    } catch (e) {
      expect(/** @type {any} */ (e).code).toBe('BANK_DETAILS_INVALID');
      expect(/** @type {any} */ (e).details.errors.map((/** @type {any} */ x) => x.code)).toEqual([
        'HOLDER_NAME_INVALID',
        'ACCOUNT_NUMBER_INVALID',
        'IFSC_INVALID',
      ]);
    }
    expect(lastFour(ACCOUNT)).toBe('6789');
  });
});

describe('sealing', () => {
  const ORG = 'org-a';
  it('stores no plain value; opens only for the same org and key', () => {
    const stored = protectDetails(validateHotelDetails(details), { orgId: ORG, key: SECRET });
    expect(stored.details).not.toHaveProperty('pan');
    expect(stored.details.panLast4).toBe('939F');
    expect(stored.panSealed).not.toContain(PAN);
    const bank = protectBank({ holderName: 'Sea View', accountNumber: ACCOUNT, ifsc: 'HDFC0001234' }, { orgId: ORG, key: SECRET });
    expect(bank.bank).toEqual({ holderName: 'Sea View', ifsc: 'HDFC0001234', accountLast4: '6789' });

    const sealed = { panSealed: stored.panSealed, accountSealed: bank.accountSealed };
    expect(revealSealed(sealed, { orgId: ORG, key: SECRET })).toEqual({ pan: PAN, accountNumber: ACCOUNT });
    expect(() => revealSealed(sealed, { orgId: 'org-b', key: SECRET })).toThrow(); // copied into another org: useless
    expect(() => revealSealed(sealed, { orgId: ORG, key: `${SECRET}-other` })).toThrow();
    expect(() => protectDetails(validateHotelDetails(details), { orgId: ORG, key: undefined })).toThrow(
      expect.objectContaining({ code: 'KYC_ENCRYPTION_NOT_CONFIGURED', status: 503 }),
    );
  });
});

describe('through the API and in the database', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  /** @type {Awaited<ReturnType<typeof startServer>>} */
  let srv;
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
    const app = express();
    app.use(
      '/api/v1',
      createB2BRouter({ connect: false, logger: createLogger({ write: () => {} }), clock, env: { B2B_AUTH_SECRET: SECRET } }),
    );
    srv = await startServer(app);
  });
  afterAll(async () => {
    await srv.close();
    await mongo.stop();
  });

  it('the hotel sees last 4 only; the database holds no plain PAN or account number; reviewers open them and the view is recorded', async () => {
    const reg = await srv.post(
      '/api/v1/registrations/hotel',
      { details, owner: { name: 'Asha', password: 'correct-horse-battery' } },
      { 'x-b2b-auth': '1' },
    );
    const auth = { authorization: `Bearer ${reg.body.accessToken}` };
    const bad = await srv.put('/api/v1/kyc/bank', { holderName: 'Sea View', accountNumber: '12', ifsc: 'HDFC0001234' }, auth);
    expect([bad.status, bad.body.code]).toEqual([422, 'BANK_DETAILS_INVALID']);
    const saved = await srv.put('/api/v1/kyc/bank', { holderName: 'Sea View', accountNumber: ACCOUNT, ifsc: 'HDFC0001234' }, auth);
    expect(saved.body.bank).toEqual({ holderName: 'Sea View', ifsc: 'HDFC0001234', accountLast4: '6789' });

    const kyc = await srv.get('/api/v1/kyc', auth);
    expect(kyc.body.details.panLast4).toBe('939F');
    expect(kyc.body).not.toHaveProperty('sensitive');
    const shown = JSON.stringify(kyc.body);
    expect(shown).not.toContain(PAN);
    expect(shown).not.toContain(ACCOUNT);

    const raw = await mongo.db.collection('kyc_applications').findOne({ orgId: kyc.body.orgId });
    expect(JSON.stringify(raw)).not.toContain(PAN);
    expect(JSON.stringify(raw)).not.toContain(ACCOUNT);

    const service = createKycService({ clock, fieldKey: SECRET });
    expect(await service.revealSensitive(kyc.body.orgId, 'staff:s1')).toEqual({ pan: PAN, accountNumber: ACCOUNT });
    const after = await mongo.db.collection('kyc_applications').findOne({ orgId: kyc.body.orgId });
    const viewed = /** @type {any[]} */ (after?.pendingEvents ?? []).filter((e) => e.type === 'kyc.application.sensitive-viewed');
    expect(viewed.map((e) => e.payload)).toEqual([{ orgId: kyc.body.orgId, applicationId: kyc.body.id, viewer: 'staff:s1' }]);
    expect(JSON.stringify(after?.pendingEvents)).not.toContain(PAN);
  });
});
