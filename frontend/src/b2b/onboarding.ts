// The partner's onboarding steps, worked out from real data only (verification application, email, listings).
import type { KycApplication } from "./kyc";
import type { Property } from "./listing";
import type { Me } from "./types";

export interface OnboardingStep {
  key: string;
  label: string;
  done: boolean;
  /** waiting for MusafirBaba (nothing for the partner to do) */
  waiting?: boolean;
  href?: string;
  action?: string;
}

/** Steps to a verified business. */
export function verificationSteps(me: Me, kyc: KycApplication | undefined): OnboardingStep[] {
  const status = kyc?.status;
  const submitted = status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "APPROVED";
  const docsDone = Boolean(kyc && kyc.documents.length > 0 && kyc.missingDocuments.length === 0);
  const href = "/business/verification";
  return [
    { key: "account", label: "Create your business account", done: true },
    { key: "details", label: "Add business and contact details", done: Boolean(kyc?.details), href, action: "Add details" },
    { key: "email", label: "Confirm your email address", done: me.user.emailVerified, href, action: "Confirm" },
    { key: "bank", label: "Add bank & payout details", done: Boolean(kyc?.bank), href, action: "Add details" },
    { key: "documents", label: "Upload required documents", done: docsDone, href, action: "Upload now" },
    { key: "submit", label: status === "REJECTED" ? "Fix what MusafirBaba asked and submit again" : "Submit for verification", done: submitted, href, action: status === "REJECTED" ? "Fix now" : "Submit" },
    { key: "verified", label: "Get verified by MusafirBaba", done: status === "APPROVED", waiting: status === "SUBMITTED" || status === "UNDER_REVIEW" },
  ];
}

/** Steps to a first live listing (after verification). */
export function listingSteps(properties: Property[]): OnboardingStep[] {
  const anyLive = properties.some((p) => p.status === "LIVE");
  const anySubmitted = properties.some((p) => p.status === "SUBMITTED");
  return [
    { key: "property", label: "Create your first property", done: properties.length > 0, href: "/business/properties", action: "Add property" },
    { key: "submit-listing", label: "Complete it and submit it for approval", done: anyLive || anySubmitted, href: properties[0] ? `/business/properties/${properties[0].id}` : "/business/properties", action: "Continue" },
    { key: "live", label: "Get your listing approved — it goes live", done: anyLive, waiting: anySubmitted && !anyLive },
  ];
}

export const percentDone = (steps: OnboardingStep[]) => Math.round((steps.filter((s) => s.done).length / Math.max(steps.length, 1)) * 100);
