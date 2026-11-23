// @ts-check
/** Stage 12 part B — usage counting (new `mtr_` collections only). */
import { USAGE_DAILY_COLLECTION, USAGE_EVENTS_COLLECTION, USAGE_MONTHLY_COLLECTION } from '../modules/metering/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_12B = [
  {
    id: '0069-mtr-usage',
    description:
      'Usage: events (unique id, per org by time, per day for the recount); daily and monthly counters (one per org × metric × period)',
    up: async (ctx) => {
      await ctx.createCollection(USAGE_EVENTS_COLLECTION);
      await ctx.createIndex(USAGE_EVENTS_COLLECTION, { eventId: 1 }, { name: 'event_unique', unique: true });
      await ctx.createIndex(USAGE_EVENTS_COLLECTION, { orgId: 1, at: -1 }, { name: 'org_at' });
      await ctx.createIndex(USAGE_EVENTS_COLLECTION, { day: 1 }, { name: 'day' });
      await ctx.createCollection(USAGE_DAILY_COLLECTION);
      await ctx.createIndex(USAGE_DAILY_COLLECTION, { orgId: 1, metric: 1, day: 1 }, { name: 'org_metric_day_unique', unique: true });
      await ctx.createIndex(USAGE_DAILY_COLLECTION, { day: 1 }, { name: 'day' });
      await ctx.createCollection(USAGE_MONTHLY_COLLECTION);
      await ctx.createIndex(USAGE_MONTHLY_COLLECTION, { orgId: 1, metric: 1, month: 1 }, { name: 'org_metric_month_unique', unique: true });
    },
  },
];
