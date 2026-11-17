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
