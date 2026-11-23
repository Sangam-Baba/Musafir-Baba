// @ts-check
/** Stage 13 — subscriptions and billing (new `sub_` / `bil_` collections only). */
import { INVOICES_COLLECTION } from '../modules/billing/index.js';
import {
  OVERRIDES_COLLECTION,
  PLAN_VERSIONS_COLLECTION,
  SUB_SETTINGS_COLLECTION,
  SUBSCRIPTIONS_COLLECTION,
} from '../modules/subscriptions/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_13 = [
  {
    id: '0070-sub-plans',
    description: 'Plan versions: one per plan × version; one draft per plan; published plans; settings (query weights)',
    up: async (ctx) => {
      await ctx.createCollection(PLAN_VERSIONS_COLLECTION);
      await ctx.createIndex(PLAN_VERSIONS_COLLECTION, { planKey: 1, version: 1 }, { name: 'plan_version_unique', unique: true });
      await ctx.createIndex(
        PLAN_VERSIONS_COLLECTION,
        { planKey: 1 },
        { name: 'one_draft', unique: true, partialFilterExpression: { status: 'DRAFT' } },
      );
      await ctx.createIndex(
        PLAN_VERSIONS_COLLECTION,
        { planKey: 1 },
        { name: 'one_published', unique: true, partialFilterExpression: { status: 'PUBLISHED' } },
      );
      await ctx.createCollection(SUB_SETTINGS_COLLECTION);
    },
  },
  {
    id: '0071-sub-subscriptions',
    description: 'Subscriptions: one per client; by status (renewals, dunning); events for the relay; overrides per client and queue',
    up: async (ctx) => {
      await ctx.createCollection(SUBSCRIPTIONS_COLLECTION);
      await ctx.createIndex(SUBSCRIPTIONS_COLLECTION, { clientOrgId: 1 }, { name: 'client_unique', unique: true });
      await ctx.createIndex(SUBSCRIPTIONS_COLLECTION, { status: 1, period: 1 }, { name: 'status_period' });
      await ctx.createIndex(
        SUBSCRIPTIONS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
      await ctx.createCollection(OVERRIDES_COLLECTION);
      await ctx.createIndex(OVERRIDES_COLLECTION, { clientOrgId: 1, createdAt: -1 }, { name: 'client' });
      await ctx.createIndex(OVERRIDES_COLLECTION, { status: 1, createdAt: 1 }, { name: 'status_age' });
    },
  },
  {
    id: '0072-bil-invoices',
    description: 'SaaS invoices: one per client × key; unique number; per client newest first; unpaid queue; by charge reference',
    up: async (ctx) => {
      await ctx.createCollection(INVOICES_COLLECTION);
      await ctx.createIndex(INVOICES_COLLECTION, { clientOrgId: 1, key: 1 }, { name: 'client_key_unique', unique: true });
      await ctx.createIndex(INVOICES_COLLECTION, { number: 1 }, { name: 'number_unique', unique: true });
      await ctx.createIndex(INVOICES_COLLECTION, { clientOrgId: 1, issuedAt: -1 }, { name: 'client_recent' });
      await ctx.createIndex(INVOICES_COLLECTION, { status: 1, lastAttemptAt: 1 }, { name: 'status_attempt' });
      await ctx.createIndex(INVOICES_COLLECTION, { clientOrgId: 1, 'lines.ref': 1 }, { name: 'client_line_ref' });
    },
  },
];
