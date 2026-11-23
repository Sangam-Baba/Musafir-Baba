// @ts-check
/**
 * Bank-transfer top-ups (plan Stage 11 §3.5, §7 "manual credit fraud" — maker–checker):
 *   client `submit` (amount, method, UTR, bank date) → SUBMITTED
 *   finance `check` (matched against the bank statement)  → CHECKED   (or REJECTED)
 *   another finance person `decide`                       → APPROVED → wallet credited once: bank → wallet (or REJECTED)
 * The credit is repeat-safe (op `manual-topup:<id>`); an approval whose credit was cut short is finished by `creditDue`.
 */
import { randomInt } from 'node:crypto';

import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { ManualTopUpRecord } from './models/manual-topup.model.js';

const SCOPE = systemScope('wallet: bank-transfer top-ups', { routine: true });
const LETTERS = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const newRef = () => `MT-${Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]).join('')}`;
const IST_MS = 330 * 60_000; // bank dates are Indian dates
export const MANUAL_TOPUP_MIN_PAISE = 10_000; // ₹100
export const MANUAL_TOPUP_MAX_PAISE = 1_000_000_000; // ₹1 crore

/**
 * @typedef {{ clock: import('../../core/clock.js').Clock, ledger: ReturnType<typeof import('./ledger.service.js').createLedger>,
 *   wallets: ReturnType<typeof import('./live.service.js').createLiveWallets> }} ManualTopUpDeps
 */

/** @param {Record<string, any>} t */
export const manualTopUpDto = (t) => ({
  id: String(t._id),
  ref: t.ref,
  clientOrgId: t.clientOrgId,
  amountPaise: t.amountPaise,
  method: t.method,
  utr: t.utr,
  paidOn: t.paidOn,
  note: t.note,
  status: t.status,
  submittedBy: t.submittedBy,
  checkedBy: t.checkedBy,
  decidedBy: t.decidedBy,
  decisionNote: t.decisionNote,
  credited: t.credited,
  createdAt: t.createdAt,
});

/** @param {string} id */
async function load(id) {
  const t = /^[a-f0-9]{24}$/.test(id) ? await ManualTopUpRecord.findById(id).setOptions(SCOPE).lean() : null;
  if (!t) throw new NotFoundError('MANUAL_TOPUP_NOT_FOUND');
  return /** @type {Record<string, any>} */ (t);
}

/**
 * @param {ManualTopUpDeps} deps
 * @param {{ clientOrgId: string, by: string, amountPaise: number, method: string, utr: string, paidOn: string, note?: string | null }} a
 */
async function submit(deps, a) {
  if (!Number.isSafeInteger(a.amountPaise) || a.amountPaise < MANUAL_TOPUP_MIN_PAISE || a.amountPaise > MANUAL_TOPUP_MAX_PAISE)
    throw new DomainError('AMOUNT_INVALID');
  if (a.paidOn > new Date(deps.clock.now().getTime() + IST_MS).toISOString().slice(0, 10)) throw new DomainError('PAID_ON_IN_FUTURE');
  const utr = a.utr.trim();
  try {
    const t = await ManualTopUpRecord.create({
      ref: newRef(),
      clientOrgId: a.clientOrgId,
      amountPaise: a.amountPaise,
      method: a.method,
      utr,
      utrKey: utr.toUpperCase(),
      paidOn: a.paidOn,
      note: a.note?.trim() || null,
      status: 'SUBMITTED',
      submittedBy: a.by,
    });
    return manualTopUpDto(t.toObject());
  } catch (error) {
    if (/** @type {any} */ (error)?.code === 11000) throw new ConflictError('UTR_ALREADY_SUBMITTED');
    throw error;
  }
}

/** The approved request's credit: bank → wallet, once. @param {ManualTopUpDeps} deps @param {Record<string, any>} t */
async function credit(deps, t) {
  await deps.ledger.openAccount(t.clientOrgId, 'WALLET', 'system:topup');
  await deps.wallets.apply({
    clientOrgId: t.clientOrgId,
    opId: `manual-topup:${String(t._id)}`,
    type: 'TOPUP',
    amountPaise: t.amountPaise,
    journal: {
      reference: { type: 'manual-topup', id: String(t._id) },
      purpose: 'wallet-topup-bank',
      lines: [{ accountId: await deps.ledger.accountId('platform', 'BANK'), debitPaise: t.amountPaise }],
      memo: `${t.ref} ${t.method} UTR ${t.utr} (${t.paidOn})`,
    },
    by: t.decidedBy ?? 'system:manual-topups',
  });
  await ManualTopUpRecord.updateOne({ _id: t._id }, { $set: { credited: true } }).setOptions(SCOPE);
}

/**
 * First finance person: matched against the bank (`ok`) → CHECKED, or not → REJECTED.
 * @param {ManualTopUpDeps} deps @param {string} by @param {string} id @param {{ ok: boolean, note?: string | null }} d
 */
async function check(deps, by, id, d) {
  const t = await load(id);
  const now = deps.clock.now();
  const set = d.ok
    ? { status: 'CHECKED', checkedBy: by, checkedAt: now }
    : { status: 'REJECTED', checkedBy: by, checkedAt: now, decidedBy: by, decidedAt: now, decisionNote: d.note ?? null, utrKey: null };
  const res = await ManualTopUpRecord.updateOne({ _id: t._id, status: 'SUBMITTED' }, { $set: set }).setOptions(SCOPE);
  if (res.modifiedCount !== 1) throw new ConflictError('MANUAL_TOPUP_NOT_WAITING', { topUpStatus: t.status });
  return manualTopUpDto({ ...t, ...set });
}

/**
 * A different finance person approves (→ credited) or rejects.
 * @param {ManualTopUpDeps} deps @param {string} by @param {string} id @param {{ approve: boolean, note?: string | null }} d
 */
async function decide(deps, by, id, d) {
  const t = await load(id);
  if (t.checkedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
  const now = deps.clock.now();
  const set = {
    status: d.approve ? 'APPROVED' : 'REJECTED',
    decidedBy: by,
    decidedAt: now,
    decisionNote: d.note ?? null,
    ...(d.approve ? {} : { utrKey: null }),
  };
  const res = await ManualTopUpRecord.updateOne({ _id: t._id, status: 'CHECKED', checkedBy: { $ne: by } }, { $set: set }).setOptions(SCOPE);
  if (res.modifiedCount !== 1) throw new ConflictError('MANUAL_TOPUP_NOT_CHECKED', { topUpStatus: t.status });
  if (d.approve) await credit(deps, { ...t, ...set });
  return manualTopUpDto(await load(id));
}

/** @param {ManualTopUpDeps} deps */
export function createManualTopUps(deps) {
  return {
    /** @param {Parameters<typeof submit>[1]} a */
    submit: (a) => submit(deps, a),
    /** @param {string} by @param {string} id @param {{ ok: boolean, note?: string | null }} d */
    check: (by, id, d) => check(deps, by, id, d),
    /** @param {string} by @param {string} id @param {{ approve: boolean, note?: string | null }} d */
    decide: (by, id, d) => decide(deps, by, id, d),
    /** @param {{ clientOrgId?: string, status?: string }} q */
    list: async (q) =>
      (
        await ManualTopUpRecord.find({
          ...(q.clientOrgId ? { clientOrgId: q.clientOrgId } : {}),
          ...(q.status ? { status: q.status } : {}),
        })
          .setOptions(SCOPE)
          .sort({ createdAt: -1 })
          .limit(200)
          .lean()
      ).map(manualTopUpDto),
    /** Approved but not credited (cut short) → credited. */
    async creditDue() {
      const due = await ManualTopUpRecord.find({ status: 'APPROVED', credited: false }).setOptions(SCOPE).limit(100).lean();
      for (const t of due) await credit(deps, t);
      return { credited: due.length };
    },
  };
}
