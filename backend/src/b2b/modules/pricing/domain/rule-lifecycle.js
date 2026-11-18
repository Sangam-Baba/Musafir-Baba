// @ts-check
/**
 * Margin rule lifecycle (plan Stage 05 §3.1). Pure.
 *   DRAFT ──submit──▶ PENDING_APPROVAL ──approve──▶ ACTIVE ──retire──▶ RETIRED
 *     ▲  └─discard──▶ RETIRED            │
 *     └────────────reject────────────────┘
 * Only a DRAFT is edited. Approving and rejecting are for a different person from the one who wrote or submitted
 * the rule (maker–checker). A rule replacing an ACTIVE one takes over the moment it is approved.
 */
import { DomainError, ForbiddenError } from '../../../core/errors.js';

export const RULE_ACTIONS = /** @type {const} */ (['edit', 'submit', 'approve', 'reject', 'retire', 'discard']);
/** @typedef {typeof RULE_ACTIONS[number]} RuleAction */
/** @typedef {'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'RETIRED'} RuleStatus */

/** @type {Record<RuleAction, [RuleStatus, RuleStatus]>} from → to */
const MOVES = {
  edit: ['DRAFT', 'DRAFT'],
  submit: ['DRAFT', 'PENDING_APPROVAL'],
  approve: ['PENDING_APPROVAL', 'ACTIVE'],
  reject: ['PENDING_APPROVAL', 'DRAFT'],
  retire: ['ACTIVE', 'RETIRED'],
  discard: ['DRAFT', 'RETIRED'],
};

/** Actions that need the approve permission and a second person. */
export const CHECKER_ACTIONS = /** @type {readonly RuleAction[]} */ (['approve', 'reject']);

/**
 * @param {RuleStatus} status
 * @param {RuleAction} action
 * @returns {RuleStatus} the status after the action
 */
export function ruleTransition(status, action) {
  const [from, to] = MOVES[action];
  if (status !== from) throw new DomainError('RULE_STATUS', { status, action });
  return to;
}

/**
 * Maker–checker: whoever wrote or submitted the rule can't approve or reject it.
 * @param {{ createdBy: string, submittedBy?: string | null }} rule
 * @param {string} by e.g. 'staff:42'
 */
export function assertSecondPerson(rule, by) {
  if (rule.createdBy === by || rule.submittedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
}

/**
 * Rules that take part in prices: ACTIVE ones, minus any that an ACTIVE rule replaces (so a replacement takes over
 * at once, even before the old rule is marked retired).
 * @template {{ id: string, replaces?: string | null }} R
 * @param {readonly R[]} active
 * @returns {R[]}
 */
export function inForce(active) {
  const replaced = new Set(active.map((r) => r.replaces).filter(Boolean));
  return active.filter((r) => !replaced.has(r.id));
}

/**
 * A margin change worth a warning in the log: a replacement moving the amount by more than half.
 * @param {{ type: string, value: number }} before
 * @param {{ type: string, value: number }} after
 */
export function isLargeChange(before, after) {
  if (before.type !== after.type) return true;
  if (before.value === 0) return after.value !== 0;
  return Math.abs(after.value - before.value) / Math.abs(before.value) > 0.5;
}
