// @ts-check
/**
 * Registry of background work for the B2B worker. Modules add their job handlers,
 * reconcile rules, invariant checks, event subscriptions and event sources here as they are built (Stage 02 onwards);
 * the worker (worker.js) runs them. Nothing here runs inside the existing backend process.
 */
import { createEventBus } from './core/db/events-relay.js';
import { createInvariantChecks } from './core/db/invariants.js';
import { createReconciler } from './core/jobs/reconciler.js';

/** @type {Map<string, import('./core/jobs/runner.js').JobHandler>} */
export const jobHandlers = new Map();
export const reconciler = createReconciler();
export const invariantChecks = createInvariantChecks();
/** Event subscriptions (consumers) — e.g. notifications subscribe to 'hotel-booking.booking.confirmed'. */
export const eventBus = createEventBus();
/** Models whose documents carry `pendingEvents` (state documents) — the relay reads these. */
/** @type {import('mongoose').Model<any>[]} */
export const eventSources = [];

export const RECONCILE_EVERY_MS = 30_000;
export const INVARIANTS_EVERY_MS = 10 * 60_000;
