// @ts-check
/**
 * Payout runs, second half (plan Stage 15 §3.2): the bank file, paying, cancelling, listing; and deduction rules.
 * See `payout-runs.service.js` for the steps.
 */
import { ConflictError, DomainError, NotFoundError } from '../../core/errors.js';
import { PayableRecord } from './models/payable.model.js';
import { DeductionRuleRecord, PayoutLineRecord, PayoutRunRecord } from './models/payout-run.model.js';
import {
  approve,
  assertIntact,
  freePayables,
  lineDto,
  linesOf,
  loadRun,
  propose,
  remittanceEvent,
  runDto,
  RUNS_SCOPE,
  setHold,
} from './payout-runs.service.js';

/** @typedef {import('./payout-runs.service.js').RunDeps} RunDeps */

/** @param {unknown} v */
const cell = (v) => {
  const c = String(v ?? '');
  const t = /^[=+\-@\t\r]/.test(c) ? `'${c}` : c;
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/**
 * The NEFT file for the approved run (generic CSV until the bank's format is known). Every account number is read
 * through KYC, which logs who looked.
 * @param {RunDeps} deps @param {string} by @param {string} runId
 */
async function bankFile(deps, by, runId) {
  const run = await loadRun(runId);
  if (run.status !== 'APPROVED' && run.status !== 'FILE_READY')
    throw new ConflictError('PAYOUT_RUN_NOT_APPROVED', { runStatus: run.status });
  await assertIntact(run);
  const rows = [['beneficiary_name', 'account_number', 'ifsc', 'amount_inr', 'reference', 'hotel_org_id'].join(',')];
  for (const l of (await linesOf(run._id)).filter((x) => x.status === 'INCLUDED' && x.netPaise > 0)) {
    const h = await deps.hotel(l.hotelOrgId);
    const account = await deps.account(l.hotelOrgId, by);
    if (!account || !h.ifsc) throw new DomainError('HOTEL_BANK_DETAILS_MISSING', { hotelOrgId: l.hotelOrgId });
    rows.push(
      [h.holderName ?? h.name, account, h.ifsc, (l.netPaise / 100).toFixed(2), `${run.ref}-${String(l._id).slice(-6)}`, l.hotelOrgId]
        .map(cell)
        .join(','),
    );
  }
  await PayoutRunRecord.updateOne(
    { _id: run._id, status: { $in: ['APPROVED', 'FILE_READY'] } },
    {
      $set: { status: 'FILE_READY', fileBy: by, fileAt: deps.clock.now() },
      $push: { history: { at: deps.clock.now(), what: 'bank file made', by } },
    },
  );
  return { ref: run.ref, csv: rows.join('\n') };
}

/** One hotel paid: journal (once), payables PAID, remittance. @param {RunDeps} deps @param {Record<string, any>} run @param {Record<string, any>} l @param {string} by */
async function payLine(deps, run, l, by) {
  if (l.paid) return;
  await deps.ledger.openHotelPayable(l.hotelOrgId);
  const deducted = l.deductions.reduce((/** @type {number} */ s, /** @type {any} */ d) => s + d.amountPaise, 0);
  /** @type {{ accountId: string, debitPaise?: number, creditPaise?: number }[]} */
  const lines = [{ accountId: await deps.ledger.accountId(l.hotelOrgId, 'PAYABLE'), debitPaise: l.grossPaise }];
  if (l.netPaise > 0) lines.push({ accountId: await deps.ledger.accountId('platform', 'BANK'), creditPaise: l.netPaise });
  if (deducted > 0) lines.push({ accountId: await deps.ledger.accountId('platform', 'DEDUCTIONS_PAYABLE'), creditPaise: deducted });
  if (l.grossPaise > 0)
    await deps.ledger.post(
      {
        reference: { type: 'payout-line', id: String(l._id) },
        purpose: 'hotel-payout-run',
        lines,
        memo: `${run.ref} ${run.bankReference ?? ''}`.trim(),
      },
      by,
    );
  const now = deps.clock.now();
  await PayableRecord.updateMany(
    { payoutId: String(l._id), status: 'ELIGIBLE' },
    { $set: { status: 'PAID', paidAt: now }, $push: { history: { at: now, status: 'PAID' } } },
  ).setOptions(RUNS_SCOPE);
  await PayoutLineRecord.updateOne(
    { _id: l._id, paid: false },
    { $set: { paid: true, hasPendingEvents: true }, $push: { pendingEvents: remittanceEvent(deps, l, run) } },
  ).setOptions(RUNS_SCOPE);
}

/** @param {RunDeps} deps @param {string} by @param {string} runId @param {string} bankReference */
async function markPaid(deps, by, runId, bankReference) {
  const run = await loadRun(runId);
  if (run.status === 'PAID') return runDto(run);
  if (run.status !== 'FILE_READY') throw new ConflictError('PAYOUT_RUN_NO_BANK_FILE', { runStatus: run.status });
  await assertIntact(run);
  await PayoutRunRecord.updateOne({ _id: run._id, status: 'FILE_READY' }, { $set: { bankReference: bankReference.trim() } });
  const r = { ...run, bankReference: bankReference.trim() };
  for (const l of (await linesOf(run._id)).filter((x) => x.status === 'INCLUDED')) await payLine(deps, r, l, by);
  await PayoutRunRecord.updateOne(
    { _id: run._id, status: 'FILE_READY' },
    {
      $set: { status: 'PAID', paidBy: by, paidAt: deps.clock.now() },
      $push: { history: { at: deps.clock.now(), what: `paid (${bankReference.trim()})`, by } },
    },
  );
  return runDto(await loadRun(run._id));
}

/** @param {RunDeps} deps @param {string} by @param {string} runId @param {string} reason */
async function cancel(deps, by, runId, reason) {
  const run = await loadRun(runId);
  const res = await PayoutRunRecord.updateOne(
    { _id: run._id, status: { $in: ['DRAFT', 'APPROVED', 'FILE_READY'] } },
    { $set: { status: 'CANCELLED' }, $push: { history: { at: deps.clock.now(), what: `cancelled: ${reason}`, by } } },
  );
  if (res.modifiedCount !== 1) throw new ConflictError('PAYOUT_RUN_NOT_CANCELLABLE', { runStatus: run.status });
  await freePayables(run._id);
  return runDto(await loadRun(run._id));
}

/** @param {RunDeps} deps */
export function createPayoutRuns(deps) {
  return {
    /** @param {string} by @param {{ cycleEnd: string }} a */
    propose: (by, a) => propose(deps, by, a),
    /** @param {string} by @param {string} lineId @param {{ hold: boolean, note?: string | null }} a */
    setHold: (by, lineId, a) => setHold(by, lineId, a),
    /** @param {string} by @param {string} runId */
    approve: (by, runId) => approve(deps, by, runId),
    /** @param {string} by @param {string} runId */
    bankFile: (by, runId) => bankFile(deps, by, runId),
    /** @param {string} by @param {string} runId @param {string} bankReference */
    markPaid: (by, runId, bankReference) => markPaid(deps, by, runId, bankReference),
    /** @param {string} by @param {string} runId @param {string} reason */
    cancel: (by, runId, reason) => cancel(deps, by, runId, reason),
    list: async () => (await PayoutRunRecord.find({}).sort({ createdAt: -1 }).limit(100).lean()).map(runDto),
    /** @param {string} runId */
    async read(runId) {
      const run = await loadRun(runId);
      return { ...runDto(run), lines: (await linesOf(run._id)).map(lineDto) };
    },
    /** A hotel's paid lines (its payouts). @param {string} hotelOrgId */
    forHotel: async (hotelOrgId) =>
      (await PayoutLineRecord.find({ hotelOrgId, paid: true }).setOptions(RUNS_SCOPE).sort({ createdAt: -1 }).limit(100).lean()).map(
        lineDto,
      ),
    deductionRules: async () =>
      (await DeductionRuleRecord.find({}).sort({ createdAt: -1 }).lean()).map((r) => ({
        id: String(r._id),
        hotelOrgId: r.hotelOrgId,
        label: r.label,
        type: r.type,
        valueBps: r.valueBps,
        amountPaise: r.amountPaise,
        status: r.status,
      })),
    /** @param {string} by @param {{ hotelOrgId?: string | null, label: string, type: 'PERCENT' | 'FIXED', valueBps?: number, amountPaise?: number }} a */
    async addDeductionRule(by, a) {
      if (
        a.type === 'PERCENT' &&
        !(Number.isSafeInteger(a.valueBps) && /** @type {number} */ (a.valueBps) > 0 && /** @type {number} */ (a.valueBps) <= 10_000)
      )
        throw new DomainError('DEDUCTION_RATE_INVALID');
      if (a.type === 'FIXED' && !(Number.isSafeInteger(a.amountPaise) && /** @type {number} */ (a.amountPaise) > 0))
        throw new DomainError('DEDUCTION_AMOUNT_INVALID');
      const r = await DeductionRuleRecord.create({
        hotelOrgId: a.hotelOrgId ?? null,
        label: a.label.trim(),
        type: a.type,
        valueBps: a.valueBps ?? 0,
        amountPaise: a.amountPaise ?? 0,
        createdBy: by,
      });
      return { id: String(r._id) };
    },
    /** @param {string} id */
    async retireDeductionRule(id) {
      const res = await DeductionRuleRecord.updateOne({ _id: id, status: 'ACTIVE' }, { $set: { status: 'RETIRED' } });
      if (res.modifiedCount !== 1) throw new NotFoundError('DEDUCTION_RULE_NOT_FOUND');
      return { id, status: 'RETIRED' };
    },
  };
}
