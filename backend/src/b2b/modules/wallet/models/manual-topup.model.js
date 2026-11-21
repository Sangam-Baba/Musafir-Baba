// @ts-check
/**
 * Bank-transfer top-ups (`wal_manual_topups`, plan Stage 11 §3.5): the client tells us it sent money (NEFT / RTGS /
 * IMPS / UPI) with the UTR; one MusafirBaba finance person checks it against the bank (CHECKED) and a **different** one
 * approves (APPROVED → the wallet credited once, `credited`). Either can reject. A UTR can be in use only once at a time
 * (`utrKey` is cleared when rejected, so a corrected request can reuse it). Owned by the client.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const MANUAL_TOPUPS_COLLECTION = 'wal_manual_topups';
export const MANUAL_TOPUP_STATUSES = /** @type {const} */ (['SUBMITTED', 'CHECKED', 'APPROVED', 'REJECTED']);
export const TRANSFER_METHODS = /** @type {const} */ (['NEFT', 'RTGS', 'IMPS', 'UPI']);

const schema = new b2bMongoose.Schema(
  {
    ref: { type: String, required: true },
    clientOrgId: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    method: { type: String, enum: TRANSFER_METHODS, required: true },
    utr: { type: String, required: true, maxlength: 40 },
    utrKey: { type: String, default: null }, // the UTR (upper case) while not rejected — unique
    paidOn: { type: String, required: true }, // YYYY-MM-DD (bank date)
    note: { type: String, default: null, maxlength: 500 },
    status: { type: String, enum: MANUAL_TOPUP_STATUSES, required: true },
    submittedBy: { type: String, required: true },
    checkedBy: { type: String, default: null },
    checkedAt: { type: Date, default: null },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: null, maxlength: 500 },
    credited: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const ManualTopUpRecord = defineTenantModel('WalletManualTopUp', schema, MANUAL_TOPUPS_COLLECTION, ['clientOrgId']);
