// @ts-check
/**
 * Who may verify a KYC application (S02-T08, decision D34): someone with `platform.kyc.approve` verifies on
 * their own at any risk; a reviewer without it gives only the first approval on a high-risk application.
 * Same stand-in staff and registration flow as kyc-review.test.js.
 */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord } from '../../src/b2b/modules/kyc/index.js';
import { MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'kyc', 'review', 'test', 'secret', 'long-enough-1'].join('-');
let now = new Date('2026-11-15T10:00:00Z');
const clock = { now: () => now };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const PDF = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF', 'latin1');
const REGISTERED_SET = ['gst_certificate', 'pan_card', 'registration_proof', 'cancelled_cheque', 'signed_contract'];
const UNREGISTERED_SET = ['gst_declaration', 'pan_card', 'registration_proof', 'cancelled_cheque', 'signed_contract'];
const REVIEW = 'platform.kyc.read,platform.kyc.review';
const A = `a1:${REVIEW}`;
const B = `b2:${REVIEW}`;
const C = `c3:${REVIEW},platform.kyc.approve`;
const SUPPORT = 's4:platform.kyc.read';

const details = {
  legalName: 'Sea View Hotels Private Limited',
  contactName: 'Asha Rao',
  mobile: '98765 43210',
  email: 'owner@seaview.in',
  gstRegistered: true,
  gstin: '27AAPFU0939F1ZV',
  pan: 'AAPFU0939F',
  address: { line1: '12 Marine Drive', city: 'Mumbai', stateCode: '27', pin: '400020' },
  propertyCount: 2,
  termsAccepted: true,
  termsVersion: '2026-11',
};

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let admin;
let dir = '';
const users = createUserRepository({ bcryptCost: 4, clock });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  dir = await mkdtemp(path.join(tmpdir(), 'b2b-kyc-approval-'));
  const env = { B2B_AUTH_SECRET: SECRET, B2B_FILE_DIR: dir };
  const logger = createLogger({ write: () => {} });
  const app = express();
  app.use('/api/v1', createB2BRouter({ connect: false, logger, clock, env }));
  srv = await startServer(app);
  const staffApp = express();
  staffApp.use(
    '/api/v1',
    createB2BRouter({
      connect: false,
      logger,
      clock,
      env,
      authenticate: async (req) => {
        const [staffId, perms] = String(req.get('x-staff') ?? '').split(':');
        return staffId ? { type: 'staff', staffId, permissions: (perms ?? '').split(',') } : null;
      },
    }),
  );
  admin = await startServer(staffApp);
});
afterAll(async () => {
  await srv.close();
  await admin.close();
  await rm(dir, { recursive: true, force: true });
  await mongo.stop();
});
beforeEach(async () => {
  now = new Date('2026-11-15T10:00:00Z');
  await Promise.all([
    UserRecord.deleteMany({}),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    ApplicationRecord.deleteMany({}).setOptions(SYSTEM),
    JobRecord.deleteMany({}),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
    mongo.db.collection('staffs').deleteMany({}),
  ]);
});

/** @param {string} t */
const auth = (t) => ({ authorization: `Bearer ${t}` });
/** @param {string} who */
const as = (who) => ({ 'x-staff': who });
const base = '/api/v1/admin/kyc-applications';

/** @param {string} token */
async function upload(token) {
  const res = await fetch(`${srv.base}/api/v1/files?purpose=kyc-document`, {
    method: 'POST',
    headers: { ...auth(token), 'content-type': 'application/octet-stream', 'x-file-name': 'doc.pdf' },
    body: PDF,
  });
  return /** @type {{ id: string }} */ (await res.json()).id;
}

/** @param {string} token @param {string} key */
const attach = async (token, key) =>
  expect((await srv.put(`/api/v1/kyc/documents/${key}`, { fileId: await upload(token) }, auth(token))).status).toBe(200);

/** A hotel that registered, filled everything in and submitted. @param {Record<string, unknown>} [change] */
async function submittedHotel(change = {}) {
  const d = { ...details, ...change };
  const reg = await srv.post(
    '/api/v1/registrations/hotel',
    { details: d, owner: { name: 'Asha', password: 'correct-horse-battery' } },
    { 'x-b2b-auth': '1' },
  );
  const token = reg.body.accessToken;
  const me = (await srv.get('/api/v1/me', auth(token))).body;
  await users.markEmailVerified(me.user.id);
  await srv.put('/api/v1/kyc/bank', { holderName: 'Sea View', accountNumber: '50100123456789', ifsc: 'HDFC0001234' }, auth(token));
  for (const key of d.gstRegistered ? REGISTERED_SET : UNREGISTERED_SET) await attach(token, key);
  const submitted = await srv.post('/api/v1/kyc/submit', {}, auth(token));
  expect(submitted.body.status).toBe('SUBMITTED');
  return { token, orgId: me.currentOrgId, id: submitted.body.id };
}

/** @param {string} who @param {string} id @param {string[]} keys */
async function verifyAll(who, id, keys) {
  for (const key of keys) expect((await admin.put(`${base}/${id}/documents/${key}`, { verdict: 'VERIFIED' }, as(who))).status).toBe(200);
}

describe('approvals', () => {
  it('high risk needs a second, different approver with the approve permission', async () => {
    const { id, orgId } = await submittedHotel({ gstRegistered: false, gstin: undefined });
    await admin.post(`${base}/${id}/assign`, {}, as(A));
    await verifyAll(A, id, UNREGISTERED_SET);
    const first = await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE', note: 'Documents fine' }, as(A));
    expect(first.body).toMatchObject({ status: 'UNDER_REVIEW', review: { reviewerId: null, firstApproval: { by: 'staff:a1' } } });
    expect((await admin.get(base, as(SUPPORT))).body.data[0].awaitingSecondApproval).toBe(true);

    await admin.post(`${base}/${id}/assign`, {}, as(A));
    expect((await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE' }, as(A))).body.code).toBe('KYC_SECOND_APPROVER_MUST_DIFFER');
    await admin.post(`${base}/${id}/release`, {}, as(A));
    await admin.post(`${base}/${id}/assign`, {}, as(B));
    expect((await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE' }, as(B))).body.code).toBe('KYC_SECOND_APPROVER_REQUIRED');
    await admin.post(`${base}/${id}/release`, {}, as(B));
    await admin.post(`${base}/${id}/assign`, {}, as(C));
    const final = await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE' }, as(C));
    expect(final.body.status).toBe('APPROVED');
    const event = (await ApplicationRecord.findOne({ orgId }).lean())?.pendingEvents?.find((e) => e.type === 'kyc.application.approved');
    expect(event?.payload.approvedBy).toEqual(['staff:a1', 'staff:c3']);
  });

  it('a reviewer with the approve permission verifies a high-risk application in one step (D34)', async () => {
    const { id, orgId } = await submittedHotel({ gstRegistered: false, gstin: undefined });
    await admin.post(`${base}/${id}/assign`, {}, as(C));
    await verifyAll(C, id, UNREGISTERED_SET);
    const done = await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE', note: 'Checked' }, as(C));
    expect(done.body).toMatchObject({ status: 'APPROVED', risk: { highRisk: true } });
    const event = (await ApplicationRecord.findOne({ orgId }).lean())?.pendingEvents?.find((e) => e.type === 'kyc.application.approved');
    expect(event?.payload.approvedBy).toEqual(['staff:c3']);
  });

  it('an application waiting after its own first approval is finished by the same approver with the approve permission (D34)', async () => {
    const { id, orgId } = await submittedHotel({ gstRegistered: false, gstin: undefined });
    await admin.post(`${base}/${id}/assign`, {}, as(C));
    await verifyAll(C, id, UNREGISTERED_SET);
    // recorded under the earlier rule: C's approval only counted as the first of two
    await ApplicationRecord.updateOne({ orgId }, { $set: { 'review.firstApproval': { by: 'staff:c3', at: now, note: null } } }).setOptions(
      SYSTEM,
    );
    expect((await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE' }, as(C))).body.status).toBe('APPROVED');
    const event = (await ApplicationRecord.findOne({ orgId }).lean())?.pendingEvents?.find((e) => e.type === 'kyc.application.approved');
    expect(event?.payload.approvedBy).toEqual(['staff:c3']);
  });
});
