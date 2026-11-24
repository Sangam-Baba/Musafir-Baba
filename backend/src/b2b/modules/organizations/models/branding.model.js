// @ts-check
/**
 * Client branding (`org_branding`, plan Stage 15 §3.10): what a B2B client's own voucher shows its guests — the name
 * to print, a contact phone / email, a colour and a logo link. One per client company; `version` guards edits.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const BRANDING_COLLECTION = 'org_branding';

const schema = new b2bMongoose.Schema(
  {
    orgId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 80 },
    contactPhone: { type: String, default: null, maxlength: 20 },
    contactEmail: { type: String, default: null, maxlength: 120 },
    colour: { type: String, default: null, maxlength: 7 },
    logoUrl: { type: String, default: null, maxlength: 500 },
    version: { type: Number, default: 1 },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const BrandingRecord = defineTenantModel('OrgBranding', schema, BRANDING_COLLECTION, ['orgId']);
