// @ts-check
/**
 * Admin reports, second half (plan Stage 15 §3.6): payments, wallets & credit ageing, hotel payables ageing, plan
 * revenue, usage — and `createAdminReports`, which runs any report by name and gives its CSV.
 */
import { DomainError } from '../../core/errors.js';
import {
  ADMIN_REPORTS,
  AGE_BUCKETS,
  ageBucket,
  byOrg,
  cancellations,
  groupLines,
  LINE_COLUMNS,
  margin,
  periodOf,
  rangeOf,
  soldRows,
  toCsv,
} from './admin-reports.service.js';

const DAY_MS = 86_400_000;

/** @param {import('./admin-reports.service.js').ReportDeps} deps @param {import('./admin-reports.service.js').ReportFilter} f */
async function payments(deps, f) {
  const { from, to } = rangeOf(f);
  /** @type {Map<string, Record<string, any>>} */
  const out = new Map();
  for (const p of await deps.payments(from, to)) {
    const key = `${p.purpose}|${p.status}|${p.mode ?? '—'}`;
    const l = out.get(key) ?? { purpose: p.purpose, status: p.status, method: p.mode ?? '—', count: 0, amountPaise: 0, refundedPaise: 0 };
    l.count += 1;
    l.amountPaise += p.amountPaise;
    l.refundedPaise += p.refundedPaise ?? 0;
    out.set(key, l);
  }
  const rows = [...out.values()].sort((a, b) => b.amountPaise - a.amountPaise);
  return { columns: ['purpose', 'status', 'method', 'count', 'amountPaise', 'refundedPaise'], rows };
}

/** @param {import('./admin-reports.service.js').ReportDeps} deps */
async function wallets(deps) {
  const now = deps.clock.now();
  const list = await deps.wallets();
  const names = await deps.names(list.map((w) => w.orgId));
  const rows = list.map((w) => {
    const usedPaise = Math.max(0, -w.balancePaise);
    const dueAt = usedPaise > 0 && w.negativeSince ? new Date(new Date(w.negativeSince).getTime() + (w.creditDueDays ?? 0) * DAY_MS) : null;
    return {
      key: w.orgId,
      name: names.get(w.orgId) ?? w.orgId,
      balancePaise: w.balancePaise,
      heldPaise: w.heldPaise,
      creditLimitPaise: w.creditLimitPaise,
      creditUsedPaise: usedPaise,
      dueOn: dueAt ? periodOf(dueAt, 'day') : null,
      ageing: usedPaise > 0 ? ageBucket(dueAt, now) : null,
    };
  });
  rows.sort((a, b) => b.creditUsedPaise - a.creditUsedPaise || a.balancePaise - b.balancePaise);
  return { columns: ['key', 'name', 'balancePaise', 'heldPaise', 'creditLimitPaise', 'creditUsedPaise', 'dueOn', 'ageing'], rows };
}

/** Unpaid hotel payables by hotel and days since they became payable. @param {import('./admin-reports.service.js').ReportDeps} deps */
async function payablesAgeing(deps) {
  const now = deps.clock.now();
  /** @type {Map<string, Record<string, any>>} */
  const out = new Map();
  for (const p of await deps.openPayables()) {
    const l = out.get(p.hotelOrgId) ?? {
      key: p.hotelOrgId,
      totalPaise: 0,
      ...Object.fromEntries(AGE_BUCKETS.map((b) => [`${b}Paise`, 0])),
    };
    const bucket = p.status === 'ELIGIBLE' ? ageBucket(p.eligibleAt ? new Date(p.eligibleAt) : null, now) : 'NOT_DUE';
    l[`${bucket}Paise`] += p.amountPaise;
    l.totalPaise += p.amountPaise;
    out.set(p.hotelOrgId, l);
  }
  const names = await deps.names([...out.keys()]);
  const rows = [...out.values()]
    .map((l) => /** @type {Record<string, any>} */ ({ ...l, name: names.get(l.key) ?? l.key }))
    .sort((a, b) => b.totalPaise - a.totalPaise);
  return { columns: ['key', 'name', 'totalPaise', ...AGE_BUCKETS.map((b) => `${b}Paise`)], rows };
}

/** @param {import('./admin-reports.service.js').ReportDeps} deps @param {import('./admin-reports.service.js').ReportFilter} f */
async function planRevenue(deps, f) {
  const { from, to } = rangeOf(f);
  /** @type {Map<string, Record<string, any>>} */
  const out = new Map();
  for (const i of await deps.saasInvoices(from, to)) {
    const l = out.get(i.period) ?? {
      period: i.period,
      invoices: 0,
      planFeesPaise: 0,
      overagePaise: 0,
      taxablePaise: 0,
      gstPaise: 0,
      totalPaise: 0,
      unpaidPaise: 0,
    };
    l.invoices += 1;
    for (const x of i.lines) l[x.kind === 'OVERAGE' ? 'overagePaise' : 'planFeesPaise'] += x.amountPaise;
    l.taxablePaise += i.totals.taxablePaise;
    l.gstPaise += i.totals.gstPaise;
    l.totalPaise += i.totals.totalPaise;
    if (i.status !== 'PAID') l.unpaidPaise += i.totals.totalPaise;
    out.set(i.period, l);
  }
  const rows = [...out.values()].sort((a, b) => a.period.localeCompare(b.period));
  return {
    columns: ['period', 'invoices', 'planFeesPaise', 'overagePaise', 'taxablePaise', 'gstPaise', 'totalPaise', 'unpaidPaise'],
    rows,
  };
}

/** Months a range touches. @param {import('./admin-reports.service.js').ReportFilter} f */
function monthsOf(f) {
  /** @type {string[]} */
  const out = [];
  for (let m = f.from.slice(0, 7); m <= f.to.slice(0, 7); ) {
    out.push(m);
    const [y, mo] = m.split('-').map(Number);
    m = mo === 12 ? `${(y ?? 0) + 1}-01` : `${y}-${String((mo ?? 0) + 1).padStart(2, '0')}`;
  }
  return out;
}

/** @param {import('./admin-reports.service.js').ReportDeps} deps @param {import('./admin-reports.service.js').ReportFilter} f */
async function usage(deps, f) {
  rangeOf(f);
  const list = await deps.usage(monthsOf(f));
  const names = await deps.names([...new Set(list.map((u) => u.orgId))]);
  const rows = list
    .map((u) => ({
      month: u.month,
      key: u.orgId,
      name: names.get(u.orgId) ?? u.orgId,
      metric: u.metric,
      count: u.count,
      billable: u.billable,
    }))
    .sort((a, b) => a.month.localeCompare(b.month) || b.count - a.count);
  return { columns: ['month', 'key', 'name', 'metric', 'count', 'billable'], rows };
}

/** @param {import('./admin-reports.service.js').ReportFilter} f */
async function sales(f) {
  const by = f.by ?? 'month';
  const lines = groupLines(await soldRows(f), (r) => `${periodOf(r.orderCreatedAt, by)}|${r.channel}`);
  const rows = lines
    .map((l) => ({ period: l.key.split('|')[0], channel: l.key.split('|')[1], ...l }))
    .sort((a, b) => String(a.period).localeCompare(String(b.period)) || String(a.channel).localeCompare(String(b.channel)));
  return { columns: ['period', 'channel', ...LINE_COLUMNS], rows };
}

/** @param {import('./admin-reports.service.js').ReportDeps} deps @param {string} name @param {import('./admin-reports.service.js').ReportFilter} f */
function runOne(deps, name, f) {
  switch (name) {
    case 'sales':
      return sales(f);
    case 'clients':
      return byOrg(deps, f, 'clientOrgId');
    case 'hotels':
      return byOrg(deps, f, 'hotelOrgId');
    case 'destinations':
      return soldRows(f).then((rows) => ({ columns: ['key', ...LINE_COLUMNS], rows: groupLines(rows, (r) => r.destination ?? '') }));
    case 'margin':
      return margin(deps, f);
    case 'cancellations':
      return cancellations(f);
    case 'payments':
      return payments(deps, f);
    case 'wallets':
      return wallets(deps);
    case 'payables-ageing':
      return payablesAgeing(deps);
    case 'plan-revenue':
      return planRevenue(deps, f);
    default:
      return usage(deps, f);
  }
}

/** @param {import('./admin-reports.service.js').ReportDeps} deps */
export function createAdminReports(deps) {
  /** @param {string} name @param {import('./admin-reports.service.js').ReportFilter} f @returns {Promise<import('./admin-reports.service.js').Report>} */
  async function run(name, f) {
    if (!(/** @type {readonly string[]} */ (ADMIN_REPORTS).includes(name))) throw new DomainError('REPORT_UNKNOWN');
    const r = await runOne(deps, name, f);
    return { name, from: f.from, to: f.to, ...r };
  }
  return {
    run,
    names: () => [...ADMIN_REPORTS],
    /** @param {string} name @param {import('./admin-reports.service.js').ReportFilter} f */
    async csv(name, f) {
      const r = await run(name, f);
      return { filename: `${name}-${f.from}-to-${f.to}.csv`, csv: toCsv(r.columns, r.rows) };
    },
  };
}
