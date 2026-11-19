// @ts-check
/**
 * Client categories (`org_client_categories`, plan Stage 10 §3.4) — platform-wide tiers such as Standard, Silver, Gold,
 * managed by MusafirBaba admins. Margin rules (Stage 05) and B2B listing visibility (Stage 03) match on the `key`.
 * Never deleted — switched off (`active: false`) so clients and rules that use one keep working.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const CLIENT_CATEGORIES_COLLECTION = 'org_client_categories';

const schema = new b2bMongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 40 },
    name: { type: String, required: true, maxlength: 60 },
    description: { type: String, default: null, maxlength: 300 },
    order: { type: Number, default: 100 },
    active: { type: Boolean, default: true },
    updatedBy: { type: String, default: 'seed' },
  },
  { timestamps: true, versionKey: false },
);

export const ClientCategoryRecord = defineModel('ClientCategory', schema, CLIENT_CATEGORIES_COLLECTION);
