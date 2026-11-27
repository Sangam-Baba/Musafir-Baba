// @ts-check
/**
 * Bus payout runs (plan Stage 18 B7 — separate from hotel runs, owner's decision 2026-11-25). Same rules as hotels,
 * reusing the wallet module's pure payout pieces (`payoutLine`, `holdReasons`, `runTotals`, `runHash`):
 *   propose  → one open run at a time; each company with payables ready to pay by the cycle end gets a line (payables
 *              locked to the run in one conditional update); held when KYC isn't approved, no bank details, bank changed
 *              in the last 72 h or a statement dispute is open → DRAFT;
 *   hold / release a line (DRAFT); approve → a different person, totals locked by a hash, held lines' payables freed;
 *   bankFile → NEFT CSV (hash checked; account numbers revealed through KYC, logged) → FILE_READY;
 *   paid     → bank reference; per company one journal entry (Dr bus company payable, Cr bank) → payables PAID → PAID;
 *   cancel   → any time before paid; payables freed. No deductions yet (TDS / TCS for operators: CA question).
 */
import { randomInt } from 'node:crypto';

import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { holdReasons, payoutLine, runHash, runTotals } from '../wallet/index.js';
import { BusPayableRecord } from './models/payable.model.js';
import { BusPayoutLineRecord, BusPayoutRunRecord } from './models/run.model.js';

const SCOPE = systemScope('bus-payouts: runs', { routine: true });
const LETTERS = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const newRef = () => `BPR-${Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]).join('')}`;
const OPEN = ['DRAFT', 'APPROVED', 'FILE_READY'];

/**
 * @typedef {{ name: string, kycApproved: boolean, hasBank: boolean, bankChangedAt: Date | null, openDisputes: number, holderName: string | null, ifsc: string | null }} Facts
 * @typedef {{ clock: import('../../core/clock.js').Clock, ledger: ReturnType<typeof import('../wallet/index.js').createLedger>,
 *   facts: (orgId: string) => Promise<Facts>, account: (orgId: string, viewer: string) => Promise<string | null> }} RunDeps
 */

/** @param {unknown} id */
async function loadRun(id) {
  const r = /^[a-f0-9]{24}$/.test(String(id)) ? await BusPayoutRunRecord.findById(id).lean() : null;
  if (!r) throw new NotFoundError('PAYOUT_RUN_NOT_FOUND');
  return /** @type {Record<string, any>} */ (r);
}
/** @param {unknown} runId */
const linesOf = async (runId) =>
  /** @type {any[]} */ (
    await BusPayoutLineRecord.find({ runId: String(runId) })
      .sort({ createdAt: 1 })
      .lean()
  );
/** @param {any[]} lines */
const asLines = (lines) => lines.map((l) => ({ ...l, id: String(l._id), hotelOrgId: l.operatorOrgId }));

/** @param {RunDeps} deps @param {string} runId @param {string} orgId @param {any[]} payables */
async function makeLine(deps, runId, orgId, payables) {
  const ids = payables.map((p) => String(p._id));
  const locked = await BusPayableRecord.updateMany({ _id: { $in: ids }, status: 'ELIGIBLE', runId: null }, { $set: { runId } }).setOptions(
    SCOPE,
  );
  if (locked.modifiedCount === 0) return;
  const mine = await BusPayableRecord.find({ runId, operatorOrgId: orgId }).setOptions(SCOPE).lean();
  const l = payoutLine({ payablesPaise: mine.reduce((s, p) => s + p.amountPaise, 0), carriedInPaise: 0, rules: [], hotelOrgId: orgId });
  const why = holdReasons(await deps.facts(orgId), deps.clock.now());
  await BusPayoutLineRecord.create({
    runId,
    operatorOrgId: orgId,
    payableIds: mine.map((p) => String(p._id)),
    grossPaise: l.grossPaise,
    deductions: l.deductions,
    netPaise: l.netPaise,
    status: why.length ? 'HELD' : 'INCLUDED',
    holdReasons: why,
  });
}

/** @param {RunDeps} deps @param {string} by @param {{ cycleEnd: string }} a */
async function propose(deps, by, a) {
  if (await BusPayoutRunRecord.exists({ status: { $in: OPEN } })) throw new ConflictError('PAYOUT_RUN_OPEN');
  const run = await BusPayoutRunRecord.create({
    ref: newRef(),
    status: 'DRAFT',
    cycleEnd: a.cycleEnd,
    preparedBy: by,
    history: [{ at: deps.clock.now(), what: 'proposed', by }],
  });
  const due = await BusPayableRecord.find({ status: 'ELIGIBLE', runId: null, tripDate: { $lte: a.cycleEnd } })
    .setOptions(SCOPE)
    .limit(20_000)
    .lean();
  /** @type {Map<string, any[]>} */
  const byOrg = new Map();
  for (const p of due) byOrg.set(p.operatorOrgId, [...(byOrg.get(p.operatorOrgId) ?? []), p]);
  for (const [orgId, payables] of byOrg) await makeLine(deps, String(run._id), orgId, payables);
  const totals = runTotals(await linesOf(run._id));
  await BusPayoutRunRecord.updateOne({ _id: run._id }, { $set: { totals } });
  return { ...run.toObject(), totals };
}

/** @param {RunDeps} deps @param {string} by @param {string} runId */
async function approve(deps, by, runId) {
  const run = await loadRun(runId);
  if (run.preparedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
  const lines = await linesOf(runId);
  const hash = runHash(asLines(lines));
  const res = await BusPayoutRunRecord.updateOne(
    { _id: runId, status: 'DRAFT' },
    {
      $set: { status: 'APPROVED', approvedBy: by, approvedAt: deps.clock.now(), hash, totals: runTotals(lines) },
      $push: { history: { at: deps.clock.now(), what: 'approved', by } },
    },
  );
  if (res.modifiedCount !== 1) throw new ConflictError('PAYOUT_RUN_NOT_DRAFT', { status: run.status });
  const held = lines.filter((l) => l.status === 'HELD').flatMap((l) => l.payableIds);
  if (held.length) await BusPayableRecord.updateMany({ _id: { $in: held }, runId }, { $set: { runId: null } }).setOptions(SCOPE);
  return loadRun(runId);
}

/** @param {RunDeps} deps @param {string} by @param {string} runId */
async function bankFile(deps, by, runId) {
  const run = await loadRun(runId);
  if (!['APPROVED', 'FILE_READY'].includes(run.status)) throw new ConflictError('PAYOUT_RUN_NOT_APPROVED', { status: run.status });
  const lines = await linesOf(runId);
  if (runHash(asLines(lines)) !== run.hash) throw new ConflictError('PAYOUT_RUN_CHANGED');
  const rows = [['Beneficiary', 'Account', 'IFSC', 'Amount', 'Reference', 'Company']];
  for (const l of lines.filter((x) => x.status === 'INCLUDED' && x.netPaise > 0)) {
    const f = await deps.facts(l.operatorOrgId);
    const account = await deps.account(l.operatorOrgId, by);
    if (!account || !f.ifsc) throw new DomainError('BANK_DETAILS_MISSING', { operatorOrgId: l.operatorOrgId });
    rows.push([
      f.holderName ?? f.name,
      account,
      f.ifsc,
      (l.netPaise / 100).toFixed(2),
      `${run.ref}-${String(l._id).slice(-6)}`,
      l.operatorOrgId,
    ]);
  }
  await BusPayoutRunRecord.updateOne(
    { _id: runId, status: { $in: ['APPROVED', 'FILE_READY'] } },
    { $set: { status: 'FILE_READY' }, $push: { history: { at: deps.clock.now(), what: 'bank file', by } } },
  );
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n') + '\n';
}

/** Per company: Dr bus company payable, Cr bank (once — the journal reference is the line). @param {RunDeps} deps @param {Record<string, any>} run @param {Record<string, any>} l */
async function payLine(deps, run, l) {
  await deps.ledger.openOperatorPayable(l.operatorOrgId);
  await deps.ledger.post(
    {
      reference: { type: 'bus-payout-line', id: String(l._id) },
      purpose: 'bus-payout',
      lines: [
        { accountId: await deps.ledger.accountId(l.operatorOrgId, 'OPERATOR_PAYABLE'), debitPaise: l.grossPaise },
        { accountId: await deps.ledger.accountId('platform', 'BANK'), creditPaise: l.netPaise },
      ],
      memo: `${run.ref} ${run.bankReference}`,
    },
    'system:bus-payouts',
  );
  await BusPayableRecord.updateMany(
    { _id: { $in: l.payableIds }, runId: String(run._id) },
    { $set: { status: 'PAID', paidAt: deps.clock.now() } },
  ).setOptions(SCOPE);
  await BusPayoutLineRecord.updateOne({ _id: l._id }, { $set: { paid: true } });
}

/** @param {RunDeps} deps @param {string} by @param {string} runId @param {{ bankReference: string }} a */
async function paid(deps, by, runId, a) {
  const run = await loadRun(runId);
  if (!['FILE_READY', 'PAID'].includes(run.status)) throw new ConflictError('PAYOUT_RUN_NO_BANK_FILE', { status: run.status });
  const withRef = { ...run, bankReference: run.bankReference ?? a.bankReference };
  await BusPayoutRunRecord.updateOne({ _id: runId, bankReference: null }, { $set: { bankReference: a.bankReference } });
  for (const l of (await linesOf(runId)).filter((x) => x.status === 'INCLUDED' && !x.paid)) await payLine(deps, withRef, l);
  await BusPayoutRunRecord.updateOne(
    { _id: runId, status: 'FILE_READY' },
    { $set: { status: 'PAID', paidAt: deps.clock.now() }, $push: { history: { at: deps.clock.now(), what: 'paid', by } } },
  );
  return loadRun(runId);
}

/** @param {RunDeps} deps */
export function createBusPayoutRuns(deps) {
  return {
    /** @param {string} by @param {{ cycleEnd: string }} a */
    propose: (by, a) => propose(deps, by, a),
    /** @param {string} by @param {string} lineId @param {boolean} hold */
    async hold(by, lineId, hold) {
      const l = /^[a-f0-9]{24}$/.test(lineId) ? await BusPayoutLineRecord.findById(lineId).lean() : null;
      if (!l) throw new NotFoundError('PAYOUT_LINE_NOT_FOUND');
      if ((await loadRun(l.runId)).status !== 'DRAFT') throw new ConflictError('PAYOUT_RUN_NOT_DRAFT');
      await BusPayoutLineRecord.updateOne({ _id: lineId }, { $set: { status: hold ? 'HELD' : 'INCLUDED' } });
      await BusPayoutRunRecord.updateOne(
        { _id: l.runId },
        {
          $set: { totals: runTotals(await linesOf(l.runId)) },
          $push: { history: { at: deps.clock.now(), what: `${hold ? 'held' : 'released'} ${l.operatorOrgId}`, by } },
        },
      );
      return loadRun(l.runId);
    },
    /** @param {string} by @param {string} runId */
    approve: (by, runId) => approve(deps, by, runId),
    /** @param {string} by @param {string} runId */
    bankFile: (by, runId) => bankFile(deps, by, runId),
    /** @param {string} by @param {string} runId @param {{ bankReference: string }} a */
    paid: (by, runId, a) => paid(deps, by, runId, a),
    /** @param {string} by @param {string} runId */
    async cancel(by, runId) {
      const res = await BusPayoutRunRecord.updateOne(
        { _id: runId, status: { $in: OPEN } },
        { $set: { status: 'CANCELLED' }, $push: { history: { at: deps.clock.now(), what: 'cancelled', by } } },
      );
      if (res.modifiedCount !== 1) throw new ConflictError('PAYOUT_RUN_NOT_OPEN');
      await BusPayableRecord.updateMany({ runId, status: 'ELIGIBLE' }, { $set: { runId: null } }).setOptions(SCOPE);
      return loadRun(runId);
    },
    list: async () => BusPayoutRunRecord.find({}).sort({ createdAt: -1 }).limit(50).lean(),
    /** @param {string} runId */
    get: async (runId) => ({ run: await loadRun(runId), lines: await linesOf(runId) }),
    /** A company's paid lines. @param {string} orgId */
    forOperator: async (orgId) => BusPayoutLineRecord.find({ operatorOrgId: orgId, paid: true }).sort({ createdAt: -1 }).limit(100).lean(),
  };
}
