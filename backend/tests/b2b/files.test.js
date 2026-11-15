// @ts-check
import express from 'express';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { decryptBytes, encryptBytes, newDataKey } from '../../src/b2b/core/crypto.js';
import { runMigrations } from '../../src/b2b/core/db/migrations.js';
import { createLogger } from '../../src/b2b/core/logger.js';
import {
  checkUpload,
  createFilesService,
  createLocalStore,
  createR2Store,
  detectType,
  R2_PREFIX,
  safeFileName,
} from '../../src/b2b/modules/files/index.js';
import { createUserRepository } from '../../src/b2b/modules/identity/index.js';
import { createOrganizationsService } from '../../src/b2b/modules/organizations/index.js';
import { MIGRATIONS } from '../../src/b2b/migrations/index.js';
import { createB2BRouter } from '../../src/b2b/routes/v1.js';
import { startServer } from './helpers/http.js';
import { startMongo } from './helpers/mongo.js';

const clock = { now: () => new Date('2026-11-15T10:00:00Z') };
const MASTER = ['file', 'master', 'key', 'for', 'tests', 'long-enough-1234567'].join('-');
const pdf = (body = 'Invoice GSTIN 27AAAPL1234C1ZV') =>
  Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n(${body})\n%%EOF`, 'latin1');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('pngdata')]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('jpgdata')]);

describe('upload checks (D30)', () => {
  it('decides the type from the content, never the name', () => {
    expect(detectType(pdf())).toBe('application/pdf');
    expect(detectType(PNG)).toBe('image/png');
    expect(detectType(JPG)).toBe('image/jpeg');
    expect(detectType(Buffer.from('MZ\x90\x00 executable'))).toBeNull();
    expect(detectType(Buffer.from('<html><script>'))).toBeNull();
  });

  it.each([
    ['empty', Buffer.alloc(0), 'FILE_EMPTY'],
    ['an executable named .pdf', Buffer.from('MZ\x90\x00'), 'FILE_TYPE_NOT_ALLOWED'],
    ['plain text', Buffer.from('hello'), 'FILE_TYPE_NOT_ALLOWED'],
    ['a PDF with JavaScript', pdf('/OpenAction << /S /JavaScript /JS (app.alert(1)) >>'), 'PDF_NOT_SAFE'],
    ['a PDF with a launch action', pdf('/S /Launch /F (cmd.exe)'), 'PDF_NOT_SAFE'],
    ['a PDF carrying another file', pdf('/EmbeddedFiles << >>'), 'PDF_NOT_SAFE'],
    ['a PDF that submits a form', pdf('/S /SubmitForm /F (http://x)'), 'PDF_NOT_SAFE'],
  ])('refuses %s', (_name, bytes, code) => {
    expect(() => checkUpload(bytes)).toThrow(expect.objectContaining({ code }));
  });

  it('size limit and allowed types per purpose; safe display names', () => {
    expect(() => checkUpload(pdf(), { maxBytes: 10 })).toThrow(expect.objectContaining({ code: 'FILE_TOO_LARGE' }));
    expect(() => checkUpload(PNG, { allowed: ['application/pdf'] })).toThrow(expect.objectContaining({ code: 'FILE_TYPE_NOT_ALLOWED' }));
    expect(checkUpload(pdf()).contentType).toBe('application/pdf');
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('C:\\Users\\x\\GST cert <final>.pdf')).toBe('GST cert _final_.pdf');
    expect(safeFileName(undefined)).toBe('document');
  });
});

describe('encryption at rest (D29)', () => {
  it('round-trips; a changed byte or the wrong key is detected', () => {
    const key = newDataKey();
    const blob = encryptBytes(Buffer.from('secret PAN AAAPL1234C'), key);
    expect(blob.toString('latin1')).not.toContain('AAAPL1234C');
    expect(decryptBytes(blob, key).toString()).toBe('secret PAN AAAPL1234C');
    expect(() => decryptBytes(blob, newDataKey())).toThrow();
    const tampered = Buffer.from(blob);
    tampered.writeUInt8(tampered.readUInt8(tampered.length - 1) ^ 1, tampered.length - 1);
    expect(() => decryptBytes(tampered, key)).toThrow();
  });
});

describe('files service', () => {
  /** @type {Awaited<ReturnType<typeof startMongo>>} */
  let mongo;
  let dir = '';
  beforeAll(async () => {
    mongo = await startMongo();
    await runMigrations(MIGRATIONS, { clock, owner: 'test' });
    dir = await mkdtemp(path.join(tmpdir(), 'b2b-files-'));
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
    await mongo.stop();
  });

  it('stores encrypted bytes under a random name; reads them back for the same org only', async () => {
    const files = createFilesService({ store: createLocalStore(dir), masterKey: MASTER, clock });
    const stored = await files.store({ orgId: 'org-a', purpose: 'kyc-document', uploadedBy: 'u1', originalName: 'gst.pdf', bytes: pdf() });
    expect(stored).toMatchObject({ contentType: 'application/pdf', originalName: 'gst.pdf', purpose: 'kyc-document' });
    const onDisk = await readdir(dir);
    expect(onDisk).toHaveLength(1);
    expect(onDisk[0]).toMatch(/^[a-f0-9]{48}$/);
    const raw = await readFile(path.join(dir, /** @type {string} */ (onDisk[0])));
    expect(raw.toString('latin1')).not.toContain('27AAAPL1234C1ZV'); // only ciphertext on disk
    expect((await files.read('org-a', stored.id)).bytes.toString('latin1')).toContain('27AAAPL1234C1ZV');
    await expect(files.read('org-b', stored.id)).rejects.toMatchObject({ code: 'FILE_NOT_FOUND', status: 404 });
    await files.remove('org-a', stored.id);
    expect(await readdir(dir)).toHaveLength(0);
    await expect(files.read('org-a', stored.id)).rejects.toMatchObject({ code: 'FILE_NOT_FOUND' });
  });

  it('a different master key cannot read stored files; no master key = not available', async () => {
    const a = createFilesService({ store: createLocalStore(dir), masterKey: MASTER, clock });
    const stored = await a.store({ orgId: 'org-a', purpose: 'kyc-document', uploadedBy: 'u1', bytes: PNG });
    await expect(
      createFilesService({ store: createLocalStore(dir), masterKey: 'x'.repeat(40), clock }).read('org-a', stored.id),
    ).rejects.toThrow();
    await expect(
      createFilesService({ store: createLocalStore(dir), masterKey: undefined, clock }).store({
        orgId: 'o',
        purpose: 'p',
        uploadedBy: 'u',
        bytes: PNG,
      }),
    ).rejects.toMatchObject({
      code: 'FILE_STORAGE_NOT_CONFIGURED',
    });
  });

  it('the R2 store writes only ciphertext, under the private b2b-private/ folder', async () => {
    /** @type {any[]} */
    const sent = [];
    const fake = {
      send: async (/** @type {any} */ command) => {
        sent.push(command);
        if (command.constructor.name === 'GetObjectCommand')
          return { Body: { transformToByteArray: async () => sent.find((c) => c.constructor.name === 'PutObjectCommand').input.Body } };
        return {};
      },
    };
    const files = createFilesService({
      store: createR2Store({
        endpoint: 'https://example.invalid',
        accessKeyId: 'k',
        secretAccessKey: 's',
        bucket: 'existing-bucket',
        client: fake,
      }),
      masterKey: MASTER,
      clock,
    });
    const stored = await files.store({ orgId: 'org-a', purpose: 'kyc-document', uploadedBy: 'u1', bytes: pdf() });
    const put = sent.find((c) => c.constructor.name === 'PutObjectCommand').input;
    expect(put.Bucket).toBe('existing-bucket');
    expect(put.Key).toMatch(new RegExp(`^${R2_PREFIX}[a-f0-9]{48}$`));
    expect(Buffer.from(put.Body).toString('latin1')).not.toContain('27AAAPL1234C1ZV');
    expect((await files.read('org-a', stored.id)).bytes.toString('latin1')).toContain('27AAAPL1234C1ZV');
  });

  describe('POST /api/v1/files (real router)', () => {
    /** @type {Awaited<ReturnType<typeof startServer>>} */
    let srv;
    const SECRET = ['b2b', 'files', 'test', 'secret', 'long-enough-1234567'].join('-');
    beforeAll(async () => {
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
    afterAll(async () => srv.close());

    /** @param {string} token @param {Buffer} bytes @param {string} [name] */
    const upload = async (token, bytes, name = 'doc.pdf') => {
      const res = await fetch(`${srv.base}/api/v1/files?purpose=kyc-document`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream', 'x-file-name': name },
        body: bytes,
      });
      return { status: res.status, body: /** @type {any} */ (await res.json().catch(() => null)) };
    };

    it('the hotel Owner uploads a KYC document; a Manager may not; unsafe files are refused', async () => {
      const users = createUserRepository({ bcryptCost: 4, clock });
      const orgs = createOrganizationsService({ clock });
      const owner = await users.create({ email: 'owner@seaview.in', name: 'Owner', password: 'correct-horse-battery' });
      const manager = await users.create({ email: 'manager@seaview.in', name: 'Manager', password: 'correct-horse-battery' });
      const org = await orgs.createOrganization({ type: 'HOTEL', legalName: 'Sea View', ownerUserId: owner.id, createdBy: 's' });
      await orgs.addMember({ orgId: org.id, userId: manager.id, roles: ['hotel.manager'], addedBy: 's' });
      const login = async (/** @type {string} */ email) =>
        (await srv.post('/api/v1/auth/login', { identifier: email, password: 'correct-horse-battery' }, { 'x-b2b-auth': '1' })).body
          .accessToken;
      const ownerToken = await login('owner@seaview.in');
      const ok = await upload(ownerToken, pdf(), 'GST certificate.pdf');
      expect([ok.status, ok.body.contentType, ok.body.originalName]).toEqual([201, 'application/pdf', 'GST certificate.pdf']);
      expect((await upload(await login('manager@seaview.in'), pdf())).status).toBe(403);
      expect((await upload(ownerToken, pdf('/S /JavaScript'))).body.code).toBe('PDF_NOT_SAFE');
      expect((await upload(ownerToken, Buffer.from('MZ\x90\x00'), 'cheque.pdf')).body.code).toBe('FILE_TYPE_NOT_ALLOWED');
    });
  });
});
