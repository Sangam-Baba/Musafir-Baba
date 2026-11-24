// Stage 14 (API keys and webhooks): the shapes the Developers page reads, labels, and the second-factor retry.
import { b2b, B2BError } from "./api";

export const SCOPES = [
  { value: "hotel:search", label: "Search hotels and prices" },
  { value: "hotel:book", label: "Book, pay, cancel and change bookings" },
  { value: "orders:read", label: "Read orders and bookings" },
  { value: "wallet:read", label: "Read the wallet balance" },
  { value: "webhooks:manage", label: "Manage webhook addresses" },
] as const;
export type Scope = (typeof SCOPES)[number]["value"];

export const EVENTS = [
  { value: "booking.confirmed", label: "Booking confirmed" },
  { value: "booking.cancelled", label: "Booking cancelled" },
  { value: "booking.hotel_failed", label: "Hotel couldn't honour a booking" },
  { value: "booking.amended", label: "Change request closed" },
  { value: "payment.succeeded", label: "Payment received (PayU)" },
  { value: "refund.processed", label: "Refund done" },
  { value: "wallet.low_balance", label: "Wallet balance low" },
  { value: "quota.threshold_reached", label: "Plan limit 80 % / 100 %" },
] as const;

export type ApiKey = {
  id: string;
  name: string;
  env: "live" | "test";
  prefix: string;
  display: string;
  scopes: Scope[];
  ipAllowList: string[];
  status: "ACTIVE" | "REVOKED";
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
};
export type NewKey = ApiKey & { key: string };
export type Endpoint = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  status: "ACTIVE" | "DISABLED";
  disabledReason: string | null;
  failingSince: string | null;
  secretRotatingUntil: string | null;
  version: number;
  createdAt: string;
};
export type Delivery = {
  id: string;
  endpointId: string;
  eventId: string;
  type: string;
  status: "PENDING" | "SENDING" | "SUCCEEDED" | "FAILED";
  attempts: number;
  nextAttemptAt: string | null;
  lastAttemptAt: string | null;
  responseCode: number | null;
  responseSnippet: string | null;
  error: string | null;
  replayOf: string | null;
  createdAt: string;
};

/**
 * Run a call that may need a fresh second-factor check (creating / rotating a key): on STEP_UP_REQUIRED ask for the
 * 6-digit code once, confirm it, and try again.
 */
export async function withStepUp<T>(call: () => Promise<T>, askCode: () => string | null): Promise<T> {
  try {
    return await call();
  } catch (e) {
    if (!(e instanceof B2BError) || e.code !== "STEP_UP_REQUIRED") throw e;
    const code = askCode()?.trim();
    if (!code) throw e;
    await b2b("/me/step-up", { method: "POST", body: { code } });
    return call();
  }
}

export const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN") : "—");
