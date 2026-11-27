// @ts-check
/**
 * Bus payout runs (`bus_payout_runs`) and their lines (`bus_payout_lines`) — plan Stage 18 B7, a separate weekly run for
 * bus companies (hotel runs unchanged). DRAFT → APPROVED (a different person; totals locked by a hash) → FILE_READY
 * (bank file) → PAID (bank reference; one journal entry per company) · CANCELLED any time before paid.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const BUS_RUNS_COLLECTION = 'bus_payout_runs';
export const BUS_LINES_COLLECTION = 'bus_payout_lines';

const runSchema = new b2bMongoose.Schema(
  {
    ref: { type: String, required: true },
    status: { type: String, enum: ['DRAFT', 'APPROVED', 'FILE_READY', 'PAID', 'CANCELLED'], required: true },
    cycleEnd: { type: String, required: true },
    totals: { type: b2bMongoose.Schema.Types.Mixed, default: {} },
    hash: { type: String, default: null },
    preparedBy: { type: String, required: true },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    bankReference: { type: String, default: null },
    paidAt: { type: Date, default: null },
    history: { type: [{ _id: false, at: Date, what: String, by: String }], default: [] },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

const lineSchema = new b2bMongoose.Schema(
  {
    runId: { type: String, required: true },
    operatorOrgId: { type: String, required: true },
    payableIds: { type: [String], default: [] },
    grossPaise: { type: Number, required: true },
    deductions: { type: [{ _id: false, ruleId: String, label: String, amountPaise: Number }], default: [] },
    netPaise: { type: Number, required: true },
    status: { type: String, enum: ['INCLUDED', 'HELD'], required: true },
    holdReasons: { type: [String], default: [] },
    paid: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const BusPayoutRunRecord = defineModel('BusPayoutRun', runSchema, BUS_RUNS_COLLECTION);
export const BusPayoutLineRecord = defineModel('BusPayoutLine', lineSchema, BUS_LINES_COLLECTION);
