"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertTriangle, Copy, Download, Gift, Lock, Search, ShieldAlert, Users, Wallet } from "lucide-react";
import { FleetEmptyState, FleetKpiStrip, FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetTh, fleetTone } from "@/components/admin/fleet/FleetUI";

// MBConnect Referral Program: settings, every referral with its full
// timeline, review / reject / reverse / extend actions, and money tracing.

const API = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-referrals`;
const inr = (n?: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

type Status = "LINKED" | "QUALIFIED" | "IN_REVIEW" | "REWARDED" | "REJECTED" | "EXPIRED" | "REVERSED";
const STATUS_META: Record<Status, { label: string; tone: string; hint: string }> = {
  LINKED: { label: "Pending approval", tone: fleetTone.slate, hint: "Code added; waiting for admin to approve the new partner" },
  QUALIFIED: { label: "Approved · waiting", tone: fleetTone.sky, hint: "New partner approved; waiting for the referrer's own approval" },
  IN_REVIEW: { label: "In review", tone: fleetTone.amber, hint: "Fraud signal — decide to approve or reject" },
  REWARDED: { label: "Rewarded", tone: fleetTone.emerald, hint: "Both rewards paid" },
  REJECTED: { label: "Rejected", tone: fleetTone.red, hint: "Not paid" },
  EXPIRED: { label: "Expired", tone: fleetTone.slate, hint: "New partner not approved in time" },
  REVERSED: { label: "Reversed", tone: fleetTone.violet, hint: "Rewards taken back by admin" },
};
const LEDGER_LABEL: Record<string, string> = {
  referral_bonus: "Referrer reward (locked)",
  referral_reward: "Referrer reward (wallet)",
  referral_joining_bonus: "Joining bonus (wallet)",
  referral_unlock: "Unlocked to wallet",
  referral_reversal: "Reversal",
};

interface Person { authId?: string; name?: string; mobile?: string; email?: string; status?: string; code?: string; lockedBalance?: number; unlockedAt?: string }
interface Row {
  _id: string; code: string; status: Status; source: string; createdAt: string; expiresAt?: string; rewardedAt?: string;
  flags: { key: string; label: string }[]; terms?: { referrerReward: number; joiningBonus: number }; referrerPaidTo?: string;
  referrer: Person; referred: Person;
}
interface Config { enabled: boolean; referrerReward: number; joiningBonus: number; unlockAfter: number; expiryDays: number; dailyLimit: number; terms: string }

function useApi() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const call = async (path: string, method = "GET", body?: unknown) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || "Request failed");
    return json;
  };
  return { call, accessToken };
}

export default function ReferralsPage() {
  const permissions = useAdminAuthStore((s) => s.permissions) as string[];
  const role = useAdminAuthStore((s) => s.role);
  const [tab, setTab] = useState<"dashboard" | "referrals" | "partners" | "settings">("dashboard");
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  if (!(role === "admin" || role === "superadmin" || permissions?.includes("partner-referrals"))) {
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  }
  return (
    <FleetPage>
      <FleetPageHeader
        icon={Gift}
        title="Referrals"
        description="MBConnect Refer & Earn: the referrer's reward stays locked until they reach the unlock count; the joining bonus goes straight to the new partner's wallet. Both are paid only after admin approves the new partner."
      />
      <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
        {([["dashboard", "Dashboard"], ["referrals", "Referrals"], ["partners", "Partner codes"], ["settings", "Settings"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-[13px] font-medium ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === "dashboard" && <DashboardTab onOpenList={(s) => { setFilter(s); setTab("referrals"); }} />}
      {tab === "referrals" && <ReferralsTab initialStatus={filter} onOpen={setOpenId} />}
      {tab === "partners" && <PartnersTab />}
      {tab === "settings" && <SettingsTab />}
      <DetailSheet id={openId} onClose={() => setOpenId(null)} />
    </FleetPage>
  );
}

// ---------------- Dashboard ----------------
function DashboardTab({ onOpenList }: { onOpenList: (status: string) => void }) {
  const { call } = useApi();
  const { data, isLoading } = useQuery({ queryKey: ["referral-summary"], queryFn: async () => (await call("/summary")).data });
  if (isLoading || !data) return <div className="flex justify-center py-12"><Loader size="lg" message="Loading..." /></div>;
  const c = data.counts as Record<Status, number>;
  const rec = data.reconciliation;
  return (
    <>
      {!data.config.enabled && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
          <AlertTriangle size={15} /> The program is OFF — new codes can't be added. Switch it on in Settings.
        </div>
      )}
      <FleetKpiStrip
        items={[
          { label: "Total referrals", value: `${data.total} · ${data.approvalRate}% rewarded`, icon: Users, tone: "sky" },
          { label: "Paid out (net)", value: inr(rec.paidOut), icon: Wallet, tone: "emerald" },
          { label: "Locked liability", value: `${inr(rec.lockedLiability)} · ${rec.driversWithLocked} partners`, icon: Lock, tone: "amber" },
          { label: "Needs review", value: String(c.IN_REVIEW || 0), icon: ShieldAlert, tone: c.IN_REVIEW ? "red" : "slate" },
        ]}
      />
      <FleetPanel title="By status" description="Click a status to see those referrals">
        <div className="flex flex-wrap gap-2 p-4">
          {(Object.keys(STATUS_META) as Status[]).map((s) => (
            <button key={s} type="button" onClick={() => onOpenList(s)} className="rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50">
              <FleetPill className={STATUS_META[s].tone}>{STATUS_META[s].label}</FleetPill>
              <p className="mt-1 text-lg font-semibold tabular-nums">{c[s] || 0}</p>
            </button>
          ))}
        </div>
      </FleetPanel>
      <FleetPanel title="Top referrers" description={`Unlock at ${data.config.unlockAfter} rewarded referrals`}>
        {data.topReferrers.length === 0 ? (
          <FleetEmptyState icon={Users} title="No referrals yet" />
        ) : (
          <Table className="text-[13px]">
            <TableHeader><TableRow>{["Partner", "Code", "Referrals", "Rewarded", "Progress", "Locked", ""].map((h) => <TableHead key={h} className={fleetTh}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {data.topReferrers.map((t: any) => (
                <TableRow key={t.authId}>
                  <TableCell><p className="font-medium">{t.name}</p><p className="text-[11px] text-slate-500">{t.mobile}</p></TableCell>
                  <TableCell className="font-mono text-[12px]">{t.code}</TableCell>
                  <TableCell className="tabular-nums">{t.total}</TableCell>
                  <TableCell className="tabular-nums">{t.rewarded}</TableCell>
                  <TableCell>
                    {t.unlocked ? <FleetPill className={fleetTone.emerald}>Unlocked</FleetPill> : (
                      <div className="w-28">
                        <div className="h-1.5 rounded bg-slate-100"><div className="h-1.5 rounded bg-[#FE5300]" style={{ width: `${Math.min(100, (t.rewarded / data.config.unlockAfter) * 100)}%` }} /></div>
                        <p className="mt-0.5 text-[11px] text-slate-500">{t.rewarded}/{data.config.unlockAfter}</p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{inr(t.lockedBalance)}</TableCell>
                  <TableCell>{data.nearUnlock.some((x: any) => x.authId === t.authId) && <FleetPill className={fleetTone.orange}>Close to unlock</FleetPill>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FleetPanel>
      <FleetPanel title="Ledger totals" description="Every referral money movement is in the partners' wallet history">
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
          {Object.entries(LEDGER_LABEL).map(([k, l]) => (
            <div key={k} className="rounded-lg border border-slate-100 px-3 py-2">
              <p className="text-[11px] text-slate-500">{l}</p>
              <p className="font-semibold tabular-nums">{inr(rec.ledger?.[k]?.amount)}</p>
              <p className="text-[11px] text-slate-400">{rec.ledger?.[k]?.count || 0} entries</p>
            </div>
          ))}
        </div>
      </FleetPanel>
    </>
  );
}

// ---------------- Referrals list ----------------
function ReferralsTab({ initialStatus, onOpen }: { initialStatus: string; onOpen: (id: string) => void }) {
  const { call, accessToken } = useApi();
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q.trim()) params.set("q", q.trim());
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const { data, isLoading } = useQuery({ queryKey: ["referrals", qs], queryFn: async () => (await call(`/?${qs}`)).data as Row[], staleTime: 10000 });

  const exportCsv = async () => {
    try {
      const res = await fetch(`${API}/?${qs}${qs ? "&" : ""}format=csv`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error("Export failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `mbconnect-referrals-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <FleetPanel
      title="Referrals"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[12px]">
            <option value="">All statuses</option>
            {(Object.keys(STATUS_META) as Status[]).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-[12px]" aria-label="From" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-[12px]" aria-label="To" />
          <div className="relative w-56">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Name, mobile, email, code" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 pl-8 text-[12px]" />
          </div>
          <Button size="sm" variant="outline" className="h-8 text-[12px]" onClick={exportCsv}><Download size={13} className="mr-1" />CSV</Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader size="lg" message="Loading..." /></div>
      ) : !data?.length ? (
        <FleetEmptyState icon={Gift} title="No referrals found" />
      ) : (
        <div className="overflow-x-auto">
          <Table className="text-[13px]">
            <TableHeader><TableRow>{["Linked", "Referrer", "New partner", "Code", "Rewards", "Status", ""].map((h) => <TableHead key={h} className={fleetTh}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r._id} className="cursor-pointer align-top hover:bg-slate-50" onClick={() => onOpen(r._id)}>
                  <TableCell className="whitespace-nowrap"><p>{fmt(r.createdAt)}</p><p className="text-[11px] text-slate-500">via {r.source}</p></TableCell>
                  <TableCell><p className="font-medium">{r.referrer.name || r.referrer.email || "—"}</p><p className="text-[11px] text-slate-500">{r.referrer.mobile}</p></TableCell>
                  <TableCell><p className="font-medium">{r.referred.name || r.referred.email || "—"}</p><p className="text-[11px] text-slate-500">{r.referred.mobile || r.referred.email}</p></TableCell>
                  <TableCell className="font-mono text-[12px]">{r.code}</TableCell>
                  <TableCell className="whitespace-nowrap text-[12px]"><p>Referrer {inr(r.terms?.referrerReward)}{r.referrerPaidTo === "locked" ? " 🔒" : ""}</p><p>Joining {inr(r.terms?.joiningBonus)}</p></TableCell>
                  <TableCell>
                    <FleetPill className={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</FleetPill>
                    {r.flags.length > 0 && <p className="mt-1 max-w-[200px] text-[11px] text-amber-700">⚠ {r.flags.map((f) => f.label).join("; ")}</p>}
                  </TableCell>
                  <TableCell className="text-[12px] text-[#FE5300]">Open ›</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </FleetPanel>
  );
}

// ---------------- Detail + actions ----------------
function DetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { call } = useApi();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const { data: d, isLoading } = useQuery({ queryKey: ["referral", id], queryFn: async () => (await call(`/${id}`)).data, enabled: !!id });

  const act = async (action: string) => {
    if ((action === "REJECT" || action === "REVERSE") && !note.trim()) return toast.error("Add a reason first");
    if (action === "REVERSE" && !confirm("Take back both rewards (referrer + joining bonus)?")) return;
    setBusy(true);
    try {
      await call(`/${id}`, "PATCH", { action, note: note.trim(), days: Number(days) });
      toast.success("Done");
      setNote("");
      qc.invalidateQueries({ queryKey: ["referral", id] });
      qc.invalidateQueries({ queryKey: ["referrals"] });
      qc.invalidateQueries({ queryKey: ["referral-summary"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const status = d?.status as Status | undefined;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Referral {d?.code}</SheetTitle>
          <SheetDescription>{status ? STATUS_META[status].hint : ""}</SheetDescription>
        </SheetHeader>
        {isLoading || !d ? (
          <div className="flex justify-center py-12"><Loader size="lg" message="Loading..." /></div>
        ) : (
          <div className="space-y-4 px-4 pb-6 text-[13px]">
            <div className="flex items-center gap-2"><FleetPill className={STATUS_META[status!].tone}>{STATUS_META[status!].label}</FleetPill><span className="text-slate-500">via {d.source}</span></div>
            <div className="grid grid-cols-2 gap-3">
              {([["Referrer", d.referrer], ["New partner", d.referred]] as const).map(([label, p]: any) => (
                <div key={label} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[11px] font-medium text-slate-500">{label}</p>
                  <p className="font-semibold">{p.name || "—"}</p>
                  <p className="text-[12px] text-slate-600">{p.mobile}</p>
                  <p className="break-all text-[12px] text-slate-600">{p.email}</p>
                  <p className="text-[11px] text-slate-500">Account: {p.status}</p>
                  {label === "Referrer" && <p className="text-[11px] text-slate-500">Locked: {inr(p.lockedBalance)}{p.unlockedAt ? ` · unlocked ${fmt(p.unlockedAt)}` : ""}</p>}
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-[11px] font-medium text-slate-500">Terms (frozen when the code was added)</p>
              <p>Referrer {inr(d.terms?.referrerReward)} (locked until {d.terms?.unlockAfter}) · Joining bonus {inr(d.terms?.joiningBonus)} · Expiry {d.terms?.expiryDays} days</p>
              <p className="text-[12px] text-slate-500">Linked {fmt(d.createdAt)} · Expires {fmt(d.expiresAt)}{d.rewardedAt ? ` · Rewarded ${fmt(d.rewardedAt)}` : ""}</p>
            </div>
            {d.flags?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] font-semibold text-amber-800">Fraud signals</p>
                {d.flags.map((f: any) => <p key={f.key} className="text-amber-800">• {f.label}</p>)}
              </div>
            )}
            <div>
              <p className="mb-1 text-[11px] font-semibold text-slate-500">TIMELINE</p>
              <ol className="space-y-2 border-l border-slate-200 pl-3">
                {d.timeline.map((t: any, i: number) => (
                  <li key={i}>
                    <p className="font-medium">{t.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())} <span className="font-normal text-slate-500">· {fmt(t.at)} · {t.by}</span></p>
                    {t.note && <p className="text-[12px] text-slate-600">{t.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold text-slate-500">MONEY (wallet ledger)</p>
              {d.ledger.length === 0 ? <p className="text-slate-400">Nothing paid.</p> : d.ledger.map((l: any) => (
                <p key={l._id} className="flex justify-between border-b border-slate-100 py-1">
                  <span>{LEDGER_LABEL[l.type] || l.type} · {String(l.partnerId) === String(d.referrerAuthId) ? "referrer" : "new partner"}<span className="text-[11px] text-slate-400"> · {fmt(l.createdAt)}</span></span>
                  <span className={`tabular-nums ${l.type === "referral_reversal" ? "text-red-600" : "text-emerald-700"}`}>{l.type === "referral_reversal" ? "−" : "+"}{inr(l.amount)}</span>
                </p>
              ))}
            </div>
            {["LINKED", "QUALIFIED", "IN_REVIEW", "REWARDED", "EXPIRED"].includes(status!) && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] font-semibold text-slate-500">ACTIONS (recorded on the timeline)</p>
                <Textarea placeholder="Reason / note (required to reject or reverse; partners see it)" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-14 text-[13px]" />
                <div className="flex flex-wrap gap-2">
                  {status === "IN_REVIEW" && <Button size="sm" disabled={busy} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => act("APPROVE_REVIEW")}>Approve & pay</Button>}
                  {["LINKED", "QUALIFIED", "IN_REVIEW"].includes(status!) && <Button size="sm" variant="outline" disabled={busy} className="text-red-600" onClick={() => act("REJECT")}>Reject</Button>}
                  {status === "REWARDED" && <Button size="sm" variant="outline" disabled={busy} className="text-red-600" onClick={() => act("REVERSE")}>Reverse rewards</Button>}
                  {["LINKED", "EXPIRED"].includes(status!) && (
                    <span className="flex items-center gap-1">
                      <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} className="h-8 w-20 text-[12px]" />
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act("EXTEND")}>Extend days</Button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------- Every partner's code ----------------
function PartnersTab() {
  const { call } = useApi();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (q.trim()) params.set("q", q.trim());
  const { data, isLoading } = useQuery({ queryKey: ["referral-partners", params.toString()], queryFn: async () => await call(`/partners?${params.toString()}`), staleTime: 15000 });
  const rows = (data?.data || []) as any[];
  const pages = data?.pagination?.pages || 1;
  const copy = (code: string) => navigator.clipboard?.writeText(code).then(() => toast.success(`Copied ${code}`), () => {});
  return (
    <FleetPanel
      title="Partner codes"
      description="Every partner account and its referral code"
      actions={
        <div className="relative w-64">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Name, mobile, email or code" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="h-8 pl-8 text-[12px]" />
        </div>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader size="lg" message="Loading..." /></div>
      ) : rows.length === 0 ? (
        <FleetEmptyState icon={Users} title="No partners found" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table className="text-[13px]">
              <TableHeader><TableRow>{["Partner", "Account", "Referral code", "Referred by", "Referrals", "Locked bonus"].map((h) => <TableHead key={h} className={fleetTh}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.authId} className="align-top">
                    <TableCell><p className="font-medium">{r.name || "—"}</p><p className="text-[11px] text-slate-500">{r.mobile || r.email}</p></TableCell>
                    <TableCell className="text-[12px]"><p>{r.status}</p><p className="text-[11px] text-slate-500">Joined {fmt(r.joinedAt)}</p></TableCell>
                    <TableCell>
                      <button type="button" onClick={() => copy(r.code)} className="flex items-center gap-1.5 font-mono text-[13px] font-semibold tracking-wider text-slate-900 hover:text-[#FE5300]" title="Copy code">
                        {r.code} <Copy size={12} />
                      </button>
                    </TableCell>
                    <TableCell className="text-[12px]">{r.referredBy ? <><p>{r.referredBy.name || "—"}</p><p className="font-mono text-[11px] text-slate-500">{r.referredBy.code} · {STATUS_META[r.referredBy.status as Status]?.label}</p></> : <span className="text-slate-400">—</span>}</TableCell>
                    <TableCell className="tabular-nums">{r.rewarded} rewarded<p className="text-[11px] text-slate-500">{r.referrals} total</p></TableCell>
                    <TableCell className="tabular-nums">{r.unlocked ? <FleetPill className={fleetTone.emerald}>Unlocked</FleetPill> : inr(r.lockedBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-[12px] text-slate-500">
            <span>{data?.pagination?.total} partners · page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-[12px]" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="outline" className="h-7 text-[12px]" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </FleetPanel>
  );
}

// ---------------- Settings ----------------
function SettingsTab() {
  const { call } = useApi();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["referral-config"], queryFn: async () => await call("/config") });
  const [draft, setDraft] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);
  if (isLoading || !data) return <div className="flex justify-center py-12"><Loader size="lg" message="Loading..." /></div>;
  const cfg: Config = draft || data.data;
  const set = (p: Partial<Config>) => setDraft({ ...cfg, ...p });
  const save = async (override?: Partial<Config>) => {
    const body = { ...cfg, ...override };
    if (override?.enabled === true && !confirm("Switch the Referral Program ON? Partners can start adding referral codes.")) return;
    setBusy(true);
    try {
      await call("/config", "PUT", body);
      toast.success("Saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["referral-config"] });
      qc.invalidateQueries({ queryKey: ["referral-summary"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const field = (label: string, key: keyof Config, hint: string) => (
    <label className="block">
      <span className="text-[12px] font-medium text-slate-700">{label}</span>
      <Input type="number" min={0} value={String(cfg[key])} onChange={(e) => set({ [key]: Number(e.target.value) } as Partial<Config>)} className="mt-1 h-9" />
      <span className="text-[11px] text-slate-500">{hint}</span>
    </label>
  );
  return (
    <>
      <FleetPanel title="Program" actions={<div className="flex items-center gap-2 text-[13px]"><span>{data.data.enabled ? "ON" : "OFF"}</span><Switch checked={data.data.enabled} disabled={busy} onCheckedChange={(v) => save({ enabled: v })} /></div>}>
        <p className="p-4 text-[13px] text-slate-600">{data.data.enabled ? "Partners can add referral codes at sign-up (email or Google) and in Refer & Earn until they submit their profile." : "OFF: no new codes can be added. Existing referrals still finish with the terms they were created with."}</p>
      </FleetPanel>
      <FleetPanel title="Rewards & rules" description="Changes apply to referrals added from now on (each referral keeps the terms it was created with).">
        <div className="grid gap-4 p-4 md:grid-cols-3">
          {field("Referrer reward (₹)", "referrerReward", "Locked until the unlock count")}
          {field("Joining bonus (₹)", "joiningBonus", "Straight to the new partner's wallet, not locked")}
          {field("Unlock after (rewarded referrals)", "unlockAfter", "Referrer's locked rewards move to the wallet")}
          {field("Expiry (days)", "expiryDays", "New partner must be approved within this time")}
          {field("Daily limit per referrer", "dailyLimit", "More than this in a day goes to review")}
        </div>
        <div className="px-4 pb-4">
          <span className="text-[12px] font-medium text-slate-700">Terms & Conditions (shown in the app)</span>
          <Textarea value={cfg.terms} onChange={(e) => set({ terms: e.target.value })} className="mt-1 min-h-24 text-[13px]" />
          <div className="mt-3 flex gap-2">
            <Button disabled={busy || !draft} className="bg-[#FE5300] hover:bg-[#e54b00]" onClick={() => save()}>Save changes</Button>
            {draft && <Button variant="outline" onClick={() => setDraft(null)}>Discard</Button>}
          </div>
        </div>
      </FleetPanel>
      <FleetPanel title="Change history">
        {!data.history?.length ? <p className="p-4 text-[13px] text-slate-400">No changes yet.</p> : (
          <ul className="divide-y divide-slate-100">
            {data.history.map((h: any) => (
              <li key={h._id} className="px-4 py-2.5 text-[13px]">
                <p className="text-[11px] text-slate-500">{fmt(h.createdAt)} · {h.changedBy}</p>
                {h.changes.map((c: any) => <p key={c.field}><span className="font-medium">{c.field}</span>: {String(c.from ?? "—").slice(0, 60)} → {String(c.to ?? "—").slice(0, 60)}</p>)}
              </li>
            ))}
          </ul>
        )}
      </FleetPanel>
    </>
  );
}
