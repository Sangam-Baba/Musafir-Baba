// @ts-check
/**
 * A journal entry (plan Stage 07 §3.2). Pure checks: at least two lines; each line is a debit **or** a credit, a
 * positive whole number of paise; debits = credits; a reference (type + id) and a purpose that make it unique.
 */
import { DomainError } from '../../../core/errors.js';

export const MAX_LINES = 50;
export const MAX_AMOUNT_PAISE = 10_000_000_000; // ₹10 crore per line — a typo is refused

/**
 * @typedef {{ accountId: string, debitPaise?: number, creditPaise?: number }} LineInput
 * @typedef {{ reference: { type: string, id: string }, purpose: string, lines: LineInput[], memo?: string | null }} EntryInput
 * @typedef {{ accountId: string, debitPaise: number, creditPaise: number }} Line
 */

/**
 * Every problem at once (JOURNAL_ENTRY_INVALID), or the normalised lines.
 * @param {EntryInput} e
 * @returns {Line[]}
 */
export function checkEntry(e) {
  /** @type {{ code: string, field: string }[]} */
  const errors = [];
  if (!e.reference?.type || !/^[a-z][a-z0-9-]{1,40}$/.test(e.reference.type))
    errors.push({ code: 'REFERENCE_TYPE_INVALID', field: 'reference.type' });
  if (!e.reference?.id || String(e.reference.id).length > 80) errors.push({ code: 'REFERENCE_ID_INVALID', field: 'reference.id' });
  if (!/^[a-z][a-z0-9-]{1,40}$/.test(e.purpose ?? '')) errors.push({ code: 'PURPOSE_INVALID', field: 'purpose' });
  const lines = (e.lines ?? []).map((l) => ({
    accountId: String(l.accountId),
    debitPaise: l.debitPaise ?? 0,
    creditPaise: l.creditPaise ?? 0,
  }));
  if (lines.length < 2 || lines.length > MAX_LINES) errors.push({ code: 'LINE_COUNT', field: 'lines' });
  lines.forEach((l, i) => {
    const amounts = [l.debitPaise, l.creditPaise];
    const bad = amounts.some((a) => !Number.isSafeInteger(a) || a < 0 || a > MAX_AMOUNT_PAISE);
    const oneSide = l.debitPaise > 0 !== l.creditPaise > 0;
    if (bad || !oneSide) errors.push({ code: 'LINE_AMOUNT', field: `lines.${i}` });
  });
  const debits = lines.reduce((s, l) => s + l.debitPaise, 0);
  const credits = lines.reduce((s, l) => s + l.creditPaise, 0);
  if (debits !== credits) errors.push({ code: 'NOT_BALANCED', field: 'lines' });
  if (errors.length > 0) throw new DomainError('JOURNAL_ENTRY_INVALID', { errors });
  return lines;
}

/** Same lines in any order. @param {Line[]} a @param {Line[]} b */
export function sameLines(a, b) {
  const key = (/** @type {Line[]} */ ls) =>
    ls
      .map((l) => `${l.accountId}:${l.debitPaise}:${l.creditPaise}`)
      .sort()
      .join('|');
  return key(a) === key(b);
}
