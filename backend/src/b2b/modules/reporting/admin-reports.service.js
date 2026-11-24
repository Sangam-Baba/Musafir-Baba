// @ts-check
/**
 * MusafirBaba admin reports (plan Stage 15 §3.6), each as `{ columns, rows }` and CSV:
 *   sales (by day / month and channel) · clients · destinations · hotels · margin (by client / hotel / destination:
 *   what the buyer paid after refunds − what the hotel is owed) · cancellations · payments (purpose × status, method)
 *   · wallets & credit ageing · hotel payables ageing · plan revenue · usage.
 * Bookings come from this module's booking summaries; everything else from functions the caller gives (wired at
 * start-up from the wallet, payments, billing, metering and organizations modules) — this module reads only its own
 * collection. Ranges are Indian days `from`…`to` (inclusive), at most 366 days.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { DomainError } from '../../core/errors.js';
import { AGE_BUCKETS, ageBucket, groupLines, periodOf, SOLD_STATUSES, toCsv } from './domain/reports.js';
import { BookingSummaryRecord } from './models/booking-summary.model.js';

const SCOPE = systemScope('reporting: admin reports', { routine: true });
const IST_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const MAX_ROWS = 50_000;

export const ADMIN_REPORTS = /** @type {const} */ ([
  'sales',
  'clients',
  'destinations',
  'hotels',
  'margin',
  'cancellations',
  'payments',
  'wallets',
  'payables-ageing',
  'plan-revenue',
  'usage',
]);

/**
 * @typedef {{
 *   clock: import('../../core/clock.js').Clock,
 *   costs: (bookingRefs: string[]) => Promise<Map<string, number>>,
 *   openPayables: () => Promise<{ hotelOrgId: string, amountPaise: number, status: string, eligibleAt: Date | null }[]>,
 *   payments: (from: Date, to: Date) => Promise<{ purpose: string, status: string, mode: string | null, amountPaise: number, refundedPaise: number }[]>,
 *   wallets: () => Promise<{ orgId: string, balancePaise: number, heldPaise: number, creditLimitPaise: number, negativeSince: Date | null, creditDueDays: number }[]>,
 *   saasInvoices: (from: Date, to: Date) => Promise<{ period: string, status: string, lines: { kind: string, amountPaise: number }[], totals: { taxablePaise: number, gstPaise: number, totalPaise: number } }[]>,
 *   usage: (months: string[]) => Promise<{ orgId: string, metric: string, month: string, count: number, billable: number }[]>,
 *   names: (orgIds: string[]) => Promise<Map<string, string>>,
 * }} ReportDeps
 * @typedef {{ from: string, to: string, by?: 'day' | 'month', channel?: string, groupBy?: 'client' | 'hotel' | 'destination' }} ReportFilter
 * @typedef {{ name: string, from: string, to: string, columns: string[], rows: Record<string, unknown>[] }} Report
 */

/** @param {ReportFilter} f */
export function rangeOf(f) {
  const ok = (/** @type {string} */ d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
  if (!ok(f.from) || !ok(f.to) || f.to < f.from) throw new DomainError('REPORT_RANGE_INVALID');
  const from = new Date(Date.parse(`${f.from}T00:00:00Z`) - IST_MS);
  const to = new Date(Date.parse(`${f.to}T00:00:00Z`) - IST_MS + DAY_MS);
  if (to.getTime() - from.getTime() > 366 * DAY_MS) throw new DomainError('REPORT_RANGE_TOO_LONG');
  return { from, to };
}

/** Sold bookings in the range. @param {ReportFilter} f */
async function soldRows(f) {
  const { from, to } = rangeOf(f);
  /** @type {Record<string, unknown>} */
  const q = { bookingStatus: { $in: [...SOLD_STATUSES] }, orderCreatedAt: { $gte: from, $lt: to } };
  if (f.channel) q.channel = f.channel;
  const rows = await BookingSummaryRecord.find(q, {
    bookingRef: 1,
    orderId: 1,
    channel: 1,
    clientOrgId: 1,
    hotelOrgId: 1,
    destination: 1,
    bookingStatus: 1,
    totalPaise: 1,
    refundedPaise: 1,
    orderCreatedAt: 1,
  })
    .setOptions(SCOPE)
    .sort({ orderCreatedAt: 1 })
    .limit(MAX_ROWS)
    .lean();
  return /** @type {import('./domain/reports.js').SaleRow[]} */ (/** @type {unknown} */ (rows));
}

const LINE_COLUMNS = ['bookings', 'cancelled', 'grossPaise', 'refundedPaise', 'netPaise'];

/** @param {ReportDeps} deps @param {import('./domain/reports.js').Line[]} lines */
async function named(deps, lines) {
  const names = await deps.names(lines.map((l) => l.key).filter((k) => /^[a-f0-9]{24}$/.test(k)));
  return lines.map((l) => ({ ...l, name: names.get(l.key) ?? (l.key === '—' ? 'Website customers / none' : l.key) }));
}

/** @param {ReportDeps} deps @param {ReportFilter} f @param {'clientOrgId' | 'hotelOrgId'} field */
async function byOrg(deps, f, field) {
  const lines = groupLines(await soldRows(f), (r) => r[field] ?? '');
  return { columns: ['key', 'name', ...LINE_COLUMNS], rows: await named(deps, lines) };
}

/** @param {ReportDeps} deps @param {ReportFilter} f */
async function margin(deps, f) {
  const rows = await soldRows(f);
  const costs = await deps.costs(rows.map((r) => r.bookingRef));
  const field = { client: 'clientOrgId', hotel: 'hotelOrgId', destination: 'destination' }[f.groupBy ?? 'client'];
  const lines = groupLines(
    rows,
    (r) => /** @type {any} */ (r)[field] ?? '',
    (ref) => costs.get(ref) ?? 0,
  );
  return {
    columns: ['key', 'name', 'bookings', 'netPaise', 'costPaise', 'marginPaise', 'marginPct'],
    rows: (await named(deps, lines)).map((l) => ({
      ...l,
      marginPct: l.netPaise > 0 ? Math.round((l.marginPaise / l.netPaise) * 1000) / 10 : 0,
    })),
  };
}

/** @param {ReportFilter} f */
async function cancellations(f) {
  const lines = groupLines(await soldRows(f), (r) => r.channel);
  return {
    columns: ['key', 'bookings', 'cancelled', 'cancelPct', 'refundedPaise'],
    rows: lines.map((l) => ({ ...l, cancelPct: l.bookings ? Math.round((l.cancelled / l.bookings) * 1000) / 10 : 0 })),
  };
}

export { byOrg, cancellations, LINE_COLUMNS, margin, named, soldRows };
export { MAX_ROWS as REPORT_MAX_ROWS, SCOPE as REPORTS_SCOPE, AGE_BUCKETS, ageBucket, groupLines, periodOf, toCsv };
