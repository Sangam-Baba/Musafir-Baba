// @ts-check
/**
 * Hotel bookings — pure rules (plan Stage 08 §3.2, `04-…` §7.4): statuses, the rooms to hold for a stay, and the
 * ledger lines a confirmed booking adds (principal model, D4 — CA to review).
 */
import { DomainError } from '../../../core/errors.js';

export const BOOKING_STATUSES = /** @type {const} */ ([
  'HELD',
  'CONFIRMED',
  'EXPIRED',
  'FAILED',
  'CANCELLING',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
  'HOTEL_FAILED',
]);
/** @typedef {typeof BOOKING_STATUSES[number]} BookingStatus */

/** @type {Readonly<Record<BookingStatus, readonly BookingStatus[]>>} */
export const BOOKING_TRANSITIONS = Object.freeze({
  HELD: ['CONFIRMED', 'EXPIRED', 'FAILED'],
  EXPIRED: ['HELD', 'FAILED'], // paid late and the rooms were held again
  CONFIRMED: ['CANCELLING', 'COMPLETED', 'NO_SHOW', 'HOTEL_FAILED'],
  CANCELLING: ['CANCELLED', 'CONFIRMED'],
  FAILED: [],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: ['COMPLETED'], // reversed by MusafirBaba after a dispute: the guest did stay
  HOTEL_FAILED: [],
});

/** @param {BookingStatus} from @param {BookingStatus} to */
export function assertBookingTransition(from, to) {
  if (!BOOKING_TRANSITIONS[from]?.includes(to)) throw new DomainError('BOOKING_STATUS', { from, to });
}

/**
 * The rooms to hold: one line for the room type, as many rooms as the stay has, every night.
 * @param {{ roomTypeId: string, occupancies: unknown[] }} stay
 * @param {string[]} nights
 */
export const holdLinesOf = (stay, nights) => [{ roomTypeId: stay.roomTypeId, qty: stay.occupancies.length, dates: nights }];

/**
 * What a confirmed booking credits (the payment mode adds the debit — PayU: customer advances; wallet: the client's
 * wallet). Principal model: the hotel is owed its rate plus its GST on it; MusafirBaba owes the GST on its price; the
 * rest is margin revenue (a debit if the hotel's GST is larger than the margin). Always balances to the total.
 * @param {{ totalPaise: number, hotelPayablePaise: number, cgstPaise: number, sgstPaise: number, igstPaise: number }} t
 * @returns {{ type: 'PAYABLE' | 'TAX_PAYABLE_CGST' | 'TAX_PAYABLE_SGST' | 'TAX_PAYABLE_IGST' | 'REVENUE_MARGIN', debitPaise?: number, creditPaise?: number }[]}
 */
export function confirmationCredits(t) {
  const revenue = t.totalPaise - t.hotelPayablePaise - t.cgstPaise - t.sgstPaise - t.igstPaise;
  /** @type {ReturnType<typeof confirmationCredits>} */
  const lines = [];
  if (t.hotelPayablePaise > 0) lines.push({ type: 'PAYABLE', creditPaise: t.hotelPayablePaise });
  if (t.cgstPaise > 0) lines.push({ type: 'TAX_PAYABLE_CGST', creditPaise: t.cgstPaise });
  if (t.sgstPaise > 0) lines.push({ type: 'TAX_PAYABLE_SGST', creditPaise: t.sgstPaise });
  if (t.igstPaise > 0) lines.push({ type: 'TAX_PAYABLE_IGST', creditPaise: t.igstPaise });
  if (revenue > 0) lines.push({ type: 'REVENUE_MARGIN', creditPaise: revenue });
  if (revenue < 0) lines.push({ type: 'REVENUE_MARGIN', debitPaise: -revenue });
  return lines;
}
