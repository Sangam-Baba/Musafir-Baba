// @ts-check
/**
 * Live client balances — pure rules (plan Stage 11 §3.2, `04-…` §5). A client wallet is credit-normal: the balance is
 * what the client has with MusafirBaba; below zero = credit in use (never below minus the credit limit).
 *   available = balance − held + credit limit
 * The database filter that guards a debit or a hold is built here so every caller uses the same floor.
 */

/** @param {{ balancePaise: number, heldPaise: number, creditLimitPaise: number }} a */
export const availableOf = (a) => a.balancePaise - a.heldPaise + a.creditLimitPaise;

/** @param {{ balancePaise: number, creditLimitPaise: number }} a */
export const creditUsedOf = (a) => Math.max(0, -a.balancePaise);

/**
 * The `$expr` that lets an update take `amount` out of what is available (balance − held + credit limit ≥ amount).
 * @param {number} amount
 */
export const canTake = (amount) => ({ $gte: [{ $add: [{ $subtract: ['$balancePaise', '$heldPaise'] }, '$creditLimitPaise'] }, amount] });

/** Live operation types: HOLD keeps money aside; the others change the balance and carry their journal entry. */
export const LIVE_OP_TYPES = /** @type {const} */ (['HOLD', 'CAPTURE', 'TOPUP', 'REFUND', 'ADJUST', 'DEBIT']);

const DAY_MS = 86_400_000;

/**
 * Credit dues (D9): credit used = the wallet below zero; due `creditDueDays` after it went below zero; overdue after.
 * @param {{ balancePaise: number, creditLimitPaise: number, creditDueDays?: number, negativeSince?: Date | null }} a
 * @param {Date} now
 */
export function creditState(a, now) {
  const usedPaise = Math.max(0, -a.balancePaise);
  const dueAt = usedPaise > 0 && a.negativeSince ? new Date(a.negativeSince.getTime() + (a.creditDueDays ?? 0) * DAY_MS) : null;
  return { usedPaise, dueAt, overdue: Boolean(dueAt && now > dueAt) };
}
