// Website hotel search (Stage 06): API shapes, the public API helper and small helpers.
// Website visitors don't sign in to search: calls go to the B2B API without a token (per-IP limits on the server).
import { B2B_API, B2BError } from "../api";

/** The whole hotels section is behind this switch (off by default) — the pages show "coming soon" until it's on. */
export const HOTELS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_HOTELS === "true";

export type Destination = { type: "CITY" | "AREA" | "PROPERTY"; id: string; name: string; cityId: string; cityName: string; ref?: string; slug?: string };
export type RoomAsk = { adults: number; childrenAges: number[] };
export type Stay = { checkIn: string; checkOut: string; rooms: RoomAsk[] };
export type SearchItem = {
  id: string;
  publicRef: string;
  slug: string;
  name: string;
  starRating: number;
  cityName: string | null;
  areaName: string | null;
  location: { lat: number; lng: number } | null;
  distanceKm: number | null;
  coverUrl: string | null;
  amenities: string[];
  soldOut: boolean;
  from: { totalPaise: number; perNightPaise: number; roomTypeName: string; planName: string; mealPlanKey: string; refundable: boolean } | null;
};
export type SearchResult = { total: number; items: SearchItem[]; nextCursor: string | null; nights: number; rooms: number };
export type Offer = {
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: string;
  planName: string;
  mealPlanKey: string;
  refundable: boolean;
  cancellation: string;
  roomsLeft: number;
  price: { totalPaise: number; gstPaise: number; nights: number; rooms: number };
  priceToken: string;
};
export type OffersResult = { property: { id: string; publicRef: string; name: string }; soldOut: boolean; offers: Offer[] };
export type PriceCheck = { status: "OK" | "PRICE_CHANGED" | "SOLD_OUT"; quotedTotalPaise: number; price?: { totalPaise: number }; priceToken?: string };

export const MEAL_LABEL: Record<string, string> = { ep: "Room only", cp: "Breakfast included", map: "Breakfast + dinner", ap: "All meals" };

/** A public API call (no sign-in). */
export async function hotelsApi<T>(path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${B2B_API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new B2BError(res.status, typeof data?.code === "string" ? data.code : `HTTP_${res.status}`, typeof data?.title === "string" ? data.title : "Request failed", data ?? {});
  return data as T;
}

/** "₹1,995" — whole rupees when there are no paise. */
export const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: paise % 100 ? 2 : 0 })}`;

const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (date: string, n: number) => iso(new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000));
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

/** Rooms in the URL: "2-0,2-5.8" = room 1: 2 adults; room 2: 2 adults + children aged 5 and 8. */
export function roomsToParam(rooms: RoomAsk[]): string {
  return rooms.map((r) => [r.adults, r.childrenAges.join(".")].filter((x, i) => i === 0 || x !== "").join("-")).join(",");
}
export function roomsFromParam(raw: string | null): RoomAsk[] {
  const rooms = (raw ?? "2")
    .split(",")
    .slice(0, 9)
    .map((part) => {
      const [a, kids] = part.split("-");
      const adults = Math.min(Math.max(Number(a) || 2, 1), 8);
      const childrenAges = (kids ?? "").split(".").filter(Boolean).map(Number).filter((n) => n >= 0 && n <= 17).slice(0, 4);
      return { adults, childrenAges };
    });
  return rooms.length ? rooms : [{ adults: 2, childrenAges: [] }];
}
export const guestsText = (rooms: RoomAsk[]) => {
  const g = rooms.reduce((n, r) => n + r.adults + r.childrenAges.length, 0);
  return `${rooms.length} room${rooms.length > 1 ? "s" : ""} · ${g} guest${g > 1 ? "s" : ""}`;
};
