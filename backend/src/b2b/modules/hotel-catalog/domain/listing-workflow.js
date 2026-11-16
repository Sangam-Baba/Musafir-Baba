// @ts-check
/**
 * The listing's state machine (plan Stage 03 §3.5–3.7) — one table, used by every step.
 *   DRAFT ──submit──▶ SUBMITTED ──approve──▶ LIVE ──suspend──▶ SUSPENDED ──reactivate──▶ LIVE
 *     ▲  ◀─withdraw──┘     │                  any but ARCHIVED ──archive──▶ ARCHIVED
 *   CHANGES_REQUESTED ◀────┘ requestChanges ── resubmit ──▶ SUBMITTED
 * The hotel submits, resubmits and withdraws; MusafirBaba approves, requests changes, suspends, reactivates
 * and archives (S03-T08). Nothing is ever deleted once submitted — archive.
 */
import { DomainError } from '../../../core/errors.js';

export const LISTING_TRANSITIONS = Object.freeze({
  submit: { from: ['DRAFT'], to: 'SUBMITTED' },
  resubmit: { from: ['CHANGES_REQUESTED'], to: 'SUBMITTED' },
  withdraw: { from: ['SUBMITTED'], to: 'DRAFT' },
  approve: { from: ['SUBMITTED'], to: 'LIVE' },
  requestChanges: { from: ['SUBMITTED'], to: 'CHANGES_REQUESTED' },
  suspend: { from: ['LIVE'], to: 'SUSPENDED' },
  reactivate: { from: ['SUSPENDED'], to: 'LIVE' },
  archive: { from: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'LIVE', 'SUSPENDED'], to: 'ARCHIVED' },
});
/** @typedef {keyof typeof LISTING_TRANSITIONS} ListingAction */

/**
 * @param {string} from
 * @param {ListingAction} action
 * @returns {string}
 */
export function listingTransition(from, action) {
  const rule = LISTING_TRANSITIONS[action];
  if (!rule || !(/** @type {readonly string[]} */ (rule.from).includes(from)))
    throw new DomainError('LISTING_TRANSITION_NOT_ALLOWED', { from, action });
  return rule.to;
}

export const MIN_PROPERTY_PHOTOS = 5;
export const MIN_ROOM_PHOTOS = 2;

/**
 * What still stops a property from being submitted (empty = ready). Everything is listed at once.
 * @param {{ sections: Record<string, boolean>, photoCounts: { property: number, perRoomType: Record<string, number> }, gstinMissing: boolean }} property
 * @param {{ id: string, name: string }[]} roomTypes the active ones
 * @param {{ businessVerified: boolean }} facts
 * @returns {{ code: string, detail?: string }[]}
 */
export function submitBlockers(property, roomTypes, facts) {
  /** @type {{ code: string, detail?: string }[]} */
  const blockers = [];
  if (!facts.businessVerified) blockers.push({ code: 'BUSINESS_NOT_VERIFIED' });
  for (const [section, done] of Object.entries(property.sections))
    if (!done) blockers.push({ code: 'SECTION_INCOMPLETE', detail: section });
  if (property.gstinMissing) blockers.push({ code: 'GSTIN_FOR_STATE_MISSING' });
  if (roomTypes.length === 0) blockers.push({ code: 'NO_ROOM_TYPES' });
  if (property.photoCounts.property < MIN_PROPERTY_PHOTOS)
    blockers.push({ code: 'NOT_ENOUGH_PHOTOS', detail: `property:${MIN_PROPERTY_PHOTOS}` });
  for (const r of roomTypes)
    if ((property.photoCounts.perRoomType[r.id] ?? 0) < MIN_ROOM_PHOTOS) blockers.push({ code: 'NOT_ENOUGH_ROOM_PHOTOS', detail: r.name });
  return blockers;
}
