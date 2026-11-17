// Shapes of the rooms / prices / rules API (Stage 04, backend/src/b2b/modules/hotel-inventory). Amounts are paise.
export type Price = { guests: number; amount: number };

export interface DayRules {
  prices: Price[];
  minLos: number | null;
  maxLos: number | null;
  closedToArrival: boolean;
  closedToDeparture: boolean;
  stopSell: boolean;
}

export interface CalendarNight {
  date: string;
  total: number;
  booked: number;
  held: number;
  available: number;
  stopSell: boolean;
  editable: boolean;
}

export interface CalendarPlan {
  id: string;
  name: string;
  mealPlanKey: string;
  pricingModel: "PER_ROOM" | "PER_OCCUPANCY";
  status: "ACTIVE" | "INACTIVE";
  derived: { parentRatePlanId: string; adjust: { type: "AMOUNT" | "PERCENT"; value: number } } | null;
  priceKeys: number[];
  days: (DayRules & { date: string; editable: boolean })[];
}

export interface Calendar {
  property: { id: string; name: string; timeZone: string };
  dates: string[];
  today: string;
  roomTypes: { id: string; name: string; maxOccupancy: number; nights: CalendarNight[]; ratePlans: CalendarPlan[] }[];
}

export interface EditResult {
  preview: boolean;
  changeId?: string;
  nights: number;
  refused: { roomTypeId: string; date: string; booked: number; held: number }[];
  skipped: { past: string[]; beyondWindow: string[] };
  warnings: { ratePlanId: string; roomTypeId: string; date: string; guests: number; from: number; to: number }[];
}

export interface ChangeEntry {
  id: string;
  kind: "EDIT" | "UNDO" | "OVERRIDE" | "IMPORT";
  by: string;
  at: string;
  from: string;
  to: string;
  reason: string | null;
  undoOf: string | null;
  undoneAt: string | null;
}

/** ₹ from paise (no decimals when whole). */
export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: paise % 100 ? 2 : 0 })}`;

/** 'YYYY-MM-DD' + n days. */
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** A request id for repeat-safe changes. */
export const newRequestId = () => `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const KIND_TEXT: Record<ChangeEntry["kind"], string> = { EDIT: "Change", UNDO: "Undo", OVERRIDE: "MusafirBaba change", IMPORT: "File import" };

export type PenaltyType = "PERCENT" | "NIGHTS" | "FIXED";
export interface Penalty { type: PenaltyType; value: number }
export interface Policy {
  id: string;
  name: string;
  nonRefundable: boolean;
  rules: { hoursBefore: number; penalty: Penalty }[];
  noShow: Penalty;
  summary: string;
  status: "ACTIVE" | "ARCHIVED";
  version: number;
}

export interface RatePlan {
  id: string;
  name: string;
  roomTypeIds: string[];
  mealPlanKey: string;
  cancellationPolicyId: string;
  pricingModel: "PER_ROOM" | "PER_OCCUPANCY";
  minAdvanceDays: number;
  maxAdvanceDays: number;
  derived: { parentRatePlanId: string; adjust: { type: "AMOUNT" | "PERCENT"; value: number } } | null;
  order: number;
  status: "ACTIVE" | "INACTIVE";
  version: number;
}

/** Problems the server listed (422 with `errors`), as readable lines. */
export function problemList(error: unknown): string[] {
  const details = (error as { details?: { errors?: { path: string; code: string }[] } })?.details;
  return (details?.errors ?? []).map((e) => `${PROBLEM_TEXT[e.code] ?? e.code}${e.path ? ` (${e.path})` : ""}`);
}

export const PROBLEM_TEXT: Record<string, string> = {
  NON_REFUNDABLE_HAS_RULES: "A non-refundable policy can't have rules",
  TOO_MANY_RULES: "At most 5 rules",
  RULE_HOURS_REPEATED: "Two rules have the same hours",
  RULE_HOURS_OUT_OF_RANGE: "Hours must be between 0 and 8760",
  PENALTY_DECREASES_CLOSER_TO_CHECK_IN: "A rule closer to check-in can't cost less",
  PENALTY_PERCENT_OUT_OF_RANGE: "Percent must be 1–100",
  PENALTY_NIGHTS_OUT_OF_RANGE: "Nights must be 1–30",
  PENALTY_FIXED_OUT_OF_RANGE: "Amount must be at least ₹1",
  ROOM_TYPE_REQUIRED: "Choose at least one room type",
  ROOM_TYPE_UNKNOWN: "Unknown room type",
  MEAL_PLAN_UNKNOWN: "Unknown meal plan",
  POLICY_UNKNOWN: "Choose a cancellation policy",
  ADVANCE_DAYS_ORDER: "\"From\" days ahead must be less than \"until\"",
  ADJUST_OUT_OF_RANGE: "The adjustment is out of range",
  PARENT_IS_SELF: "A plan can't follow itself",
  PARENT_UNKNOWN: "The plan to follow doesn't exist",
  PARENT_IS_DERIVED: "Follow a plan that has its own prices",
  PARENT_PRICING_MODEL_DIFFERS: "Use the same pricing as the plan it follows",
  ROOM_TYPE_NOT_IN_PARENT: "Only room types of the plan it follows",
  PLANS_DERIVED_FROM_IT: "Other plans follow this one, so it can't follow another",
  DERIVED_PLANS_NEED_PRICING_MODEL: "Plans following this one need its pricing",
  DERIVED_PLANS_NEED_ROOM_TYPE: "Plans following this one need these room types",
  RATE_PLAN_UNKNOWN: "Unknown rate plan",
  ROOM_TYPE_NOT_IN_PLAN: "The plan doesn't sell this room type",
  PRICES_COME_FROM_PARENT: "This plan's prices come from the plan it follows",
  PRICE_GUESTS_INVALID: "A price for a number of guests this room can't take",
  PRICE_GUESTS_REPEATED: "The same number of guests twice",
  STAY_LIMITS_ORDER: "Minimum stay is above maximum stay",
  NOTHING_TO_CHANGE: "Nothing to change",
};
