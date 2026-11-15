// @ts-check
/**
 * Background work of the B2B system. It runs INSIDE the existing backend process, only when
 * B2B_ENABLED=true, started by routes/v1.js once the B2B database is connected (ADR-0015,
 * docs/plan/12-… B4). There is no separate worker or realtime process.
 *
 * Modules register their job handlers, reconcile rules, invariant checks, event subscriptions and
 * event sources here as they are built (Stage 02 onwards).
 *
 * Rules for running inside the existing process:
 * - Nothing here may throw into the existing app. Every loop catches and logs its own errors.
 * - Timers are unref'd, so they never keep the process alive or delay its shutdown. No signal
 *   handlers are installed; the existing app's shutdown stays exactly as it is.
 * - Light on the shared database. Idle polling backs off. Lease locks and repeat-safe steps keep it
 *   correct if more than one backend container ever runs.
 */
import { hostname } from 'node:os';

import { evictCachedPrefix } from './core/cache.js';
import { systemClock } from './core/clock.js';
import { EMAIL_JOB, emailJobHandler, queueEmail } from './core/email.js';
import { consumerJobHandlers, createEventBus, createEventRelay } from './core/db/events-relay.js';
import { createInvariantChecks } from './core/db/invariants.js';
import { createReconciler } from './core/jobs/reconciler.js';
import { createJobRunner } from './core/jobs/runner.js';
import { createScheduler } from './core/jobs/scheduler.js';
import { CACHE_EVICT_ROOM } from './core/realtime/rooms.js';
import { logger as defaultLogger } from './core/logger.js';
import { createSignalReader } from './core/realtime/signals.js';
import { EVENTS as ACCESS_EVENTS, RoleRecord, syncPermissionCatalogue } from './modules/access/index.js';
import { createAuditService } from './modules/audit/index.js';
import { ApplicationRecord, EVENTS as KYC_EVENTS } from './modules/kyc/index.js';
import { createUserRepository, EVENTS as IDENTITY_EVENTS, SessionRecord, UserRecord, ViewAsRecord } from './modules/identity/index.js';
import { ADMIN_QUEUES, createDelivery, EVENT_CATEGORIES } from './modules/notifications/index.js';
import {
  createOrganizationsService,
  EVENTS as ORG_EVENTS,
  InvitationRecord,
  MemberRecord,
  OrganizationRecord,
} from './modules/organizations/index.js';
import { PERMISSION_CATALOGUE } from './permission-catalogue.js';
import { createAccessChangeNotifier } from './routes/access-cache.js';

/** @type {Map<string, import('./core/jobs/runner.js').JobHandler>} */
export const jobHandlers = new Map();
export const reconciler = createReconciler();
export const invariantChecks = createInvariantChecks();
/** Event subscriptions (consumers) — e.g. notifications subscribe to 'hotel-booking.booking.confirmed'. */
export const eventBus = createEventBus();

/** The activity log records every Stage 01 event (sign-ins, lockouts, stolen tokens, orgs, members, invitations, roles). */
const audit = createAuditService({ clock: systemClock });
eventBus.subscribe({
  consumer: 'audit',
  types: [...Object.values(IDENTITY_EVENTS), ...Object.values(ORG_EVENTS), ...Object.values(ACCESS_EVENTS), ...Object.values(KYC_EVENTS)],
  handler: (event) => audit.record(event),
});

/**
 * A verified hotel becomes active (S02-T09): `kyc.application.approved` → the org goes ONBOARDING → ACTIVE
 * with the verified legal name and `organizations.org.activated`; cached access is cleared so members see
 * it on their next request. Repeat-safe (the inbox skips repeats; an already-active org is left alone), and
 * the job is retried until it succeeds, so an approved application always ends with an active org.
 */
const orgs = createOrganizationsService({ clock: systemClock });
const accessChanged = createAccessChangeNotifier({ clock: systemClock, logger: defaultLogger });
eventBus.subscribe({
  consumer: 'organizations-kyc-approved',
  types: [KYC_EVENTS.applicationApproved],
  handler: async (event) => {
    const orgId = String(event.payload.orgId);
    const legalName = typeof event.payload.legalName === 'string' ? event.payload.legalName : null;
    const result = await orgs.activate({ orgId, legalName, activatedBy: `kyc:${String(event.payload.applicationId)}` });
    if (result.activated) accessChanged(orgId);
  },
});

/**
 * Notifications (S02-T10): events → bell row, live push, emails from templates; admin queue pushes.
 * The public address and the email secret come from the settings when background work starts.
 */
const notificationSettings = { publicUrl: 'https://musafirbaba.com', secret: /** @type {string | null} */ (null) };
/** @param {{ publicUrl?: string | undefined, secret?: string | null | undefined }} settings */
export function configureNotifications(settings) {
  notificationSettings.publicUrl = settings.publicUrl || 'https://musafirbaba.com';
  notificationSettings.secret = settings.secret ?? null;
}
const users = createUserRepository({ clock: systemClock });
/** @param {readonly string[]} ids */
const contactsOf = async (ids) => (await users.describe(ids)).map((u) => ({ userId: u.id, email: u.email }));
eventBus.subscribe({
  consumer: 'notifications',
  types: [...new Set([...Object.keys(EVENT_CATEGORIES), ...Object.keys(ADMIN_QUEUES)])],
  handler: (event) => {
    const { publicUrl, secret } = notificationSettings;
    return createDelivery({
      clock: systemClock,
      logger: defaultLogger,
      publicUrl,
      orgName: async (orgId) => (await orgs.basicInfo(orgId))?.displayName ?? null,
      ownerContacts: async (orgId) => contactsOf(await orgs.ownerUserIds(orgId)),
      userContact: async (userId) => (await contactsOf([userId]))[0] ?? null,
      queueEmail: secret ? (message) => queueEmail(message, { secret, clock: systemClock }) : null,
    })(event);
  },
});

/** Models whose documents carry `pendingEvents` (state documents) — the relay reads these. */
/** @type {import('mongoose').Model<any>[]} */
export const eventSources = [
  SessionRecord,
  UserRecord,
  OrganizationRecord,
  MemberRecord,
  InvitationRecord,
  RoleRecord,
  ViewAsRecord,
  ApplicationRecord,
];

/**
 * One-off tasks run when background work starts (repeat-safe: every backend process runs them).
 * @type {{ name: string, run: (deps: { clock: import('./core/clock.js').Clock }) => Promise<unknown> }[]}
 */
export const startupTasks = [
  { name: 'access: sync permission catalogue', run: (deps) => syncPermissionCatalogue(PERMISSION_CATALOGUE, deps) },
];

export const RECONCILE_EVERY_MS = 30_000;
export const INVARIANTS_EVERY_MS = 10 * 60_000;
const RELAY_EVERY_MS = 1000;

/**
 * Routes one realtime signal: `cache:evict` clears this process's caches; everything else goes to SSE streams.
 * @param {import('./core/realtime/signals.js').Signal} signal
 * @param {{ deliver: (s: import('./core/realtime/signals.js').Signal) => void }} hub
 */
export function routeSignal(signal, hub) {
  if (signal.room === CACHE_EVICT_ROOM) {
    const prefix = signal.data.prefix;
    if (typeof prefix === 'string' && prefix.length > 0) evictCachedPrefix(prefix);
    return;
  }
  hub.deliver(signal);
}

/**
 * Starts the background loops. The live-update reader always runs; jobs, schedules and the event
 * relay run unless `runJobs` is false (B2B_BACKGROUND=false).
 * @param {{ clock: import('./core/clock.js').Clock, logger: import('./core/logger.js').Logger, runJobs: boolean,
 *   hub: { deliver: (s: import('./core/realtime/signals.js').Signal) => void },
 *   email?: { sender: import('./core/email.js').EmailSender, secret: string } | null, publicUrl?: string }} options
 * @returns {{ stop: () => Promise<void> }}
 */
export function startBackground(options) {
  const workerId = `${hostname()}:${process.pid}`;
  const logger = options.logger.child({ part: 'b2b-background', workerId });
  const deps = { clock: options.clock, logger };
  configureNotifications({ publicUrl: options.publicUrl, secret: options.email?.secret ?? null });

  const reader = createSignalReader({ onSignal: (s) => routeSignal(s, options.hub), ...deps });
  reader.start();
  for (const task of startupTasks) {
    task.run(deps).then(
      (result) => logger.info({ task: task.name, result }, 'b2b startup task done'),
      (error) => logger.error({ task: task.name, err: error }, 'b2b startup task failed'),
    );
  }
  if (!options.runJobs) {
    logger.info({}, 'b2b background: live updates only (B2B_BACKGROUND=false)');
    return { stop: () => reader.stop() };
  }

  const scheduler = createScheduler({ workerId, ...deps });
  scheduler.register({ name: 'reconciler', everyMs: RECONCILE_EVERY_MS, run: () => reconciler.runOnce(deps).then(() => undefined) });
  scheduler.register({ name: 'invariants', everyMs: INVARIANTS_EVERY_MS, run: () => invariantChecks.runAll(logger).then(() => undefined) });
  const handlers = new Map([...jobHandlers, ...consumerJobHandlers(eventBus, options.clock)]);
  if (options.email) handlers.set(EMAIL_JOB, emailJobHandler(options.email));
  const runner = createJobRunner({ handlers, workerId, ...deps });
  const relay = createEventRelay({ sources: eventSources, bus: eventBus, intervalMs: RELAY_EVERY_MS, ...deps });

  scheduler.start();
  relay.start();
  runner.start();
  logger.info(
    { jobHandlers: handlers.size, reconcileRules: reconciler.rules().length, eventSources: eventSources.length },
    'b2b background ready',
  );
  return {
    async stop() {
      await Promise.all([scheduler.stop(), relay.stop(), runner.stop(), reader.stop()]);
    },
  };
}
