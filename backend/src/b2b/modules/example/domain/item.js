// @ts-check
/** Pure rules for items — no Express, no Mongoose, no network. */
import { DomainError } from '../../../core/errors.js';

/**
 * @param {string} raw
 * @returns {string}
 */
export function normaliseItemName(raw) {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length === 0) throw new DomainError('ITEM_NAME_EMPTY');
  return name;
}
