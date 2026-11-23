// @ts-check
/**
 * Payout runs (plan Stage 15 §3.2–3.3) — weekly by default; one open run at a time:
 *   propose  → every hotel with payables ready to pay by the cycle end: a line each (payables locked to it in one
 *              conditional update; deductions from the rules; held when bank details changed < 72 h, KYC not approved,
 *              no bank details or a dispute is open) → run DRAFT;
 *   hold / release a line (DRAFT only; totals recomputed);
 *   approve  → a **different** person; held lines' payables freed for the next run; totals locked by a hash;
 *   bankFile → the NEFT file (hash checked; every account number view is logged by KYC) → FILE_READY;
 *   paid     → bank reference; per hotel one journal entry: hotel payable → bank (+ deductions payable); payables PAID;
 *              a remittance notice to the hotel → PAID;
 *   cancel   → any time before paid; payables freed.
 * Hotel facts (bank, KYC, disputes) come from the caller — this module reads only its own collections.
 */
import { randomInt } from 'node:crypto';

import { newEvent } from '../../core/db/events.js';
import { systemScope } from '../../core/db/tenant-plugin.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../core/errors.js';
import { holdReasons, payoutLine, runHash, runTotals } from './domain/payouts.js';
import { EVENTS } from './events.js';
import { PayableRecord } from './models/payable.model.js';
import { DeductionRuleRecord, PayoutLineRecord, PayoutRunRecord } from './models/payout-run.model.js';

const SCOPE = systemScope('wallet: payout runs', { routine: true });
const IST_MS = 330 * 60_000;
const LETTERS = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const newRef = () => `PR-${Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]).join('')}`;
const OPEN = ['DRAFT', 'APPROVED', 'FILE_READY'];

/**
 * @typedef {{ name: string, kycApproved: boolean, hasBank: boolean, bankChangedAt: Date | null, openDisputes: number,
 *   holderName: string | null, ifsc: string | null }} HotelFacts
 * @typedef {{
 *   clock: import('../../core/clock.js').Clock,
 *   ledger: ReturnType<typeof import('./ledger.service.js').createLedger>,
 *   hotel: (orgId: string) => Promise<HotelFacts>,
 *   account: (orgId: string, viewer: string) => Promise<string | null>,
 * }} RunDeps
 */

/** @param {Record<string, any>} r */
export const runDto = (r) => ({
  id: String(r._id),
  ref: r.ref,
  status: r.status,
  cycleEnd: r.cycleEnd,
  totals: r.totals,
  preparedBy: r.preparedBy,
  approvedBy: r.approvedBy,
  approvedAt: r.approvedAt,
  bankReference: r.bankReference,
  paidAt: r.paidAt,
  createdAt: r.createdAt,
});
/** @param {Record<string, any>} l */
export const lineDto = (l) => ({
  id: String(l._id),
  hotelOrgId: l.hotelOrgId,
  payables: l.payableIds.length,
  grossPaise: l.grossPaise,
  deductions: l.deductions,
  netPaise: l.netPaise,
  status: l.status,
  holdReasons: l.holdReasons,
  note: l.note,
  paid: l.paid,
});

/** @param {unknown} id */
async function loadRun(id) {
  const r = /^[a-f0-9]{24}$/.test(String(id)) ? await PayoutRunRecord.findById(id).lean() : null;
  if (!r) throw new NotFoundError('PAYOUT_RUN_NOT_FOUND');
  return /** @type {Record<string, any>} */ (r);
}
/** @param {unknown} runId */
const linesOf = async (runId) =>
  /** @type {any[]} */ (
    await PayoutLineRecord.find({ runId: String(runId) })
      .setOptions(SCOPE)
      .lean()
  );
/** @param {any[]} lines @returns {any[]} */
const withIds = (lines) => lines.map((l) => ({ ...l, id: String(l._id) }));

/** End of an Indian day as an instant. @param {string} day */
const endOfDay = (day) => new Date(Date.parse(`${day}T00:00:00Z`) - IST_MS + 86_400_000);

/**
 * One hotel's line: payables locked to it, deductions, holds.
 * @param {RunDeps} deps @param {string} runId @param {{ hotelOrgId: string, payables: Record<string, any>[], rules: any[] }} a
 */
async function makeLine(deps, runId, { hotelOrgId, payables, rules }) {
  const facts = await deps.hotel(hotelOrgId);
  const doc = await PayoutLineRecord.create({ runId, hotelOrgId, payablesPaise: 0, grossPaise: 0, netPaise: 0, status: 'INCLUDED' });
  const lineId = String(doc._id);
  await PayableRecord.updateMany(
    { _id: { $in: payables.map((p) => p._id) }, status: 'ELIGIBLE', payoutId: null },
    { $set: { payoutId: lineId } },
  ).setOptions(SCOPE);
  const locked = await PayableRecord.find({ payoutId: lineId }).setOptions(SCOPE).lean(); // someone else may have taken one meanwhile
  const payablesPaise = locked.reduce((s, p) => s + p.amountPaise, 0);
  const l = payoutLine({ payablesPaise, carriedInPaise: 0, rules: rules.map((r) => ({ ...r, id: String(r._id) })), hotelOrgId });
  const reasons = holdReasons(facts, deps.clock.now());
  await PayoutLineRecord.updateOne(
    { _id: doc._id },
    {
      $set: {
        payableIds: locked.map((p) => String(p._id)),
        payablesPaise,
        grossPaise: l.grossPaise,
        deductions: l.deductions,
        netPaise: l.netPaise,
        status: reasons.length ? 'HELD' : 'INCLUDED',
        holdReasons: reasons,
      },
    },
  ).setOptions(SCOPE);
}

/** @param {RunDeps} deps @param {string} by @param {{ cycleEnd: string }} a */
async function propose(deps, by, a) {
  if (await PayoutRunRecord.exists({ status: { $in: OPEN } })) throw new ConflictError('PAYOUT_RUN_OPEN');
  const due = await PayableRecord.find({ status: 'ELIGIBLE', payoutId: null, eligibleAt: { $lt: endOfDay(a.cycleEnd) } })
    .setOptions(SCOPE)
    .lean();
  if (due.length === 0) throw new ConflictError('NOTHING_TO_PAY');
  const now = deps.clock.now();
  const run = await PayoutRunRecord.create({
    ref: newRef(),
    status: 'DRAFT',
    cycleEnd: a.cycleEnd,
    totals: runTotals([]),
    preparedBy: by,
    history: [{ at: now, what: 'proposed', by }],
  });
  const rules = await DeductionRuleRecord.find({ status: 'ACTIVE' }).lean();
  /** @type {Map<string, any[]>} */
  const byHotel = new Map();
  for (const p of due) byHotel.set(p.hotelOrgId, [...(byHotel.get(p.hotelOrgId) ?? []), p]);
  for (const [hotelOrgId, payables] of byHotel) await makeLine(deps, String(run._id), { hotelOrgId, payables, rules });
  await PayoutRunRecord.updateOne({ _id: run._id }, { $set: { totals: runTotals(await linesOf(run._id)) } });
  return runDto(await loadRun(run._id));
}

/** @param {RunDeps} deps @param {string} by @param {string} lineId @param {{ hold: boolean, note?: string | null }} a */
async function setHold(deps, by, lineId, a) {
  const l = /^[a-f0-9]{24}$/.test(lineId) ? await PayoutLineRecord.findById(lineId).setOptions(SCOPE).lean() : null;
  if (!l) throw new NotFoundError('PAYOUT_LINE_NOT_FOUND');
  const run = await loadRun(l.runId);
  if (run.status !== 'DRAFT') throw new ConflictError('PAYOUT_RUN_LOCKED', { runStatus: run.status });
  await PayoutLineRecord.updateOne(
    { _id: l._id },
    {
      $set: {
        status: a.hold ? 'HELD' : 'INCLUDED',
        note: a.note ?? null,
        holdReasons: a.hold ? [...new Set([...(l.holdReasons ?? []), 'HELD_BY_FINANCE'])] : [],
      },
    },
  ).setOptions(SCOPE);
  await PayoutRunRecord.updateOne(
    { _id: run._id, status: 'DRAFT' },
    {
      $set: { totals: runTotals(await linesOf(run._id)) },
      $push: { history: { at: deps.clock.now(), what: `${a.hold ? 'held' : 'released'} ${l.hotelOrgId}`, by } },
    },
  );
  return lineDto(/** @type {any} */ (await PayoutLineRecord.findById(lineId).setOptions(SCOPE).lean()));
}

/** @param {RunDeps} deps @param {string} by @param {string} runId */
async function approve(deps, by, runId) {
  const run = await loadRun(runId);
  if (run.preparedBy === by) throw new ForbiddenError('SECOND_PERSON_REQUIRED');
  const lines = await linesOf(run._id);
  const hash = runHash(withIds(lines));
  const res = await PayoutRunRecord.updateOne(
    { _id: run._id, status: 'DRAFT' },
    {
      $set: { status: 'APPROVED', approvedBy: by, approvedAt: deps.clock.now(), hash, totals: runTotals(lines) },
      $push: { history: { at: deps.clock.now(), what: 'approved', by } },
    },
  );
  if (res.modifiedCount !== 1) throw new ConflictError('PAYOUT_RUN_NOT_DRAFT', { runStatus: run.status });
  for (const l of lines.filter((x) => x.status === 'HELD'))
    await PayableRecord.updateMany({ payoutId: String(l._id), status: 'ELIGIBLE' }, { $set: { payoutId: null } }).setOptions(SCOPE);
  return runDto(await loadRun(run._id));
}

/** The run's lines still match what was approved. @param {Record<string, any>} run */
async function assertIntact(run) {
  if (run.hash !== runHash(withIds(await linesOf(run._id)))) throw new ConflictError('PAYOUT_RUN_CHANGED_AFTER_APPROVAL');
}

export { approve, assertIntact, endOfDay, linesOf, loadRun, propose, setHold, SCOPE as RUNS_SCOPE };

/** Free a run's payables (cancel). @param {unknown} runId */
export async function freePayables(runId) {
  for (const l of await linesOf(runId))
    await PayableRecord.updateMany({ payoutId: String(l._id), status: 'ELIGIBLE' }, { $set: { payoutId: null } }).setOptions(SCOPE);
}

/** A hotel's remittance notice, pushed onto its line (relay → bell + owners' email). @param {RunDeps} deps @param {Record<string, any>} l @param {Record<string, any>} run */
export const remittanceEvent = (deps, l, run) =>
  newEvent(EVENTS.payoutPaid, { orgId: l.hotelOrgId, amountPaise: l.netPaise, ref: run.ref, bankReference: run.bankReference }, deps);
