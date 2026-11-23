// Client wallet (Stage 11): types and helpers for /business/wallet. Amounts are paise from the server.
export type Wallet = {
  accountId: string;
  balancePaise: number;
  heldPaise: number;
  creditLimitPaise: number;
  availablePaise: number;
  creditUsedPaise: number;
  creditDueDays: number;
  negativeSince: string | null;
  lowBalanceThresholdPaise: number;
  status: string;
};
export type Credit = { limitPaise: number; dueDays: number; usedPaise: number; availablePaise: number; usedSince: string | null; dueAt: string | null; overdue: boolean };
export type TopUp = { txnId: string; amountPaise: number; status: "CREATED" | "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED"; createdAt: string; paidLate: boolean };
export const TRANSFER_METHODS = ["NEFT", "RTGS", "IMPS", "UPI"] as const;
export type ManualTopUp = {
  id: string;
  ref: string;
  amountPaise: number;
  method: (typeof TRANSFER_METHODS)[number];
  utr: string;
  paidOn: string;
  status: "SUBMITTED" | "CHECKED" | "APPROVED" | "REJECTED";
  decisionNote: string | null;
  createdAt: string;
};
export type WalletStatement = {
  from: string;
  to: string;
  openingPaise: number;
  closingPaise: number;
  lines: { at: string; description: string; reference: string; memo: string | null; amountPaise: number; balancePaise: number }[];
  truncated: boolean;
};

/** What a top-up's status means to the client. */
export function topUpLabel(t: TopUp): string {
  if (t.status === "SUCCEEDED" || t.paidLate) return "Added";
  if (t.status === "FAILED") return "Not paid";
  if (t.status === "REFUNDED") return "Refunded";
  return "Waiting for payment";
}
export const MANUAL_LABEL: Record<ManualTopUp["status"], string> = {
  SUBMITTED: "Waiting for our check",
  CHECKED: "Checked — waiting for approval",
  APPROVED: "Added",
  REJECTED: "Not accepted",
};

/** A fresh key for one money request (the same click retried never pays twice). */
export function idempotencyKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `w-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
