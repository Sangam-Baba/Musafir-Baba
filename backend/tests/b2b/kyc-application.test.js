// @ts-check
/** The hotel's KYC application (S02-T06): details, documents, submit / resubmit, the state machine. */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { EMAIL_JOB } from '../../src/b2b/core/email.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { createUserRepository, UserRecord } from '../../src/b2b/modules/identity/index.js';
import { APPLICATION_STATUSES, ApplicationRecord, TRANSITIONS, transition } from '../../src/b2b/modules/kyc/index.js';
import { createOrganizationsService, MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'kyc', 'application', 'test', 'secret', 'long-1'].join('-');
const PASSWORD = 'correct-horse-battery';
const clock = { now: () => new Date('2026-11-15T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const H = { 'x-b2b-auth': '1' };
const PDF = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF', 'latin1');
const REGISTERED_SET = ['gst_certificate', 'pan_card', 'registration_proof', 'cancelled_cheque', 'signed_contract'];

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
let dir = '';
const users = createUserRepository({ bcryptCost: 4, clock });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  dir = await mkdtemp(path.join(tmpdir(), 'b2b-kyc-'));
  const app = express();
  app.use(
    '/api/v1',
    createB2BRouter({
      connect: false,
      logger: createLogger({ write: () => {} }),
      clock,
      env: { B2B_AUTH_SECRET: SECRET, B2B_FILE_DIR: dir },
    }),
  );
  srv = await startServer(app);
});
afterAll(async () => {
  await srv.close();
  await rm(dir, { recursive: true, force: true });
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([
    UserRecord.deleteMany({}),
    OrganizationRecord.deleteMany({}).setOptions(SYSTEM),
    MemberRecord.deleteMany({}).setOptions(SYSTEM),
    ApplicationRecord.deleteMany({}).setOptions(SYSTEM),
    JobRecord.deleteMany({}),
    mongo.db.collection(RATE_LIMITS_COLLECTION).deleteMany({}),
  ]);
});

/** @param {string} t */
const auth = (t) => ({ authorization: `Bearer ${t}` });

/** Registers a hotel; returns the owner's token and org id. @param {string} [email] */
async function registerHotel(email = 'owner@seaview.in', verified = true) {
  const res = await srv.post(
    '/api/v1/registrations/hotel',
    { details: { ...details, email }, owner: { name: 'Asha', password: PASSWORD } },
    H,
  );
  const token = res.body.accessToken;
  const me = (await srv.get('/api/v1/me', auth(token))).body;
  if (verified) await users.markEmailVerified(me.user.id);
  return { token, orgId: me.currentOrgId, userId: me.user.id };
}

/** @param {string} token */
async function upload(token) {
  const res = await fetch(`${srv.base}/api/v1/files?purpose=kyc-document`, {
    method: 'POST',
    headers: { ...auth(token), 'content-type': 'application/octet-stream', 'x-file-name': 'doc.pdf' },
    body: PDF,
  });
  return /** @type {{ id: string }} */ (await res.json()).id;
}

/** @param {string} token @param {string[]} keys */
async function attachAll(token, keys) {
  for (const key of keys) {
    const res = await srv.put(`/api/v1/kyc/documents/${key}`, { fileId: await upload(token) }, auth(token));
    expect(res.status).toBe(200);
  }
}

/** @param {string} orgId */
const eventsOf = async (orgId) =>
  ((await ApplicationRecord.findOne({ orgId }).lean())?.pendingEvents ?? []).map((/** @type {any} */ e) => e.type);

describe('state machine', () => {
  it('allows exactly the transitions in the table, refuses every other pair', () => {
    for (const status of APPLICATION_STATUSES)
      for (const [action, rule] of Object.entries(TRANSITIONS)) {
        const a = /** @type {keyof typeof TRANSITIONS} */ (action);
        if (/** @type {readonly string[]} */ (rule.from).includes(status)) expect(transition(status, a)).toBe(rule.to);
        else expect(() => transition(status, a)).toThrow(expect.objectContaining({ code: 'KYC_TRANSITION_NOT_ALLOWED' }));
      }
    expect(transition('DRAFT', 'submit')).toBe('SUBMITTED');
    expect(transition('REJECTED', 'resubmit')).toBe('SUBMITTED');
    expect(() => transition('APPROVED', 'submit')).toThrow();
  });
});

describe('the hotel completes and submits its application', () => {
  it('shows the document list and what is missing; refuses submit until email is verified and every document is attached', async () => {
    const { token, userId } = await registerHotel('owner@seaview.in', false);
    const kyc = (await srv.get('/api/v1/kyc', auth(token))).body;
    expect(kyc.documentSet.map((/** @type {any} */ d) => d.key)).toEqual(REGISTERED_SET);
    expect([kyc.missingDocuments, kyc.editable, kyc.history.map((/** @type {any} */ h) => h.action)]).toEqual([
      REGISTERED_SET,
      true,
      ['created'],
    ]);

    expect((await srv.post('/api/v1/kyc/submit', {}, auth(token))).body.code).toBe('EMAIL_NOT_VERIFIED');
    await users.markEmailVerified(userId);
    const missing = await srv.post('/api/v1/kyc/submit', {}, auth(token));
    expect([missing.status, missing.body.code, missing.body.missing]).toEqual([422, 'KYC_DOCUMENTS_MISSING', REGISTERED_SET]);
  });

  it('attaching: one file per document, only known documents, only this org’s KYC uploads', async () => {
    const other = await registerHotel('other@hillview.in');
    const { token } = await registerHotel();
    await attachAll(token, ['pan_card', 'pan_card']);
    const kyc = (await srv.get('/api/v1/kyc', auth(token))).body;
    expect(kyc.documents.map((/** @type {any} */ d) => d.key)).toEqual(['pan_card']); // replaced, not added
    expect(kyc.revision).toBe(2);

    const unknown = await srv.put('/api/v1/kyc/documents/passport', { fileId: await upload(token) }, auth(token));
    expect([unknown.status, unknown.body.code]).toEqual([422, 'KYC_DOCUMENT_KEY_UNKNOWN']);
    const foreign = await srv.put('/api/v1/kyc/documents/gst_certificate', { fileId: await upload(other.token) }, auth(token));
    expect([foreign.status, foreign.body.code]).toEqual([404, 'FILE_NOT_FOUND']);
    expect((await srv.del('/api/v1/kyc/documents/pan_card', auth(token))).body.documents).toEqual([]);
    expect((await srv.del('/api/v1/kyc/documents/pan_card', auth(token))).status).toBe(404);
  });

  it('submit: moves to SUBMITTED with one event; repeating it (even all at once) changes nothing; then edits are refused', async () => {
    const { token, orgId } = await registerHotel();
    await attachAll(token, REGISTERED_SET);
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => srv.post('/api/v1/kyc/submit', {}, auth(token))));
    for (const r of results) expect([r.status, r.body.status, r.body.round]).toEqual([200, 'SUBMITTED', 1]);
    expect(await eventsOf(orgId)).toEqual(['kyc.application.submitted']);
    expect((await srv.post('/api/v1/kyc/submit', {}, auth(token))).body.status).toBe('SUBMITTED');
    expect(await eventsOf(orgId)).toEqual(['kyc.application.submitted']);

    const kyc = (await srv.get('/api/v1/kyc', auth(token))).body;
    expect([kyc.editable, kyc.submittedAt, kyc.history.map((/** @type {any} */ h) => h.action)]).toEqual([
      false,
      '2026-11-15T10:00:00.000Z',
      ['created', 'submit'],
    ]);
    const edit = await srv.put('/api/v1/kyc', { details }, auth(token));
    expect([edit.status, edit.body.code]).toEqual([422, 'KYC_NOT_EDITABLE']);
    expect((await srv.del('/api/v1/kyc/documents/pan_card', auth(token))).body.code).toBe('KYC_NOT_EDITABLE');
  });

  it('changing to "not GST registered" re-assesses risk and drops the GST certificate; bad details are refused', async () => {
    const { token } = await registerHotel();
    await attachAll(token, ['gst_certificate', 'pan_card']);
    const saved = await srv.put(
      '/api/v1/kyc',
      { details: { ...details, gstRegistered: false, gstin: undefined, pan: 'ABCPK1234L' } },
      auth(token),
    );
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ details: { gstRegistered: false, gstin: null }, risk: { flags: ['GST_UNREGISTERED'] } });
    expect(saved.body.documents.map((/** @type {any} */ d) => d.key)).toEqual(['pan_card']);
    expect((await srv.get('/api/v1/kyc', auth(token))).body.missingDocuments).toContain('gst_declaration');

    const bad = await srv.put('/api/v1/kyc', { details: { ...details, pan: 'AAPFU0940F' } }, auth(token));
    expect([bad.status, bad.body.code]).toEqual([422, 'KYC_DETAILS_INVALID']);
    expect((await srv.put('/api/v1/kyc', { details, orgId: 'x' }, auth(token))).status).toBe(400);
  });

  it('after a rejection the hotel edits and resubmits (round 2, its own event)', async () => {
    const { token, orgId } = await registerHotel();
    await attachAll(token, REGISTERED_SET);
    await srv.post('/api/v1/kyc/submit', {}, auth(token));
    await ApplicationRecord.updateOne({ orgId }, { $set: { status: 'REJECTED' } }); // the reviewer's decision comes in S02-T08
    await attachAll(token, ['cancelled_cheque']);
    const again = await srv.post('/api/v1/kyc/submit', {}, auth(token));
    expect([again.body.status, again.body.round]).toEqual(['SUBMITTED', 2]);
    expect(await eventsOf(orgId)).toEqual(['kyc.application.submitted', 'kyc.application.resubmitted']);
  });

  it('only people with the KYC permission: a Manager can neither read nor change it', async () => {
    const { token, orgId } = await registerHotel();
    const manager = await users.create({ email: 'manager@seaview.in', name: 'Manager', password: PASSWORD });
    await createOrganizationsService({ clock }).addMember({ orgId, userId: manager.id, roles: ['hotel.manager'], addedBy: 's' });
    const m = (await srv.post('/api/v1/auth/login', { identifier: 'manager@seaview.in', password: PASSWORD }, H)).body.accessToken;
    expect((await srv.get('/api/v1/kyc', auth(m))).status).toBe(403);
    expect((await srv.put('/api/v1/kyc', { details }, auth(m))).status).toBe(403);
    expect((await srv.post('/api/v1/kyc/submit', {}, auth(m))).status).toBe(403);
    expect((await srv.get('/api/v1/kyc', auth(token))).status).toBe(200);
  });
});

describe('email verification link again', () => {
  it('sends a new link to an unverified user, at most 3 times an hour; nothing for a verified user', async () => {
    const { token } = await registerHotel('owner@seaview.in', false);
    await JobRecord.deleteMany({});
    for (let i = 0; i < 3; i += 1) expect((await srv.post('/api/v1/registrations/resend-verification', {}, auth(token))).status).toBe(204);
    expect(await JobRecord.countDocuments({ name: EMAIL_JOB })).toBe(3);
    expect((await srv.post('/api/v1/registrations/resend-verification', {}, auth(token))).status).toBe(429);
    expect((await srv.post('/api/v1/registrations/resend-verification', {})).status).toBe(401);

    const verified = await registerHotel('other@hillview.in');
    await JobRecord.deleteMany({});
    expect((await srv.post('/api/v1/registrations/resend-verification', {}, auth(verified.token))).status).toBe(204);
    expect(await JobRecord.countDocuments({ name: EMAIL_JOB })).toBe(0);
  });
});
