// @ts-check
/**
 * SaaS invoices (`bil_invoices`, plan Stage 13 §3.7–3.8) — plan fees, upgrades and overage, with GST, in their own
 * number series (`S2627DL000001`, gap-free via `doc_number_series`). One invoice per `key` (the charge ids it bills,
 * or `overage:<month>`), so a repeated run never bills twice. ISSUED → PAID (from the wallet or by PayU) | UNPAID
 * (collection failed → the subscription is past due) → PAID; VOID by finance. The printable page is kept (`html`).
 * Owned by the client.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const INVOICES_COLLECTION = 'bil_invoices';
export const INVOICE_STATUSES = /** @type {const} */ (['ISSUED', 'PAID', 'UNPAID', 'VOID']);

const line = new b2bMongoose.Schema(
  { kind: String, description: String, quantity: Number, unitPaise: Number, amountPaise: Number, ref: { type: String, default: null } },
  { _id: false },
);

const schema = new b2bMongoose.Schema(
  {
    clientOrgId: { type: String, required: true },
    key: { type: String, required: true },
    number: { type: String, required: true },
    series: { type: String, required: true },
    period: { type: String, required: true }, // YYYY-MM the invoice belongs to
    lines: { type: [line], required: true },
    totals: {
      type: { taxablePaise: Number, cgstPaise: Number, sgstPaise: Number, igstPaise: Number, gstPaise: Number, totalPaise: Number },
      required: true,
      _id: false,
    },
    supply: { type: { intraState: Boolean, issuerGstin: String, issuerState: String, clientGstin: String }, required: true, _id: false },
    status: { type: String, enum: INVOICE_STATUSES, required: true },
    issuedAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    payment: { type: { method: String, ref: String }, default: null, _id: false }, // WALLET (op) | PAYU (txn)
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    html: { type: String, required: true },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const InvoiceRecord = defineTenantModel('SaasInvoice', schema, INVOICES_COLLECTION, ['clientOrgId']);
