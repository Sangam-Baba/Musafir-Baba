// @ts-check
/**
 * Payout runs — pure (plan Stage 15 §3.2–3.3, D11). Per hotel: gross = its payables ready to pay (+ what a previous
 * run carried in — negative when deductions outran it); deductions from the rules (CA to set; none by default),
 * never more than the gross; net = gross − deductions. A negative net is carried to the next run, never taken from the
 * hotel. Run totals = Σ included lines; an approved run's totals are locked by a hash of its lines.
 */
import { createHash } from 'node:crypto';

export const BANK_CHANGE_HOLD_MS = 72 * 60 * 60_000;

/**
 * @typedef {{ id: string, hotelOrgId: string | null, label: string, type: 'PERCENT' | 'FIXED', valueBps?: number, amountPaise?: number }} DeductionRule
 * @typedef {{ ruleId: string, label: string, amountPaise: number }} Deduction
 */

/**
 * The deductions for a hotel's gross: its own rules first, then the rules for all hotels; capped at the gross.
 * @param {number} grossPaise
 * @param {DeductionRule[]} rules
 * @param {string} hotelOrgId
 * @returns {Deduction[]}
 */
export function deductionsFor(grossPaise, rules, hotelOrgId) {
  const mine = [...rules.filter((r) => r.hotelOrgId === hotelOrgId), ...rules.filter((r) => r.hotelOrgId === null)];
  /** @type {Deduction[]} */
  const out = [];
  let left = Math.max(0, grossPaise);
  for (const r of mine) {
    const raw = r.type === 'PERCENT' ? Math.round((Math.max(0, grossPaise) * (r.valueBps ?? 0)) / 10_000) : (r.amountPaise ?? 0);
    const amount = Math.min(left, Math.max(0, raw));
    if (amount > 0) out.push({ ruleId: r.id, label: r.label, amountPaise: amount });
    left -= amount;
  }
  return out;
}

/**
 * One hotel's line.
 * @param {{ payablesPaise: number, carriedInPaise: number, rules: DeductionRule[], hotelOrgId: string }} a
 */
export function payoutLine(a) {
  const grossPaise = a.payablesPaise + a.carriedInPaise;
  const deductions = deductionsFor(grossPaise, a.rules, a.hotelOrgId);
  const net = grossPaise - deductions.reduce((s, d) => s + d.amountPaise, 0);
  return { grossPaise, deductions, netPaise: Math.max(0, net), carryForwardPaise: Math.min(0, net) };
}

/**
 * Why a hotel's line must wait (empty = pay it).
 * @param {{ bankChangedAt: Date | null, kycApproved: boolean, openDisputes: number, hasBank: boolean }} h
 * @param {Date} now
 */
export function holdReasons(h, now) {
  /** @type {string[]} */
  const why = [];
  if (!h.kycApproved) why.push('KYC_NOT_APPROVED');
  if (!h.hasBank) why.push('NO_BANK_DETAILS');
  if (h.bankChangedAt && now.getTime() - h.bankChangedAt.getTime() < BANK_CHANGE_HOLD_MS) why.push('BANK_CHANGED_RECENTLY');
  if (h.openDisputes > 0) why.push('STATEMENT_DISPUTE_OPEN');
  return why;
}

/** @param {{ status: string, grossPaise: number, netPaise: number, deductions: Deduction[] }[]} lines */
export function runTotals(lines) {
  const inc = lines.filter((l) => l.status === 'INCLUDED');
  return {
    lines: inc.length,
    held: lines.length - inc.length,
    grossPaise: inc.reduce((s, l) => s + l.grossPaise, 0),
    deductionsPaise: inc.reduce((s, l) => s + l.deductions.reduce((a, d) => a + d.amountPaise, 0), 0),
    netPaise: inc.reduce((s, l) => s + l.netPaise, 0),
  };
}

/** The lock on an approved run: its included lines and totals. @param {{ id: string, hotelOrgId: string, status: string, grossPaise: number, netPaise: number, deductions: Deduction[] }[]} lines */
export function runHash(lines) {
  const inc = lines
    .filter((l) => l.status === 'INCLUDED')
    .map((l) => [l.id, l.hotelOrgId, l.grossPaise, l.netPaise, l.deductions.map((d) => d.amountPaise)])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return createHash('sha256')
    .update(JSON.stringify([inc, runTotals(/** @type {any} */ (lines))]))
    .digest('hex');
}
