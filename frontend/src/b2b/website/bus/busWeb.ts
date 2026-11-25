// Website bus booking (Stage 18 B8): API calls for public visitors and website customers. Everything is behind
// NEXT_PUBLIC_FEATURE_BUS (pages show "coming soon" while it's off); booking also needs the server's selling switch.
// Same guest session / customer login as hotel bookings (checkout.ts), so orders belong to the same buyer.
import type { BusResult, BusTicketView, BuyerSeatMap, CancelQuote } from "../../bus";
import { orderHeaders, randomId, type Order } from "../checkout";
import { hotelsApi } from "../hotels";

export const BUS_WEB_ENABLED = process.env.NEXT_PUBLIC_FEATURE_BUS === "true";

export type BusOrder = Omit<Order, "items"> & { items: BusTicketView[] };
export type City = { id: string; name: string };
export type PassengerInput = { no: string; passenger: { name: string; age: number; gender: "F" | "M" | "O" } };

const withKey = (path: string, key?: string | null) => (key ? `${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}` : path);

export const busCities = async () => (await hotelsApi<{ cities: City[] }>("/catalog/masters")).cities;

export const searchBuses = (q: { from: string; to: string; date: string; ac?: string; seatType?: string; sort?: string }) =>
  hotelsApi<{ data: BusResult[] }>(`/buses/search?${new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString()}`, undefined, { headers: orderHeaders(), cache: "no-store" });

export const busSeatMap = (tripId: string, from: string, to: string) =>
  hotelsApi<BuyerSeatMap>(`/buses/trips/${tripId}/seats?from=${from}&to=${to}`, undefined, { headers: orderHeaders(), cache: "no-store" });

export const createBusOrder = (body: { tripId: string; fromStopId: string; toStopId: string; seats: PassengerInput[]; contact: { name: string; email: string; phone: string }; expectedTotalPaise: number }, requestKey: string) =>
  hotelsApi<BusOrder>("/bus-orders", body, { headers: { "Content-Type": "application/json", ...orderHeaders({ "Idempotency-Key": requestKey }) } });

export const getBusOrder = (ref: string, key?: string | null) => hotelsApi<BusOrder>(withKey(`/orders/${encodeURIComponent(ref)}`, key), undefined, { headers: orderHeaders(), cache: "no-store" });

export const busCancelQuote = (pnr: string, seats: string[], key?: string | null) =>
  hotelsApi<CancelQuote>(withKey(`/bookings/buses/${encodeURIComponent(pnr)}/cancel-quote?seats=${seats.join(",")}`, key), undefined, { headers: orderHeaders(), cache: "no-store" });

export const cancelBusSeats = (pnr: string, seats: string[], expectedRefundPaise: number, key?: string | null) =>
  hotelsApi<{ refundPaise: number }>(withKey(`/bookings/buses/${encodeURIComponent(pnr)}/cancel`, key), { seats, expectedRefundPaise }, { headers: { "Content-Type": "application/json", ...orderHeaders({ "Idempotency-Key": randomId() }) } });
