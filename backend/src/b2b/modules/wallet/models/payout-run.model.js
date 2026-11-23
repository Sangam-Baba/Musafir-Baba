// @ts-check
/**
 * Payout runs (plan Stage 15 §3.2): `wal_payout_runs` (one per run) and `wal_payout_lines` (one per hotel in a run).
 * Run: DRAFT (prepared: lines can be held / released) → APPROVED (a different person; totals locked by `hash`) →
 * FILE_READY (bank file made) → PAID (bank reference; journal per hotel) | CANCELLED (payables freed). Line: INCLUDED |
 * HELD (with reasons; its payables freed at approval for the next run); `carryForwardPaise` < 0 = what the next run
 * starts from. A line locks its payables (`payoutId` = line id) so nothing is paid twice.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { eventFields } from '../../../core/db/events.js';
import { defineModel, defineTenantModel } from '../../../core/db/model.js';

export const PAYOUT_RUNS_COLLECTION = 'wal_payout_runs';
export const PAYOUT_LINES_COLLECTION = 'wal_payout_lines';
export const DEDUCTION_RULES_COLLECTION = 'wal_deduction_rules';
export const PAYOUT_RUN_STATUSES = /** @type {const} */ (['DRAFT', 'APPROVED', 'FILE_READY', 'PAID', 'CANCELLED']);

const totals = { lines: Number, held: Number, grossPaise: Number, deductionsPaise: Number, netPaise: Number };

const run = new b2bMongoose.Schema(
  {
    ref: { type: String, required: true },
    status: { type: String, enum: PAYOUT_RUN_STATUSES, required: true },
    cycleEnd: { type: String, required: true }, // YYYY-MM-DD (India) — payables eligible by this day
    totals: { type: totals, required: true, _id: false },
    hash: { type: String, default: null },
    preparedBy: { type: String, required: true },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    fileBy: { type: String, default: null },
    fileAt: { type: Date, default: null },
    bankReference: { type: String, default: null },
    paidBy: { type: String, default: null },
    paidAt: { type: Date, default: null },
    history: { type: [{ _id: false, at: Date, what: String, by: String }], default: [] },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

const line = new b2bMongoose.Schema(
  {
    runId: { type: String, required: true },
    hotelOrgId: { type: String, required: true },
    payableIds: { type: [String], default: [] },
    payablesPaise: { type: Number, required: true },
    carriedInPaise: { type: Number, default: 0 },
    grossPaise: { type: Number, required: true },
    deductions: { type: [{ _id: false, ruleId: String, label: String, amountPaise: Number }], default: [] },
    netPaise: { type: Number, required: true, min: 0 },
    carryForwardPaise: { type: Number, default: 0, max: 0 },
    status: { type: String, enum: ['INCLUDED', 'HELD'], required: true },
    holdReasons: { type: [String], default: [] },
    note: { type: String, default: null, maxlength: 500 },
    paid: { type: Boolean, default: false },
    ...eventFields(b2bMongoose),
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

const rule = new b2bMongoose.Schema(
  {
    hotelOrgId: { type: String, default: null }, // null = every hotel
    label: { type: String, required: true, maxlength: 80 }, // e.g. "TDS 194-O"
    type: { type: String, enum: ['PERCENT', 'FIXED'], required: true },
    valueBps: { type: Number, default: 0, min: 0, max: 10_000 },
    amountPaise: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'RETIRED'], default: 'ACTIVE' },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const PayoutRunRecord = defineModel('PayoutRun', run, PAYOUT_RUNS_COLLECTION);
export const PayoutLineRecord = defineTenantModel('PayoutLine', line, PAYOUT_LINES_COLLECTION, ['hotelOrgId']);
export const DeductionRuleRecord = defineModel('DeductionRule', rule, DEDUCTION_RULES_COLLECTION);
