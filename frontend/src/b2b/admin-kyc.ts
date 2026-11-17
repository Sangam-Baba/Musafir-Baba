// MusafirBaba's KYC review — shapes from /api/v1/admin/kyc-applications (backend/src/b2b/modules/kyc/review.service.js).
import type { DocumentRequirement, GstRegistration, KycStatus, StoredDetails } from "./kyc";

export interface QueueItem {
  id: string;
  orgId: string;
  orgType: "CLIENT" | "HOTEL";
  legalName: string | null;
  status: KycStatus;
  round: number;
  risk: { flags: string[]; highRisk: boolean };
  submittedAt: string | null;
  reviewerId: string | null;
  lockedUntil: string | null;
  awaitingSecondApproval: boolean;
  pendingGstRegistrations: number;
}

export type Verdict = "VERIFIED" | "MISMATCH" | "UNREADABLE";

export interface ReviewDetail {
  id: string;
  orgId: string;
  orgType: "CLIENT" | "HOTEL";
  status: KycStatus;
  details: StoredDetails | null;
  documents: { key: string; fileId: string; attachedAt: string }[];
  risk: { flags: string[]; highRisk: boolean };
  bank: { holderName: string; ifsc: string; accountLast4: string } | null;
  gstRegistrations: GstRegistration[];
  round: number;
  history: { at: string; action: string; status: KycStatus; note: string | null }[];
  submittedAt: string | null;
  decidedAt: string | null;
  documentSet: DocumentRequirement[];
  notVerified: string[];
  review: {
    reviewerId: string | null;
    lockedUntil: string | null;
    verdicts: { key: string; fileId: string; verdict: Verdict; note: string | null; by: string; at: string }[];
    firstApproval: { by: string; at: string; note: string | null } | null;
    decisionNote: string | null;
  };
  you: { staffId: string | null; canReview: boolean; canSecondApprove: boolean };
}

export const RISK_TEXT: Record<string, string> = {
  GST_UNREGISTERED: "Not registered for GST",
  DUPLICATE_GSTIN: "GSTIN already used by another organisation",
  PERSONAL_PAN_FOR_BUSINESS: "Personal PAN for a business",
  PAN_DOES_NOT_MATCH_ENTITY_TYPE: "PAN type doesn't match the business type",
};

export const lockState = (d: { review: { reviewerId: string | null; lockedUntil: string | null } }, me: string | null) => {
  const live = Boolean(d.review.reviewerId && d.review.lockedUntil && new Date(d.review.lockedUntil).getTime() > Date.now());
  return { mine: live && d.review.reviewerId === me, other: live && d.review.reviewerId !== me };
};

/** "3 h", "2 d" since a date. */
export function age(iso: string | null): string {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h`;
  return `${Math.round(mins / 1440)} d`;
}

/** Loose name comparison for "account holder vs legal name" (case, punctuation and company suffixes ignored). */
export function namesMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b(private|pvt|limited|ltd|llp|the|m\/s)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const x = norm(a);
  const y = norm(b);
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
}
