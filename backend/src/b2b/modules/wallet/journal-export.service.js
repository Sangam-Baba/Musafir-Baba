// @ts-check
/**
 * Accounting export (plan Stage 15 §3.8): every journal line between two Indian days (at most 31) as CSV for the
 * accountant's software (Tally / Zoho import) — one row per line: date, entry, reference, purpose, account
 * (owner type, type, name, owner org), debit, credit, memo. Read-only; each entry's debits equal its credits.
 */
import { DomainError } from '../../core/errors.js';
import { AccountRecord } from './models/account.model.js';
import { TransactionRecord } from './models/transaction.model.js';
import { systemScope } from '../../core/db/tenant-plugin.js';

const SCOPE = systemScope('wallet: accounting export', { routine: true });
const IST_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const MAX_ENTRIES = 100_000;

/** @param {unknown} v */
function cell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One CSV row per journal line. @param {any[]} entries @param {Map<string, any>} accounts */
function linesOf(entries, accounts) {
  const rupees = (/** @type {number} */ p) => (p ? (p / 100).toFixed(2) : '');
  const rows = [
    [
      'date_ist',
      'entry_id',
      'reference_type',
      'reference_id',
      'purpose',
      'account_owner',
      'account_type',
      'account_name',
      'owner_org',
      'debit_inr',
      'credit_inr',
      'memo',
    ],
  ];
  let debit = 0;
  let credit = 0;
  for (const e of entries)
    for (const l of e.lines) {
      const acc = /** @type {any} */ (accounts.get(l.accountId) ?? {});
      debit += l.debitPaise;
      credit += l.creditPaise;
      rows.push([
        new Date(new Date(e.at).getTime() + IST_MS).toISOString().slice(0, 10),
        String(e._id),
        e.reference.type,
        e.reference.id,
        e.purpose,
        acc.ownerType ?? '',
        acc.type ?? '',
        acc.name ?? l.accountId,
        acc.ownerType === 'PLATFORM' ? '' : (acc.ownerOrgId ?? ''),
        rupees(l.debitPaise),
        rupees(l.creditPaise),
        e.memo ?? '',
      ]);
    }
  return { rows, debit, credit };
}

/** @param {{ from: string, to: string }} a */
export async function journalExport(a) {
  const ok = (/** @type {string} */ d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
  if (!ok(a.from) || !ok(a.to) || a.to < a.from) throw new DomainError('EXPORT_RANGE_INVALID');
  const from = new Date(Date.parse(`${a.from}T00:00:00Z`) - IST_MS);
  const to = new Date(Date.parse(`${a.to}T00:00:00Z`) - IST_MS + DAY_MS);
  if (to.getTime() - from.getTime() > 31 * DAY_MS) throw new DomainError('EXPORT_RANGE_TOO_LONG');
  const entries = await TransactionRecord.find({ at: { $gte: from, $lt: to } })
    .sort({ at: 1, _id: 1 })
    .limit(MAX_ENTRIES)
    .lean();
  const ids = [...new Set(entries.flatMap((e) => e.lines.map((l) => l.accountId)))];
  const accounts = new Map(
    (
      await AccountRecord.find({ _id: { $in: ids } }, { ownerType: 1, ownerOrgId: 1, type: 1, name: 1 })
        .setOptions(SCOPE)
        .lean()
    ).map((x) => [String(x._id), x]),
  );
  const { rows, debit, credit } = linesOf(entries, accounts);
  return {
    filename: `journal-${a.from}-to-${a.to}.csv`,
    entries: entries.length,
    debitPaise: debit,
    creditPaise: credit,
    truncated: entries.length === MAX_ENTRIES,
    csv: rows.map((r) => r.map(cell).join(',')).join('\n'),
  };
}
