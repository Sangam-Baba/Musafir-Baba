// @ts-check
/** `file_access_log`: every download link issued and every download of a document (who, when, from where). Owned by the org. */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const FILE_ACCESS_COLLECTION = 'file_access_log';

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    fileId: { type: String, required: true },
    action: { type: String, enum: ['link-issued', 'downloaded'], required: true },
    viewer: { type: String, required: true },
    ip: { type: String, default: null },
    at: { type: Date, required: true },
  },
  { versionKey: false },
);

export const FileAccessRecord = defineTenantModel('FileAccess', schema, FILE_ACCESS_COLLECTION, ['orgId']);
