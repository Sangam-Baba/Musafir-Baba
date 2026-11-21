// @ts-check
/**
 * Background start for a connected server (moved out of v1.js): schedules, the booking engine's reconciler rules,
 * event consumers (orders, documents, customer emails) and invariant checks.
 */
import { startBackground } from '../background.js';
import { systemClock } from '../core/clock.js';
import { loadConfig } from '../core/config.js';
import { emailSenderFromConfig, queueEmail } from '../core/email.js';
import { connectB2BDatabase } from '../core/db/connection.js';
import { createFiles } from './files.js';
import { paymentsFromEnv } from './payments-wiring.js';
import { bookingEngine } from './orders-wiring.js';
import {
  EVENTS as ORDER_EVENTS,
  ORDER_SWEEP_EVERY_MS,
  orderConsumers,
  orderInvariants,
  orderReconcileRules,
  sweepOrders,
} from '../modules/orders/index.js';
import { documentInvariants } from '../modules/documents/index.js';
import { DOCUMENTS_RETRY_EVERY_MS, documentJobs } from './documents-wiring.js';
import { amendmentEmailConsumer, customerEmailConsumers } from './customer-emails.js';
import { SUMMARIES_REBUILD_EVERY_MS, summaryJobs } from './reporting-wiring.js';
import { ackEscalation, BookingRecord, bookingInvariants } from '../modules/hotel-booking/index.js';
import { createOrderCancellations } from '../modules/orders/index.js';
import { dailyReconciliation, EVENTS as PAYMENT_EVENTS, pollPayments, POLL_EVERY_MS } from '../modules/payments/index.js';
import { rollUpBalances, ROLLUP_EVERY_MS } from '../modules/wallet/index.js';
import { createKycRetention, RETENTION_EVERY_MS } from '../flows/kyc-retention.js';
import { bookedNightOwners, extendCalendarWindow, SWEEP_EVERY_MS, sweepHolds } from '../modules/hotel-inventory/index.js';

/**
 * Unfinished registrations: reminder, then removal (S02-T11).
 * @param {NodeJS.ProcessEnv} env
 * @param {ReturnType<typeof loadConfig>} config
 * @param {import('../core/logger.js').Logger} log
 */
function retentionSchedule(env, config, log) {
  const retention = createKycRetention({
    clock: systemClock,
    logger: log,
    files: createFiles(env, systemClock),
    secret: config.B2B_AUTH_SECRET,
    remindAfterDays: config.B2B_KYC_REMIND_DAYS,
    purgeAfterDays: config.B2B_KYC_PURGE_DAYS,
  });
  return { name: 'kyc-retention', everyMs: RETENTION_EVERY_MS, run: () => retention.runOnce() };
}

/** Stage 04: keep every known room type's calendar 365 days ahead (new nights start with 0 rooms). */
const CALENDAR_WINDOW_SCHEDULE = {
  name: 'inventory-calendar-window',
  everyMs: 6 * 60 * 60_000,
  run: () => extendCalendarWindow({ clock: systemClock }),
};

/**
 * Connects the B2B Mongoose instance, then starts the background work (../background.js).
 * A failure only affects /api/v1 (health reports `down`); the existing app has its own connection.
 * @param {NodeJS.ProcessEnv} env
 * @param {import('../core/logger.js').Logger} log
 * @param {ReturnType<typeof import('../core/realtime/stream.js').createStreamHub>} hub
 * @param {ReturnType<typeof import('./identity.js').createIdentity>} identity
 */
export function startDatabase(env, log, hub, identity) {
  const config = loadConfig(env);
  const engine = bookingEngine(env, systemClock, log, identity);
  const documents = documentJobs(engine.ordersDeps, ORDER_EVENTS.orderConfirmed);
  const summaries = summaryJobs(engine.ordersDeps);
  const email = config.B2B_AUTH_SECRET ? { sender: emailSenderFromConfig(config, log), secret: config.B2B_AUTH_SECRET } : null;
  const emails = emailConsumers(engine, config, email);
  connectB2BDatabase(config.MONGO_URI, 'api')
    .then(() =>
      startBackground({
        clock: systemClock,
        logger: log,
        runJobs: config.B2B_BACKGROUND === 'true',
        hub,
        email,
        publicUrl: config.B2B_PUBLIC_URL,
        rules: [...orderReconcileRules(engine.ordersDeps), cancellingRule(engine.ordersDeps)],
        consumers: [
          ...orderConsumers(engine.ordersDeps, PAYMENT_EVENTS),
          documents.consumer,
          documents.creditNotes,
          ...emails,
          summaries.consumer,
        ],
        invariants: [
          ...orderInvariants({ clock: systemClock }),
          ...documentInvariants({ clock: systemClock }),
          ...bookingInvariants({ clock: systemClock, owners: () => bookedNightOwners(systemClock) }),
        ],
        schedules: [
          retentionSchedule(env, config, log),
          CALENDAR_WINDOW_SCHEDULE,
          { name: 'inventory-hold-sweeper', everyMs: SWEEP_EVERY_MS, run: () => sweepHolds({ clock: systemClock, logger: log }) },
          { name: 'hotel-booking-ack-reminders', everyMs: 60_000, run: () => ackEscalation({ clock: systemClock }) },
          { name: 'reporting-summaries-rebuild', everyMs: SUMMARIES_REBUILD_EVERY_MS, run: () => summaries.summaries.rebuild() },
          { name: 'documents-retry', everyMs: DOCUMENTS_RETRY_EVERY_MS, run: () => documents.retryMissing() },
          { name: 'orders-sweeper', everyMs: ORDER_SWEEP_EVERY_MS, run: () => sweepOrders(engine.ordersDeps) },
          { name: 'ledger-balances-rollup', everyMs: ROLLUP_EVERY_MS, run: () => rollUpBalances({ clock: systemClock }) },
          { name: 'payments-poller', everyMs: POLL_EVERY_MS, run: () => pollPayments(paymentsFromEnv(env, systemClock, log).deps) },
          {
            name: 'payments-daily-reconciliation',
            everyMs: 24 * 60 * 60_000,
            run: () => dailyReconciliation(paymentsFromEnv(env, systemClock, log).deps),
          },
        ],
      }),
    )
    .catch((error) => {
      log.error({ err: error }, 'b2b database connection or background start failed');
    });
}

/**
 * Reconciler: a booking stuck in CANCELLING for more than 30 seconds → its cancellation finished (rooms, ledger, refund,
 * CANCELLED) — forward, the buyer was promised the refund.
 * @param {import('../modules/orders/payment.service.js').PayDeps} ordersDeps
 * @returns {import('../core/jobs/reconciler.js').ReconcileRule}
 */
function cancellingRule(ordersDeps) {
  const cancellations = createOrderCancellations(ordersDeps);
  return {
    name: 'hotel-booking-cancelling',
    model: BookingRecord,
    stuckStatus: 'CANCELLING',
    olderThanMs: 30_000,
    resume: async (b) => cancellations.finishBooking(String(b.orderId), String(b._id)),
  };
}

/**
 * Emails to website buyers: confirmed / refunding / cancelled orders and answers to their change requests.
 * @param {ReturnType<typeof bookingEngine>} engine
 * @param {ReturnType<typeof loadConfig>} config
 * @param {{ sender: unknown, secret: string } | null} email
 */
function emailConsumers(engine, config, email) {
  const deps = {
    ordersDeps: engine.ordersDeps,
    publicUrl: config.B2B_PUBLIC_URL || 'https://musafirbaba.com',
    linkSecret: config.B2B_AUTH_SECRET ?? '',
    send: email
      ? (/** @type {{ to: string, subject: string, text: string }} */ message) =>
          queueEmail(message, { secret: email.secret, clock: systemClock })
      : null,
    events: ORDER_EVENTS,
  };
  return [...customerEmailConsumers(deps), amendmentEmailConsumer(deps, 'hotel-booking.amendment.staff-replied')];
}
