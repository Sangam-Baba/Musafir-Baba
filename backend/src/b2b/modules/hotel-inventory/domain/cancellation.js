// @ts-check
/**
 * Cancellation policies (plan Stage 04 §3.2): reusable rules "cancelled less than N hours before check-in →
 * penalty", a no-show penalty, or non-refundable. Pure: checks, the summary the guest reads, and which
 * penalty applies at a moment (the booking engine charges it in Stage 08). Amounts in paise.
 */
import { DomainError } from '../../../core/errors.js';

export const PENALTY_TYPES = /** @type {const} */ (['PERCENT', 'NIGHTS', 'FIXED']);
export const MAX_RULES = 5;
export const MAX_POLICIES_PER_PROPERTY = 20;

/** @typedef {{ type: 'PERCENT' | 'NIGHTS' | 'FIXED', value: number }} Penalty */
/** @typedef {{ hoursBefore: number, penalty: Penalty }} Rule */
/** @typedef {{ name: string, nonRefundable: boolean, rules: Rule[], noShow: Penalty }} PolicyInput */

/** @type {Record<Penalty['type'], { min: number, max: number }>} */
const LIMITS = { PERCENT: { min: 1, max: 100 }, NIGHTS: { min: 1, max: 30 }, FIXED: { min: 100, max: 1_000_000_00 } };

/** @param {Penalty} p @param {string} path @param {{ path: string, code: string }[]} errors */
function checkPenalty(p, path, errors) {
  const { min, max } = LIMITS[p.type];
  if (!Number.isInteger(p.value) || p.value < min || p.value > max)
    errors.push({ path: `${path}.value`, code: `PENALTY_${p.type}_OUT_OF_RANGE` });
}

/**
 * Checks a policy (all problems at once) and returns it with the rules furthest from check-in first.
 * @param {PolicyInput} input
 * @returns {PolicyInput}
 */
export function normalisePolicy(input) {
  /** @type {{ path: string, code: string }[]} */
  const errors = [];
  const rules = [...input.rules].sort((a, b) => b.hoursBefore - a.hoursBefore);
  if (input.nonRefundable && rules.length > 0) errors.push({ path: 'rules', code: 'NON_REFUNDABLE_HAS_RULES' });
  if (rules.length > MAX_RULES) errors.push({ path: 'rules', code: 'TOO_MANY_RULES' });
  if (new Set(rules.map((r) => r.hoursBefore)).size !== rules.length) errors.push({ path: 'rules', code: 'RULE_HOURS_REPEATED' });
  rules.forEach((r, i) => {
    if (!Number.isInteger(r.hoursBefore) || r.hoursBefore < 0 || r.hoursBefore > 8760)
      errors.push({ path: `rules.${i}.hoursBefore`, code: 'RULE_HOURS_OUT_OF_RANGE' });
    checkPenalty(r.penalty, `rules.${i}.penalty`, errors);
    const prev = rules[i - 1];
    // closer to check-in never costs less (compared when both use the same kind of penalty)
    if (prev && prev.penalty.type === r.penalty.type && r.penalty.value < prev.penalty.value)
      errors.push({ path: `rules.${i}.penalty`, code: 'PENALTY_DECREASES_CLOSER_TO_CHECK_IN' });
  });
  checkPenalty(input.noShow, 'noShow', errors);
  if (errors.length > 0) throw new DomainError('POLICY_INVALID', { errors });
  return { ...input, name: input.name.trim(), rules };
}

const rupees = (/** @type {number} */ paise) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** @param {Penalty} p */
export function penaltyText(p) {
  if (p.type === 'PERCENT') return p.value === 100 ? 'the full booking amount' : `${p.value}% of the booking amount`;
  if (p.type === 'NIGHTS') return p.value === 1 ? "the first night's price" : `the price of ${p.value} nights`;
  return rupees(p.value);
}

/** @param {number} h */
function beforeText(h) {
  if (h === 0) return 'check-in time';
  const unit = h % 24 === 0 ? [h / 24, 'day'] : [h, 'hour'];
  return `${unit[0]} ${unit[1]}${unit[0] === 1 ? '' : 's'} before check-in`;
}

/** The sentence guests read. @param {PolicyInput} policy */
export function summarise(policy) {
  const noShow = `No-show: ${penaltyText(policy.noShow)}.`;
  if (policy.nonRefundable) return `Non-refundable: cancelling costs the full booking amount. ${noShow}`;
  const rules = [...policy.rules].sort((a, b) => b.hoursBefore - a.hoursBefore);
  const furthest = rules[0];
  if (!furthest) return `Free cancellation until check-in. ${noShow}`;
  const parts = [`Free cancellation until ${beforeText(furthest.hoursBefore)}.`];
  for (const r of rules) {
    const when =
      r.hoursBefore === 0
        ? 'Cancelled after check-in time'
        : `Cancelled within ${beforeText(r.hoursBefore).replace(' before check-in', '')} of check-in`;
    parts.push(`${when}: ${penaltyText(r.penalty)}.`);
  }
  return [...parts, noShow].join(' ');
}

/**
 * The penalty for cancelling `hoursLeft` hours before check-in (negative = after check-in time), or null when free.
 * @param {PolicyInput} policy @param {number} hoursLeft
 * @returns {Penalty | null}
 */
export function penaltyAt(policy, hoursLeft) {
  if (policy.nonRefundable) return { type: 'PERCENT', value: 100 };
  const applies = policy.rules.filter((r) => (r.hoursBefore === 0 ? hoursLeft < 0 : hoursLeft < r.hoursBefore));
  if (applies.length === 0) return null;
  return applies.reduce((closest, r) => (r.hoursBefore < closest.hoursBefore ? r : closest)).penalty;
}
