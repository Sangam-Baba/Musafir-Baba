// @ts-check
/**
 * Registry of background work for the B2B worker. Modules add their job handlers,
 * reconcile rules and invariant checks here as they are built (Stage 02 onwards);
 * the worker (worker.js) runs them. Nothing here runs inside the existing backend process.
 */
import { createInvariantChecks } from './core/db/invariants.js';
import { createReconciler } from './core/jobs/reconciler.js';

/** @type {Map<string, import('./core/jobs/runner.js').JobHandler>} */
export const jobHandlers = new Map();
export const reconciler = createReconciler();
export const invariantChecks = createInvariantChecks();

export const RECONCILE_EVERY_MS = 30_000;
export const INVARIANTS_EVERY_MS = 10 * 60_000;
