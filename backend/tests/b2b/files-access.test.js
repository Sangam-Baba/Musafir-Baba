// @ts-check
import express from 'express';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import { createUserRepository } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const SECRET = ['b2b', 'file', 'access', 'test', 'secret', 'long-enough-12'].join('-');
const PASSWORD = 'correct-horse-battery';
let now = new Date('2026-11-15T10:00:00Z');
const clock = { now: () => now };
const quiet = createLogger({ write: () => {} });
const PDF = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n(PAN AAAPL1234C)\n%%EOF', 'latin1');

/** @type {Awaited<ReturnType<typeof startMongo>>} */
let mongo;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let srv;
/** @type {Awaited<ReturnType<typeof startServer>>} */
let admin;
let dir = '';
let orgId = '';
let ownerToken = '';
let managerToken = '';

beforeAll(async () => {
  mongo = await startMongo();
  await runMigrations(MIGRATIONS, { clock, owner: 'test' });
  dir = await mkdtemp(path.join(tmpdir(), 'b2b-file-access-'));
  const env = { B2B_AUTH_SECRET: SECRET, B2B_FILE_DIR: dir };
  const app = express();
  app.use('/api/v1', createB2BRouter({ connect: false, logger: quiet, clock, env }));
  srv = await startServer(app);
  const staffApp = express();
  staffApp.use(
    '/api/v1',
    createB2BRouter({
      connect: false,
      logger: quiet,
      clock,
      env,
      authenticate: async () => ({ type: 'staff', staffId: 's1', permissions: ['platform.kyc.read'] }),
    }),
  );
  admin = await startServer(staffApp);

  const users = createUserRepository({ bcryptCost: 4, clock });
  const orgs = createOrganizationsService({ clock });
  const owner = await users.create({ email: 'owner@seaview.in', name: 'Owner', password: PASSWORD });
  const manager = await users.create({ email: 'manager@seaview.in', name: 'Manager', password: PASSWORD });
  orgId = (await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, createdBy: 's' })).id;
  await orgs.addMember({ orgId, userId: manager.id, roles: ['hotel.manager'], addedBy: 's' });
  const login = async (/** @type {string} */ email) =>
    (await srv.post('/api/v1/auth/login', { identifier: email, password: PASSWORD }, { 'x-b2b-auth': '1' })).body.accessToken;
  ownerToken = await login('owner@seaview.in');
  managerToken = await login('manager@seaview.in');
});
afterAll(async () => {
  await srv.close();
  await admin.close();
  await rm(dir, { recursive: true, force: true });
  await mongo.stop();
});

/** @param {string} token */
const auth = (token) => ({ authorization: `Bearer ${token}` });
async function uploadAsOwner() {
  const res = await fetch(`${srv.base}/api/v1/files?purpose=kyc-document`, {
    method: 'POST',
    headers: { ...auth(ownerToken), 'content-type': 'application/octet-stream', 'x-file-name': 'PAN card.pdf' },
    body: PDF,
  });
  return /** @type {{ id: string }} */ (await res.json());
}
/** @param {string} token */
const download = (token) => fetch(`${srv.base}/api/v1/files/download?t=${encodeURIComponent(token)}`);

describe('opening documents', () => {
  it('the Owner gets a 60-second link; the download is a file download with the original bytes', async () => {
    now = new Date('2026-11-15T10:00:00Z');
    const file = await uploadAsOwner();
    const link = await srv.post(`/api/v1/files/${file.id}/link`, {}, auth(ownerToken));
    expect(link.body.expiresAt).toBe('2026-11-15T10:01:00.000Z');
    const res = await download(link.body.token);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="PAN card.pdf"');
    expect(res.headers.get('content-security-policy')).toContain('sandbox');
    expect(Buffer.from(await res.arrayBuffer()).toString('latin1')).toContain('AAAPL1234C');
  });

  it('links expire after 60 seconds and cannot be edited', async () => {
    now = new Date('2026-11-15T10:00:00Z');
    const file = await uploadAsOwner();
    const { token } = (await srv.post(`/api/v1/files/${file.id}/link`, {}, auth(ownerToken))).body;
    const [body, mac] = token.split('.');
    const edited = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), e: 9999999999 })).toString(
      'base64url',
    );
    expect((await download(`${edited}.${mac}`)).status).toBe(404);
    now = new Date('2026-11-15T10:01:01Z');
    expect((await download(token)).status).toBe(404);
  });

  it("reviewers open any org's document from the admin side; every link and download is logged", async () => {
    now = new Date('2026-11-15T10:05:00Z'); // within the Owner's 15-minute token
    const file = await uploadAsOwner();
    const link = await admin.post(`/api/v1/admin/files/${file.id}/link`, { orgId });
    expect((await download(link.body.token)).status).toBe(200);
    const log = (await admin.get(`/api/v1/admin/files/${file.id}/access?orgId=${orgId}`)).body.data;
    expect(log.map((/** @type {any} */ e) => [e.action, e.viewer])).toEqual([
      ['downloaded', 'staff:s1'],
      ['link-issued', 'staff:s1'],
    ]);
  });

  it("no link for people without the permission, or for another org's file", async () => {
    now = new Date('2026-11-15T10:10:00Z');
    const file = await uploadAsOwner();
    expect((await srv.post(`/api/v1/files/${file.id}/link`, {}, auth(managerToken))).status).toBe(403); // KYC stays with the Owner
    expect((await admin.post(`/api/v1/admin/files/${file.id}/link`, { orgId: '64b000000000000000000000' })).status).toBe(404);
    expect((await srv.get(`/api/v1/admin/files/${file.id}/access?orgId=${orgId}`, auth(ownerToken))).status).toBe(403);
  });
});
