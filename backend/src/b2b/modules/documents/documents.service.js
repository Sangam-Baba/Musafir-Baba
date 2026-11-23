// @ts-check
/**
 * Issuing documents for an order (plan Stage 08 §3.8). Shared module — it never reads hotel or order collections: the
 * caller gives `facts(orderId)` (the order's copies, wired at start-up).
 * - `ensureForOrder`: issues whatever is missing (voucher, receipt; the tax invoice once MusafirBaba's GSTIN is set —
 *   without it no invoice and no number is used). Repeat-safe: one version 1 per order and type (unique index).
 * - Invoice numbers: gap-free series per registration and financial year, reserved by order (a retry gets the same).
 * - Never overwritten: `regenerate` stores a new version (an invoice keeps its number).
 * A failure never touches the booking; the retry job (`retryMissing`) tries again and alerts after 5 minutes.
 */
import { createHash } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { NotFoundError } from '../../core/errors.js';
import { EVENTS } from './events.js';
import { creditNoteNumber, creditSeriesKey, financialYear, invoiceNumber, seriesKey } from './domain/numbering.js';
import { clientVoucherHtml, creditNoteHtml, receiptHtml, taxInvoiceHtml, voucherHtml } from './domain/templates.js';
import { DocumentRecord } from './models/document.model.js';
import { KEEP_RESERVATIONS, NumberSeriesRecord } from './models/number-series.model.js';

const DOCS = systemScope('documents: booking documents', { routine: true });
const DUPLICATE_KEY = 11000;

/**
 * @typedef {import('./domain/templates.js').OrderFacts} OrderFacts
 * @typedef {{ customerId: string | null, guestKey: string | null, clientOrgId: string | null, hotelOrgId: string | null }} Owners
 * @typedef {{ orderRef: string, confirmedAt: Date, owners: Owners, facts: OrderFacts, issuer: { stateCode: string, gstin: string | null },
 *   brand?: { name: string } | null }} FactsFor   brand: a B2B client's order → its own voucher too
 * @typedef {{ orderRef: string, owners: Owners, issuer: { stateCode: string, gstin: string | null }, cancelledAt: Date,
 *   bookingRef: string, propertyName: string, contact: { name: string, email: string }, refundPaise: number,
 *   totals: { totalPaise: number, cgstPaise: number, sgstPaise: number, igstPaise: number }, sac: string, rateBps: number,
 *   placeOfSupply: string }} CreditFactsFor
 * @typedef {{ clock: import('../../core/clock.js').Clock, logger: import('../../core/logger.js').Logger,
 *   facts: (orderId: string) => Promise<FactsFor | null>,
 *   creditFacts?: (orderId: string, bookingId: string) => Promise<CreditFactsFor | null> }} DocumentsDeps
 */

/**
 * The next number of a series for `key` — or the one already reserved for it. One conditional update moves the
 * counter and records the reservation together.
 * @param {string} series
 * @param {string} key
 * @param {Date} at
 */
export async function reserveNumber(series, key, at) {
  const held = async () => (await NumberSeriesRecord.findOne({ _id: series, 'recent.key': key }, { 'recent.$': 1 }).lean())?.recent?.[0]?.n;
  const existing = await held();
  if (existing) return existing;
  await NumberSeriesRecord.updateOne({ _id: series }, { $setOnInsert: { last: 0, recent: [] } }, { upsert: true }).catch((e) => {
    if (e?.code !== DUPLICATE_KEY) throw e;
  });
  await NumberSeriesRecord.updateOne({ _id: series, 'recent.key': { $ne: key } }, [
    { $set: { last: { $add: ['$last', 1] } } },
    { $set: { recent: { $slice: [{ $concatArrays: ['$recent', [{ n: '$last', key, at }]] }, -KEEP_RESERVATIONS] } } },
  ]);
  const n = await held();
  if (!n) throw new Error(`[b2b] number not reserved for ${key} in ${series}`);
  return n;
}

/**
 * @param {DocumentsDeps} deps
 * @param {{ owners: Owners, orderRef: string }} f
 * @param {{ orderId: string, type: 'VOUCHER' | 'TAX_INVOICE' | 'RECEIPT' | 'CREDIT_NOTE' | 'VOUCHER_CLIENT', version: number, html: string, number?: string | null, series?: string | null, againstNumber?: string | null, subjectId?: string | null }} d
 */
async function store(deps, f, d) {
  const sha256 = createHash('sha256').update(d.html).digest('hex');
  const at = deps.clock.now();
  const event = newEvent(
    EVENTS.documentGenerated,
    { orgId: f.owners.hotelOrgId ?? 'platform', orderId: d.orderId, ref: f.orderRef, type: d.type, version: d.version },
    deps,
  );
  try {
    await DocumentRecord.create({
      ...f.owners,
      ...d,
      orderRef: f.orderRef,
      number: d.number ?? null,
      series: d.series ?? null,
      sha256,
      issuedAt: at,
      pendingEvents: [event],
      hasPendingEvents: true,
    });
    return true;
  } catch (e) {
    if (/** @type {any} */ (e)?.code === DUPLICATE_KEY) return false; // another run issued it first
    throw e;
  }
}

/**
 * @param {DocumentsDeps} deps
 * @param {string} orderId
 * @param {FactsFor} f
 * @param {number} version
 */
async function issueInvoice(deps, orderId, f, version) {
  if (!f.issuer.gstin) return { skipped: 'ISSUER_GSTIN_MISSING' };
  const fy = financialYear(new Date(f.confirmedAt));
  const series = seriesKey(f.issuer.stateCode, fy);
  const number = invoiceNumber(fy, await reserveNumber(series, `order:${orderId}`, deps.clock.now()));
  const html = taxInvoiceHtml(f.facts, { number, issuedAt: deps.clock.now(), gstin: f.issuer.gstin });
  return { created: await store(deps, f, { orderId, type: 'TAX_INVOICE', version, html, number, series }) };
}

/** @param {DocumentsDeps} deps @param {string} orderId */
async function ensureForOrder(deps, orderId) {
  const f = await deps.facts(orderId);
  if (!f) throw new NotFoundError('ORDER_NOT_FOUND');
  const have = new Set((await DocumentRecord.find({ orderId, version: 1 }, { type: 1 }).setOptions(DOCS).lean()).map((d) => d.type));
  /** @type {string[]} */
  const created = [];
  /** @type {{ type: string, reason: string }[]} */
  const skipped = [];
  if (!have.has('VOUCHER') && (await store(deps, f, { orderId, type: 'VOUCHER', version: 1, html: voucherHtml(f.facts) })))
    created.push('VOUCHER');
  if (!have.has('RECEIPT') && (await store(deps, f, { orderId, type: 'RECEIPT', version: 1, html: receiptHtml(f.facts) })))
    created.push('RECEIPT');
  if (
    f.brand &&
    !have.has('VOUCHER_CLIENT') &&
    (await store(deps, f, { orderId, type: 'VOUCHER_CLIENT', version: 1, html: clientVoucherHtml(f.facts, f.brand) }))
  )
    created.push('VOUCHER_CLIENT');
  if (!have.has('TAX_INVOICE')) {
    const r = await issueInvoice(deps, orderId, f, 1);
    if ('skipped' in r && r.skipped) skipped.push({ type: 'TAX_INVOICE', reason: r.skipped });
    else if (r.created) created.push('TAX_INVOICE');
  }
  return { created, skipped };
}

/**
 * The GST credit note for a cancelled booking's refund (plan Stage 09 §3.10) — once per booking; only with MusafirBaba's
 * GSTIN and when the booking had a tax invoice; amounts = the ledger reversal (each GST part × refund ÷ total).
 * @param {DocumentsDeps} deps
 * @param {string} orderId
 * @param {string} bookingId
 */
async function issueCreditNote(deps, orderId, bookingId) {
  const c = deps.creditFacts ? await deps.creditFacts(orderId, bookingId) : null;
  if (!c || c.refundPaise <= 0) return { skipped: 'NOTHING_REFUNDED' };
  if (await DocumentRecord.exists({ orderId, type: 'CREDIT_NOTE', subjectId: bookingId }).setOptions(DOCS))
    return { skipped: 'ALREADY_ISSUED' };
  if (!c.issuer.gstin) return { skipped: 'ISSUER_GSTIN_MISSING' };
  const invoice = await DocumentRecord.findOne({ orderId, type: 'TAX_INVOICE', version: 1 }, { number: 1, issuedAt: 1 })
    .setOptions(DOCS)
    .lean();
  if (!invoice?.number) return { skipped: 'NO_TAX_INVOICE' };
  const part = (/** @type {number} */ x) => Math.round((x * c.refundPaise) / c.totals.totalPaise);
  const taxes = { cgstPaise: part(c.totals.cgstPaise), sgstPaise: part(c.totals.sgstPaise), igstPaise: part(c.totals.igstPaise) };
  const fy = financialYear(new Date(c.cancelledAt));
  const series = creditSeriesKey(c.issuer.stateCode, fy);
  const number = creditNoteNumber(fy, c.issuer.stateCode, await reserveNumber(series, `booking:${bookingId}`, deps.clock.now()));
  const html = creditNoteHtml(
    {
      orderRef: c.orderRef,
      bookingRef: c.bookingRef,
      propertyName: c.propertyName,
      contact: c.contact,
      invoiceNumber: invoice.number,
      invoiceDate: invoice.issuedAt,
      gstin: c.issuer.gstin,
      issuerState: c.issuer.stateCode,
      placeOfSupply: c.placeOfSupply,
      sac: c.sac,
      rateBps: c.rateBps,
      taxablePaise: c.refundPaise - taxes.cgstPaise - taxes.sgstPaise - taxes.igstPaise,
      ...taxes,
      refundPaise: c.refundPaise,
      reason: 'Cancellation refund',
    },
    { number, issuedAt: deps.clock.now() },
  );
  return {
    created: await store(deps, c, {
      orderId,
      type: 'CREDIT_NOTE',
      version: 1,
      html,
      number,
      series,
      againstNumber: invoice.number,
      subjectId: bookingId,
    }),
  };
}

/** Latest version of each document of an order (no HTML). @param {string} orderId */
async function list(orderId) {
  const docs = await DocumentRecord.find({ orderId }, { html: 0, pendingEvents: 0 }).setOptions(DOCS).sort({ version: -1 }).lean();
  /** @type {Map<string, any>} */
  const latest = new Map();
  for (const d of docs) if (!latest.has(d.type)) latest.set(d.type, d);
  return [...latest.values()].map((d) => ({
    id: String(d._id),
    type: d.type,
    version: d.version,
    number: d.number,
    issuedAt: d.issuedAt,
    sha256: d.sha256,
  }));
}

/**
 * One document of an order (the HTML). Another order's id → not found.
 * @param {string} orderId
 * @param {string} id
 */
async function read(orderId, id) {
  const d = /^[a-f0-9]{24}$/.test(id) ? await DocumentRecord.findOne({ _id: id, orderId }).setOptions(DOCS).lean() : null;
  if (!d) throw new NotFoundError('DOCUMENT_NOT_FOUND');
  return { type: d.type, number: d.number, version: d.version, html: d.html };
}

/**
 * A new version of a document (corrected template, changed contact). An invoice keeps its number.
 * @param {DocumentsDeps} deps
 * @param {string} orderId
 * @param {'VOUCHER' | 'TAX_INVOICE' | 'RECEIPT'} type
 */
async function regenerate(deps, orderId, type) {
  const f = await deps.facts(orderId);
  if (!f) throw new NotFoundError('ORDER_NOT_FOUND');
  const last = await DocumentRecord.findOne({ orderId, type }, { version: 1, number: 1, series: 1 })
    .setOptions(DOCS)
    .sort({ version: -1 })
    .lean();
  const version = (last?.version ?? 0) + 1;
  if (type === 'TAX_INVOICE') return issueInvoice(deps, orderId, f, version);
  const html = type === 'VOUCHER' ? voucherHtml(f.facts) : receiptHtml(f.facts);
  return { created: await store(deps, f, { orderId, type, version, html }) };
}

/** @param {DocumentsDeps} deps */
export function createDocuments(deps) {
  return {
    /** @param {string} orderId */
    ensureForOrder: (orderId) => ensureForOrder(deps, orderId),
    list,
    read,
    /** @param {string} orderId @param {string} bookingId */
    issueCreditNote: (orderId, bookingId) => issueCreditNote(deps, orderId, bookingId),
    /** @param {string} orderId @param {'VOUCHER' | 'TAX_INVOICE' | 'RECEIPT'} type */
    regenerate: (orderId, type) => regenerate(deps, orderId, type),
  };
}

/**
 * Checks (every 10 min): every invoice number reserved more than 10 minutes ago has its invoice (no gaps).
 * @param {{ clock: import('../../core/clock.js').Clock }} deps
 */
export function documentInvariants(deps) {
  return [
    {
      name: 'documents-invoice-and-credit-note-numbers-gap-free',
      check: async () => {
        const before = new Date(deps.clock.now().getTime() - 10 * 60_000);
        const out = [];
        for (const s of await NumberSeriesRecord.find({}).lean()) {
          const [kind, state, fy] = s._id.split(':');
          const old = (s.recent ?? []).filter((r) => r.at && r.at < before);
          if (old.length === 0) continue;
          const numbers = old.map((r) =>
            kind === 'CREDIT_NOTE'
              ? creditNoteNumber(fy ?? '', state ?? '', /** @type {number} */ (r.n))
              : invoiceNumber(fy ?? '', /** @type {number} */ (r.n)),
          );
          const issued = new Set(
            (
              await DocumentRecord.find({ series: s._id, number: { $in: numbers } }, { number: 1 })
                .setOptions(DOCS)
                .lean()
            ).map((d) => d.number),
          );
          for (const n of numbers) if (!issued.has(n)) out.push({ id: n, detail: `${s._id}: number ${n} reserved but no document` });
        }
        return out;
      },
    },
  ];
}
