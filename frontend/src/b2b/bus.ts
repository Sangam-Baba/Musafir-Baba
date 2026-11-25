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

export interface Seat { no: string; row: number; col: number; type: SeatType; ladies?: boolean; span?: 1 | 2 }
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
