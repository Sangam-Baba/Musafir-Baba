// Hotel registration and verification (KYC) — shapes from the B2B API (backend/src/b2b/modules/kyc).
export const TERMS_VERSION = "2026-11";

export type KycStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export const ENTITY_TYPES = {
  PROPRIETORSHIP: "Proprietorship",
  PARTNERSHIP: "Partnership firm",
  LLP: "LLP",
  PRIVATE_LIMITED: "Private Limited Company",
  PUBLIC_LIMITED: "Public Limited Company",
  HUF: "Hindu Undivided Family (HUF)",
  TRUST_SOCIETY: "Trust / Society",
  OTHER: "Other",
} as const;
export type EntityType = keyof typeof ENTITY_TYPES;

export interface HotelDetailsInput {
  legalName: string;
  contactName: string;
  mobile: string;
  email: string;
  gstRegistered: boolean;
  gstin?: string;
  pan: string;
  address: { line1: string; line2?: string; city: string; stateCode: string; pin: string };
  propertyCount: number;
  fleetSize?: number; // Stage 18: bus operators
  termsAccepted: boolean;
  termsVersion: string;
  tradeName?: string;
  entityType?: EntityType | "";
  yearEstablished?: number | null;
  contactDesignation?: string;
  alternateMobile?: string;
}

/** Details as stored: no PAN, only its last 4 characters. */
export interface StoredDetails {
  legalName: string;
  contactName: string;
  mobile: string;
  email: string;
  gstRegistered: boolean;
  gstin: string | null;
  panLast4: string;
  address: { line1: string; line2: string | null; city: string; stateCode: string; pin: string };
  propertyCount?: number; // hotels only
  fleetSize?: number; // bus operators only
  termsVersion: string;
  tradeName?: string | null;
  entityType?: EntityType | null;
  yearEstablished?: number | null;
  contactDesignation?: string | null;
  alternateMobile?: string | null;
}

export interface DocumentRequirement {
  key: string;
  label: string;
  required: boolean;
}

/** A further GSTIN of the same business (same PAN, another state), verified on its own. */
export interface GstRegistration {
  id: string;
  stateCode: string;
  gstin: string;
  fileId: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  duplicate: boolean;
  note: string | null;
  addedAt: string;
  decidedAt: string | null;
}

export const stateName = (code: string) => GST_STATES.find(([c]) => c === code)?.[1] ?? code;

export interface KycApplication {
  id: string;
  orgId: string;
  orgType: "CLIENT" | "HOTEL" | "BUS_OPERATOR";
  status: KycStatus;
  details: StoredDetails | null;
  documents: { key: string; fileId: string; attachedAt: string }[];
  risk: { flags: string[]; highRisk: boolean };
  bank: { holderName: string; ifsc: string; accountLast4: string } | null;
  gstRegistrations: GstRegistration[];
  revision: number;
  round: number;
  history: { at: string; action: string; status: KycStatus; note: string | null }[];
  submittedAt: string | null;
  decidedAt: string | null;
  documentSet: DocumentRequirement[];
  missingDocuments: string[];
  editable: boolean;
  rejection: { note: string | null; decidedAt: string; reasons: { key: string; verdict: string; note: string | null; resolved: boolean }[] } | null;
}

export const KYC_PERMISSION_READ = "kyc.application.read";
export const KYC_PERMISSION_SUBMIT = "kyc.application.submit";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** GST state codes (same list as the backend). */
export const GST_STATES: [string, string][] = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"], ["05", "Uttarakhand"],
  ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"], ["09", "Uttar Pradesh"], ["10", "Bihar"], ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"], ["13", "Nagaland"], ["14", "Manipur"], ["15", "Mizoram"], ["16", "Tripura"], ["17", "Meghalaya"],
  ["18", "Assam"], ["19", "West Bengal"], ["20", "Jharkhand"], ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"],
  ["24", "Gujarat"], ["26", "Dadra and Nagar Haveli and Daman and Diu"], ["27", "Maharashtra"], ["29", "Karnataka"], ["30", "Goa"],
  ["31", "Lakshadweep"], ["32", "Kerala"], ["33", "Tamil Nadu"], ["34", "Puducherry"], ["35", "Andaman and Nicobar Islands"],
  ["36", "Telangana"], ["37", "Andhra Pradesh"], ["38", "Ladakh"],
];

export const STATUS_TEXT: Record<KycStatus, { label: string; text: string; tone: string }> = {
  DRAFT: { label: "Not submitted", text: "Fill in your details, bank account and documents, then submit for verification.", tone: "border-slate-200 bg-white text-slate-700" },
  SUBMITTED: { label: "Submitted", text: "Thanks — your application is waiting for a MusafirBaba reviewer. We'll let you know by email.", tone: "border-blue-200 bg-blue-50 text-blue-800" },
  UNDER_REVIEW: { label: "Under review", text: "A MusafirBaba reviewer is checking your documents now.", tone: "border-blue-200 bg-blue-50 text-blue-800" },
  APPROVED: { label: "Verified", text: "Your business is verified. You can start listing your property.", tone: "border-green-200 bg-green-50 text-green-800" },
  REJECTED: { label: "Needs changes", text: "Some things need fixing. See the notes below, make the changes and submit again.", tone: "border-amber-200 bg-amber-50 text-amber-800" },
};

export const HISTORY_TEXT: Record<string, string> = {
  created: "Registration started",
  submit: "Submitted for verification",
  resubmit: "Submitted again",
  take: "Review started",
  release: "Back in the review queue",
  "first-approval": "First approval given (a second reviewer checks next)",
  approve: "Verified",
  reject: "Changes requested",
};

export const VERDICT_TEXT: Record<string, string> = { VERIFIED: "Verified", MISMATCH: "Doesn't match your details", UNREADABLE: "Can't be read" };

/** Field-level problems from KYC_DETAILS_INVALID / BANK_DETAILS_INVALID. */
export const FIELD_ERROR_TEXT: Record<string, string> = {
  GSTIN_INVALID: "This GSTIN isn't valid — check for a typo.",
  GSTIN_STATE_MISMATCH: "The GSTIN belongs to a different state than the address.",
  PAN_INVALID: "Enter a 10-character PAN, e.g. ABCDE1234F.",
  PAN_NOT_IN_GSTIN: "This PAN doesn't match the one inside your GSTIN.",
  PIN_INVALID: "Enter a 6-digit PIN code.",
  STATE_INVALID: "Choose a state.",
  TERMS_NOT_ACCEPTED: "Please accept the terms.",
  MOBILE_INVALID: "Enter a valid mobile number.",
  EMAIL_INVALID: "Enter a valid email address.",
  HOLDER_NAME_INVALID: "Enter the account holder's name.",
  ENTITY_TYPE_INVALID: "Choose the type of business.",
  YEAR_INVALID: "Enter a year like 2018.",
  ALTERNATE_MOBILE_INVALID: "Enter a valid mobile number.",
  ACCOUNT_NUMBER_INVALID: "Enter 9 to 18 digits.",
  IFSC_INVALID: "Enter an 11-character IFSC, e.g. HDFC0001234.",
};

/** path → message, from a B2BError's details. */
export function fieldErrors(details: Record<string, unknown>): Record<string, string> {
  const list = Array.isArray(details.errors) ? (details.errors as { path?: string; code?: string }[]) : [];
  // business rules give "pan"; input checks give "body.details.pan" — both become "pan"
  const key = (path: string) => path.replace(/^body\.(details\.)?/, "");
  return Object.fromEntries(list.filter((e) => e.path && e.code).map((e) => [key(e.path as string), FIELD_ERROR_TEXT[e.code as string] ?? "Please check this field."]));
}
