// @ts-check
/**
 * Billing (plan Stage 13 §3.5, §3.7–3.8):
 * - `billCharges`: the subscription's charges not yet invoiced (plan fees, prorated upgrades) → one SaaS invoice per
 *   period → collected from the wallet;
 * - `closeMonth`: 24 h after a month ends, its overage (from the month's snapshot and usage) → invoice → collected;
 * - `collect`: wallet debit (op `saas:<invoice>`, once): Dr wallet / Cr SaaS revenue + GST payable; not enough money
 *   (or credit overdue) → UNPAID and the subscription past due; `paidByPayu` settles it from a PayU payment
 *   (Dr customer advances / Cr revenue + GST); everything paid → the subscription active again.
 * Invoices are unique per client and key, numbers reserved per key — a repeated run never bills or numbers twice.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { DomainError, NotFoundError } from '../../core/errors.js';
import { financialYear, reserveNumber, STATE_LETTERS } from '../documents/index.js';
import { UsageMonthlyRecord } from '../metering/index.js';
import { monthStart, nextMonth, queryWeights, SAAS_SAC, weightedUsed } from '../subscriptions/index.js';
import { saasInvoiceHtml } from './domain/invoice-html.js';
import { chargeLines, intraState, invoiceTotals, overageLines } from './domain/rating.js';
import { InvoiceRecord } from './models/invoice.model.js';

export const BILL = systemScope('billing: SaaS invoices', { routine: true });
export const MONTH_CLOSE_AFTER_MS = 24 * 60 * 60_000;
const NOT_COLLECTABLE = ['INSUFFICIENT_WALLET_BALANCE', 'CREDIT_OVERDUE', 'WALLET_NOT_ACTIVE'];

/**
 * @typedef {{
 *   clock: import('../../core/clock.js').Clock,
 *   ledger: ReturnType<typeof import('../wallet/index.js').createLedger>,
 *   wallets: ReturnType<typeof import('../wallet/index.js').createLiveWallets>,
 *   subscriptions: ReturnType<typeof import('../subscriptions/index.js').createSubscriptions>,
 *   issuer: () => Promise<{ stateCode: string, gstin: string | null }>,
 *   client: (orgId: string) => Promise<{ name: string, gstin: string | null }>,
 * }} BillingDeps
 */

/** `S2627DL000001`. @param {string} fy @param {string} stateCode @param {number} n */
export function saasInvoiceNumber(fy, stateCode, n) {
  if (!Number.isSafeInteger(n) || n < 1) throw new DomainError('INVOICE_NUMBER_INVALID', { n });
  return `S${fy.replace('-', '')}${STATE_LETTERS[stateCode] ?? stateCode}${String(n).padStart(6, '0')}`;
}

/** @param {Record<string, any>} i */
export const invoiceDto = (i) => ({
  id: String(i._id),
  number: i.number,
  period: i.period,
  status: i.status,
  lines: i.lines,
  totals: i.totals,
  issuedAt: i.issuedAt,
  paidAt: i.paidAt ?? null,
  payment: i.payment ?? null,
});

/**
 * An invoice for `key` (the existing one if it was issued before).
 * @param {BillingDeps} deps
 * @param {{ clientOrgId: string, key: string, period: string, lines: import('./domain/rating.js').InvoiceLine[] }} a
 */
async function issue(deps, a) {
  const have = await InvoiceRecord.findOne({ clientOrgId: a.clientOrgId, key: a.key }).setOptions(BILL).lean();
  if (have) return /** @type {Record<string, any>} */ (have);
  const now = deps.clock.now();
  const [issuer, client] = await Promise.all([deps.issuer(), deps.client(a.clientOrgId)]);
  const supply = {
    intraState: intraState(issuer.stateCode, client.gstin),
    issuerGstin: issuer.gstin,
    issuerState: issuer.stateCode,
    clientGstin: client.gstin,
  };
  const totals = invoiceTotals(a.lines, supply);
  const fy = financialYear(now);
  const series = `SAAS:${issuer.stateCode}:${fy}`;
  const number = saasInvoiceNumber(fy, issuer.stateCode, await reserveNumber(series, `saas:${a.clientOrgId}:${a.key}`, now));
  const html = saasInvoiceHtml({
    number,
    issuedAt: now,
    clientName: client.name,
    period: a.period,
    sac: SAAS_SAC,
    supply,
    lines: a.lines,
    totals,
  });
  try {
    await InvoiceRecord.create({ ...a, number, series, totals, supply, status: 'ISSUED', issuedAt: now, html });
  } catch (e) {
    if (/** @type {any} */ (e)?.code !== 11000) throw e; // issued a moment earlier by another run
  }
  return /** @type {Record<string, any>} */ (
    await InvoiceRecord.findOne({ clientOrgId: a.clientOrgId, key: a.key }).setOptions(BILL).lean()
  );
}

/** The revenue and GST side of a paid invoice. @param {BillingDeps} deps @param {Record<string, any>} inv */
async function revenueLines(deps, inv) {
  const t = inv.totals;
  const lines = [{ accountId: await deps.ledger.accountId('platform', 'REVENUE_SAAS'), creditPaise: t.taxablePaise }];
  if (t.cgstPaise > 0) lines.push({ accountId: await deps.ledger.accountId('platform', 'TAX_PAYABLE_CGST'), creditPaise: t.cgstPaise });
  if (t.sgstPaise > 0) lines.push({ accountId: await deps.ledger.accountId('platform', 'TAX_PAYABLE_SGST'), creditPaise: t.sgstPaise });
  if (t.igstPaise > 0) lines.push({ accountId: await deps.ledger.accountId('platform', 'TAX_PAYABLE_IGST'), creditPaise: t.igstPaise });
  return lines;
}

/** No more unpaid invoices → the subscription is active again. @param {BillingDeps} deps @param {string} clientOrgId */
async function paidUpIfClear(deps, clientOrgId) {
  if (!(await InvoiceRecord.exists({ clientOrgId, status: 'UNPAID' }).setOptions(BILL))) await deps.subscriptions.markPaidUp(clientOrgId);
}

/**
 * Collect an invoice from the client's wallet (repeat-safe). Returns the invoice's status after.
 * @param {BillingDeps} deps
 * @param {Record<string, any>} inv
 */
async function collect(deps, inv) {
  if (inv.status === 'PAID' || inv.status === 'VOID') return inv.status;
  const now = deps.clock.now();
  await InvoiceRecord.updateOne({ _id: inv._id }, { $inc: { attempts: 1 }, $set: { lastAttemptAt: now } }).setOptions(BILL);
  if (inv.totals.totalPaise === 0) return markPaid(deps, inv, { method: 'NONE', ref: 'zero' });
  try {
    await deps.wallets.open(inv.clientOrgId);
    await deps.wallets.apply({
      clientOrgId: inv.clientOrgId,
      opId: `saas:${String(inv._id)}`,
      type: 'DEBIT',
      amountPaise: -inv.totals.totalPaise,
      journal: {
        reference: { type: 'saas-invoice', id: String(inv._id) },
        purpose: 'saas-invoice-paid',
        lines: await revenueLines(deps, inv),
        memo: inv.number,
      },
      by: 'system:billing',
    });
  } catch (e) {
    const code = /** @type {any} */ (e)?.code;
    if (!NOT_COLLECTABLE.includes(code)) throw e;
    await InvoiceRecord.updateOne({ _id: inv._id, status: 'ISSUED' }, { $set: { status: 'UNPAID' } }).setOptions(BILL);
    await deps.subscriptions.markPastDue(inv.clientOrgId, `${inv.number}: ${code}`);
    return 'UNPAID';
  }
  return markPaid(deps, inv, { method: 'WALLET', ref: `saas:${String(inv._id)}` });
}

/** @param {BillingDeps} deps @param {Record<string, any>} inv @param {{ method: string, ref: string }} payment */
async function markPaid(deps, inv, payment) {
  await InvoiceRecord.updateOne(
    { _id: inv._id, status: { $in: ['ISSUED', 'UNPAID'] } },
    { $set: { status: 'PAID', paidAt: deps.clock.now(), payment } },
  ).setOptions(BILL);
  await paidUpIfClear(deps, inv.clientOrgId);
  return 'PAID';
}

/** The subscription's charges not invoiced yet → invoices (one per period) → collected. @param {BillingDeps} deps @param {Record<string, any>} sub */
async function billCharges(deps, sub) {
  const refs = (sub.charges ?? []).map((/** @type {any} */ c) => `charge:${c.id}`);
  if (refs.length === 0) return 0;
  const billed = new Set(
    (
      await InvoiceRecord.find({ clientOrgId: sub.clientOrgId, 'lines.ref': { $in: refs } }, { lines: 1 })
        .setOptions(BILL)
        .lean()
    ).flatMap((i) => i.lines.map((l) => l.ref)),
  );
  /** @type {Map<string, any[]>} */
  const byPeriod = new Map();
  for (const c of sub.charges) if (!billed.has(`charge:${c.id}`)) byPeriod.set(c.period, [...(byPeriod.get(c.period) ?? []), c]);
  let issued = 0;
  for (const [period, charges] of byPeriod) {
    const lines = chargeLines(charges);
    if (lines.length === 0) continue;
    const inv = await issue(deps, { clientOrgId: sub.clientOrgId, key: `charges:${charges[0].id}`, period, lines });
    await collect(deps, inv);
    issued += 1;
  }
  return issued;
}

/** A finished month's overage (24 h after it ends) → invoice → collected. @param {BillingDeps} deps @param {Record<string, any>} sub */
async function closeMonths(deps, sub) {
  const now = deps.clock.now().getTime();
  let issued = 0;
  for (const p of sub.closedPeriods ?? []) {
    if (now < monthStart(nextMonth(p.period)).getTime() + MONTH_CLOSE_AFTER_MS) continue;
    if (await InvoiceRecord.exists({ clientOrgId: sub.clientOrgId, key: `overage:${p.period}` }).setOptions(BILL)) continue;
    const rows = /** @type {any[]} */ (await UsageMonthlyRecord.find({ orgId: sub.clientOrgId, month: p.period }).setOptions(BILL).lean());
    const lines = overageLines({
      used: weightedUsed(rows, await queryWeights()),
      allowance: p.allowance,
      behaviour: p.limitBehaviour,
      overagePricePerQueryPaise: p.overagePricePerQueryPaise,
      planName: p.planName,
      month: p.period,
    });
    if (lines.length === 0) continue;
    await collect(deps, await issue(deps, { clientOrgId: sub.clientOrgId, key: `overage:${p.period}`, period: p.period, lines }));
    issued += 1;
  }
  return issued;
}

/** @param {BillingDeps} deps */
export function createBilling(deps) {
  return {
    /** @param {Record<string, any>} sub */
    billCharges: (sub) => billCharges(deps, sub),
    /** @param {Record<string, any>} sub */
    closeMonths: (sub) => closeMonths(deps, sub),
    /** @param {Record<string, any>} inv */
    collect: (inv) => collect(deps, inv),
    /** A PayU payment for an invoice (verified by payments): customer advances → revenue + GST, once. @param {string} invoiceId @param {string} txnId */
    async paidByPayu(invoiceId, txnId) {
      const inv = /^[a-f0-9]{24}$/.test(invoiceId) ? await InvoiceRecord.findById(invoiceId).setOptions(BILL).lean() : null;
      if (!inv) throw new NotFoundError('INVOICE_NOT_FOUND');
      if (inv.status === 'PAID') return 'PAID';
      const advances = await deps.ledger.accountId('platform', 'CUSTOMER_ADVANCES');
      await deps.ledger.post(
        {
          reference: { type: 'saas-invoice', id: String(inv._id) },
          purpose: 'saas-invoice-paid',
          lines: [{ accountId: advances, debitPaise: Number(inv.totals.totalPaise) }, ...(await revenueLines(deps, inv))],
          memo: `${inv.number} PayU ${txnId}`,
        },
        'system:billing',
      );
      return markPaid(deps, inv, { method: 'PAYU', ref: txnId });
    },
    /** @param {string} clientOrgId */
    list: async (clientOrgId) =>
      (await InvoiceRecord.find({ clientOrgId }).setOptions(BILL).sort({ issuedAt: -1 }).limit(100).lean()).map(invoiceDto),
    /** @param {string} clientOrgId @param {string} id */
    async read(clientOrgId, id) {
      const inv = /^[a-f0-9]{24}$/.test(id) ? await InvoiceRecord.findOne({ _id: id, clientOrgId }).setOptions(BILL).lean() : null;
      if (!inv) throw new NotFoundError('INVOICE_NOT_FOUND');
      return /** @type {Record<string, any>} */ (inv);
    },
    /** Unpaid invoices tried again from the wallet (after a top-up — one client, or all). @param {string} [clientOrgId] */
    async retryUnpaid(clientOrgId) {
      const due = await InvoiceRecord.find({ status: 'UNPAID', ...(clientOrgId ? { clientOrgId } : {}) })
        .setOptions(BILL)
        .sort({ lastAttemptAt: 1 })
        .limit(200)
        .lean();
      let paid = 0;
      for (const inv of due) if ((await collect(deps, inv)) === 'PAID') paid += 1;
      return { unpaidTried: due.length, unpaidPaid: paid };
    },
  };
}
