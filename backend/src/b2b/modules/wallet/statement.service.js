// @ts-check
/**
 * A client's wallet statement (plan Stage 11 §3.8): for Indian dates `from`–`to`, the opening balance, every journal
 * line on the wallet in order with the balance after it, and the closing balance — straight from the journal, so it
 * always agrees with the books. Also as CSV. (Credit used shows as a balance below zero.)
 */
import { DomainError } from '../../core/errors.js';
import { walletOf } from './live.service.js';
import { TransactionRecord } from './models/transaction.model.js';

const IST_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
export const STATEMENT_MAX_DAYS = 366;
const MAX_LINES = 5000;

/** What each journal purpose means to the client. @type {Readonly<Record<string, string>>} */
export const PURPOSE_LABELS = Object.freeze({
  'wallet-topup': 'Money added (PayU)',
  'wallet-topup-bank': 'Money added (bank transfer)',
  'order-paid-wallet': 'Booking paid',
  'wallet-debit': 'Payment',
  'wallet-refund': 'Refund',
  'wallet-adjustment': 'Adjustment by MusafirBaba',
});

/** Midnight in India for a `YYYY-MM-DD` date, as a UTC instant. @param {string} day */
const istStart = (day) => new Date(Date.parse(`${day}T00:00:00Z`) - IST_MS);

/** @param {string} accountId @param {Record<string, any>} match */
async function sumOf(accountId, match) {
  const [s] = await TransactionRecord.aggregate([
    { $match: { 'lines.accountId': accountId, ...match } },
    { $unwind: '$lines' },
    { $match: { 'lines.accountId': accountId } },
    { $group: { _id: null, d: { $sum: '$lines.debitPaise' }, c: { $sum: '$lines.creditPaise' } } },
  ]);
  return (s?.c ?? 0) - (s?.d ?? 0);
}

/**
 * @param {string} clientOrgId
 * @param {{ from: string, to: string }} q Indian dates, inclusive
 */
export async function walletStatement(clientOrgId, q) {
  const start = istStart(q.from);
  const end = new Date(istStart(q.to).getTime() + DAY_MS);
  if (!(end > start) || end.getTime() - start.getTime() > STATEMENT_MAX_DAYS * DAY_MS) throw new DomainError('PERIOD_INVALID');
  const w = await walletOf(clientOrgId);
  const accountId = String(w._id);
  const opening = await sumOf(accountId, { at: { $lt: start } });
  const docs = await TransactionRecord.find({ 'lines.accountId': accountId, at: { $gte: start, $lt: end } })
    .sort({ at: 1, _id: 1 })
    .limit(MAX_LINES)
    .lean();
  let balance = opening;
  const lines = docs.map((t) => {
    const mine = t.lines.filter((l) => l.accountId === accountId);
    const amountPaise = mine.reduce((s, l) => s + (l.creditPaise ?? 0) - (l.debitPaise ?? 0), 0);
    balance += amountPaise;
    return {
      at: t.at,
      description: PURPOSE_LABELS[t.purpose] ?? 'Other',
      reference: `${t.reference.type}/${t.reference.id}`,
      memo: t.memo ?? null,
      amountPaise,
      balancePaise: balance,
    };
  });
  return { from: q.from, to: q.to, openingPaise: opening, closingPaise: balance, lines, truncated: docs.length === MAX_LINES };
}

/** @param {Awaited<ReturnType<typeof walletStatement>>} s */
export function walletStatementCsv(s) {
  const rupees = (/** @type {number} */ p) => (p / 100).toFixed(2);
  const day = (/** @type {Date} */ d) => new Date(new Date(d).getTime() + IST_MS).toISOString().replace('T', ' ').slice(0, 16);
  const rows = [['date_ist', 'description', 'reference', 'note', 'amount_inr', 'balance_inr']];
  rows.push([s.from, 'Opening balance', '', '', '', rupees(s.openingPaise)]);
  const text = (/** @type {string} */ c) => (/^[=+\-@\t\r]/.test(c) ? `'${c}` : c); // never a spreadsheet formula
  for (const l of s.lines)
    rows.push([day(l.at), l.description, text(l.reference), text(l.memo ?? ''), rupees(l.amountPaise), rupees(l.balancePaise)]);
  rows.push([s.to, 'Closing balance', '', '', '', rupees(s.closingPaise)]);
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}
