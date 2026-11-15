// @ts-check
/**
 * `file_files`: one stored document. The bytes live encrypted in the file store under `storageKey`
 * (random); `wrappedKey` is that file's own key, sealed with the master key. `sha256` is of the
 * original bytes (checked on every read). Owned by the org.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const FILES_COLLECTION = 'file_files';

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    purpose: { type: String, required: true, maxlength: 60 },
    originalName: { type: String, required: true, maxlength: 100 },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    sha256: { type: String, required: true },
    storageKey: { type: String, required: true },
    wrappedKey: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'DELETED'], default: 'ACTIVE' },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const FileRecord = defineTenantModel('StoredFile', schema, FILES_COLLECTION, ['orgId']);
