"use client";
// Developers (Stage 14): API keys for the company's own software (shown once, permissions, IP limits, rotate, revoke),
// webhook addresses for booking updates (signing secret shown once, test event), and the delivery log with "send again".
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, ListChecks, Webhook } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, Panel, Pill, Tabs } from "@/b2b/components/portal/ui";
import { EVENTS, SCOPES, when, withStepUp, type ApiKey, type Delivery, type Endpoint, type NewKey, type Scope } from "@/b2b/developers";
import { errorMessage } from "@/b2b/messages";

type Tab = "keys" | "webhooks" | "log";
const input = "h-9 w-full rounded-lg border border-slate-200 px-2 text-[13px]";
const btn = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] hover:bg-slate-50 disabled:opacity-50";
const primary = "rounded-lg bg-[#FE5300] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50";
const askCode = () => window.prompt("Enter the 6-digit code from your authenticator app to confirm:");
const lines = (s: string) => s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

function ShownOnce({ label, value, onDone }: { label: string; value: string; onDone: () => void }) {
  return (
    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px]">
      <p className="font-medium text-amber-900">{label} — copy it now. It will not be shown again.</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1 font-mono text-[12px]">{value}</code>
        <button className={btn} onClick={() => void navigator.clipboard.writeText(value).then(() => toast.success("Copied"))}><Copy size={13} /></button>
      </div>
      <button className={btn} onClick={onDone}>I have saved it</button>
    </div>
  );
}

function NewKeyForm({ onMade }: { onMade: (k: NewKey) => void }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Scope[]>(["hotel:search"]);
  const [ips, setIps] = useState("");
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try {
      const body = { name: name.trim(), scopes, ipAllowList: lines(ips) };
      onMade(await withStepUp(() => b2b<NewKey>("/api-keys", { method: "POST", body }), askCode));
      setName("");
      setIps("");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3 text-[13px]">
      <label className="block">Name<input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Our booking website" /></label>
      <div>
        <p className="mb-1">What the key may do</p>
        {SCOPES.map((s) => (
          <label key={s.value} className="flex items-center gap-2 py-0.5">
            <input type="checkbox" checked={scopes.includes(s.value)} onChange={(e) => setScopes(e.target.checked ? [...scopes, s.value] : scopes.filter((x) => x !== s.value))} />
            {s.label} <code className="text-[11px] text-slate-400">{s.value}</code>
          </label>
        ))}
      </div>
      <label className="block">Only from these IP addresses (optional — one per line, ranges like 203.0.113.0/24)<textarea className={`${input} h-16 py-1`} value={ips} onChange={(e) => setIps(e.target.value)} /></label>
      <button className={primary} disabled={busy || name.trim().length < 2 || scopes.length === 0} onClick={create}>Create key</button>
    </div>
  );
}

function KeyRow({ k, canManage, onNew }: { k: ApiKey; canManage: boolean; onNew: (k: NewKey) => void }) {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["b2b", "api-keys"] });
  async function act(fn: () => Promise<unknown>, done: string) {
    try {
      await fn();
      toast.success(done);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const editIps = () => {
    const v = window.prompt("IP addresses or ranges allowed (comma separated; empty = any):", k.ipAllowList.join(", "));
    if (v !== null) void act(() => b2b(`/api-keys/${k.id}`, { method: "PATCH", body: { ipAllowList: lines(v) } }), "Saved — applies within 5 seconds");
  };
  const rotate = () =>
    void act(async () => onNew(await withStepUp(() => b2b<NewKey>(`/api-keys/${k.id}/rotate`, { method: "POST" }), askCode)), "New key made — the old one keeps working for 24 hours");
  const revoke = () => {
    if (window.confirm(`Revoke "${k.name}"? Software using it stops working within 5 seconds.`)) void act(() => b2b(`/api-keys/${k.id}`, { method: "DELETE" }), "Revoked");
  };
  return (
    <div className="space-y-1 border-b border-slate-100 px-1 py-2 text-[13px] last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-900">{k.name}</span>
        <code className="text-[12px] text-slate-500">{k.display}</code>
        <Pill tone={k.status === "REVOKED" ? "red" : k.expiresAt ? "amber" : "green"}>{k.status === "REVOKED" ? "Revoked" : k.expiresAt ? `Stops ${when(k.expiresAt)}` : "Active"}</Pill>
        {canManage && k.status === "ACTIVE" && (
          <span className="ml-auto flex gap-1.5">
            <button className={btn} onClick={editIps}>IP limits</button>
            {!k.expiresAt && <button className={btn} onClick={rotate}>Rotate</button>}
            <button className={btn} onClick={revoke}>Revoke</button>
          </span>
        )}
      </div>
      <p className="text-[12px] text-slate-500">
        {k.scopes.join(" · ")} · {k.ipAllowList.length ? `only from ${k.ipAllowList.join(", ")}` : "any IP"} · last used {when(k.lastUsedAt)}{k.lastUsedIp ? ` from ${k.lastUsedIp}` : ""}
      </p>
    </div>
  );
}

function Keys({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [shown, setShown] = useState<NewKey | null>(null);
  const q = useQuery({ queryKey: ["b2b", "api-keys"], queryFn: () => b2b<{ data: ApiKey[] }>("/api-keys"), retry: false });
  const onNew = (k: NewKey) => {
    setShown(k);
    void qc.invalidateQueries({ queryKey: ["b2b", "api-keys"] });
  };
  return (
    <Panel icon={KeyRound} title="API keys" subtitle="A key acts for the person who made it, only with the permissions you pick. Send it as: Authorization: Bearer mb_live_…  · 2 keys at a time.">
      {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {shown && <ShownOnce label={`Your key "${shown.name}"`} value={shown.key} onDone={() => setShown(null)} />}
      <div className="my-2">{(q.data?.data ?? []).map((k) => <KeyRow key={k.id} k={k} canManage={canManage} onNew={onNew} />)}</div>
      {q.data && q.data.data.length === 0 && <p className="py-2 text-[13px] text-slate-500">No keys yet.</p>}
      {canManage && q.data && <NewKeyForm onMade={onNew} />}
    </Panel>
  );
}

function NewEndpointForm({ onMade }: { onMade: (secret: string) => void }) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["booking.confirmed", "booking.cancelled"]);
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    try {
      const r = await b2b<Endpoint & { secret: string }>("/webhook-endpoints", { method: "POST", body: { url: url.trim(), events } });
      onMade(r.secret);
      setUrl("");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3 text-[13px]">
      <label className="block">Your HTTPS address<input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourcompany.com/musafirbaba/webhooks" /></label>
      <div className="grid gap-1 sm:grid-cols-2">
        {EVENTS.map((ev) => (
          <label key={ev.value} className="flex items-center gap-2">
            <input type="checkbox" checked={events.includes(ev.value)} onChange={(e) => setEvents(e.target.checked ? [...events, ev.value] : events.filter((x) => x !== ev.value))} />
            {ev.label}
          </label>
        ))}
      </div>
      <button className={primary} disabled={busy || !url.startsWith("https://") || events.length === 0} onClick={add}>Add address</button>
    </div>
  );
}

function Webhooks() {
  const qc = useQueryClient();
  const [secret, setSecret] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["b2b", "webhooks"], queryFn: () => b2b<{ data: Endpoint[] }>("/webhook-endpoints"), retry: false });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["b2b", "webhooks"] });
  async function act(fn: () => Promise<unknown>, done: string) {
    try {
      await fn();
      toast.success(done);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <Panel icon={Webhook} title="Webhook addresses" subtitle="We POST signed booking updates to these addresses (MB-Signature header). Retries for about 22 hours; an address failing for 24 hours is switched off.">
      {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {secret && <ShownOnce label="Signing secret" value={secret} onDone={() => setSecret(null)} />}
      <div className="my-2">
        {(q.data?.data ?? []).map((e) => (
          <div key={e.id} className="space-y-1 border-b border-slate-100 py-2 text-[13px] last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all text-[12px] text-slate-800">{e.url}</code>
              <Pill tone={e.status === "ACTIVE" ? "green" : "red"}>{e.status === "ACTIVE" ? "On" : e.disabledReason === "FAILING_24H" ? "Off — failed 24 h" : "Off"}</Pill>
              <span className="ml-auto flex flex-wrap gap-1.5">
                <button className={btn} onClick={() => void act(() => b2b(`/webhook-endpoints/${e.id}/test`, { method: "POST" }), "Test event queued — see the delivery log")}>Send test</button>
                <button className={btn} onClick={() => void act(() => b2b(`/webhook-endpoints/${e.id}`, { method: "PATCH", body: { enabled: e.status !== "ACTIVE" } }), e.status === "ACTIVE" ? "Switched off" : "Switched on")}>{e.status === "ACTIVE" ? "Switch off" : "Switch on"}</button>
                <button className={btn} onClick={() => void act(async () => setSecret((await b2b<{ secret: string }>(`/webhook-endpoints/${e.id}/rotate-secret`, { method: "POST" })).secret), "New secret — the old one also works for 24 hours")}>New secret</button>
                <button className={btn} onClick={() => window.confirm("Remove this address?") && void act(() => b2b(`/webhook-endpoints/${e.id}`, { method: "DELETE" }), "Removed")}>Remove</button>
              </span>
            </div>
            <p className="text-[12px] text-slate-500">{e.events.join(" · ")}{e.failingSince ? ` · failing since ${when(e.failingSince)}` : ""}{e.secretRotatingUntil ? ` · old secret valid until ${when(e.secretRotatingUntil)}` : ""}</p>
          </div>
        ))}
      </div>
      {q.data && <NewEndpointForm onMade={(s) => { setSecret(s); refresh(); }} />}
    </Panel>
  );
}

function Log({ canReplay }: { canReplay: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | Delivery["status"]>("");
  const q = useQuery({ queryKey: ["b2b", "deliveries", status], queryFn: () => b2b<{ data: Delivery[] }>(`/webhook-deliveries${status ? `?status=${status}` : ""}`), retry: false, refetchInterval: 15_000 });
  async function replay(id: string) {
    try {
      await b2b(`/webhook-deliveries/${id}/replay`, { method: "POST" });
      toast.success("Queued to send again (same event id)");
      void qc.invalidateQueries({ queryKey: ["b2b", "deliveries"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <Panel icon={ListChecks} title="Delivery log" subtitle="The last 100 deliveries. Your system should ignore an event id it has already handled.">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {(["", "PENDING", "SUCCEEDED", "FAILED"] as const).map((s) => (
          <button key={s || "all"} onClick={() => setStatus(s)} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${status === s ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>{s || "All"}</button>
        ))}
      </div>
      {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {(q.data?.data ?? []).map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-1.5 text-[12px] last:border-0">
          <Pill tone={d.status === "SUCCEEDED" ? "green" : d.status === "FAILED" ? "red" : "amber"}>{d.status}</Pill>
          <span className="font-medium text-slate-800">{d.type}</span>
          <code className="text-slate-500">{d.eventId}</code>
          <span className="text-slate-500">{d.attempts} tr{d.attempts === 1 ? "y" : "ies"}{d.responseCode ? ` · HTTP ${d.responseCode}` : ""}{d.error ? ` · ${d.error}` : ""}{d.status === "PENDING" && d.nextAttemptAt ? ` · next ${when(d.nextAttemptAt)}` : ""}</span>
          <span className="ml-auto text-slate-400">{when(d.createdAt)}</span>
          {canReplay && d.status !== "PENDING" && <button className={btn} onClick={() => void replay(d.id)}>Send again</button>}
        </div>
      ))}
      {q.data && q.data.data.length === 0 && <p className="py-2 text-[13px] text-slate-500">Nothing sent yet.</p>}
    </Panel>
  );
}

function Developers({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes(p);
  const tabs: { value: Tab; label: string }[] = [
    ...(can("api-access.key.read") ? [{ value: "keys" as const, label: "API keys" }] : []),
    ...(can("webhooks.endpoint.manage") ? [{ value: "webhooks" as const, label: "Webhooks" }] : []),
    ...(can("webhooks.delivery.read") ? [{ value: "log" as const, label: "Delivery log" }] : []),
  ];
  const [tab, setTab] = useState<Tab>(tabs[0]?.value ?? "keys");
  return (
    <div className="space-y-4">
      <PageHeader
        title="Developers"
        subtitle="Connect your own software to MusafirBaba: search, book and cancel through the API, and get booking updates on your server."
        actions={<a href="/business/developers/docs" className={btn}>API guides →</a>}
      />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "keys" && <Keys canManage={can("api-access.key.manage")} />}
      {tab === "webhooks" && <Webhooks />}
      {tab === "log" && <Log canReplay={can("webhooks.endpoint.manage")} />}
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.some((p) => p.startsWith("api-access.") || p.startsWith("webhooks.")) ? (
          <Developers permissions={me.permissions} />
        ) : (
          <p className="text-[13px] text-slate-600">Only your company&apos;s owner can manage API keys and webhooks.</p>
        )
      }
    </BusinessShell>
  );
}
