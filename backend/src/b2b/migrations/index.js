// @ts-check
/**
 * All B2B migrations, in run order. Each module adds its own here as it is built
 * (e.g. `0006-htl-properties`). Modules that store events also add a
 * partial index `{ hasPendingEvents: 1 }` (where hasPendingEvents exists) for the relay. Ids are never renamed or reused.
 */
import { INBOX_COLLECTION, OUTBOX_COLLECTION } from '../core/db/events-relay.js';
import { IDEMPOTENCY_COLLECTION } from '../core/db/idempotency.js';
import { JOBS_COLLECTION } from '../core/jobs/queue.js';
import { SCHEDULES_COLLECTION } from '../core/jobs/scheduler.js';
import { RATE_LIMITS_COLLECTION } from '../core/rate-limit.js';
import { SIGNALS_CAPPED_BYTES, SIGNALS_COLLECTION } from '../core/realtime/signals.js';
import { PERMISSIONS_COLLECTION } from '../modules/access/index.js';
import { SESSIONS_COLLECTION, USERS_COLLECTION } from '../modules/identity/index.js';

/** @type {readonly import('../core/db/migrations.js').Migration[]} */
export const MIGRATIONS = [
  {
    id: '0001-core-idempotency-keys',
    description: 'Idempotency records: one per (scope, key), deleted 24 h after creation',
    up: async (ctx) => {
      await ctx.createCollection(IDEMPOTENCY_COLLECTION);
      await ctx.createIndex(IDEMPOTENCY_COLLECTION, { scope: 1, key: 1 }, { name: 'scope_key_unique', unique: true });
      await ctx.createIndex(IDEMPOTENCY_COLLECTION, { expiresAt: 1 }, { name: 'expires_ttl', expireAfterSeconds: 0 });
    },
  },
  {
    id: '0002-core-jobs-and-schedules',
    description: 'Job queue (claim index, dedupe, DONE jobs removed after 7 days) and lease-locked schedules',
    up: async (ctx) => {
      await ctx.createCollection(JOBS_COLLECTION);
      await ctx.createIndex(JOBS_COLLECTION, { queue: 1, status: 1, runAt: 1 }, { name: 'claim' });
      await ctx.createIndex(
        JOBS_COLLECTION,
        { queue: 1, dedupeKey: 1 },
        {
          name: 'dedupe_unique',
          unique: true,
          partialFilterExpression: { dedupeKey: { $exists: true } },
        },
      );
      await ctx.createIndex(
        JOBS_COLLECTION,
        { finishedAt: 1 },
        {
          name: 'done_ttl',
          expireAfterSeconds: 7 * 24 * 60 * 60,
          partialFilterExpression: { status: 'DONE' },
        },
      );
      await ctx.createCollection(SCHEDULES_COLLECTION);
    },
  },
  {
    id: '0003-core-outbox-inbox',
    description: 'Relayed events (outbox) and processed-event records per consumer (inbox), kept 90 days',
    up: async (ctx) => {
      const ninetyDays = 90 * 24 * 60 * 60;
      await ctx.createCollection(OUTBOX_COLLECTION);
      await ctx.createIndex(OUTBOX_COLLECTION, { type: 1, occurredAt: 1 }, { name: 'type_time' });
      await ctx.createIndex(OUTBOX_COLLECTION, { relayedAt: 1 }, { name: 'relayed_ttl', expireAfterSeconds: ninetyDays });
      await ctx.createCollection(INBOX_COLLECTION);
      await ctx.createIndex(INBOX_COLLECTION, { processedAt: 1 }, { name: 'processed_ttl', expireAfterSeconds: ninetyDays });
    },
  },
  {
    id: '0004-core-rate-limits',
    description: 'Rate-limit counters, removed when their window ends',
    up: async (ctx) => {
      await ctx.createCollection(RATE_LIMITS_COLLECTION);
      await ctx.createIndex(RATE_LIMITS_COLLECTION, { expiresAt: 1 }, { name: 'expires_ttl', expireAfterSeconds: 0 });
    },
  },
  {
    id: '0005-rt-signals',
    description: 'Realtime signals: capped collection (64 MB) read with a tailable cursor',
    up: async (ctx) => {
      await ctx.createCollection(SIGNALS_COLLECTION, { cappedSizeBytes: SIGNALS_CAPPED_BYTES });
    },
  },
  {
    id: '0006-acl-permissions',
    description: 'Stored copy of the permission catalogue (synced when background work starts)',
    up: async (ctx) => {
      await ctx.createCollection(PERMISSIONS_COLLECTION);
    },
  },
  {
    id: '0007-id-users',
    description: 'Business users: email and phone each unique when present',
    up: async (ctx) => {
      await ctx.createCollection(USERS_COLLECTION);
      await ctx.createIndex(
        USERS_COLLECTION,
        { email: 1 },
        { name: 'email_unique', unique: true, partialFilterExpression: { email: { $type: 'string' } } },
      );
      await ctx.createIndex(
        USERS_COLLECTION,
        { phone: 1 },
        { name: 'phone_unique', unique: true, partialFilterExpression: { phone: { $type: 'string' } } },
      );
    },
  },
  {
    id: '0008-id-sessions',
    description: 'Business-user sessions: open sessions per user, relay index, expired sessions removed after 30 days',
    up: async (ctx) => {
      const thirtyDays = 30 * 24 * 60 * 60;
      await ctx.createCollection(SESSIONS_COLLECTION);
      await ctx.createIndex(SESSIONS_COLLECTION, { userId: 1, revokedAt: 1 }, { name: 'user_open' });
      await ctx.createIndex(SESSIONS_COLLECTION, { expiresAt: 1 }, { name: 'expired_ttl', expireAfterSeconds: thirtyDays });
      await ctx.createIndex(
        SESSIONS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
];
