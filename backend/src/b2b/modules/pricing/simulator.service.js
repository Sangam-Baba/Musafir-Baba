// @ts-check
/**
 * Admin price simulator (S05-T09): the full breakdown (hotel rate, margin and which rule gave it, sell, GST lines,
 * hotel's GST, totals) for any buyer, optionally **with draft rules** as if they were approved (a draft that
 * replaces a rule hides it, exactly as on approval). Nothing is saved; no token is issued.
 * The caller supplies the nightly hotel rates — typed in (sample) or from a property's real calendar (the routes
 * layer reads hotel-inventory / hotel-catalog, so this shared module never imports hotel modules).
 */
import { DomainError } from '../../core/errors.js';
import { inForce } from './domain/rule-lifecycle.js';
import { buildBreakdown } from './domain/quote.js';
import { createMarginRulesService } from './margin-rules.service.js';

/** @typedef {import('./domain/quote.js').QuoteInput} QuoteInput */

/**
 * @param {{ clock: import('../../core/clock.js').Clock, quotes: { data: () => Promise<Omit<import('./domain/quote.js').QuoteData, 'now'>> } }} deps
 */
export function createSimulatorService(deps) {
  const margins = createMarginRulesService();
  return {
    /**
     * @param {QuoteInput[]} inputs one per offer (same buyer and drafts)
     * @param {string[]} draftIds
     */
    async simulate(inputs, draftIds) {
      const [data, drafts] = await Promise.all([deps.quotes.data(), margins.draftRules(draftIds)]);
      const rules = inForce([...data.rules, ...drafts]);
      const all = { ...data, rules, now: deps.clock.now() };
      const results = inputs.map((q) => {
        try {
          return { ok: true, breakdown: buildBreakdown(all, q) };
        } catch (error) {
          if (!(error instanceof DomainError)) throw error;
          return { ok: false, problem: { code: error.code, ...error.details } };
        }
      });
      const ids = [...new Set(results.flatMap((r) => (r.breakdown ? r.breakdown.ruleIds : [])))];
      return { results, ruleNames: await margins.names(ids), draftsUsed: drafts.map((d) => d.id) };
    },
  };
}
