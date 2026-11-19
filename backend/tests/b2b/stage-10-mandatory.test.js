// @ts-check
/**
 * Stage 10 mandatory tests (plan Stage 10 §8). This file holds a B2B client's verification end to end through the
 * generic KYC engine (configuration only — the engine's code was not changed for clients), the approval listeners'
 * effects, a "Junior Agent" custom role limited to search, and team / role isolation between two client companies.
 * Also covered elsewhere: client details and document set → kyc-client-details.test.js; registration →
 * kyc-client-registration.test.js; categories → client-categories.test.js; approval listeners repeat-safe and the
 * welcome → client-approval.test.js; view-as read-only and audited (any org type) → view-as.test.js.
 */
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createUserRepository } from '../../src/b2b/modules/identity/index.js';
import { ApplicationRecord, gstinCheckChar } from '../../src/b2b/modules/kyc/index.js';
import {
  createClientCategoriesService,
  createOrganizationsService,
  OrganizationRecord,
  seedClientCategories,
} from '../../src/b2b/modules/organizations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'stage10', 'test', 'secret', 'long-enough-1'].join('-');
const clock = { now: () => new Date('2026-11-19T10:00:00Z') };
const SYSTEM = { tenantScope: /** @type {const} */ ('SYSTEM'), tenantReason: 'test' };
const PDF = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF', 'latin1');
const CLIENT_SET = ['gst_certificate', 'pan_card', 'registration_proof', 'address_proof', 'cancelled_cheque'];
const APPROVER = { 'x-staff': 'c1:platform.kyc.read,platform.kyc.review,platform.kyc.approve' };
const gstin = (/** @type {string} */ base) => base + gstinCheckChar(base);

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let admin;
let dir = '';
const users = createUserRepository({ bcryptCost: 4, clock });
const orgs = createOrganizationsService({ clock });
const categories = createClientCategoriesService({ clock });
const auth = (/** @type {string} */ t) => ({ authorization: `Bearer ${t}` });

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  await seedClientCategories();
  dir = await mkdtemp(path.join(tmpdir(), 'b2b-stage10-'));
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

/** @param {string} email @param {string} panBase e.g. 'AABCW1234K' */
async function verifiedClient(email, panBase) {
  const details = {
    legalName: `${panBase} Travels Private Limited`,
    contactName: 'Owner',
    mobile: '9876543210',
    email,
    gstRegistered: true,
    gstin: gstin(`07${panBase}1Z`),
    pan: panBase,
    address: { line1: '12 Connaught Place', city: 'New Delhi', stateCode: '07', pin: '110001' },
    termsAccepted: true,
    termsVersion: '2026-11',
  };
  const reg = await srv.post(
    '/api/v1/registrations/client',
    { details, owner: { name: 'Owner', password: 'correct-horse-battery-1' } },
    { 'x-b2b-auth': '1' },
  );
  const token = reg.body.accessToken;
  const me = (await srv.get('/api/v1/me', auth(token))).body;
  await users.markEmailVerified(me.user.id);
  await srv.put('/api/v1/kyc/bank', { holderName: 'Owner', accountNumber: '50100123456789', ifsc: 'HDFC0001234' }, auth(token));
  for (const key of CLIENT_SET) {
    const up = await fetch(`${srv.base}/api/v1/files?purpose=kyc-document`, {
      method: 'POST',
      headers: { ...auth(token), 'content-type': 'application/octet-stream', 'x-file-name': 'doc.pdf' },
      body: PDF,
    });
    const fileId = /** @type {{ id: string }} */ (await up.json()).id;
    expect((await srv.put(`/api/v1/kyc/documents/${key}`, { fileId }, auth(token))).status).toBe(200);
  }
  const submitted = await srv.post('/api/v1/kyc/submit', {}, auth(token));
  expect(submitted.body).toMatchObject({ status: 'SUBMITTED', orgType: 'CLIENT' });
  const id = submitted.body.id;
  const base = '/api/v1/admin/kyc-applications';
  await admin.post(`${base}/${id}/assign`, {}, APPROVER);
  for (const key of CLIENT_SET)
    expect((await admin.put(`${base}/${id}/documents/${key}`, { verdict: 'VERIFIED' }, APPROVER)).status).toBe(200);
  expect((await admin.post(`${base}/${id}/decision`, { decision: 'APPROVE', note: 'Checked' }, APPROVER)).body.status).toBe('APPROVED');
  // what the background listeners do after `kyc.application.approved` / `organizations.org.activated`
  await orgs.activate({ orgId: me.currentOrgId, legalName: details.legalName, activatedBy: `kyc:${id}` });
  await categories.assignDefault(me.currentOrgId);
  return { token, orgId: /** @type {string} */ (me.currentOrgId), applicationId: id };
}

describe('client verification through the generic engine', () => {
  it('register → documents → submit → MusafirBaba approves → active, Standard, signed in to its workspace', async () => {
    const c = await verifiedClient('owner@wanderlust.in', 'AABCW1234K');
    const event = (await ApplicationRecord.findOne({ orgId: c.orgId }).setOptions(SYSTEM).lean())?.pendingEvents?.find(
      (e) => e.type === 'kyc.application.approved',
    );
    expect(event?.payload).toMatchObject({ orgType: 'CLIENT', approvedBy: ['staff:c1'] });
    expect(await OrganizationRecord.findById(c.orgId).setOptions(SYSTEM).lean()).toMatchObject({
      type: 'CLIENT',
      status: 'ACTIVE',
      clientCategory: 'STANDARD',
    });
    const me = (await srv.get('/api/v1/me', auth(c.token))).body;
    expect(me.memberships.find((/** @type {any} */ m) => m.orgId === c.orgId)).toMatchObject({ type: 'CLIENT', status: 'ACTIVE' });
    expect(me.permissions).toContain('hotel-search.search.use');
  });
});

describe('team and roles', () => {
  it('a "Junior Agent" custom role (search only) and a branch; another client company sees none of it', async () => {
    const a = await verifiedClient('owner@alpha.in', 'AABCA1234K');
    const b = await verifiedClient('owner@beta.in', 'AABCB1234K');
    const role = await srv.post(
      '/api/v1/roles',
      { name: 'Junior Agent', permissions: ['hotel-search.search.use', 'pricing.markup.read'] },
      auth(a.token),
    );
    expect(role.status).toBe(201);
    const branch = await srv.post('/api/v1/branches', { name: 'Delhi office', city: 'New Delhi', stateCode: '07' }, auth(a.token));
    expect(branch.status).toBe(201);
    // sensitive / platform permissions can never go into a custom role
    expect(
      (await srv.post('/api/v1/roles', { name: 'Sneaky', permissions: ['platform.org.manage'] }, auth(a.token))).status,
    ).toBeGreaterThanOrEqual(400);
    const bRoles = (await srv.get('/api/v1/roles', auth(b.token))).body.data.map((/** @type {any} */ r) => r.name);
    expect(bRoles).not.toContain('Junior Agent');
    expect((await srv.get('/api/v1/branches', auth(b.token))).body.data).toEqual([]);
    const roleId = String(role.body.ref).split(':').pop(); // custom roles answer with a `custom:<id>` reference
    expect((await srv.patch(`/api/v1/roles/${roleId}`, { name: 'Taken over' }, auth(b.token))).status).toBe(404);
    expect((await srv.patch(`/api/v1/roles/${roleId}`, { name: 'Junior Agent (Delhi)' }, auth(a.token))).status).toBe(200);
    const bMembers = (await srv.get('/api/v1/members', auth(b.token))).body.data;
    expect(bMembers.map((/** @type {any} */ m) => m.email)).toEqual(['owner@beta.in']);
  });
});
