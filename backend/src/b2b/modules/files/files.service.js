// @ts-check
/**
 * Storing and reading private documents (D29, D30). Callers (kyc, …) decide WHO may do it and pass
 * the org from their ctx; this service checks the content, encrypts, stores and logs nothing about
 * the content itself.
 * store(): check → new file key → encrypt → put in the store → record (with the key sealed).
 * read():  load record (same org, ACTIVE) → get → decrypt → verify sha256.
 */
import { createHash, randomBytes } from 'node:crypto';

import { decryptBytes, encryptBytes, newDataKey, seal, unseal } from '../../core/crypto.js';
import { NotFoundError, ServiceUnavailableError } from '../../core/errors.js';
import { checkUpload, safeFileName } from './domain/content-check.js';
import { FileRecord } from './models/file.model.js';

const KEY_PURPOSE = 'file-key';
const ID = /^[a-f0-9]{24}$/;

/** @typedef {{ id: string, purpose: string, originalName: string, contentType: string, size: number, createdAt: Date }} FileDto */

/** @param {any} f @returns {FileDto} */
const toDto = (f) => ({
  id: String(f._id),
  purpose: f.purpose,
  originalName: f.originalName,
  contentType: f.contentType,
  size: f.size,
  createdAt: f.createdAt,
});

/**
 * @param {{ store: import('./storage.js').FileStore, masterKey: string | undefined, clock: import('../../core/clock.js').Clock }} deps
 */
export function createFilesService(deps) {
  const master = () => {
    if (!deps.masterKey || deps.masterKey.length < 32) throw new ServiceUnavailableError('FILE_STORAGE_NOT_CONFIGURED');
    return deps.masterKey;
  };

  return {
    /**
     * @param {{ orgId: string, purpose: string, uploadedBy: string, originalName?: string | undefined, bytes: Buffer,
     *   allowed?: readonly import('./domain/content-check.js').DocumentType[], maxBytes?: number }} input
     * @returns {Promise<FileDto>}
     */
    async store(input) {
      const { contentType } = checkUpload(input.bytes, { allowed: input.allowed, maxBytes: input.maxBytes });
      const fileKey = newDataKey();
      const storageKey = randomBytes(24).toString('hex');
      await deps.store.put(storageKey, encryptBytes(input.bytes, fileKey));
      const doc = await FileRecord.create({
        orgId: input.orgId,
        purpose: input.purpose,
        originalName: safeFileName(input.originalName),
        contentType,
        size: input.bytes.length,
        sha256: createHash('sha256').update(input.bytes).digest('hex'),
        storageKey,
        wrappedKey: seal(fileKey.toString('base64'), { secret: master(), purpose: KEY_PURPOSE }),
        uploadedBy: input.uploadedBy,
      });
      return toDto(doc);
    },

    /** @param {string} orgId @param {string} fileId @returns {Promise<FileDto | null>} */
    async describe(orgId, fileId) {
      if (!ID.test(fileId)) return null;
      const doc = await FileRecord.findOne({ _id: fileId, orgId, status: 'ACTIVE' }).lean();
      return doc ? toDto(doc) : null;
    },

    /**
     * @param {string} orgId @param {string} fileId
     * @returns {Promise<{ bytes: Buffer, contentType: string, originalName: string }>}
     */
    async read(orgId, fileId) {
      if (!ID.test(fileId)) throw new NotFoundError('FILE_NOT_FOUND');
      const doc = await FileRecord.findOne({ _id: fileId, orgId, status: 'ACTIVE' }).lean();
      if (!doc) throw new NotFoundError('FILE_NOT_FOUND'); // another org's file looks missing
      const fileKey = Buffer.from(String(unseal(doc.wrappedKey, { secret: master(), purpose: KEY_PURPOSE })), 'base64');
      const bytes = decryptBytes(await deps.store.get(doc.storageKey), fileKey);
      if (createHash('sha256').update(bytes).digest('hex') !== doc.sha256) throw new Error('[b2b] stored file does not match its checksum');
      return { bytes, contentType: doc.contentType, originalName: doc.originalName };
    },

    /** Marks a file deleted and removes its bytes. @param {string} orgId @param {string} fileId */
    async remove(orgId, fileId) {
      if (!ID.test(fileId)) throw new NotFoundError('FILE_NOT_FOUND');
      const doc = await FileRecord.findOneAndUpdate({ _id: fileId, orgId, status: 'ACTIVE' }, { $set: { status: 'DELETED' } }).lean();
      if (!doc) throw new NotFoundError('FILE_NOT_FOUND');
      await deps.store.remove(doc.storageKey);
    },
  };
}
