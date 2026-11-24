// @ts-check
/**
 * Statement disputes (`wal_statement_disputes`, plan Stage 15 §3.4): a hotel questions a payable (amount, missing
 * booking…) → OPEN (its next payout line is held) → MusafirBaba resolves: ACCEPTED (finance corrects it — adjustment
 * or a recorded payout) or REJECTED, with a note the hotel sees. Owned by the hotel company.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const STATEMENT_DISPUTES_COLLECTION = 'wal_statement_disputes';

const schema = new b2bMongoose.Schema(
  {
    hotelOrgId: { type: String, required: true },
    payableId: { type: String, required: true },
    bookingRef: { type: String, required: true },
    message: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['OPEN', 'ACCEPTED', 'REJECTED'], required: true },
    raisedBy: { type: String, required: true },
    resolvedBy: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const StatementDisputeRecord = defineTenantModel('StatementDispute', schema, STATEMENT_DISPUTES_COLLECTION, ['hotelOrgId']);
