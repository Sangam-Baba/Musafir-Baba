// @ts-check
/**
 * GST registers (plan Stage 15 §3.5) for a month (India): hotel tax invoices, hotel credit notes (negative) and SaaS
 * invoices — each with taxable value, CGST / SGST / IGST, place of supply, SAC and the buyer's GSTIN (B2B when there
 * is one, B2C otherwise); summaries by type, B2B / B2C, place of supply and SAC; net = invoices − credit notes. CSV
 * in a simple layout until the CA agrees the format. `lock` closes a finished month (never the current one).
 */
import { ConflictError, DomainError } from '../../core/errors.js';
import { taxDocumentsBetween } from '../documents/index.js';
import { monthOf, monthStart, nextMonth } from '../subscriptions/index.js';
import { InvoiceRecord } from './models/invoice.model.js';
import { PeriodLockRecord } from './models/period-lock.model.js';
import { BILL } from './billing.service.js';

const SAAS_SAC = '998314';

/**
 * @typedef {{ kind: 'HOTEL_INVOICE' | 'HOTEL_CREDIT_NOTE' | 'SAAS_INVOICE', number: string, date: Date, against: string | null,
 *   buyerGstin: string | null, b2b: boolean, placeOfSupply: string, sac: string, taxablePaise: number, cgstPaise: number,
 *   sgstPaise: number, igstPaise: number, totalPaise: number }} RegisterRow
 */

/**
 * A hotel tax invoice or credit note as a register row (credit notes negative).
 * @param {Awaited<ReturnType<typeof taxDocumentsBetween>>[number]} d @returns {RegisterRow}
 */
function documentRow(d) {
  const t = d.tax ?? { taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0, placeOfSupply: '', sac: '', buyerGstin: null };
  const sign = d.type === 'CREDIT_NOTE' ? -1 : 1;
  const amounts = {
    taxablePaise: sign * (t.taxablePaise ?? 0),
    cgstPaise: sign * (t.cgstPaise ?? 0),
    sgstPaise: sign * (t.sgstPaise ?? 0),
    igstPaise: sign * (t.igstPaise ?? 0),
  };
  return {
    kind: d.type === 'CREDIT_NOTE' ? 'HOTEL_CREDIT_NOTE' : 'HOTEL_INVOICE',
    number: String(d.number),
    date: d.issuedAt,
    against: d.againstNumber ?? null,
    buyerGstin: t.buyerGstin ?? null,
    b2b: Boolean(t.buyerGstin),
    placeOfSupply: t.placeOfSupply ?? '',
    sac: t.sac ?? '',
    ...amounts,
    totalPaise: amounts.taxablePaise + amounts.cgstPaise + amounts.sgstPaise + amounts.igstPaise,
  };
}

/** @param {string} month */
async function rowsOf(month) {
  const from = monthStart(month);
  const to = monthStart(nextMonth(month));
  /** @type {RegisterRow[]} */
  const rows = [];
  for (const d of await taxDocumentsBetween(from, to)) rows.push(documentRow(d));
  const saas = await InvoiceRecord.find({ issuedAt: { $gte: from, $lt: to }, status: { $ne: 'VOID' } }, { html: 0 })
    .setOptions(BILL)
    .sort({ issuedAt: 1 })
    .lean();
  for (const i of saas) {
    const t = /** @type {any} */ (i.totals);
    const s = /** @type {any} */ (i.supply);
    rows.push({
      kind: 'SAAS_INVOICE',
      number: i.number,
      date: i.issuedAt,
      against: null,
      buyerGstin: s.clientGstin ?? null,
      b2b: Boolean(s.clientGstin),
      placeOfSupply: s.clientGstin ? String(s.clientGstin).slice(0, 2) : s.issuerState,
      sac: SAAS_SAC,
      taxablePaise: t.taxablePaise,
      cgstPaise: t.cgstPaise,
      sgstPaise: t.sgstPaise,
      igstPaise: t.igstPaise,
      totalPaise: t.totalPaise,
    });
  }
  return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** @param {RegisterRow[]} rows @param {(r: RegisterRow) => string} key */
function groupTotals(rows, key) {
  /** @type {Record<string, { taxablePaise: number, gstPaise: number, count: number }>} */
  const out = {};
  for (const r of rows) {
    const g = (out[key(r) || '—'] ??= { taxablePaise: 0, gstPaise: 0, count: 0 });
    g.taxablePaise += r.taxablePaise;
    g.gstPaise += r.cgstPaise + r.sgstPaise + r.igstPaise;
    g.count += 1;
  }
  return out;
}

/** The register for a month. @param {string} month */
export async function gstRegister(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new DomainError('MONTH_INVALID');
  const rows = await rowsOf(month);
  const sum = (/** @type {keyof RegisterRow} */ k) => rows.reduce((s, r) => s + Number(r[k]), 0);
  const lock = await PeriodLockRecord.findOne({ month }).lean();
  return {
    month,
    locked: lock ? { by: lock.lockedBy, at: lock.lockedAt } : null,
    rows,
    totals: {
      taxablePaise: sum('taxablePaise'),
      cgstPaise: sum('cgstPaise'),
      sgstPaise: sum('sgstPaise'),
      igstPaise: sum('igstPaise'),
      totalPaise: sum('totalPaise'),
    },
    byKind: groupTotals(rows, (r) => r.kind),
    bySupplyType: groupTotals(rows, (r) => (r.b2b ? 'B2B' : 'B2C')),
    byPlaceOfSupply: groupTotals(rows, (r) => r.placeOfSupply),
    bySac: groupTotals(rows, (r) => r.sac),
  };
}

/** @param {Awaited<ReturnType<typeof gstRegister>>} reg */
export function gstRegisterCsv(reg) {
  const rupees = (/** @type {number} */ p) => (p / 100).toFixed(2);
  const head = [
    'kind',
    'number',
    'date',
    'against',
    'buyer_gstin',
    'supply_type',
    'place_of_supply',
    'sac',
    'taxable_inr',
    'cgst_inr',
    'sgst_inr',
    'igst_inr',
    'total_inr',
  ];
  const lines = reg.rows.map((r) =>
    [
      r.kind,
      r.number,
      new Date(r.date).toISOString().slice(0, 10),
      r.against ?? '',
      r.buyerGstin ?? '',
      r.b2b ? 'B2B' : 'B2C',
      r.placeOfSupply,
      r.sac,
      rupees(r.taxablePaise),
      rupees(r.cgstPaise),
      rupees(r.sgstPaise),
      rupees(r.igstPaise),
      rupees(r.totalPaise),
    ].join(','),
  );
  return [head.join(','), ...lines].join('\n');
}

/** @param {string} month */
export const isLocked = async (month) => Boolean(await PeriodLockRecord.exists({ month }));

/**
 * Lock a finished month after filing (once; never the current or a future month).
 * @param {{ clock: import('../../core/clock.js').Clock }} deps @param {string} by @param {string} month @param {string | null} note
 */
export async function lockPeriod(deps, by, month, note) {
  if (month >= monthOf(deps.clock.now())) throw new DomainError('PERIOD_NOT_FINISHED');
  const reg = await gstRegister(month);
  try {
    await PeriodLockRecord.create({ month, lockedBy: by, lockedAt: deps.clock.now(), note, totals: reg.totals });
  } catch (e) {
    if (/** @type {any} */ (e)?.code === 11000) throw new ConflictError('PERIOD_ALREADY_LOCKED');
    throw e;
  }
  return { month, totals: reg.totals };
}
