// @ts-check
/**
 * Report arithmetic (plan Stage 15 §3.6) — pure: grouping booking rows into sales / cancellation / margin lines,
 * ageing buckets and CSV. Money in integer paise.
 */

/** Booking statuses that were sold (rooms confirmed at some point). */
export const SOLD_STATUSES = /** @type {const} */ (['CONFIRMED', 'CANCELLING', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'HOTEL_FAILED']);
const CANCELLED = new Set(['CANCELLING', 'CANCELLED', 'HOTEL_FAILED']);
const DAY_MS = 86_400_000;
const IST_MS = 330 * 60_000;

/**
 * @typedef {{ bookingRef: string, orderId: string, channel: string, clientOrgId: string | null, hotelOrgId: string | null,
 *   destination: string | null, bookingStatus: string, totalPaise: number, refundedPaise: number, orderCreatedAt: Date }} SaleRow
 * @typedef {{ key: string, bookings: number, cancelled: number, grossPaise: number, refundedPaise: number, netPaise: number,
 *   costPaise: number, marginPaise: number }} Line
 */

/** Indian day / month of an instant. @param {Date} at @param {'day' | 'month'} by */
export function periodOf(at, by) {
  const d = new Date(new Date(at).getTime() + IST_MS).toISOString();
  return by === 'day' ? d.slice(0, 10) : d.slice(0, 7);
}

/**
 * An order's refund counted once (on its first booking row), never more than that booking's total in the rest.
 * @param {SaleRow[]} rows @returns {(SaleRow & { refundPaise: number })[]}
 */
export function refundsOncePerOrder(rows) {
  /** @type {Map<string, number>} */
  const left = new Map();
  return rows.map((r) => {
    if (!left.has(r.orderId)) left.set(r.orderId, r.refundedPaise);
    const remaining = /** @type {number} */ (left.get(r.orderId));
    const refundPaise = Math.min(remaining, r.totalPaise);
    left.set(r.orderId, remaining - refundPaise);
    return { ...r, refundPaise };
  });
}

/**
 * Group sold rows into lines; `cost` = what the hotel is owed for a booking (0 when unknown).
 * @param {SaleRow[]} rows @param {(r: SaleRow) => string} key @param {(bookingRef: string) => number} [cost]
 * @returns {Line[]}
 */
export function groupLines(rows, key, cost = () => 0) {
  /** @type {Map<string, Line>} */
  const out = new Map();
  for (const r of refundsOncePerOrder(rows)) {
    const k = key(r) || '—';
    const l = out.get(k) ?? {
      key: k,
      bookings: 0,
      cancelled: 0,
      grossPaise: 0,
      refundedPaise: 0,
      netPaise: 0,
      costPaise: 0,
      marginPaise: 0,
    };
    l.bookings += 1;
    if (CANCELLED.has(r.bookingStatus)) l.cancelled += 1;
    l.grossPaise += r.totalPaise;
    l.refundedPaise += r.refundPaise;
    l.netPaise += r.totalPaise - r.refundPaise;
    l.costPaise += cost(r.bookingRef);
    l.marginPaise = l.netPaise - l.costPaise;
    out.set(k, l);
  }
  return [...out.values()].sort((a, b) => b.netPaise - a.netPaise || a.key.localeCompare(b.key));
}

export const AGE_BUCKETS = /** @type {const} */ (['NOT_DUE', 'D0_7', 'D8_15', 'D16_30', 'D31_PLUS']);

/** Which ageing bucket a due instant falls in. @param {Date | null} dueAt @param {Date} now */
export function ageBucket(dueAt, now) {
  if (!dueAt || dueAt.getTime() > now.getTime()) return 'NOT_DUE';
  const days = Math.floor((now.getTime() - dueAt.getTime()) / DAY_MS);
  if (days <= 7) return 'D0_7';
  if (days <= 15) return 'D8_15';
  return days <= 30 ? 'D16_30' : 'D31_PLUS';
}

/** A cell that a spreadsheet will not run as a formula. @param {unknown} v */
function cell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Paise columns (ending in `Paise`) as rupees with two decimals. @param {string[]} columns @param {Record<string, unknown>[]} rows */
export function toCsv(columns, rows) {
  const head = columns.map((c) => c.replace(/Paise$/, '_inr'));
  const body = rows.map((r) =>
    columns.map((c) => cell(c.endsWith('Paise') && typeof r[c] === 'number' ? (Number(r[c]) / 100).toFixed(2) : r[c])).join(','),
  );
  return [head.join(','), ...body].join('\n');
}
