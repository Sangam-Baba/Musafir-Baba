// @ts-check
/**
 * Reconciler — the safety net that replaces transactions (patterns P3 + P4,
 * docs/plan/01-architecture.md §8, 05-… §5.4). Modules register rules: "documents stuck
 * in status X for more than N seconds → resume them". `resume` must be idempotent and
 * move FORWARD if money was captured, BACKWARD otherwise. The worker runs this every
 * 30 s under a lease lock (S00-T03); one runner at a time.
 */
import { systemScope } from '../db/tenant-plugin.js';

/**
 * @typedef {object} ReconcileRule
 * @property {string} name
 * @property {import('mongoose').Model<any>} model   a state document model (stateFields)
 * @property {string} stuckStatus
 * @property {number} olderThanMs
 * @property {(doc: Record<string, any>, deps: ReconcileDeps) => Promise<void>} resume
 * @property {number} [batchSize]
 */
/** @typedef {{ clock: import('../clock.js').Clock, logger: import('../logger.js').Logger }} ReconcileDeps */
/** @typedef {{ rule: string, found: number, resumed: number, failed: number }} RuleReport */

export const ALERT_AFTER_ATTEMPTS = 3;

/** @returns {{ register: (rule: ReconcileRule) => void, rules: () => readonly ReconcileRule[], runOnce: (deps: ReconcileDeps) => Promise<RuleReport[]> }} */
export function createReconciler() {
  /** @type {Map<string, ReconcileRule>} */
  const registry = new Map();
  return {
    register(rule) {
      if (registry.has(rule.name)) throw new Error(`[b2b] reconcile rule "${rule.name}" registered twice`);
      registry.set(rule.name, rule);
    },
    rules: () => [...registry.values()],
    async runOnce(deps) {
      /** @type {RuleReport[]} */
      const reports = [];
      for (const rule of registry.values()) reports.push(await runRule(rule, deps));
      return reports;
    },
  };
}

/**
 * @param {ReconcileRule} rule
 * @param {ReconcileDeps} deps
 * @returns {Promise<RuleReport>}
 */
async function runRule(rule, deps) {
  const cutoff = new Date(deps.clock.now().getTime() - rule.olderThanMs);
  const scope = systemScope(`reconciler:${rule.name}`, { routine: true });
  const stuck = await rule.model
    .find({ status: rule.stuckStatus, statusChangedAt: { $lt: cutoff } })
    .setOptions(scope)
    .sort({ statusChangedAt: 1 })
    .limit(rule.batchSize ?? 100)
    .lean();
  const report = { rule: rule.name, found: stuck.length, resumed: 0, failed: 0 };
  for (const doc of stuck) {
    const attempts = await countAttempt(rule, doc, scope);
    if (attempts > ALERT_AFTER_ATTEMPTS) {
      deps.logger.error({ rule: rule.name, id: String(doc._id), attempts }, 'reconciler: document keeps getting stuck');
    }
    try {
      await rule.resume(doc, deps);
      report.resumed += 1;
    } catch (error) {
      report.failed += 1;
      deps.logger.error({ rule: rule.name, id: String(doc._id), err: error }, 'reconciler: resume failed');
    }
  }
  return report;
}

/**
 * @param {ReconcileRule} rule
 * @param {Record<string, any>} doc
 * @param {import('../db/tenant-plugin.js').TenantOptions} scope
 */
async function countAttempt(rule, doc, scope) {
  const updated = await rule.model
    .findOneAndUpdate({ _id: doc._id, status: rule.stuckStatus }, { $inc: { reconcileAttempts: 1 } }, { new: true, projection: { reconcileAttempts: 1 } })
    .setOptions(scope)
    .lean();
  return Number(/** @type {any} */ (updated)?.reconcileAttempts ?? 0);
}
