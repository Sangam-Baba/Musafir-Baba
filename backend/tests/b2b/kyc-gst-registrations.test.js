// @ts-check
/** Several GSTINs for one business (S03-T03a): same PAN, one per state, each verified on its own. */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { JobRecord } from '../../src/b2b/core/jobs/queue.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { RATE_LIMITS_COLLECTION } from '../../src/b2b/core/rate-limit.js';
import { UserRecord } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord, createGstRegistrations, gstinCheckChar } from '../../src/b2b/modules/kyc/index.js';
import { MemberRecord, OrganizationRecord } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'gst', 'registrations', 'test', 'secret', 'long-1'].join('-');
const clock = { now: () => new Date('2026-11-16T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const PDF = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF', 'latin1');
/** a valid GSTIN for a state and PAN @param {string} state @param {string} pan */
const gstinFor = (state, pan) => `${state}${pan}1Z${gstinCheckChar(`${state}${pan}1Z`)}`;
const PAN = 'AAPFU0939F';
const KARNATAKA = gstinFor('29', PAN);
const REVIEWER = { 'x-staff': 'r1:platform.kyc.read,platform.kyc.review' };

const details = {
  legalName: 'Sea View Hotels Private Limited',
  contactName: 'Asha',
  mobile: '9876543210',
  email: 'owner@seaview.in',
  gstRegistered: true,
  gstin: gstinFor('27', PAN),
  pan: PAN,
  address: { line1: '12 Marine Drive', city: 'Mumbai', stateCode: '27', pin: '400020' },
  propertyCount: 3,
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

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  dir = await mkdtemp(path.join(tmpdir(), 'b2b-gst-'));
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
/** @param {Record<string, unknown>} [change] */
async function hotel(change = {}) {
  const res = await srv.post(
    '/api/v1/registrations/hotel',
    { details: { ...details, ...change }, owner: { name: 'Asha', password: 'correct-horse-battery' } },
    { 'x-b2b-auth': '1' },
  );
  const token = res.body.accessToken;
  const kyc = (await srv.get('/api/v1/kyc', auth(token))).body;
  return { token, orgId: kyc.orgId, applicationId: kyc.id };
}
/** @param {string} token */
async function certificate(token) {
  const res = await fetch(`${srv.base}/api/v1/files?purpose=kyc-document`, {
    method: 'POST',
    headers: { ...auth(token), 'content-type': 'application/octet-stream', 'x-file-name': 'gst.pdf' },
    body: PDF,
  });
  return /** @type {{ id: string }} */ (await res.json()).id;
}
/** @param {string} token @param {string} gstin */
const addGstin = async (token, gstin) =>
  srv.post('/api/v1/kyc/gst-registrations', { gstin, fileId: await certificate(token) }, auth(token));

describe('adding GST registrations', () => {
  it('a further GSTIN of the same PAN for another state, with its certificate, waits for review', async () => {
    const { token, orgId } = await hotel();
    const res = await addGstin(token, KARNATAKA.toLowerCase());
    expect(res.status).toBe(201);
    expect(res.body.gstRegistrations).toMatchObject([{ stateCode: '29', gstin: KARNATAKA, status: 'PENDING', duplicate: false }]);
    expect((await ApplicationRecord.findOne({ orgId }).lean())?.pendingEvents?.map((e) => e.type)).toContain('kyc.gst-registration.added');
    const queue = (await admin.get('/api/v1/admin/kyc-applications', REVIEWER)).body.data;
    expect(queue).toMatchObject([{ orgId, status: 'DRAFT', pendingGstRegistrations: 1 }]); // shown even before the application is submitted
  });

  it('refuses: the main GSTIN state again, another PAN, an invalid GSTIN, a second one for a state, someone else’s file', async () => {
    const { token } = await hotel();
    expect((await addGstin(token, gstinFor('27', PAN))).body.code).toBe('GST_STATE_ALREADY_ADDED');
    expect((await addGstin(token, '29AAGCB7383J1Z4')).body.code).toBe('PAN_NOT_IN_GSTIN');
    expect((await addGstin(token, `${KARNATAKA.slice(0, 14)}X`)).body.code).toBe('GSTIN_INVALID');
    expect((await addGstin(token, KARNATAKA)).status).toBe(201);
    expect((await addGstin(token, KARNATAKA)).body.code).toBe('GST_STATE_ALREADY_ADDED');
    const other = await hotel({ email: 'other@hill.in', legalName: 'Hill View Hotels' });
    const foreign = await srv.post(
      '/api/v1/kyc/gst-registrations',
      { gstin: gstinFor('08', PAN), fileId: await certificate(other.token) },
      auth(token),
    );
    expect([foreign.status, foreign.body.code]).toEqual([404, 'FILE_NOT_FOUND']);
  });

  it('a business below the GST threshold has no GST registrations to add', async () => {
    const { token } = await hotel({ gstRegistered: false, gstin: undefined });
    expect((await addGstin(token, KARNATAKA)).body.code).toBe('KYC_NOT_GST_REGISTERED');
  });

  it('a GSTIN already on another organisation is flagged for the reviewer', async () => {
    const first = await hotel();
    await addGstin(first.token, KARNATAKA);
    const second = await hotel({ email: 'twin@seaview.in', legalName: 'Sea View Twin' });
    expect((await addGstin(second.token, KARNATAKA)).body.gstRegistrations[0].duplicate).toBe(true);
  });
});

describe('review and use', () => {
  it('verified on its own (the business stays as it is); verified ones count for properties and cannot be removed', async () => {
    const { token, orgId, applicationId } = await hotel();
    const added = (await addGstin(token, KARNATAKA)).body.gstRegistrations[0];
    await addGstin(token, gstinFor('08', PAN));
    const url = `/api/v1/admin/kyc-applications/${applicationId}/gst-registrations`;
    const reject = await admin.post(`${url}/${added.id}/decision`, { decision: 'REJECT' }, REVIEWER);
    expect(reject.body.code).toBe('KYC_REJECTION_NOTE_REQUIRED');
    const verified = await admin.post(`${url}/${added.id}/decision`, { decision: 'VERIFY' }, REVIEWER);
    expect(verified.body.gstRegistrations.find((/** @type {any} */ g) => g.id === added.id).status).toBe('VERIFIED');
    expect(verified.body.status).toBe('DRAFT');
    expect((await admin.post(`${url}/${added.id}/decision`, { decision: 'VERIFY' }, REVIEWER)).body.code).toBe(
      'GST_REGISTRATION_ALREADY_DECIDED',
    );
    expect((await admin.post(`${url}/${added.id}/decision`, { decision: 'VERIFY' }, { 'x-staff': 's1:platform.kyc.read' })).status).toBe(
      403,
    );

    const gst = createGstRegistrations({ clock });
    expect(await gst.verifiedGstins(orgId)).toEqual([{ stateCode: '29', gstin: KARNATAKA }]); // main GSTIN counts once the business is verified
    await ApplicationRecord.updateOne({ orgId }, { $set: { status: 'APPROVED' } });
    expect(await gst.verifiedGstins(orgId)).toEqual([
      { stateCode: '27', gstin: details.gstin },
      { stateCode: '29', gstin: KARNATAKA },
    ]);

    expect((await srv.del(`/api/v1/kyc/gst-registrations/${added.id}`, auth(token))).status).toBe(404); // verified: stays
    const rajasthan = (await srv.get('/api/v1/kyc', auth(token))).body.gstRegistrations.find(
      (/** @type {any} */ g) => g.stateCode === '08',
    );
    expect((await srv.del(`/api/v1/kyc/gst-registrations/${rajasthan.id}`, auth(token))).body.gstRegistrations).toHaveLength(1);
  });

  it('a verified business adding a state later stays verified while the new GSTIN is reviewed', async () => {
    const { token, orgId } = await hotel();
    await ApplicationRecord.updateOne({ orgId }, { $set: { status: 'APPROVED' } });
    const res = await addGstin(token, KARNATAKA);
    expect([res.body.status, res.body.gstRegistrations[0].status]).toEqual(['APPROVED', 'PENDING']);
    expect((await admin.get('/api/v1/admin/kyc-applications', REVIEWER)).body.data).toMatchObject([
      { orgId, status: 'APPROVED', pendingGstRegistrations: 1 },
    ]);
  });
});
