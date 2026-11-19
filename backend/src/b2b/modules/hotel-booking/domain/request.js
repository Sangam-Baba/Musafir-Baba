// @ts-check
/**
 * Booking requests (D37). Pure.
 *   SUBMITTED ──take──▶ IN_PROGRESS ──confirm──▶ CONFIRMED
 *       │                   └──decline──▶ DECLINED
 *       └──decline──▶ DECLINED      (SUBMITTED / IN_PROGRESS) ──cancel (client)──▶ CANCELLED
 * A request never takes rooms or moves money: MusafirBaba arranges it offline and records the outcome.
 */
import { randomInt } from 'node:crypto';

import { DomainError } from '../../../core/errors.js';

export const REQUEST_STATUSES = /** @type {const} */ (['SUBMITTED', 'IN_PROGRESS', 'CONFIRMED', 'DECLINED', 'CANCELLED']);
/** @typedef {typeof REQUEST_STATUSES[number]} RequestStatus */
/** @typedef {'take' | 'confirm' | 'decline' | 'cancel'} RequestAction */

/** @type {Record<RequestAction, { from: readonly RequestStatus[], to: RequestStatus }>} */
const MOVES = {
  take: { from: ['SUBMITTED'], to: 'IN_PROGRESS' },
  confirm: { from: ['IN_PROGRESS'], to: 'CONFIRMED' },
  decline: { from: ['SUBMITTED', 'IN_PROGRESS'], to: 'DECLINED' },
  cancel: { from: ['SUBMITTED', 'IN_PROGRESS'], to: 'CANCELLED' },
};

/**
 * @param {RequestStatus} status
 * @param {RequestAction} action
 * @returns {RequestStatus}
 */
export function requestTransition(status, action) {
  const move = MOVES[action];
  if (!move.from.includes(status)) throw new DomainError('REQUEST_STATUS', { status, action });
  return move.to;
}

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no 0 / O / 1 / I / L
/** A short reference people can read on the phone, e.g. `BR-7KQ2-M9XA` (unique index in the database). */
export function newRequestRef() {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `BR-${part()}-${part()}`;
}
