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
import { PERMISSIONS_COLLECTION, ROLES_COLLECTION, STAFF_ROLES_COLLECTION } from '../modules/access/index.js';
import { AUDIT_COLLECTION } from '../modules/audit/index.js';
import { MFA_COLLECTION, OTP_COLLECTION, SESSIONS_COLLECTION, USERS_COLLECTION, VIEW_AS_COLLECTION } from '../modules/identity/index.js';
import { BRANCHES_COLLECTION, INVITATIONS_COLLECTION, MEMBERS_COLLECTION, ORGS_COLLECTION } from '../modules/organizations/index.js';

import { STAGE_02_AND_LATER } from './stage-02-onwards.js';
import { STAGE_04 } from './stage-04.js';

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
  {
    id: '0009-id-users-events',
    description: 'Business users carry events (account locked): relay index',
    up: async (ctx) => {
      await ctx.createIndex(
        USERS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0010-id-otp-codes',
    description: 'One-time email codes: latest active code per user and purpose; removed 1 h after expiry',
    up: async (ctx) => {
      await ctx.createCollection(OTP_COLLECTION);
      await ctx.createIndex(OTP_COLLECTION, { userId: 1, purpose: 1, consumedAt: 1, createdAt: -1 }, { name: 'user_purpose_active' });
      await ctx.createIndex(OTP_COLLECTION, { expiresAt: 1 }, { name: 'expired_ttl', expireAfterSeconds: 3600 });
    },
  },
  {
    id: '0011-id-mfa',
    description: 'Authenticator-app setup: one document per business user',
    up: async (ctx) => {
      await ctx.createCollection(MFA_COLLECTION);
      await ctx.createIndex(MFA_COLLECTION, { userId: 1 }, { name: 'user_unique', unique: true });
    },
  },
  {
    id: '0012-org-organizations-members-branches',
    description: 'Organisations (unique reference), members (one per org and user), branches; relay indexes',
    up: async (ctx) => {
      const pending = { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } };
      await ctx.createCollection(ORGS_COLLECTION);
      await ctx.createIndex(ORGS_COLLECTION, { reference: 1 }, { name: 'reference_unique', unique: true });
      await ctx.createIndex(ORGS_COLLECTION, { type: 1, status: 1 }, { name: 'type_status' });
      await ctx.createIndex(ORGS_COLLECTION, { hasPendingEvents: 1 }, pending);
      await ctx.createCollection(MEMBERS_COLLECTION);
      await ctx.createIndex(MEMBERS_COLLECTION, { orgId: 1, userId: 1 }, { name: 'org_user_unique', unique: true });
      await ctx.createIndex(MEMBERS_COLLECTION, { userId: 1, status: 1 }, { name: 'user_status' });
      await ctx.createIndex(MEMBERS_COLLECTION, { hasPendingEvents: 1 }, pending);
      await ctx.createCollection(BRANCHES_COLLECTION);
      await ctx.createIndex(BRANCHES_COLLECTION, { orgId: 1, name: 1 }, { name: 'org_name' });
    },
  },
  {
    id: '0013-org-invitations',
    description: 'Invitations: one open invitation per org and email; pending list per org; relay index',
    up: async (ctx) => {
      await ctx.createCollection(INVITATIONS_COLLECTION);
      await ctx.createIndex(
        INVITATIONS_COLLECTION,
        { orgId: 1, email: 1 },
        { name: 'org_email_pending_unique', unique: true, partialFilterExpression: { status: 'PENDING' } },
      );
      await ctx.createIndex(INVITATIONS_COLLECTION, { orgId: 1, status: 1, createdAt: -1 }, { name: 'org_status_recent' });
      await ctx.createIndex(
        INVITATIONS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0014-acl-roles',
    description: 'Custom roles: name unique per org among active roles; relay index',
    up: async (ctx) => {
      await ctx.createCollection(ROLES_COLLECTION);
      await ctx.createIndex(ROLES_COLLECTION, { orgId: 1, nameKey: 1 }, { name: 'org_name_unique', unique: true });
      await ctx.createIndex(
        ROLES_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  {
    id: '0015-aud-events',
    description: 'Activity log: newest first per org, per user and overall',
    up: async (ctx) => {
      await ctx.createCollection(AUDIT_COLLECTION);
      await ctx.createIndex(AUDIT_COLLECTION, { orgId: 1, occurredAt: -1, _id: -1 }, { name: 'org_recent' });
      await ctx.createIndex(AUDIT_COLLECTION, { userId: 1, occurredAt: -1, _id: -1 }, { name: 'user_recent' });
      await ctx.createIndex(AUDIT_COLLECTION, { occurredAt: -1, _id: -1 }, { name: 'recent' });
    },
  },
  {
    id: '0016-acl-staff-roles',
    description: 'Platform roles of MusafirBaba staff (keyed by the existing staff id); Super Admin count',
    up: async (ctx) => {
      await ctx.createCollection(STAFF_ROLES_COLLECTION);
      await ctx.createIndex(STAFF_ROLES_COLLECTION, { roles: 1 }, { name: 'roles' });
    },
  },
  {
    id: '0017-id-view-as',
    description: 'View-as sessions of MusafirBaba admins (per org, newest first); relay index',
    up: async (ctx) => {
      await ctx.createCollection(VIEW_AS_COLLECTION);
      await ctx.createIndex(VIEW_AS_COLLECTION, { orgId: 1, createdAt: -1 }, { name: 'org_recent' });
      await ctx.createIndex(
        VIEW_AS_COLLECTION,
        { hasPendingEvents: 1 },
        { name: 'pending_events', partialFilterExpression: { hasPendingEvents: true } },
      );
    },
  },
  ...STAGE_02_AND_LATER,
  ...STAGE_04,
];
