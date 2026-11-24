"use client";
// B2B admin → Finance (Stage 07): accounts and corrections, payments and refunds, reconciliation, and a ₹1 test
// payment that proves the PayU connection end to end (Super Admin only). Stage 15: hotel payouts, GST register,
// reports and the accounting export.
import { FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { submitPayuForm, type PayuForm } from "../../../finance";
import { errorMessage } from "../../../messages";
import { adminCall } from "../AdminPassGate";
import { FleetPanel, Input, inputSm, PrimaryBtn } from "../kit";
import { LedgerPanel } from "./LedgerPanel";
import { PaymentsPanel } from "./PaymentsPanel";
import { PayoutRunsPanel } from "./PayoutRunsPanel";
import { ReportsPanel } from "./ReportsPanel";

const SECTIONS = [
  { key: "ledger", label: "Accounts & corrections" },
  { key: "payments", label: "Payments & refunds" },
  { key: "reconciliation", label: "Reconciliation" },
  { key: "payouts", label: "Hotel payouts" }, // Stage 15
  { key: "gst", label: "GST register" },
  { key: "reports", label: "Reports & exports" },
  { key: "test", label: "Test payment" },
] as const;

function TestPayment({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    try {
      const form = await adminCall<PayuForm>("/admin/payments/test", token, { method: "POST", body: { amountPaise: 100, name: name.trim(), email: email.trim() } });
      toast.message(`Opening PayU for ${form.txnId}…`);
      submitPayuForm(form);
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <FleetPanel title="Test payment" description="Pays ₹1 through PayU on the live merchant account and comes back here. It shows under Payments with purpose TEST; refund it from there." icon={FlaskConical}>
      <div className="flex flex-wrap items-center gap-2">
        <Input className={`${inputSm} w-48`} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input className={`${inputSm} w-64`} placeholder="Your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PrimaryBtn disabled={busy || name.trim().length < 2 || !email.includes("@")} onClick={start}>Pay ₹1 with PayU</PrimaryBtn>
      </div>
    </FleetPanel>
  );
}

/** PayU sends the browser back to /admin/b2b?payment=…&txn=… — say what happened once. */
function usePaymentReturn() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("payment");
    if (!result) return;
    const txn = params.get("txn") ?? "";
    if (result === "succeeded") toast.success(`Payment ${txn} confirmed by PayU`);
    else if (result === "pending" || result === "created") toast.message(`Payment ${txn} is being checked with PayU — it shows under Payments in a few minutes`);
    else toast.error(`Payment ${txn} didn't go through`);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
}

export function FinanceTab({ token }: { token: string }) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("ledger");
  usePaymentReturn();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} className={`rounded-md border px-3 py-1 text-[12px] ${section === s.key ? "border-[#FE5300] bg-orange-50 font-medium text-[#FE5300]" : "border-slate-200 bg-white text-slate-600"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {section === "ledger" && <LedgerPanel token={token} />}
      {section === "payments" && <PaymentsPanel token={token} view="payments" />}
      {section === "reconciliation" && <PaymentsPanel token={token} view="reconciliation" />}
      {section === "payouts" && <PayoutRunsPanel token={token} />}
      {section === "gst" && <ReportsPanel token={token} view="gst" />}
      {section === "reports" && <ReportsPanel token={token} view="reports" />}
      {section === "test" && <TestPayment token={token} />}
    </div>
  );
}
