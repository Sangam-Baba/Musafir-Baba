// @ts-check
/**
 * Usage counting (plan Stage 12 §3.11, D3):
 * - `mtr_usage_events`: one row per counted call — who (`orgId`, `userId`, later `apiKeyId`), how (`channel`), what
 *   (`metric`), whether it counts (`billable`), the answer's status, the request id, when. Archived monthly.
 * - `mtr_usage_daily` / `mtr_usage_monthly`: counters per org, metric and Indian day / month (`count` = every call,
 *   `billable` = the ones that count) — what the usage screens and Stage 13's billing read. The nightly check recounts
 *   each day from the events. Owned by the org (website traffic under `platform`, never billable).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const USAGE_EVENTS_COLLECTION = 'mtr_usage_events';
export const USAGE_DAILY_COLLECTION = 'mtr_usage_daily';
export const USAGE_MONTHLY_COLLECTION = 'mtr_usage_monthly';

const events = new b2bMongoose.Schema(
  {
    eventId: { type: String, required: true },
    orgId: { type: String, required: true },
    userId: { type: String, default: null },
    apiKeyId: { type: String, default: null },
    channel: { type: String, required: true },
    metric: { type: String, required: true },
    billable: { type: Boolean, required: true },
    statusCode: { type: Number, required: true },
    requestId: { type: String, default: null },
    day: { type: String, required: true }, // Indian date
    at: { type: Date, required: true },
  },
  { versionKey: false, strict: 'throw' },
);
const counter = (/** @type {'day' | 'month'} */ period) =>
  new b2bMongoose.Schema(
    {
      orgId: { type: String, required: true },
      metric: { type: String, required: true },
      [period]: { type: String, required: true },
      count: { type: Number, default: 0 },
      billable: { type: Number, default: 0 },
      byUser: { type: b2bMongoose.Schema.Types.Mixed, default: {} }, // userId → count (daily only)
    },
    { versionKey: false, strict: 'throw' },
  );

export const UsageEventRecord = defineTenantModel('UsageEvent', events, USAGE_EVENTS_COLLECTION, ['orgId']);
export const UsageDailyRecord = defineTenantModel('UsageDaily', counter('day'), USAGE_DAILY_COLLECTION, ['orgId']);
export const UsageMonthlyRecord = defineTenantModel('UsageMonthly', counter('month'), USAGE_MONTHLY_COLLECTION, ['orgId']);
