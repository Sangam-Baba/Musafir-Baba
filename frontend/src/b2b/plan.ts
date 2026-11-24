// Client plan and billing (Stage 13): shapes from the server.
export type Plan = { id: string; key: string; name: string; monthlyQueryLimit: number; pricePaise: number; limitBehaviour: "BLOCK" | "OVERAGE"; overagePricePerQueryPaise: number; trialDays: number; features: { users: number; branches: number; api: boolean; webhooks: boolean } };
export type MySubscription = {
  planKey: string;
  planName: string;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
  period: string;
  trialEndsAt: string | null;
  pricePaise: number;
  limitBehaviour: "BLOCK" | "OVERAGE";
  overagePricePerQueryPaise: number;
  used: number;
  allowance: number;
  percent: number;
  forecast: number;
  pending: { action: "DOWNGRADE" | "CANCEL"; planKey: string; at: string } | null;
  version: number;
};
export type ChangePreview = { kind: "UPGRADE" | "DOWNGRADE"; planKey: string; planName: string; from: string; chargeNowPaise: number; includedQueries: number; version: number };
export type SaasInvoice = { id: string; number: string; period: string; status: "ISSUED" | "PAID" | "UNPAID" | "VOID"; totals: { taxablePaise: number; gstPaise: number; totalPaise: number }; issuedAt: string; paidAt: string | null };
export const STATUS_TEXT: Record<MySubscription["status"], string> = { TRIAL: "Free trial", ACTIVE: "Active", PAST_DUE: "Payment due", SUSPENDED: "Paused — unpaid", CANCELLED: "Cancelled" };
