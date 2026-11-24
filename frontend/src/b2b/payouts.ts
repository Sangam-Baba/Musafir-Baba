// Stage 15 (payouts, GST registers, reports, branding): the shapes the screens read, and CSV download helpers.
import { B2B_API, refreshBusinessSession } from "./api";
import { useBusinessSession } from "./session-store";

export type RunStatus = "DRAFT" | "APPROVED" | "FILE_READY" | "PAID" | "CANCELLED";
export type RunTotals = { lines: number; held: number; grossPaise: number; deductionsPaise: number; netPaise: number };
export type PayoutRun = {
  id: string;
  ref: string;
  status: RunStatus;
  cycleEnd: string;
  totals: RunTotals;
  preparedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  bankReference: string | null;
  paidAt: string | null;
  createdAt: string;
};
export type Deduction = { ruleId: string; label: string; amountPaise: number };
export type PayoutLine = {
  id: string;
  hotelOrgId: string;
  payables: number;
  grossPaise: number;
  deductions: Deduction[];
  netPaise: number;
  status: "INCLUDED" | "HELD";
  holdReasons: string[];
  note: string | null;
  paid: boolean;
};
export type DeductionRule = { id: string; hotelOrgId: string | null; label: string; type: "PERCENT" | "FIXED"; valueBps: number; amountPaise: number; status: "ACTIVE" | "RETIRED" };
export type Dispute = { id: string; hotelOrgId: string; payableId: string; bookingRef: string; message: string; status: "OPEN" | "ACCEPTED" | "REJECTED"; resolution: string | null; resolvedAt: string | null; createdAt: string };
export type PayoutStatement = {
  id: string;
  ref: string | null;
  paidAt: string | null;
  bankReference: string | null;
  lines: { payableId: string; bookingRef: string; orderRef: string; checkOut: string; amountPaise: number }[];
  grossPaise: number;
  deductions: Deduction[];
  netPaise: number;
};

export const HOLD_LABEL: Record<string, string> = {
  KYC_NOT_APPROVED: "KYC not approved",
  NO_BANK_DETAILS: "No bank details",
  BANK_CHANGED_RECENTLY: "Bank details changed in the last 72 hours",
  STATEMENT_DISPUTE_OPEN: "A statement question is open",
  HELD_BY_FINANCE: "Held by finance",
};
export const RUN_LABEL: Record<RunStatus, string> = { DRAFT: "Draft", APPROVED: "Approved", FILE_READY: "Bank file ready", PAID: "Paid", CANCELLED: "Cancelled" };

export type ReportResult = { name: string; from: string; to: string; columns: string[]; rows: Record<string, unknown>[] };
export type GstRow = { kind: string; number: string; date: string; against: string | null; buyerGstin: string | null; b2b: boolean; placeOfSupply: string; sac: string; taxablePaise: number; cgstPaise: number; sgstPaise: number; igstPaise: number; totalPaise: number };
export type GstGroup = Record<string, { taxablePaise: number; gstPaise: number; count: number }>;
export type GstRegister = {
  month: string;
  locked: { by: string; at: string } | null;
  rows: GstRow[];
  totals: { taxablePaise: number; cgstPaise: number; sgstPaise: number; igstPaise: number; totalPaise: number };
  byKind: GstGroup;
  bySupplyType: GstGroup;
  byPlaceOfSupply: GstGroup;
  bySac: GstGroup;
};
export type Branding = { name: string; contactPhone: string | null; contactEmail: string | null; colour: string | null; logoUrl: string | null; version: number; updatedAt: string };

/** Today / months as Indian dates. */
export const indiaDay = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
};
export const indiaMonth = (offsetMonths = 0) => {
  const [y, m] = indiaDay().split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1 + offsetMonths, 1));
  return d.toISOString().slice(0, 7);
};

/** A column's header in plain words (`netPaise` → "Net (₹)"). */
export function columnLabel(c: string) {
  const money = c.endsWith("Paise");
  const base = (money ? c.slice(0, -5) : c).replace(/^D(\d+)_(\d+|PLUS)$/, (_m, a: string, b: string) => (b === "PLUS" ? `${a}+ days` : `${a}–${b} days`));
  const words = base.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (x) => x.toUpperCase());
  return money ? `${words} (₹)` : words;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function fileNameOf(res: Response, fallback: string) {
  return /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallback;
}

/** Admin CSV download (GET, or POST for the bank file). */
export async function adminDownload(path: string, token: string, fallback: string, method: "GET" | "POST" = "GET") {
  const res = await fetch(`${B2B_API}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) }, body: method === "POST" ? "{}" : undefined });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: string; title?: string } | null;
    throw new Error(body?.code ?? body?.title ?? "Download failed");
  }
  saveBlob(await res.blob(), fileNameOf(res, fallback));
}

/** Business-area CSV download (signed-in member; refreshes the session once). */
export async function businessDownload(path: string, fallback: string) {
  const get = (token: string | null) => fetch(`${B2B_API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
  let res = await get(useBusinessSession.getState().accessToken);
  if (res.status === 401) res = await get(await refreshBusinessSession());
  if (!res.ok) throw new Error("Download failed");
  saveBlob(await res.blob(), fileNameOf(res, fallback));
}
