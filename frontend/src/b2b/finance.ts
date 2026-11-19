// Finance (MusafirBaba admin, Stage 07): types of the ledger and payments admin endpoints, and small helpers.
export type LedgerAccount = {
  id: string;
  ownerType: string;
  ownerOrgId: string;
  type: string;
  name: string;
  normal: "DEBIT" | "CREDIT";
  status: string;
  debitPaise: number;
  creditPaise: number;
  balancePaise: number;
  asOf: string | null;
};
export type JournalLine = { accountId: string; debitPaise?: number; creditPaise?: number };
export type JournalEntry = { id: string; reference: { type: string; id: string }; purpose: string; memo: string | null; at: string; createdBy: string; lines: JournalLine[] };

export const REASON_CODES = ["BANK_CHARGES", "PAYU_DIFFERENCE", "MISPOSTING", "WRITE_OFF", "OTHER"] as const;
export type ReasonCode = (typeof REASON_CODES)[number];
export const REASON_LABEL: Record<ReasonCode, string> = {
  BANK_CHARGES: "Bank charges",
  PAYU_DIFFERENCE: "PayU difference",
  MISPOSTING: "Wrong posting",
  WRITE_OFF: "Write-off",
  OTHER: "Other",
};
export type Adjustment = {
  id: string;
  reasonCode: ReasonCode;
  note: string;
  lines: JournalLine[];
  status: "PROPOSED" | "POSTED" | "REJECTED";
  proposedBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  transactionId: string | null;
  createdAt: string;
};

export const INTENT_STATUSES = ["CREATED", "PENDING", "SUCCEEDED", "FAILED", "REFUNDED"] as const;
export type IntentStatus = (typeof INTENT_STATUSES)[number];
export type PaymentRow = {
  id: string;
  txnId: string;
  purpose: string;
  reference: { type: string; id: string };
  amountPaise: number;
  refundedPaise: number;
  status: IntentStatus;
  failureReason: string | null;
  gatewayPaymentId: string | null;
  mode: string | null;
  payer: { firstname: string; email: string };
  createdAt: string;
  lastVerifiedAt: string | null;
};
export type RefundRow = { _id: string; refundId: string; txnId: string; amountPaise: number; reason: string; status: string; gatewayMessage: string | null; requestedBy: string; createdAt: string };
export type SettlementRow = { _id: string; txnId: string; mihpayid: string; action: string; amountPaise: number; feePaise: number; taxPaise: number; settledPaise: number; utr: string | null; settledOn: string; source: string; matched: boolean; journalPosted: boolean };
export type ReconException = { _id: string; kind: string; key: string; txnId: string | null; detail: string; amountPaise: number | null; status: "OPEN" | "RESOLVED"; resolvedBy: string | null; resolution: string | null; raisedAt: string };
export type PayuForm = { intentId: string; txnId: string; action: string; fields: Record<string, string> };
export type SettlementLineInput = { txnid: string; mihpayid: string; amountPaise: number; feePaise: number; taxPaise: number; settledPaise: number; utr: string | null; action: "capture" | "refund"; settledOn: string };

/** "1,234.50" / "1234.5" → 123450 paise, without floating point. Null when it isn't an amount. */
export function rupeesToPaise(text: string): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(text.trim().replace(/,/g, ""));
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/**
 * A settlement file pasted as CSV with a header row. Columns (any order, amounts in rupees):
 * txnid, mihpayid, amount, fee, tax, settled, utr, action (capture/refund), settledOn (YYYY-MM-DD).
 */
export function parseSettlementCsv(text: string): { lines: SettlementLineInput[]; errors: string[] } {
  const rows = text.trim().split(/\r?\n/).map((r) => r.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
  const head = (rows.shift() ?? []).map((h) => h.toLowerCase());
  const col = (row: string[], name: string) => row[head.indexOf(name.toLowerCase())] ?? "";
  const lines: SettlementLineInput[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const amount = rupeesToPaise(col(row, "amount"));
    const money = ["fee", "tax", "settled"].map((n) => (col(row, n) ? rupeesToPaise(col(row, n)) : 0));
    const settledOn = col(row, "settledOn");
    if (!col(row, "txnid") || !col(row, "mihpayid") || amount === null || money.includes(null) || !/^\d{4}-\d{2}-\d{2}$/.test(settledOn)) {
      errors.push(`Row ${i + 2}: check txnid, mihpayid, amounts and settledOn (YYYY-MM-DD)`);
      return;
    }
    lines.push({
      txnid: col(row, "txnid"),
      mihpayid: col(row, "mihpayid"),
      amountPaise: amount,
      feePaise: money[0] ?? 0,
      taxPaise: money[1] ?? 0,
      settledPaise: money[2] ?? 0,
      utr: col(row, "utr") || null,
      action: col(row, "action").toLowerCase() === "refund" ? "refund" : "capture",
      settledOn,
    });
  });
  return { lines, errors };
}

/** Sends the browser to PayU's hosted payment page with the signed fields from our server. */
export function submitPayuForm(form: PayuForm): void {
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
