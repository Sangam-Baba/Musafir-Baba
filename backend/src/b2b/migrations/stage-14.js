// @ts-check
/** Stage 14 — API access and webhooks (new collections with allowed prefixes only). */
import { API_KEYS_COLLECTION } from '../modules/api-access/index.js';
import { DELIVERIES_COLLECTION, ENDPOINTS_COLLECTION } from '../modules/webhooks/index.js';

/** @type {import('../core/db/migrations.js').Migration[]} */
export const STAGE_14 = [
  {
    id: '0078-api-keys',
    description: 'API keys: unique prefix, by company',
    up: async (ctx) => {
      await ctx.createCollection(API_KEYS_COLLECTION);
      await ctx.createIndex(API_KEYS_COLLECTION, { prefix: 1 }, { name: 'prefix_unique', unique: true });
      await ctx.createIndex(API_KEYS_COLLECTION, { orgId: 1, status: 1, createdAt: -1 }, { name: 'org_status' });
      await ctx.createIndex(
        API_KEYS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0079-whk-endpoints',
    description: 'Webhook endpoints: by company',
    up: async (ctx) => {
      await ctx.createCollection(ENDPOINTS_COLLECTION);
      await ctx.createIndex(ENDPOINTS_COLLECTION, { orgId: 1, status: 1 }, { name: 'org_status' });
      await ctx.createIndex(
        ENDPOINTS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0080-whk-deliveries',
    description: 'Webhook deliveries: once per event per endpoint (replays apart), due list, log per company',
    up: async (ctx) => {
      await ctx.createCollection(DELIVERIES_COLLECTION);
      await ctx.createIndex(
        DELIVERIES_COLLECTION,
        { endpointId: 1, eventId: 1 },
        { name: 'event_once_per_endpoint', unique: true, partialFilterExpression: { replayOf: null } },
      );
      await ctx.createIndex(DELIVERIES_COLLECTION, { status: 1, nextAttemptAt: 1 }, { name: 'due' });
      await ctx.createIndex(DELIVERIES_COLLECTION, { orgId: 1, createdAt: -1 }, { name: 'org_recent' });
    },
  },
];
