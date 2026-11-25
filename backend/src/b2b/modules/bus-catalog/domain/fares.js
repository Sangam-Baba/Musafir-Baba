// @ts-check
/**
 * Bus fares (plan Stage 18 B4) — pure. The operator's **net fare** (integer paise) per stop pair × seat type, optionally
 * per deck (sleeper lower ₹900, upper ₹800); a row with no deck applies to both. Date rules add or take off an amount
 * between two dates (inclusive), optionally only on some weekdays (Fri–Sun +₹100); when several match, the one added
 * last wins (no stacking — what the operator sees is what is charged). A fare never goes below ₹1.
 */
import { SEAT_TYPES } from './layout.js';
import { addDays, weekdayOf } from './route.js';

export const MIN_FARE_PAISE = 100;
export const MAX_FARE_PAISE = 1_000_000; // ₹10,000
export const MAX_ADJUST_PAISE = 500_000;
export const MAX_FARE_ROWS = 2000;
export const MAX_DATE_RULES = 50;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** @typedef {{ fromIdx: number, toIdx: number, seatType: typeof SEAT_TYPES[number], deck: 'LOWER' | 'UPPER' | null, netPaise: number }} FareRow */
/** @typedef {{ id: string, label: string, from: string, to: string, weekdays: number[], addPaise: number }} DateRule */
/** @typedef {{ stopId: string, boarding: boolean, dropping: boolean }} StopLike */
/** @typedef {{ path: string, code: string }} Problem */

/** @param {FareRow} r */
export const fareKey = (r) => `${r.fromIdx}-${r.toIdx}-${r.seatType}-${r.deck ?? '*'}`;

/** One row's problems. @param {FareRow} r @param {StopLike[]} stops @param {string} p @param {Problem[]} out */
function checkRow(r, stops, p, out) {
  const okIdx = Number.isInteger(r.fromIdx) && Number.isInteger(r.toIdx) && r.fromIdx >= 0 && r.toIdx < stops.length && r.fromIdx < r.toIdx;
  if (!okIdx || !stops[r.fromIdx]?.boarding || !stops[r.toIdx]?.dropping) out.push({ path: p, code: 'FARE_STOPS_INVALID' });
  if (!SEAT_TYPES.includes(r.seatType)) out.push({ path: `${p}.seatType`, code: 'SEAT_TYPE_INVALID' });
  if (!Number.isInteger(r.netPaise) || r.netPaise < MIN_FARE_PAISE || r.netPaise > MAX_FARE_PAISE)
    out.push({ path: `${p}.netPaise`, code: 'FARE_AMOUNT_INVALID' });
}

/** One date rule's problems. @param {DateRule} d @param {string} p @param {Problem[]} out */
function checkRule(d, p, out) {
  if (!DATE.test(d.from) || !DATE.test(d.to) || d.to < d.from || d.to > addDays(d.from, 366))
    out.push({ path: p, code: 'RULE_DATES_INVALID' });
  if (d.weekdays.some((w) => !Number.isInteger(w) || w < 0 || w > 6) || new Set(d.weekdays).size !== d.weekdays.length)
    out.push({ path: `${p}.weekdays`, code: 'WEEKDAYS_INVALID' });
  if (!Number.isInteger(d.addPaise) || d.addPaise === 0 || Math.abs(d.addPaise) > MAX_ADJUST_PAISE)
    out.push({ path: `${p}.addPaise`, code: 'RULE_AMOUNT_INVALID' });
}

/**
 * Every problem with a route's fares at once.
 * @param {StopLike[]} stops @param {FareRow[]} rows @param {DateRule[]} rules
 * @returns {Problem[]}
 */
export function checkFares(stops, rows, rules) {
  /** @type {Problem[]} */
  const out = [];
  if (rows.length > MAX_FARE_ROWS) out.push({ path: 'rows', code: 'TOO_MANY_FARES' });
  if (rules.length > MAX_DATE_RULES) out.push({ path: 'rules', code: 'TOO_MANY_RULES' });
  const keys = new Set();
  rows.forEach((r, i) => {
    checkRow(r, stops, `rows.${i}`, out);
    if (keys.has(fareKey(r))) out.push({ path: `rows.${i}`, code: 'FARE_REPEATED' });
    keys.add(fareKey(r));
  });
  rules.forEach((d, i) => checkRule(d, `rules.${i}`, out));
  return out;
}

/**
 * The net fare for one seat on a journey and date: the deck's own row, else the row for any deck; then the last date
 * rule that matches. `null` when the operator set no fare for it (the seat isn't sold).
 * @param {{ rows: FareRow[], rules: DateRule[] }} fares
 * @param {{ fromIdx: number, toIdx: number, seatType: string, deck: string, date: string }} q
 * @returns {{ netPaise: number, baseNetPaise: number, ruleId: string | null } | null}
 */
export function fareFor(fares, q) {
  const same = (/** @type {FareRow} */ r) => r.fromIdx === q.fromIdx && r.toIdx === q.toIdx && r.seatType === q.seatType;
  const row = fares.rows.find((r) => same(r) && r.deck === q.deck) ?? fares.rows.find((r) => same(r) && r.deck === null);
  if (!row) return null;
  const day = weekdayOf(q.date);
  const rule = [...fares.rules]
    .reverse()
    .find((d) => q.date >= d.from && q.date <= d.to && (!d.weekdays.length || d.weekdays.includes(day)));
  return {
    netPaise: Math.max(MIN_FARE_PAISE, row.netPaise + (rule?.addPaise ?? 0)),
    baseNetPaise: row.netPaise,
    ruleId: rule?.id ?? null,
  };
}

/** A short line for the fare change log ("2 changed, 1 added, 0 removed · 3 date rules"). @param {FareRow[]} before @param {FareRow[]} after @param {number} rules */
export function fareChangeSummary(before, after, rules) {
  const old = new Map(before.map((r) => [fareKey(r), r.netPaise]));
  const now = new Map(after.map((r) => [fareKey(r), r.netPaise]));
  let changed = 0;
  let added = 0;
  for (const [k, v] of now) old.has(k) ? old.get(k) !== v && (changed += 1) : (added += 1);
  const removed = [...old.keys()].filter((k) => !now.has(k)).length;
  return `${changed} changed, ${added} added, ${removed} removed · ${rules} date rule${rules === 1 ? '' : 's'}`;
}
