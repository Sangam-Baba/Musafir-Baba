// @ts-check
/**
 * Seat rules (plan Stage 18 §5) — pure. A journey from stop a to stop b of a trip uses legs a … b-1 (a bit mask). A
 * seat's `taken` mask is the OR of its entries' masks, and entries never overlap (a seat is taken only when none of the
 * wanted legs is taken), so giving back one entry is `taken & ~mask`.
 */
import { legMask } from '../../bus-catalog/index.js';

/** @typedef {{ stopId: string, boarding: boolean, dropping: boolean }} TripStopLike */
/** @typedef {{ kind: string, ref: string, mask: number }} Entry */

/**
 * The legs of a journey between two stops of a trip (by stop id); with no stops given, the whole route. Boarding must be
 * allowed at the first stop and getting off at the last.
 * @param {TripStopLike[]} stops @param {string | null | undefined} fromStopId @param {string | null | undefined} toStopId
 * @returns {{ ok: true, fromIdx: number, toIdx: number, mask: number } | { ok: false, code: string }}
 */
export function journeyLegs(stops, fromStopId, toStopId) {
  const fromIdx = fromStopId ? stops.findIndex((s) => s.stopId === fromStopId) : 0;
  const toIdx = toStopId ? stops.findIndex((s) => s.stopId === toStopId) : stops.length - 1;
  if (fromIdx < 0 || toIdx < 0) return { ok: false, code: 'STOP_NOT_ON_ROUTE' };
  if (toIdx <= fromIdx) return { ok: false, code: 'STOPS_WRONG_WAY' };
  if (fromStopId && !stops[fromIdx]?.boarding) return { ok: false, code: 'NO_BOARDING_HERE' };
  if (toStopId && !stops[toIdx]?.dropping) return { ok: false, code: 'NO_DROPPING_HERE' };
  return { ok: true, fromIdx, toIdx, mask: legMask(fromIdx, toIdx) };
}

/** The `taken` mask a seat must have for its entries (the invariant). @param {Entry[]} entries */
export const maskOf = (entries) => entries.reduce((m, e) => m | e.mask, 0);

/** Do any two entries share a leg? (must never happen) @param {Entry[]} entries */
export function entriesOverlap(entries) {
  let seen = 0;
  for (const e of entries) {
    if (seen & e.mask) return true;
    seen |= e.mask;
  }
  return false;
}

/** Is the seat free for these legs? @param {number} taken @param {number} mask */
export const freeFor = (taken, mask) => (taken & mask) === 0;
