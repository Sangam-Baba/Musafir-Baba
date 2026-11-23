// @ts-check
/**
 * A B2B client's own reports (plan Stage 15 §3.7): bookings by month, spend by destination / branch / booker, and
 * usage by month. Bookings come from the booking summaries limited exactly like the bookings list (the company, the
 * viewer's branches, or only their own bookings); usage from the function the caller gives (metering). Wallet
 * statements already exist (Stage 11). Never shows other companies' rows or MusafirBaba's cost / margin.
 */
import { DomainError } from '../../core/errors.js';
import { groupLines, periodOf, SOLD_STATUSES, toCsv } from './domain/reports.js';
import { rangeOf } from './admin-reports.service.js';
import { BookingSummaryRecord } from './models/booking-summary.model.js';
import { clientFilter } from './summaries.service.js';
import { systemScope } from '../../core/db/tenant-plugin.js';

const SCOPE = systemScope('reporting: client reports', { routine: true });
export const CLIENT_REPORTS = /** @type {const} */ (['bookings', 'spend', 'usage']);
const COLUMNS = ['bookings', 'cancelled', 'grossPaise', 'refundedPaise', 'netPaise'];

/**
 * @typedef {{ clientOrgId: string, branchIds: readonly string[], ownUser: string | null }} Viewer
 * @typedef {{ from: string, to: string, groupBy?: 'destination' | 'branch' | 'booker' }} ClientReportFilter
 * @typedef {{ usage: (orgId: string, month: string) => Promise<{ billable: number, byMetric: Record<string, { count: number, billable: number }> }> }} ClientReportDeps
 */

/** @param {Viewer} who @param {ClientReportFilter} f */
async function rowsOf(who, f) {
  const { from, to } = rangeOf({ from: f.from, to: f.to });
  const q = { ...clientFilter(who, { bookedFrom: from, bookedTo: to }), bookingStatus: { $in: [...SOLD_STATUSES] } };
  const rows = await BookingSummaryRecord.find(q, {
    bookingRef: 1,
    orderId: 1,
    channel: 1,
    clientOrgId: 1,
    branchId: 1,
    createdBy: 1,
    destination: 1,
    bookingStatus: 1,
    totalPaise: 1,
    refundedPaise: 1,
    orderCreatedAt: 1,
  })
    .setOptions(SCOPE)
    .sort({ orderCreatedAt: 1 })
    .limit(50_000)
    .lean();
  return /** @type {any[]} */ (rows);
}

/** Months a range touches. @param {ClientReportFilter} f */
function monthsOf(f) {
  /** @type {string[]} */
  const out = [];
  for (let m = f.from.slice(0, 7); m <= f.to.slice(0, 7); ) {
    out.push(m);
    const y = Number(m.slice(0, 4));
    const mo = Number(m.slice(5, 7));
    m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
  }
  return out;
}

/** @param {ClientReportDeps} deps @param {Viewer} who @param {string} name @param {ClientReportFilter} f */
async function runOne(deps, who, name, f) {
  if (name === 'bookings') {
    const lines = groupLines(await rowsOf(who, f), (r) => periodOf(r.orderCreatedAt, 'month'));
    return {
      columns: ['month', ...COLUMNS],
      rows: lines.map((l) => ({ month: l.key, ...l })).sort((a, b) => a.month.localeCompare(b.month)),
    };
  }
  if (name === 'spend') {
    const field = { destination: 'destination', branch: 'branchId', booker: 'createdBy' }[f.groupBy ?? 'destination'];
    const lines = groupLines(await rowsOf(who, f), (r) => /** @type {Record<string, any>} */ (r)[field] ?? '');
    return { columns: ['key', ...COLUMNS], rows: lines.map(({ costPaise: _c, marginPaise: _m, ...l }) => l) };
  }
  rangeOf({ from: f.from, to: f.to });
  const rows = [];
  for (const month of monthsOf(f)) {
    const u = await deps.usage(who.clientOrgId, month);
    rows.push({ month, billable: u.billable, ...Object.fromEntries(Object.entries(u.byMetric).map(([k, v]) => [k, v.count])) });
  }
  const metrics = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k !== 'month' && k !== 'billable')))].sort();
  return { columns: ['month', 'billable', ...metrics], rows };
}

/** @param {ClientReportDeps} deps */
export function createClientReports(deps) {
  /**
   * @param {Viewer} who @param {string} name @param {ClientReportFilter} f
   * @returns {Promise<{ name: string, from: string, to: string, columns: string[], rows: Record<string, any>[] }>}
   */
  async function run(who, name, f) {
    if (!(/** @type {readonly string[]} */ (CLIENT_REPORTS).includes(name))) throw new DomainError('REPORT_UNKNOWN');
    // usage counts the whole company — a viewer limited to branches / own bookings sees only bookings reports
    if (name === 'usage' && (who.branchIds.length > 0 || who.ownUser)) throw new DomainError('REPORT_NOT_AVAILABLE');
    return { name, from: f.from, to: f.to, ...(await runOne(deps, who, name, f)) };
  }
  return {
    run,
    /** @param {Viewer} who @param {string} name @param {ClientReportFilter} f */
    async csv(who, name, f) {
      const r = await run(who, name, f);
      return { filename: `${name}-${f.from}-to-${f.to}.csv`, csv: toCsv(r.columns, r.rows) };
    },
  };
}
