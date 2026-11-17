// @ts-check
/**
 * MusafirBaba's KYC review (S02-T08): queue, 30-minute lock, verdicts per document, decision, never your own
 * organisation. Who may verify (approve permission, first approval on high risk): kyc-review-approval.test.js.
 * Staff are stand-ins (header → staff actor); the `staffs` record for the own-organisation check is SHAPED like the existing app's — never real data.
 */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ObjectId } from 'mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { eventBus } from '../../src/b2b/background.js';
import { consumerJobHandlers, relayOnce } from '../../src/b2b/core/db/events-relay.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { EMAIL_JOB } from '../../src/b2b/core/email.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createJobRunner } from '../../src/b2b/core/jobs/runner.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord } from '../../src/b2b/modules/kyc/index.js';
import { InboxRecord } from '../../src/b2b/modules/notifications/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
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
  dir = await mkdtemp(path.join(tmpdir(), 'b2b-kyc-review-'));
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

/** @param {string} orgId */
const eventsOf = async (orgId) =>
  ((await ApplicationRecord.findOne({ orgId }).lean())?.pendingEvents ?? []).map((/** @type {any} */ e) => e.type);

describe('queue and lock', () => {
  it('Support sees the queue but cannot take; a reviewer takes it for 30 minutes; nobody else can act meanwhile', async () => {
    const { id, orgId } = await submittedHotel();
    const queue = (await admin.get(base, as(SUPPORT))).body.data;
    expect(queue).toMatchObject([{ id, status: 'SUBMITTED', legalName: 'Sea View Hotels Private Limited', reviewerId: null }]);
    expect((await admin.get(`${base}/${id}`, as(SUPPORT))).body.notVerified).toEqual(REGISTERED_SET);
    expect((await admin.post(`${base}/${id}/assign`, {}, as(SUPPORT))).status).toBe(403);

    const taken = await admin.post(`${base}/${id}/assign`, {}, as(A));
    expect(taken.body).toMatchObject({ status: 'UNDER_REVIEW', review: { reviewerId: 'a1', lockedUntil: '2026-11-15T10:30:00.000Z' } });
    expect(taken.body.you).toEqual({ staffId: 'a1', canReview: true, canSecondApprove: false });
    expect(await eventsOf(orgId)).toContain('kyc.application.assigned');
    expect((await admin.post(`${base}/${id}/assign`, {}, as(B))).body.code).toBe('KYC_LOCKED_BY_ANOTHER_REVIEWER');
    expect((await admin.put(`${base}/${id}/documents/pan_card`, { verdict: 'VERIFIED' }, as(B))).body.code).toBe('KYC_NOT_ASSIGNED_TO_YOU');

    now = new Date('2026-11-15T10:30:01Z'); // the lock expired: free for anyone
    expect((await admin.post(`${base}/${id}/assign`, {}, as(B))).body.review.reviewerId).toBe('b2');
    expect((await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE' }, as(A))).body.code).toBe('KYC_NOT_ASSIGNED_TO_YOU');
    const released = await admin.post(`${base}/${id}/release`, {}, as(B));
    expect([released.body.status, released.body.review.reviewerId]).toEqual(['SUBMITTED', null]);
  });

  it('filters by risk; oldest first', async () => {
    await submittedHotel({ gstRegistered: false, gstin: undefined, email: 'risky@hill.in' });
    now = new Date('2026-11-15T10:05:00Z');
    const normal = await submittedHotel();
    expect((await admin.get(`${base}?risk=normal`, as(SUPPORT))).body.data.map((/** @type {any} */ a) => a.id)).toEqual([normal.id]);
    const all = (await admin.get(base, as(SUPPORT))).body.data;
    expect(all.map((/** @type {any} */ a) => a.risk.highRisk)).toEqual([true, false]);
  });
});

describe('decisions', () => {
  it('approve needs every required document verified; then APPROVED with its event', async () => {
    const { id, orgId } = await submittedHotel();
    await admin.post(`${base}/${id}/assign`, {}, as(A));
    await verifyAll(A, id, ['pan_card']);
    const early = await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE' }, as(A));
    expect([early.status, early.body.code, early.body.keys]).toEqual([
      422,
      'KYC_DOCUMENTS_NOT_VERIFIED',
      ['gst_certificate', 'registration_proof', 'cancelled_cheque', 'signed_contract'],
    ]);
    await verifyAll(A, id, REGISTERED_SET);
    const approved = await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE', note: 'All good' }, as(A));
    expect(approved.body).toMatchObject({
      status: 'APPROVED',
      decidedAt: '2026-11-15T10:00:00.000Z',
      review: { decisionNote: 'All good' },
    });
    const event = (await ApplicationRecord.findOne({ orgId }).lean())?.pendingEvents?.find((e) => e.type === 'kyc.application.approved');
    expect(event?.payload).toMatchObject({ orgId, applicationId: id, approvedBy: ['staff:a1'] });
    expect((await admin.post(`${base}/${id}/assign`, {}, as(B))).body.code).toBe('KYC_NOT_IN_QUEUE');
  });

  it('reject with reasons per document; the hotel replaces that document and resubmits; other verdicts are kept', async () => {
    const { id, orgId, token } = await submittedHotel();
    await admin.post(`${base}/${id}/assign`, {}, as(A));
    await verifyAll(A, id, ['gst_certificate', 'pan_card', 'registration_proof', 'signed_contract']);
    await admin.put(`${base}/${id}/documents/cancelled_cheque`, { verdict: 'MISMATCH', note: 'Name differs from the PAN' }, as(A));
    expect((await admin.post(`${base}/${id}/decision`, { decision: 'REJECT' }, as(A))).body.code).toBe('KYC_REJECTION_NOTE_REQUIRED');
    const rejected = await admin.post(`${base}/${id}/decision`, { decision: 'REJECT', note: 'Please upload the right cheque' }, as(A));
    expect(rejected.body.status).toBe('REJECTED');
    const event = (await ApplicationRecord.findOne({ orgId }).lean())?.pendingEvents?.find((e) => e.type === 'kyc.application.rejected');
    expect(event?.payload.reasons).toEqual([{ key: 'cancelled_cheque', verdict: 'MISMATCH', note: 'Name differs from the PAN' }]);

    expect((await srv.get('/api/v1/kyc', auth(token))).body.editable).toBe(true);
    await attach(token, 'cancelled_cheque');
    expect((await srv.post('/api/v1/kyc/submit', {}, auth(token))).body).toMatchObject({ status: 'SUBMITTED', round: 2 });
    const again = await admin.post(`${base}/${id}/assign`, {}, as(B));
    expect(again.body.notVerified).toEqual(['cancelled_cheque']); // only the new file needs a look
  });

  it("a reviewer can never decide their own organisation's application", async () => {
    const { id } = await submittedHotel();
    const staffId = new ObjectId();
    await mongo.db.collection('staffs').insertOne({ _id: staffId, name: 'Asha', email: 'owner@seaview.in', role: 'admin', isActive: true });
    const me = `${staffId.toHexString()}:${REVIEW}`;
    await admin.post(`${base}/${id}/assign`, {}, as(me));
    await verifyAll(me, id, REGISTERED_SET);
    const own = await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE' }, as(me));
    expect([own.status, own.body.code]).toEqual([403, 'KYC_OWN_ORGANISATION']);
  });

  it('the full PAN and account number: reviewers only, every view recorded', async () => {
    const { id, orgId } = await submittedHotel();
    expect((await admin.post(`${base}/${id}/sensitive`, {}, as(SUPPORT))).status).toBe(403);
    expect((await admin.post(`${base}/${id}/sensitive`, {}, as(A))).body).toEqual({ pan: 'AAPFU0939F', accountNumber: '50100123456789' });
    expect(await eventsOf(orgId)).toContain('kyc.application.sensitive-viewed');
    expect((await admin.get(`${base}/64b000000000000000000000`, as(A))).status).toBe(404);
  });
});

/** Runs the background steps once: relay the application's events, then every consumer job. */
async function runBackground() {
  await JobRecord.deleteMany({ name: EMAIL_JOB }); // emails are not part of these checks
  await relayOnce(ApplicationRecord, eventBus, clock);
  const runner = createJobRunner({
    handlers: consumerJobHandlers(eventBus, clock),
    workerId: 'test',
    clock,
    logger: createLogger({ write: () => {} }),
  });
  while (await runner.processOne()) {
    /* drain */
  }
}

/** @param {string} orgId */
const orgOf = async (orgId) => /** @type {any} */ (await OrganizationRecord.findOne({ _id: orgId }).lean());

describe('after the decision (S02-T09)', () => {
  /** @param {string} id */
  async function approveAll(id) {
    await admin.post(`${base}/${id}/assign`, {}, as(A));
    await verifyAll(A, id, REGISTERED_SET);
    expect((await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE' }, as(A))).body.status).toBe('APPROVED');
  }

  it('approved → the hotel becomes ACTIVE with the verified legal name, once', async () => {
    const { id, orgId } = await submittedHotel();
    await OrganizationRecord.updateOne({ _id: orgId }, { $set: { legalName: 'Typed At Sign-up' } });
    await approveAll(id);
    expect((await orgOf(orgId)).status).toBe('ONBOARDING'); // nothing until the background step runs
    await runBackground();
    const org = await orgOf(orgId);
    expect([org.status, org.legalName]).toEqual(['ACTIVE', 'Sea View Hotels Private Limited']);
    expect(await InboxRecord.countDocuments({ recipientId: orgId, category: 'kyc.approved' })).toBe(1); // in the hotel's bell
    expect(org.pendingEvents.filter((/** @type {any} */ e) => e.type === 'organizations.org.activated')).toHaveLength(1);

    await ApplicationRecord.updateOne({ orgId }, { $set: { hasPendingEvents: true } }); // a repeat delivery
    await runBackground();
    expect(await createOrganizationsService({ clock }).activate({ orgId, activatedBy: 'again' })).toEqual({ activated: false });
    expect((await orgOf(orgId)).pendingEvents.filter((/** @type {any} */ e) => e.type === 'organizations.org.activated')).toHaveLength(1);
  });

  it('a hotel suspended meanwhile is not activated by the approval', async () => {
    const { id, orgId } = await submittedHotel();
    await approveAll(id);
    await OrganizationRecord.updateOne({ _id: orgId }, { $set: { status: 'SUSPENDED' } });
    await runBackground();
    expect((await orgOf(orgId)).status).toBe('SUSPENDED');
  });

  it('rejected → the hotel sees the note and each problem; a replaced document shows as resolved; the hotel stays onboarding', async () => {
    const { id, orgId, token } = await submittedHotel();
    await admin.post(`${base}/${id}/assign`, {}, as(A));
    await admin.put(`${base}/${id}/documents/cancelled_cheque`, { verdict: 'UNREADABLE', note: 'Blurry photo' }, as(A));
    await admin.post(`${base}/${id}/decision`, { decision: 'REJECT', note: 'Please send a clear cheque' }, as(A));
    await runBackground();
    expect((await orgOf(orgId)).status).toBe('ONBOARDING');

    const seen = (await srv.get('/api/v1/kyc', auth(token))).body;
    expect(seen.rejection).toEqual({
      note: 'Please send a clear cheque',
      decidedAt: '2026-11-15T10:00:00.000Z',
      reasons: [{ key: 'cancelled_cheque', verdict: 'UNREADABLE', note: 'Blurry photo', resolved: false }],
    });
    expect(JSON.stringify(seen)).not.toContain('staff:'); // reviewer not shown to the hotel
    await attach(token, 'cancelled_cheque');
    expect((await srv.get('/api/v1/kyc', auth(token))).body.rejection.reasons[0].resolved).toBe(true);
    await srv.post('/api/v1/kyc/submit', {}, auth(token));
    expect((await srv.get('/api/v1/kyc', auth(token))).body.rejection).toBeNull();
  });
});
