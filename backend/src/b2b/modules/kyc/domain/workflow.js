// @ts-check
/**
 * The KYC application's state machine (plan Stage 02 §1, §3.5–3.7) — one table, used by every step.
 *   DRAFT ──submit──▶ SUBMITTED ──take──▶ UNDER_REVIEW ──approve──▶ APPROVED
 *                       ▲   ◀──release── (lock expired / reviewer let go)
 *   REJECTED ──resubmit─┘                 UNDER_REVIEW ──reject──▶ REJECTED
 * The hotel may change its details and documents only in DRAFT or REJECTED.
 */
import { DomainError } from '../../../core/errors.js';

export const TRANSITIONS = Object.freeze({
  submit: { from: ['DRAFT'], to: 'SUBMITTED' },
  resubmit: { from: ['REJECTED'], to: 'SUBMITTED' },
  take: { from: ['SUBMITTED'], to: 'UNDER_REVIEW' },
  release: { from: ['UNDER_REVIEW'], to: 'SUBMITTED' },
  approve: { from: ['UNDER_REVIEW'], to: 'APPROVED' },
  reject: { from: ['UNDER_REVIEW'], to: 'REJECTED' },
});

/** @typedef {keyof typeof TRANSITIONS} KycAction */

export const EDITABLE_STATUSES = /** @type {const} */ (['DRAFT', 'REJECTED']);

/** @param {string} status */
export const isEditable = (status) => /** @type {readonly string[]} */ (EDITABLE_STATUSES).includes(status);

/**
 * @param {string} from
 * @param {KycAction} action
 * @returns {string} the new status
 */
export function transition(from, action) {
  const rule = TRANSITIONS[action];
  if (!rule || !rule.from.includes(from)) throw new DomainError('KYC_TRANSITION_NOT_ALLOWED', { from, action });
  return rule.to;
}

/** submit for a first application, resubmit after a rejection @param {string} status @returns {KycAction} */
export const submitActionFor = (status) => (status === 'REJECTED' ? 'resubmit' : 'submit');
