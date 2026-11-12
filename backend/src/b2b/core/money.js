// @ts-check
/**
 * Money in integer paise (INR). Never floats; rates in basis points (100 bps = 1 %).
 * Rounding: half-up to the paisa. Negative amounts are not allowed — refunds and
 * reversals are separate positive amounts in the ledger (docs/plan/02-… §4.3, 04-… §8).
 */
import { DomainError } from './errors.js';

export class Money {
  /** @type {number} */ #paise;

  /** @param {number} paise */
  constructor(paise) {
    if (!Number.isSafeInteger(paise) || paise < 0) throw new DomainError('INVALID_MONEY', { paise: String(paise) });
    this.#paise = paise;
    Object.freeze(this);
  }

  /** @param {number} paise @returns {Money} */
  static inr(paise) {
    return new Money(paise);
  }

  /** @returns {Money} */
  static zero() {
    return new Money(0);
  }

  /** @param {readonly Money[]} amounts @returns {Money} */
  static sum(amounts) {
    return amounts.reduce((total, m) => total.add(m), Money.zero());
  }

  get paise() {
    return this.#paise;
  }

  get currency() {
    return /** @type {const} */ ('INR');
  }

  /** @param {Money} other */
  add(other) {
    return new Money(this.#paise + other.paise);
  }

  /** Throws INVALID_MONEY if the result would be negative. @param {Money} other */
  subtract(other) {
    return new Money(this.#paise - other.paise);
  }

  /** @param {number} quantity whole number, e.g. nights or rooms */
  times(quantity) {
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new DomainError('INVALID_QUANTITY', { quantity });
    return new Money(this.#paise * quantity);
  }

  /** Share in basis points, half-up to the paisa. @param {number} bps */
  percent(bps) {
    if (!Number.isSafeInteger(bps) || bps < 0) throw new DomainError('INVALID_RATE', { bps });
    return new Money(Math.floor((this.#paise * bps + 5000) / 10000));
  }

  /** @param {Money} other */
  equals(other) {
    return this.#paise === other.paise;
  }

  /** @param {Money} other @returns {-1 | 0 | 1} */
  compare(other) {
    return this.#paise === other.paise ? 0 : this.#paise < other.paise ? -1 : 1;
  }

  isZero() {
    return this.#paise === 0;
  }

  /** API shape (06-api-and-events.md §1). */
  toJSON() {
    return { amountPaise: this.#paise, currency: this.currency };
  }
}
