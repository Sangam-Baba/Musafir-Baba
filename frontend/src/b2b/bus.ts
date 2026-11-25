// Buses and seat layouts — shapes from /api/v1/bus/* (backend/src/b2b/modules/bus-catalog, Stage 18 B2).
export const DECKS = ["LOWER", "UPPER"] as const;
export const SEAT_TYPES = ["SEATER", "SEMI_SLEEPER", "SLEEPER"] as const;
export const PAPER_KINDS = ["RC", "PERMIT", "INSURANCE", "FITNESS"] as const;
export const AMENITIES = ["AC", "WIFI", "CHARGING", "WATER", "BLANKET", "PILLOW", "READING_LIGHT", "CCTV", "GPS", "TOILET", "TV", "SNACKS", "EMERGENCY_EXIT", "FIRE_EXTINGUISHER"] as const;
export const BUS_KINDS = ["SEATER", "SLEEPER", "SEMI_SLEEPER", "MIXED"] as const;
export const MAX_ROWS = 20;
export const MAX_COLS = 8;

export type Deck = (typeof DECKS)[number];
export type SeatType = (typeof SEAT_TYPES)[number];
export type PaperKind = (typeof PAPER_KINDS)[number];
export type Amenity = (typeof AMENITIES)[number];
export type BusKind = (typeof BUS_KINDS)[number];
export type BusStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED" | "SUSPENDED" | "RETIRED";

/** A seat on a layout; `taken` (trips only) = bit mask of route legs sold, held or blocked. */
export interface Seat { no: string; row: number; col: number; type: SeatType; ladies?: boolean; span?: 1 | 2; taken?: number }
export interface DeckGrid { deck: Deck; rows: number; cols: number; seats: Seat[] }
export interface Layout {
  id: string;
  name: string;
  decks: DeckGrid[];
  seatCount: number;
  deckCount: number;
  types: SeatType[];
  ladiesSeats: number;
  version: number;
  updatedAt: string;
}
export interface LayoutTemplate { key: string; name: string; layout: { decks: DeckGrid[] } }
export interface Paper { kind: PaperKind; fileId: string; number: string; expiresOn: string }
export interface Bus {
  id: string;
  regNo: string;
  name: string | null;
  acType: "AC" | "NON_AC";
  kind: BusKind;
  layoutId: string | null;
  amenities: Amenity[];
  papers: Paper[];
  status: BusStatus;
  review: { note: string | null; at: string; by?: string } | null;
  paperProblems?: { kind: PaperKind; code: "PAPER_MISSING" | "PAPER_EXPIRED" }[];
  sellable?: boolean;
  version: number;
  updatedAt: string;
}
/** A bus in the staff review queue (with the operator company and the layout). */
export interface BusInQueue extends Bus {
  operatorOrgId: string;
  operatorName: string | null;
  operatorRef: string | null;
  layout: { name: string; decks: DeckGrid[] } | null;
}

export const BUS_STATUS: Record<BusStatus, { label: string; tone: "orange" | "green" | "blue" | "amber" | "red" | "violet" }> = {
  DRAFT: { label: "Draft", tone: "violet" },
  SUBMITTED: { label: "Waiting for approval", tone: "blue" },
  APPROVED: { label: "Approved", tone: "green" },
  CHANGES_REQUESTED: { label: "Needs changes", tone: "amber" },
  SUSPENDED: { label: "Suspended", tone: "red" },
  RETIRED: { label: "Retired", tone: "violet" },
};
export const PAPER_LABEL: Record<PaperKind, string> = { RC: "Registration (RC)", PERMIT: "Permit", INSURANCE: "Insurance", FITNESS: "Fitness certificate" };
export const SEAT_LABEL: Record<SeatType, string> = { SEATER: "Seat", SEMI_SLEEPER: "Semi-sleeper", SLEEPER: "Sleeper" };
export const KIND_LABEL: Record<BusKind, string> = { SEATER: "Seater", SLEEPER: "Sleeper", SEMI_SLEEPER: "Semi-sleeper", MIXED: "Seater + sleeper" };
export const AMENITY_LABEL: Record<Amenity, string> = {
  AC: "AC", WIFI: "Wi-Fi", CHARGING: "Charging point", WATER: "Water bottle", BLANKET: "Blanket", PILLOW: "Pillow", READING_LIGHT: "Reading light",
  CCTV: "CCTV", GPS: "GPS tracking", TOILET: "Toilet", TV: "TV", SNACKS: "Snacks", EMERGENCY_EXIT: "Emergency exit", FIRE_EXTINGUISHER: "Fire extinguisher",
};

/** Problems with a seat layout, in plain words (codes from the backend `checkLayout`). */
export const LAYOUT_PROBLEM: Record<string, string> = {
  SEAT_NUMBER_INVALID: "A seat number can only use letters and digits (up to 6).",
  SEAT_NUMBER_REPEATED: "Two seats have the same number.",
  SEATS_OVERLAP: "Two seats sit on the same spot.",
  SEAT_OUTSIDE_GRID: "A seat is outside the grid.",
  ONLY_SLEEPERS_SPAN: "Only sleepers can be two cells long.",
  DECKS_ONE_OR_TWO: "A bus has one or two decks.",
  DECK_REPEATED: "The same deck is there twice.",
  SEAT_COUNT_INVALID: "A layout needs between 1 and 80 seats.",
  ROWS_INVALID: `Rows must be between 1 and ${MAX_ROWS}.`,
  COLS_INVALID: `Columns must be between 1 and ${MAX_COLS}.`,
};

/** Days from today (local) until a `YYYY-MM-DD` date; negative when past. */
export function daysUntil(date: string): number {
  const today = new Date();
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1) - t) / 86_400_000);
}

/** The next free seat number on a deck ("L" / "U" prefix for sleepers on two-deck buses is up to the operator). */
export function nextSeatNo(decks: DeckGrid[]): string {
  const used = new Set(decks.flatMap((d) => d.seats.map((s) => s.no)));
  let n = 1;
  while (used.has(String(n))) n += 1;
  return String(n);
}

// ── Stage 18 B3: points, routes, schedules, trips ──
export const MAX_STOPS = 31;
export const WEEKDAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface BusStop { id: string; cityId: string; name: string; address: string | null; landmark: string | null; lat: number | null; lng: number | null; active: boolean; version: number }
export interface RouteStop { stopId: string; cityId?: string; dayOffset: number; time: string; boarding: boolean; dropping: boolean }
export interface BusRoute {
  id: string;
  name: string;
  stops: RouteStop[];
  fromCityId: string;
  toCityId: string;
  status: BusStatus;
  review: { note: string | null; at: string } | null;
  version: number;
  updatedAt: string;
}
export interface RouteInQueue extends BusRoute { operatorOrgId: string; operatorName: string | null; operatorRef: string | null; stopNames: Record<string, string | null> }
export interface BusSchedule { id: string; routeId: string; vehicleId: string; weekdays: number[]; validFrom: string; validTo: string | null; status: "ACTIVE" | "ENDED"; endedFrom: string | null; version: number }
export interface TripStop { stopId: string; cityId: string; name: string; at: string; boarding: boolean; dropping: boolean }
export interface Trip { id: string; scheduleId: string; routeId: string; vehicleId: string; layoutId: string; date: string; stops: TripStop[]; departAt: string; arriveAt: string; seatCount: number; status: "SCHEDULED" | "CANCELLED"; saleStopped: boolean; cancelReason: string | null }
/** A trip with its own seat map (copied when the trip was made) and each seat's taken legs. */
export interface TripDetail extends Trip { decks: DeckGrid[] }

/** Route problems in plain words (codes from the backend `checkRoute`). */
export const ROUTE_PROBLEM: Record<string, string> = {
  STOPS_TWO_TO_31: "A route needs between 2 and 31 stops.",
  STOP_REPEATED: "The same point is on the route twice.",
  STOP_UNUSED: "Each stop must allow boarding, dropping or both.",
  TIME_INVALID: "A time isn't valid (use HH:MM, 24-hour).",
  DAY_OFFSET_INVALID: "The day must be the departure day or up to 3 days later.",
  TIMES_NOT_IN_ORDER: "Each stop must be later than the one before (use “next day” after midnight).",
  FIRST_STOP_MUST_BOARD: "Passengers must be able to board at the first stop.",
  LAST_STOP_MUST_DROP: "Passengers must be able to get off at the last stop.",
  STOP_NOT_FOUND: "A point isn't yours or is switched off.",
  FROM_TO_SAME_CITY: "The first and last stops are in the same city.",
};

/** "22:45" or "04:30 (+1 day)". */
export const stopTime = (s: { dayOffset: number; time: string }) => (s.dayOffset ? `${s.time} (+${s.dayOffset} day${s.dayOffset > 1 ? "s" : ""})` : s.time);
/** A moment in Indian time, e.g. "Sat 12 Dec, 22:00". */
export const istTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
/** How many legs of the route a seat has sold / held / blocked (bits set in `taken`). */
export const legsTaken = (taken: number) => taken.toString(2).split("").filter((b) => b === "1").length;

// ── Stage 18 B4: counter blocks, stop sale, fares ──
export interface SeatClaim { id: string; tripId: string; kind: "HOLD" | "BLOCK"; seats: string[]; fromIdx: number; toIdx: number; status: string; by: string; note: string | null; createdAt: string }
export interface FareRow { fromIdx: number; toIdx: number; seatType: SeatType; deck: Deck | null; netPaise: number }
export interface DateRule { id?: string | null; label: string; from: string; to: string; weekdays: number[]; addPaise: number }
export interface RouteFares { routeId: string; rows: FareRow[]; rules: DateRule[]; version: number; history: { at: string; by: string; summary: string }[] }

export const FARE_PROBLEM: Record<string, string> = {
  FARE_STOPS_INVALID: "A fare's stops are wrong (board at the first, get off at a later stop).",
  FARE_AMOUNT_INVALID: "Fares must be between ₹1 and ₹10,000.",
  FARE_REPEATED: "The same fare (stops, seat type and deck) is there twice.",
  SEAT_TYPE_INVALID: "Unknown seat type.",
  RULE_DATES_INVALID: "A date rule's dates are wrong (last day on or after the first, within a year).",
  WEEKDAYS_INVALID: "A date rule has a wrong weekday.",
  RULE_AMOUNT_INVALID: "A date rule must add or take off between ₹1 and ₹5,000.",
  TOO_MANY_FARES: "At most 2,000 fares per route.",
  TOO_MANY_RULES: "At most 50 date rules per route.",
};
/** ₹ from paise, e.g. 90000 → "₹900". */
export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
