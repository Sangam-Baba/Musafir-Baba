// @ts-check
/** Public interface of the metering module (usage counting) — other modules import only from here. */
export { PERMISSION_CATALOGUE, PERMISSIONS } from './permissions.js';
export { BILLABLE_METRICS, REFRESHABLE_METRICS, REFRESH_EVERY_MS, istDay, usageOf } from './domain/usage.js';
export {
  USAGE_EVENTS_COLLECTION,
  USAGE_DAILY_COLLECTION,
  USAGE_MONTHLY_COLLECTION,
  UsageEventRecord,
  UsageDailyRecord,
  UsageMonthlyRecord,
} from './models/usage.model.js';
export { createUsageRecorder, FLUSH_EVERY_MS, FLUSH_AT } from './recorder.service.js';
export { createUsageReports, recountDay } from './usage.service.js';
