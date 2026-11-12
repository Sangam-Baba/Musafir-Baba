// @ts-check
/**
 * Scheduled invariant checks (docs/plan/04-domain-model.md §9, 05-… §5.4): modules register
 * checks such as "held = Σ holds.qty" or "wallet balance = Σ journal". Any violation is
 * logged as an error (alerting/paging hooks on top). Checks only READ.
 */

/** @typedef {{ id: string, detail: string }} Violation */
/** @typedef {{ name: string, check: () => Promise<Violation[]> }} Invariant */
/** @typedef {{ name: string, violations: Violation[], error?: string }} InvariantReport */

/** @returns {{ register: (inv: Invariant) => void, runAll: (logger: import('../logger.js').Logger) => Promise<InvariantReport[]> }} */
export function createInvariantChecks() {
  /** @type {Map<string, Invariant>} */
  const registry = new Map();
  return {
    register(inv) {
      if (registry.has(inv.name)) throw new Error(`[b2b] invariant "${inv.name}" registered twice`);
      registry.set(inv.name, inv);
    },
    async runAll(logger) {
      /** @type {InvariantReport[]} */
      const reports = [];
      for (const inv of registry.values()) {
        try {
          const violations = await inv.check();
          if (violations.length > 0)
            logger.error({ invariant: inv.name, count: violations.length, sample: violations.slice(0, 5) }, 'invariant violated');
          reports.push({ name: inv.name, violations });
        } catch (error) {
          logger.error({ invariant: inv.name, err: error }, 'invariant check failed to run');
          reports.push({ name: inv.name, violations: [], error: error instanceof Error ? error.message : String(error) });
        }
      }
      return reports;
    },
  };
}
