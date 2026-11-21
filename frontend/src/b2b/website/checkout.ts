// Website booking (Stage 08): the guest's browser id, the order API calls and their shapes.
// Guests book without an account: the browser keeps a random id (sent as X-Guest-Session) so the same browser sees its
// orders; the order link from the email carries its own key. Online booking is behind NEXT_PUBLIC_FEATURE_HOTEL_BOOKING
// (off by default) — with it off the Reserve button stays "call us", as today.
import { useAuthStore } from "@/store/useAuthStore"; // the existing website login — read only

import { hotelsApi, type Offer, type RoomAsk } from "./hotels";

export const BOOKING_ENABLED = process.env.NEXT_PUBLIC_FEATURE_HOTEL_BOOKING === "true";

export type OrderStatus = "HOLDING" | "AWAITING_PAYMENT" | "PAYMENT_PENDING" | "CONFIRMING" | "CONFIRMED" | "FAILED" | "EXPIRED" | "CANCELLED" | "COMPLETED";
export type OrderItem = {
  ref: string;
  status: string;
  property: { name: string; address: { line1: string | null; line2: string | null; pin: string | null }; city: string | null; area: string | null; checkInTime: string | null; checkOutTime: string | null };
  roomTypeName: string;
  ratePlanName: string;
  mealPlanKey: string | null;
  cancellation: { summary: string; nonRefundable: boolean };
  stay: { checkIn: string; checkOut: string; nights: number; occupancies: { adults: number; children: number }[] };
  rooms: { leadGuest: string; guests: string[] }[];
  specialRequests: string | null;
  price: { totalPaise: number; gstPaise: number };
};
export type Order = {
  ref: string;
  status: OrderStatus;
  totalPaise: number;
  gstPaise: number;
  holdExpiresAt: string | null;
  holdExtended: boolean;
  payment: { txnId: string | null; windowEndsAt: string | null; verified: boolean };
  contact: { name: string; email: string; phone: string };
  items: OrderItem[];
  failure: { code: string } | null;
  createdAt: string;
  confirmedAt: string | null;
  linkKey?: string;
};
export type PayuForm = { txnId: string; action: string; fields: Record<string, string>; windowEndsAt: string };
export type OrderDocument = { id: string; type: "VOUCHER" | "TAX_INVOICE" | "RECEIPT" | "CREDIT_NOTE"; version: number; number: string | null; issuedAt: string };

/** What the hotel page hands to checkout (kept in this browser tab only). */
export type CheckoutOffer = { hotelName: string; hotelSlug: string; checkIn: string; checkOut: string; rooms: RoomAsk[]; offer: Offer };
const OFFER_KEY = "mb-checkout-offer";
const SESSION_KEY = "mb-guest-session";

export function saveCheckoutOffer(o: CheckoutOffer) {
  try {
    sessionStorage.setItem(OFFER_KEY, JSON.stringify(o));
  } catch {
    /* private mode: checkout shows "start again" */
  }
}
export function loadCheckoutOffer(): CheckoutOffer | null {
  try {
    const raw = sessionStorage.getItem(OFFER_KEY);
    return raw ? (JSON.parse(raw) as CheckoutOffer) : null;
  } catch {
    return null;
  }
}

/** A random id for request keys and the guest session (URL-safe). */
export function randomId(bytes = 18): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** This browser's guest id (created once; kept in localStorage). */
export function guestSession(): string {
  try {
    const have = localStorage.getItem(SESSION_KEY);
    if (have && /^[A-Za-z0-9_-]{20,100}$/.test(have)) return have;
    const id = randomId(24);
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return randomId(24); // storage blocked: this page still works; the order link opens it later
  }
}

/** A signed-in website customer's existing login token (read only), so their bookings belong to their account. */
function customerToken(): string | null {
  try {
    const a = useAuthStore.getState();
    return a.isAuthenticated && a.role === "user" && a.accessToken ? a.accessToken : null;
  } catch {
    return null;
  }
}

const headers = (extra: Record<string, string> = {}): Record<string, string> => {
  const token = customerToken();
  return { "X-Guest-Session": guestSession(), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
};
const withKey = (path: string, key?: string | null) => (key ? `${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}` : path);

export type CreateOrderInput = {
  priceToken: string;
  rooms: { leadGuest: string; guests?: string[] }[];
  contact: { name: string; email: string; phone: string };
  specialRequests?: string | null;
  confirmDuplicate?: boolean;
};

export const createOrder = (input: CreateOrderInput, requestKey: string) =>
  hotelsApi<Order>("/orders", input, { headers: { "Content-Type": "application/json", ...headers({ "Idempotency-Key": requestKey }) } });

export const getOrder = (ref: string, key?: string | null) => hotelsApi<Order>(withKey(`/orders/${encodeURIComponent(ref)}`, key), undefined, { headers: headers(), cache: "no-store" });

export const startPayment = (ref: string, key: string | null, requestKey: string) =>
  hotelsApi<PayuForm>(withKey(`/orders/${encodeURIComponent(ref)}/payments`, key), {}, { headers: { "Content-Type": "application/json", ...headers({ "Idempotency-Key": requestKey }) } });

export const extendHold = (ref: string, key: string | null) =>
  hotelsApi<Order>(withKey(`/orders/${encodeURIComponent(ref)}/extend-hold`, key), {}, { headers: { "Content-Type": "application/json", ...headers() } });

export const orderDocuments = (ref: string, key?: string | null) =>
  hotelsApi<{ data: OrderDocument[] }>(withKey(`/orders/${encodeURIComponent(ref)}/documents`, key), undefined, { headers: headers(), cache: "no-store" });

/** The link to a document page (opens in a new tab; works with the order link key). */
export const documentUrl = (base: string, ref: string, id: string, key?: string | null) => withKey(`${base}/orders/${encodeURIComponent(ref)}/documents/${id}`, key);

/** Sends the browser to PayU's hosted page with the signed fields from our server. */
export function submitToPayu(form: PayuForm) {
  const el = document.createElement("form");
  el.method = "POST";
  el.action = form.action;
  for (const [name, value] of Object.entries(form.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    el.appendChild(input);
  }
  document.body.appendChild(el);
  el.submit();
}

export const NAME_RE = /^[\p{L}][\p{L} .'-]{0,59}$/u;
export const DOC_LABEL: Record<OrderDocument["type"], string> = { VOUCHER: "Hotel voucher", TAX_INVOICE: "GST tax invoice", RECEIPT: "Payment receipt", CREDIT_NOTE: "GST credit note (refund)" };

// Stage 09: the customer's hotel bookings (a new page — the existing website bookings page is not touched).
export type BookingRow = { bookingRef: string; orderRef: string; propertyName: string | null; destination: string | null; leadGuest: string | null; checkIn: string | null; checkOut: string | null; bookingStatus: string; orderStatus: string; paymentState: "UNPAID" | "PAID" | "PARTLY_REFUNDED" | "REFUNDED"; totalPaise: number; refundedPaise: number; orderCreatedAt: string };
export type Moment = { at: string; hotelTime: string };
export type Terms = { timeZone: string; checkInAt: string; checkInHotelTime: string; nonRefundable: boolean; freeUntil: Moment | null; steps: { from: Moment | null; text: string }[]; summary: string; ifCancelledNow: { chargePaise: number; refundPaise: number }; canCancelOnline: boolean };
export type BookingDetail = {
  booking: OrderItem & { confirmedAt: string | null; cancelled: { chargePaise: number; refundPaise: number; requestedAt: string } | null };
  terms: Terms;
  order: { ref: string; status: OrderStatus; totalPaise: number; gstPaise: number; createdAt: string; confirmedAt: string | null };
  payments: { txnId: string; status: string; amountPaise: number; mode: string | null; at: string }[];
  refunds: { status: string; amountPaise: number; reason: string; at: string }[];
  documents: OrderDocument[];
};

export const myHotelBookings = () => hotelsApi<{ data: BookingRow[] }>("/bookings/hotels", undefined, { headers: headers(), cache: "no-store" });
export const hotelBooking = (ref: string, key?: string | null) => hotelsApi<BookingDetail>(withKey(`/bookings/hotels/${encodeURIComponent(ref)}`, key), undefined, { headers: headers(), cache: "no-store" });
export const STATUS_TEXT: Record<string, string> = { CONFIRMED: "Confirmed", HELD: "Waiting for payment", EXPIRED: "Not paid in time", FAILED: "Not completed", CANCELLING: "Cancelling", CANCELLED: "Cancelled", COMPLETED: "Stayed", NO_SHOW: "No-show", HOTEL_FAILED: "Hotel couldn't honour" };

export type CancellationQuote = { quoteToken: string; chargePaise: number; refundPaise: number; expiresAt: string; nonRefundable: boolean; paidPaise: number };
export const cancellationQuote = (ref: string, key?: string | null) =>
  hotelsApi<CancellationQuote>(withKey(`/bookings/hotels/${encodeURIComponent(ref)}/cancellation-quote`, key), {}, { headers: { "Content-Type": "application/json", ...headers() } });
export const cancelHotelBooking = (ref: string, key: string | null, quoteToken: string, reason: string | null, requestKey: string) =>
  hotelsApi<{ chargePaise: number; refundPaise: number }>(withKey(`/bookings/hotels/${encodeURIComponent(ref)}/cancel`, key), { quoteToken, reason }, { headers: { "Content-Type": "application/json", ...headers({ "Idempotency-Key": requestKey }) } });

export const AMENDMENT_TYPES = { MODIFY_DATES: "Change dates", MODIFY_GUESTS: "Change guest names", UPGRADE_ROOM: "Better room", REFUND_REQUEST: "Refund question", OTHER: "Something else" } as const;
export type AmendmentType = keyof typeof AMENDMENT_TYPES;
export type ChangeRequest = { id: string; ref: string; type: AmendmentType; status: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED"; messages: { at: string; from: string; text: string }[]; resolution: string | null; createdAt: string };
export const changeRequests = (ref: string, key?: string | null) => hotelsApi<{ data: ChangeRequest[] }>(withKey(`/bookings/hotels/${encodeURIComponent(ref)}/amendments`, key), undefined, { headers: headers(), cache: "no-store" });
export const openChangeRequest = (ref: string, key: string | null, body: { type: AmendmentType; message: string; guestNames?: { room: number; leadGuest: string }[] }) =>
  hotelsApi<ChangeRequest>(withKey(`/bookings/hotels/${encodeURIComponent(ref)}/amendments`, key), body, { headers: { "Content-Type": "application/json", ...headers() } });
export const replyChangeRequest = (ref: string, key: string | null, id: string, text: string) =>
  hotelsApi<ChangeRequest>(withKey(`/bookings/hotels/${encodeURIComponent(ref)}/amendments/${id}/messages`, key), { text }, { headers: { "Content-Type": "application/json", ...headers() } });

export type NoShowInfo = { status: "DISPUTE_WINDOW" | "DISPUTED" | "FINAL" | "REVERSED"; disputeUntil: string; chargePaise: number; refundPaise: number; dispute: { at: string; message: string } | null; resolution: { decision: string; note: string } | null };
export const bookingNoShow = (ref: string, key?: string | null) => hotelsApi<{ noShow: NoShowInfo | null }>(withKey(`/bookings/hotels/${encodeURIComponent(ref)}/no-show`, key), undefined, { headers: headers(), cache: "no-store" });
export const disputeNoShow = (ref: string, key: string | null, message: string) =>
  hotelsApi<NoShowInfo>(withKey(`/bookings/hotels/${encodeURIComponent(ref)}/no-show-dispute`, key), { message }, { headers: { "Content-Type": "application/json", ...headers() } });
