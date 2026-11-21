// @ts-check
/**
 * Credit lines (plan Stage 11 §3.6, D9 — maker–checker):
 *   `propose` (limit, due days)  → PROPOSED (one open proposal per client)
 *   `decide` by a different person → APPROVED: the older approved line SUPERSEDED, the wallet gets the new limit and due
 *   days (`applied`) — or REJECTED.
 * Credit used = the wallet below zero; it is due `dueDays` after the wallet went below zero; overdue → new bookings
 * blocked (live.service `assertNotOverdue`) until a top-up brings the wallet back to zero or above.
 * An approval cut short before the wallet was updated is finished by `applyDue`.
 */
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { availableOf, creditState } from './domain/live.js';
import { walletOf } from './live.service.js';
import { AccountRecord } from './models/account.model.js';
import { CreditLineRecord } from './models/credit-line.model.js';

const SCOPE = systemScope('wallet: credit lines', { routine: true });
export const CREDIT_LIMIT_MAX_PAISE = 1_000_000_000; // ₹1 crore

/** @typedef {{ clock: import('../../core/clock.js').Clock, ledger: ReturnType<typeof import('./ledger.service.js').createLedger> }} CreditDeps */

/** @param {Record<string, any>} l */
export const creditLineDto = (l) => ({
  id: String(l._id),
  clientOrgId: l.clientOrgId,
  limitPaise: l.limitPaise,
  dueDays: l.dueDays,
  note: l.note,
  status: l.status,
  proposedBy: l.proposedBy,
  decidedBy: l.decidedBy,
  decidedAt: l.decidedAt,
  decisionNote: l.decisionNote,
  createdAt: l.createdAt,
});

/** @param {CreditDeps} deps @param {string} by @param {{ clientOrgId: string, limitPaise: number, dueDays: number, note?: string | null }} a */
async function propose(deps, by, a) {
  if (!Number.isSafeInteger(a.limitPaise) || a.limitPaise < 0 || a.limitPaise > CREDIT_LIMIT_MAX_PAISE)
    throw new DomainError('AMOUNT_INVALID');
  await deps.ledger.openAccount(a.clientOrgId, 'WALLET', 'system:credit-line');
  if (await CreditLineRecord.exists({ clientOrgId: a.clientOrgId, status: 'PROPOSED' }).setOptions(SCOPE))
    throw new ConflictError('CREDIT_LINE_ALREADY_PROPOSED');
  const l = await CreditLineRecord.create({ ...a, note: a.note?.trim() || null, status: 'PROPOSED', proposedBy: by });
  return creditLineDto(l.toObject());
}

/** The approved line onto the wallet (repeat-safe). @param {Record<string, any>} l */
async function applyLine(l) {
  await AccountRecord.updateOne(
    { ownerOrgId: l.clientOrgId, type: 'WALLET' },
    { $set: { creditLimitPaise: l.limitPaise, creditDueDays: l.dueDays, creditLineId: String(l._id) }, $inc: { version: 1 } },
  ).setOptions(SCOPE);
  await CreditLineRecord.updateOne({ _id: l._id }, { $set: { applied: true } }).setOptions(SCOPE);
}

/** @param {CreditDeps} deps @param {string} by @param {string} id @param {{ approve: boolean, note?: string | null }} d */
async function decide(deps, by, id, d) {
  const l = /^[a-f0-9]{24}$/.test(id) ? await CreditLineRecord.findById(id).setOptions(SCOPE).lean() : null;
  if (!l) throw new NotFoundError('CREDIT_LINE_NOT_FOUND');
  if (l.proposedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
  const set = { status: d.approve ? 'APPROVED' : 'REJECTED', decidedBy: by, decidedAt: deps.clock.now(), decisionNote: d.note ?? null };
  const res = await CreditLineRecord.updateOne({ _id: l._id, status: 'PROPOSED' }, { $set: set }).setOptions(SCOPE);
  if (res.modifiedCount !== 1) throw new ConflictError('CREDIT_LINE_ALREADY_DECIDED', { lineStatus: l.status });
  if (d.approve) {
    await CreditLineRecord.updateMany(
      { clientOrgId: l.clientOrgId, status: 'APPROVED', _id: { $ne: l._id } },
      { $set: { status: 'SUPERSEDED' } },
    ).setOptions(SCOPE);
    await applyLine({ ...l, ...set });
  }
  return creditLineDto({ ...l, ...set });
}

/** What the client sees (`GET /credit`). @param {CreditDeps} deps @param {string} clientOrgId */
async function summary(deps, clientOrgId) {
  const w = await walletOf(clientOrgId);
  const c = creditState(/** @type {any} */ (w), deps.clock.now());
  return {
    limitPaise: w.creditLimitPaise ?? 0,
    dueDays: w.creditDueDays ?? 0,
    usedPaise: c.usedPaise,
    availablePaise: availableOf(/** @type {any} */ (w)),
    usedSince: c.usedPaise > 0 ? (w.negativeSince ?? null) : null,
    dueAt: c.dueAt,
    overdue: c.overdue,
  };
}

/** @param {CreditDeps} deps */
export function createCreditLines(deps) {
  return {
    /** @param {string} by @param {{ clientOrgId: string, limitPaise: number, dueDays: number, note?: string | null }} a */
    propose: (by, a) => propose(deps, by, a),
    /** @param {string} by @param {string} id @param {{ approve: boolean, note?: string | null }} d */
    decide: (by, id, d) => decide(deps, by, id, d),
    /** @param {string} clientOrgId */
    summary: (clientOrgId) => summary(deps, clientOrgId),
    /** @param {{ clientOrgId?: string, status?: string }} q */
    list: async (q) =>
      (
        await CreditLineRecord.find({ ...(q.clientOrgId ? { clientOrgId: q.clientOrgId } : {}), ...(q.status ? { status: q.status } : {}) })
          .setOptions(SCOPE)
          .sort({ createdAt: -1 })
          .limit(200)
          .lean()
      ).map(creditLineDto),
    /** Clients whose credit is overdue (for finance and the alerts). */
    async overdue() {
      const now = deps.clock.now();
      const rows = await AccountRecord.find({ type: 'WALLET', balancePaise: { $lt: 0 }, negativeSince: { $ne: null } })
        .setOptions(SCOPE)
        .limit(1000)
        .lean();
      return rows.map((a) => ({ clientOrgId: a.ownerOrgId, ...creditState(/** @type {any} */ (a), now) })).filter((r) => r.overdue);
    },
    /** Approved but not yet on the wallet (cut short) → applied. */
    async applyDue() {
      const due = await CreditLineRecord.find({ status: 'APPROVED', applied: false }).setOptions(SCOPE).limit(100).lean();
      for (const l of due) await applyLine(l);
      return { creditLinesApplied: due.length };
    },
  };
}
