"use client";
// Frame of the signed-in business area: makes sure there is a session (renewing it from the refresh
// cookie after a reload), shows the org switcher, the navigation and log out.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { b2b, refreshBusinessSession } from "../api";
import { errorMessage } from "../messages";
import { useBusinessSession } from "../session-store";
import type { Me } from "../types";

const NAV: { href: string; label: string; permission?: string }[] = [
  { href: "/business", label: "Home" },
  { href: "/business/verification", label: "Verification", permission: "kyc.application.read" },
  { href: "/business/team", label: "Team" },
  { href: "/business/activity", label: "Activity" },
  { href: "/business/security", label: "Security" },
];

export function useMe() {
  const token = useBusinessSession((s) => s.accessToken);
  return useQuery({ queryKey: ["b2b", "me", token], queryFn: () => b2b<Me>("/me"), enabled: Boolean(token) });
}

export function BusinessShell({ children }: { children: (me: Me) => ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const token = useBusinessSession((s) => s.accessToken);
  const setToken = useBusinessSession((s) => s.setAccessToken);
  const startViewAs = useBusinessSession((s) => s.startViewAs);
  const viewing = useBusinessSession((s) => s.viewAs);
  const [checked, setChecked] = useState(Boolean(token));
  const [ended, setEnded] = useState(false);
  const me = useMe();

  useEffect(() => {
    // MusafirBaba admin "view as": the pass arrives in the address fragment (never sent to any server)
    const match = /^#viewAs=(.+)$/.exec(window.location.hash);
    if (match) {
      startViewAs(decodeURIComponent(match[1] ?? ""));
      window.history.replaceState(null, "", window.location.pathname);
      return setChecked(true);
    }
    if (token) return setChecked(true);
    if (viewing) return setEnded(true);
    refreshBusinessSession().then((t) => {
      if (!t) router.replace("/business/login");
      else setChecked(true);
    });
  }, [token, router, startViewAs, viewing]);

  async function endViewAs() {
    await b2b("/view-as/end", { method: "POST" }).catch(() => undefined);
    setToken(null);
    queryClient.removeQueries({ queryKey: ["b2b"] });
    setEnded(true);
  }

  async function switchOrg(orgId: string) {
    try {
      const r = await b2b<{ accessToken: string }>("/orgs/switch", { method: "POST", body: { orgId } });
      setToken(r.accessToken);
      await queryClient.invalidateQueries({ queryKey: ["b2b"] });
      toast.success("Organisation switched");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function logout() {
    await b2b("/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    queryClient.removeQueries({ queryKey: ["b2b"] });
    router.replace("/business/login");
  }

  if (ended) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">The view-as session has ended. You can close this tab.</div>;
  }
  if (!checked || me.isLoading || !me.data) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">{me.error ? errorMessage(me.error) : "Loading…"}</div>;
  }
  const data = me.data;
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/business" className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FE5300] text-xs font-bold text-white">MB</span>
            Business
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {NAV.filter((n) => !n.permission || data.permissions.includes(n.permission)).map((n) => (
              <Link key={n.href} href={n.href} className={`rounded-md px-3 py-1.5 text-sm ${pathname === n.href ? "bg-orange-50 font-medium text-[#FE5300]" : "text-slate-600 hover:bg-slate-100"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          {!data.viewAs && data.memberships.length > 0 && (
            <select aria-label="Organisation" value={data.currentOrgId ?? ""} onChange={(e) => e.target.value && switchOrg(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="" disabled>
                Choose organisation…
              </option>
              {data.memberships.map((m) => (
                <option key={m.orgId} value={m.orgId}>
                  {m.displayName} · {m.type === "HOTEL" ? "Hotel" : "Client"}
                </option>
              ))}
            </select>
          )}
          <span className="text-sm text-slate-500">{data.user.name}</span>
          {!data.viewAs && (
            <button onClick={logout} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
              Log out
            </button>
          )}
        </div>
      </header>
      {data.viewAs && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-900">
          <span>
            Viewing as MusafirBaba support · {data.viewAs.mode === "READ" ? "read-only" : "changes allowed"} · ends at {new Date(data.viewAs.expiresAt).toLocaleTimeString()} · reason: {data.viewAs.reason}
          </span>
          <button onClick={endViewAs} className="rounded-md border border-violet-300 bg-white px-3 py-1 text-xs font-medium hover:bg-violet-100">
            End view
          </button>
        </div>
      )}
      {data.blockedOrgs.map((b) => (
        <div key={b.orgId} className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
          {b.displayName} is {b.status.toLowerCase()}
          {b.reason ? ` — ${b.reason}` : ""}. Contact MusafirBaba support.
        </div>
      ))}
      <main className="mx-auto max-w-6xl px-4 py-6">{children(data)}</main>
    </div>
  );
}
