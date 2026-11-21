// @ts-check
/**
 * Admin actions on orders (`ord_admin_actions`, plan Stage 08 §3.11): one person proposes (release the rooms of an
 * unpaid order, refund a failed paid order), a different person approves, then it runs once. Platform-only data.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const ADMIN_ACTIONS_COLLECTION = 'ord_admin_actions';
export const ADMIN_ACTIONS = /** @type {const} */ (['RELEASE', 'REFUND']);
export const ADMIN_ACTION_STATUSES = /** @type {const} */ (['PROPOSED', 'APPROVED', 'DONE', 'FAILED', 'REJECTED']);

const schema = new b2bMongoose.Schema(
  {
    orderId: { type: String, required: true },
    orderRef: { type: String, required: true },
    action: { type: String, enum: ADMIN_ACTIONS, required: true },
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ADMIN_ACTION_STATUSES, required: true },
    proposedBy: { type: String, required: true },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, default: null, maxlength: 500 },
    result: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const AdminActionRecord = defineModel('OrderAdminAction', schema, ADMIN_ACTIONS_COLLECTION);
