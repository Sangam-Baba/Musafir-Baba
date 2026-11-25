// Pricing & GST (Stage 05): shapes of the admin API and small helpers.
export const CHANNELS = ["WEBSITE", "B2B_PORTAL", "B2B_API"] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABEL: Record<Channel, string> = { WEBSITE: "Website", B2B_PORTAL: "B2B dashboard", B2B_API: "B2B API" };
export type RuleStatus = "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "RETIRED";
export const STATUS_LABEL: Record<RuleStatus, string> = { DRAFT: "Draft", PENDING_APPROVAL: "Waiting for approval", ACTIVE: "In force", RETIRED: "Retired" };
export type Adjustment = { type: "FIXED_PER_NIGHT" | "PERCENT" | "FIXED_PER_BOOKING"; value: number; minPaise: number | null; maxPaise: number | null };
export type RuleMatch = { channels?: Channel[]; clientCategory?: string; clientOrgId?: string; hotelOrgId?: string; propertyId?: string; cityId?: string; starRating?: number; stayFrom?: string; stayTo?: string; productType?: "HOTEL" | "BUS"; operatorOrgId?: string; routeId?: string };
export type HistoryLine = { at: string; action: string; by: string; note: string | null; status: string };
export interface MarginRule {
  id: string;
  key: string | null;
  name: string;
  note: string | null;
  priority: number;
  match: RuleMatch;
  adjustment: Adjustment;
  allowBelowNet: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: RuleStatus;
  replaces: string | null;
  createdBy: string;
  submittedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  version: number;
  history?: HistoryLine[];
}
export interface TaxRule {
  id: string;
  key: string;
  appliesTo: "ACCOMMODATION" | "SAAS" | "BUS_TRANSPORT";
  sac: string;
  slabMinPaise: number;
  slabMaxPaise: number | null;
  rateBps: number;
  itcAllowed: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceNote: string;
  status: "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "RETIRED";
  proposedBy: string;
  approvedBy: string | null;
  version: number;
}
export type Issuer = { gstin: string | null; stateCode: string; isDefault: boolean };
export interface PricingSettings {
  model: "PRINCIPAL" | "AGENT";
  issuers: Issuer[];
  sellUnregisteredHotels: boolean;
  version: number;
  history: { at: string; by: string; note: string }[];
}
export type NightLine = {
  date: string;
  room: number;
  netPaise: number;
  marginPaise: number;
  ruleId: string;
  sellPaise: number;
  hotelGstPaise: number;
  gst: { rateBps: number; sac: string; cgstPaise: number; sgstPaise: number; igstPaise: number; gstPaise: number; intraState: boolean; taxRuleKey: string };
};
export interface Breakdown {
  channel: Channel;
  rooms: number;
  nights: number;
  lines: NightLine[];
  fee: { ruleId: string; sellPaise: number; gstPaise: number } | null;
  totals: { netPaise: number; marginPaise: number; feePaise: number; sellPaise: number; cgstPaise: number; sgstPaise: number; igstPaise: number; gstPaise: number; totalPaise: number; hotelGstPaise: number; hotelPayablePaise: number };
  ruleIds: string[];
}
export type SimResult = { ok: true; breakdown: Breakdown } | { ok: false; problem: { code: string; reason?: string } };

/** "+₹250 per night", "+15 % (min ₹100, max ₹1,500)", "+₹99 per booking". */
export function adjustmentText(a: Adjustment): string {
  const r = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const sign = a.value < 0 ? "−" : "+";
  if (a.type === "PERCENT") {
    const bounds = [a.minPaise !== null ? `min ${r(a.minPaise)}` : "", a.maxPaise !== null ? `max ${r(a.maxPaise)}` : ""].filter(Boolean).join(", ");
    return `${sign}${Math.abs(a.value) / 100} %${bounds ? ` (${bounds})` : ""}`;
  }
  return `${sign}${r(Math.abs(a.value))} ${a.type === "FIXED_PER_BOOKING" ? "per booking" : "per room per night"}`;
}

/** "Website · Goa · 1 Dec – 5 Jan" — what a rule covers, in words. */
export function matchText(m: RuleMatch, cityName: (id: string) => string): string {
  const parts = [
    m.productType === "BUS" ? "Buses" : "",
    m.channels ? m.channels.map((c) => CHANNEL_LABEL[c]).join(" + ") : "All channels",
    m.cityId ? cityName(m.cityId) : "",
    m.starRating !== undefined ? `${m.starRating}★` : "",
    m.hotelOrgId ? "one hotel company" : "",
    m.propertyId ? "one property" : "",
    m.clientCategory ? `clients "${m.clientCategory}"` : "",
    m.clientOrgId ? "one client" : "",
    m.operatorOrgId ? "one bus company" : "",
    m.routeId ? "one route" : "",
    m.stayFrom || m.stayTo ? `stays ${m.stayFrom ?? "…"} – ${m.stayTo ?? "…"}` : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

const FIELD_TEXT: Record<string, string> = {
  PRIORITY_INVALID: "Priority must be 0–1000",
  CHANNEL_INVALID: "Choose at least one channel",
  STAR_INVALID: "Stars must be 0–5",
  DATE_INVALID: "Date is not valid",
  DATE_RANGE: "End date is before the start",
  VALUE_INVALID: "Amount is out of range",
  BELOW_NET_NOT_ALLOWED: "A negative margin needs \"allow below hotel rate\"",
  BOUNDS_ONLY_FOR_PERCENT: "Min / max only apply to a percentage",
  BOUNDS_RANGE: "Max is below min",
  REPLACES_NOT_ACTIVE: "The rule it replaces is no longer in force",
  SAC_INVALID: "SAC must be 6 digits",
  SLAB_RANGE: "Slab maximum is below its minimum",
  RATE_INVALID: "Rate must be 0–28 %",
  AMOUNT_INVALID: "Amount is not valid",
  ONE_DEFAULT_ISSUER: "Exactly one GSTIN must be the default",
  STATE_INVALID: "Unknown state code",
  GSTIN_INVALID: "GSTIN is not valid for that state",
  STATE_REPEATED: "A state is listed twice",
  PRICING_MODEL_NOT_BUILT: "The agent model isn't built yet (waiting for the CA)",
};

/** Problems the server listed (`errors: [{ code, field }]`) as readable lines. */
export function pricingProblems(error: unknown): string[] {
  const errs = (error as { details?: { errors?: { code: string; field: string }[] } })?.details?.errors ?? [];
  return errs.map((e) => `${FIELD_TEXT[e.code] ?? e.code} (${e.field})`);
}

export const pct = (bps: number) => `${bps / 100} %`;
