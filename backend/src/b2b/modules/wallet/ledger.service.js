// @ts-check
/**
 * The ledger (S07-T02, T03): accounts and `post` — the only way money is recorded.
 * - MusafirBaba's accounts are opened at background start; a hotel company's PAYABLE when it is activated
 *   (both repeat-safe upserts, never changing an existing account).
 * - `post(entry)` checks the entry (balanced, ≥ 2 lines, whole paise), that every account exists and is active, and
 *   inserts it as one document. The unique reference + purpose makes it repeat-safe: posting it again returns the first;
 *   the same reference with different lines is refused (`JOURNAL_REFERENCE_REUSED`).
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError } from '../../core/errors.js';
import { ACCOUNT_TYPES, PLATFORM_ACCOUNT_TYPES, PLATFORM_ORG } from './domain/accounts.js';
import { checkEntry, sameLines } from './domain/journal.js';
import { AccountRecord } from './models/account.model.js';
import { TransactionRecord } from './models/transaction.model.js';

const BOOKS = systemScope('wallet: MusafirBaba books', { routine: true });

/**
 * @typedef {import('./domain/journal.js').EntryInput} EntryInput
 * @typedef {import('./domain/accounts.js').AccountType} AccountType
 */

/**
 * @param {string} ownerOrgId
 * @param {AccountType} type
 * @param {string} by
 */
async function openAccount(ownerOrgId, type, by) {
  const t = ACCOUNT_TYPES[type];
  if (!t) throw new DomainError('ACCOUNT_TYPE_UNKNOWN', { type });
  const doc = { ownerType: t.owner, ownerOrgId, type, name: t.name, normal: t.normal, balanceMode: t.mode, status: 'ACTIVE', openedBy: by };
  await AccountRecord.updateOne({ ownerOrgId, type }, { $setOnInsert: doc }, { upsert: true }).setOptions(BOOKS);
  const a = await AccountRecord.findOne({ ownerOrgId, type }, { _id: 1 }).setOptions(BOOKS).lean();
  return String(a?._id);
}

/** Opens MusafirBaba's accounts that are missing (never changes existing ones). */
export async function seedPlatformAccounts() {
  for (const type of PLATFORM_ACCOUNT_TYPES) await openAccount(PLATFORM_ORG, /** @type {AccountType} */ (type), 'seed');
  return PLATFORM_ACCOUNT_TYPES.length;
}

/** @param {{ clock: import('../../core/clock.js').Clock }} deps */
export function createLedger(deps) {
  /** @type {Map<string, string>} */
  const ids = new Map();
  return {
    openAccount,

    /** A hotel company's payable (repeat-safe). @param {string} hotelOrgId */
    openHotelPayable: (hotelOrgId) => openAccount(hotelOrgId, 'PAYABLE', 'system:hotel-activated'),
    /** Stage 18: a bus company's payable (its net fares). @param {string} operatorOrgId */
    openOperatorPayable: (operatorOrgId) => openAccount(operatorOrgId, 'OPERATOR_PAYABLE', 'system:bus-booking'),

    /** The id of an owner's account of a type (MusafirBaba's: owner `platform`). @param {string} ownerOrgId @param {AccountType} type */
    async accountId(ownerOrgId, type) {
      const key = `${ownerOrgId}:${type}`;
      const hit = ids.get(key);
      if (hit) return hit;
      const a = await AccountRecord.findOne({ ownerOrgId, type, status: 'ACTIVE' }, { _id: 1 }).setOptions(BOOKS).lean();
      if (!a) throw new DomainError('ACCOUNT_NOT_FOUND', { ownerOrgId, type });
      ids.set(key, String(a._id));
      return String(a._id);
    },

    /**
     * Record a balanced entry once.
     * @param {EntryInput} entry
     * @param {string} by e.g. 'system:payments', 'staff:12'
     * @returns {Promise<{ id: string, created: boolean }>}
     */
    async post(entry, by) {
      const lines = checkEntry(entry);
      const accountIds = [...new Set(lines.map((l) => l.accountId))];
      const valid = accountIds.filter((id) => /^[a-f0-9]{24}$/.test(id));
      const active =
        valid.length === accountIds.length
          ? await AccountRecord.countDocuments({ _id: { $in: valid }, status: 'ACTIVE' }).setOptions(BOOKS)
          : 0;
      if (active !== accountIds.length)
        throw new DomainError('JOURNAL_ENTRY_INVALID', { errors: [{ code: 'ACCOUNT_NOT_ACTIVE', field: 'lines' }] });
      const doc = {
        reference: { type: entry.reference.type, id: String(entry.reference.id) },
        purpose: entry.purpose,
        lines,
        memo: entry.memo ?? null,
        createdBy: by,
        at: deps.clock.now(),
      };
      try {
        const created = await TransactionRecord.create(doc);
        return { id: String(created._id), created: true };
      } catch (error) {
        if (/** @type {any} */ (error)?.code !== 11000) throw error;
        const first = await TransactionRecord.findOne({
          'reference.type': doc.reference.type,
          'reference.id': doc.reference.id,
          purpose: doc.purpose,
        }).lean();
        if (!first || !sameLines(first.lines, lines))
          throw new ConflictError('JOURNAL_REFERENCE_REUSED', { reference: doc.reference, purpose: doc.purpose });
        return { id: String(first._id), created: false };
      }
    },
  };
}
