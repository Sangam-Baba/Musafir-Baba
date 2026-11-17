// @ts-check
/**
 * Who may verify an application (plan Stage 02 §3.6, decision D34 — 17 Nov 2026, owner):
 * - a reviewer holding `platform.kyc.approve` has the authority to verify on their own, at any risk;
 * - a reviewer without it verifies a normal application, but on a high-risk one gives only the first
 *   approval; the final approval then needs someone with `platform.kyc.approve`.
 */
import { ForbiddenError } from '../../../core/errors.js';

/**
 * @param {{ highRisk: boolean, firstBy: string | null, by: string, authority: boolean }} a
 * @returns {'FIRST' | 'FINAL'} FIRST = recorded as the first of two; FINAL = the application is verified
 */
export function approvalStep(a) {
  if (a.authority) return 'FINAL';
  if (!a.firstBy) return a.highRisk ? 'FIRST' : 'FINAL';
  throw new ForbiddenError(a.firstBy === a.by ? 'KYC_SECOND_APPROVER_MUST_DIFFER' : 'KYC_SECOND_APPROVER_REQUIRED');
}
