"use client";
// Settings: account information, sign out everywhere, and notification choices (critical ones stay on).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, KeyRound, LogOut, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { errorMessage } from "../../messages";
import { roleName } from "../../roles";
import { useBusinessSession } from "../../session-store";
import type { Me } from "../../types";
import { Panel, Pill } from "../portal/ui";

function Line({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <Icon className="h-5 w-5 text-slate-400" />
      <span className="w-32 text-sm text-slate-600">{label}</span>
      <span className="flex flex-1 flex-wrap items-center gap-2 text-sm text-slate-900">{children}</span>
    </div>
  );
}

export function AccountPanel({ me }: { me: Me }) {
  const [sent, setSent] = useState(false);
  const initials = me.user.name.split(/\s+/).map((w) => w.charAt(0)).join("").slice(0, 2).toUpperCase();
  const current = me.memberships.find((m) => m.orgId === me.currentOrgId);
  async function resend() {
    try {
      await b2b("/registrations/resend-verification", { method: "POST" });
      setSent(true);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <Panel icon={User} title="Account information" subtitle="Your sign-in details.">
      <div className="mb-4 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FE5300] text-xl font-semibold text-white">{initials}</span>
        <div>
          <p className="text-lg font-semibold text-slate-900">{me.user.name}</p>
          <p className="text-sm text-slate-500">{current ? `Business ${roleName(current.roles[0] ?? "")} · ${current.displayName}` : "No business selected"}</p>
        </div>
      </div>
      <Line icon={Mail} label="Email address">
        {me.user.email ?? "—"}
        {me.user.email && (me.user.emailVerified ? <Pill tone="green">Verified</Pill> : <Pill tone="amber">Not confirmed</Pill>)}
        {me.user.email && !me.user.emailVerified && !me.viewAs && (sent ? <span className="text-xs text-slate-500">New link sent</span> : <button onClick={resend} className="text-xs font-medium text-[#FE5300] hover:underline">Send a new link</button>)}
      </Line>
      {me.user.phone && (
        <Line icon={Phone} label="Mobile number">
          {me.user.phone}
          {me.user.phoneVerified && <Pill tone="green">Verified</Pill>}
        </Line>
      )}
      <Line icon={KeyRound} label="Password">
        ••••••••••
        {!me.viewAs && (
          <Link href="/business/forgot" className="rounded-md border border-[#FE5300] px-3 py-1 text-xs font-medium text-[#FE5300] hover:bg-orange-50">
            Change password
          </Link>
        )}
      </Line>
      {me.memberships.length > 1 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">Your businesses</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {me.memberships.map((m) => (
              <li key={m.orgId}>
                {m.displayName} · {roleName(m.roles[0] ?? "")} · {m.status.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export function SignOutEverywherePanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setToken = useBusinessSession((s) => s.setAccessToken);
  const [busy, setBusy] = useState(false);
  async function signOutAll() {
    if (!window.confirm("Sign out of MusafirBaba Business on every device, including this one?")) return;
    setBusy(true);
    try {
      const r = await b2b<{ sessionsEnded: number }>("/auth/logout-all", { method: "POST" });
      toast.success(`Signed out of ${r.sessionsEnded} session(s)`);
      setToken(null);
      queryClient.removeQueries({ queryKey: ["b2b"] });
      router.replace("/business/login");
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }
  return (
    <Panel icon={LogOut} title="Signed-in devices" subtitle="Lost a phone or used a shared computer?">
      <p className="text-sm text-slate-600">Sign out everywhere ends every session of your account. Your sign-ins are listed on the Activity page.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={busy} onClick={signOutAll} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
          Sign out everywhere
        </button>
        <Link href="/business/activity" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-[#FE5300]">
          See sign-in activity
        </Link>
      </div>
    </Panel>
  );
}

type Preference = { category: string; label: string; critical: boolean; locked: boolean; inApp: boolean; email: boolean };

function Toggle({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition disabled:opacity-60 ${on ? "bg-emerald-500" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

export function NotificationPrefsPanel({ readOnly }: { readOnly: boolean }) {
  const token = useBusinessSession((s) => s.accessToken);
  const queryClient = useQueryClient();
  const prefs = useQuery({ queryKey: ["b2b", "notification-preferences", token], queryFn: () => b2b<{ data: Preference[] }>("/notification-preferences") });
  async function save(p: Preference, change: Partial<Pick<Preference, "inApp" | "email">>) {
    try {
      await b2b("/notification-preferences", { method: "PUT", body: { category: p.category, inApp: change.inApp ?? p.inApp, email: change.email ?? p.email } });
      await queryClient.invalidateQueries({ queryKey: ["b2b", "notification-preferences"] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  const list = prefs.data?.data ?? [];
  return (
    <Panel icon={Bell} title="Notifications" subtitle="Important messages (verification, listing decisions) always reach you.">
      {prefs.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing to choose here yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-2">Message</th>
              <th className="py-2 text-center">In the bell</th>
              <th className="py-2 text-center">By email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((p) => (
              <tr key={p.category}>
                <td className="py-3 text-slate-800">
                  {p.label} {p.locked && <span className="ml-1 text-xs text-slate-400">(always on)</span>}
                </td>
                <td className="py-3 text-center">
                  <Toggle label={`${p.label} in the bell`} on={p.inApp} disabled={p.locked || readOnly} onChange={(v) => save(p, { inApp: v })} />
                </td>
                <td className="py-3 text-center">
                  <Toggle label={`${p.label} by email`} on={p.email} disabled={p.locked || readOnly} onChange={(v) => save(p, { email: v })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
