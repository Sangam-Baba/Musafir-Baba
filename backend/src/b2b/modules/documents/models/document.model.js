// @ts-check
/**
 * Generated documents (`doc_documents`, plan Stage 08 §3.8): voucher, GST tax invoice, receipt of an order — the HTML as
 * issued and its SHA-256. Never overwritten: a regeneration is a new version. Owned by the buyer (one of `customerId` /
 * `guestKey` / `clientOrgId`) and the hotel company (`hotelOrgId`).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const DOCUMENTS_COLLECTION = 'doc_documents';
export const DOCUMENT_TYPES = /** @type {const} */ (['VOUCHER', 'TAX_INVOICE', 'RECEIPT']);

const schema = new b2bMongoose.Schema(
  {
    orderId: { type: String, required: true },
    orderRef: { type: String, required: true },
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    version: { type: Number, required: true, min: 1 },
    number: { type: String, default: null }, // tax invoices only
    series: { type: String, default: null },
    html: { type: String, required: true },
    sha256: { type: String, required: true },
    customerId: { type: String, default: null },
    guestKey: { type: String, default: null },
    clientOrgId: { type: String, default: null },
    hotelOrgId: { type: String, default: null },
    issuedAt: { type: Date, required: true },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const DocumentRecord = defineTenantModel('Document', schema, DOCUMENTS_COLLECTION, [
  'customerId',
  'guestKey',
  'clientOrgId',
  'hotelOrgId',
]);
