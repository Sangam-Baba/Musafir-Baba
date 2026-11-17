"use client";
// The partner portal frame: dark sidebar (only pages that work today), top bar with the business switcher,
// the bell and the account menu. Behaviour (switching business, log out, view-as) stays in BusinessShell.
import { Activity, Building2, Hotel, Headphones, Home, LogOut, Menu, Settings, ShieldCheck, Users, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { roleName } from "../../roles";
import type { Me } from "../../types";
import { Bell } from "../Bell";

type NavItem = { href: string; label: string; icon: LucideIcon; permission?: string };
const MAIN: NavItem[] = [
  { href: "/business", label: "Overview", icon: Home },
  { href: "/business/profile", label: "Business Profile", icon: Building2 },
  { href: "/business/verification", label: "Verification", icon: ShieldCheck, permission: "kyc.application.read" },
  { href: "/business/properties", label: "My Properties", icon: Hotel, permission: "hotel-catalog.property.read" },
];
const ADMIN: NavItem[] = [
  { href: "/business/team", label: "Team & Access", icon: Users },
  { href: "/business/activity", label: "Activity", icon: Activity },
  { href: "/business/security", label: "Settings & Security", icon: Settings },
  { href: "/business/help", label: "Help & Support", icon: Headphones },
];

const isActive = (href: string, pathname: string) => pathname === href || (href !== "/business" && pathname.startsWith(`${href}/`));

function NavList({ items, pathname, permissions, onNavigate }: { items: NavItem[]; pathname: string; permissions: string[]; onNavigate: () => void }) {
  return (
    <ul className="space-y-1">
      {items
        .filter((n) => !n.permission || permissions.includes(n.permission))
        .map((n) => (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isActive(n.href, pathname) ? "bg-[#FE5300] font-medium text-white shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          </li>
        ))}
    </ul>
  );
}

/** Mountains drawn in orange at the foot of the sidebar. */
function Mountains() {
  return (
    <svg viewBox="0 0 240 70" className="h-16 w-full text-[#FE5300]" aria-hidden="true">
      <path d="M0 70 L40 32 L58 46 L92 12 L120 40 L140 28 L178 60 L200 44 L240 70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M86 18 L92 12 L100 20 M134 32 L140 28 L146 34" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".6" />
    </svg>
  );
}

export function Sidebar({ permissions, pathname, open, onClose }: { permissions: string[]; pathname: string; open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <button aria-label="Close menu" onClick={onClose} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#111d3a] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-start justify-between px-5 pt-5">
          <Link href="/business" onClick={onClose} className="block">
            <Image src="/logo-white.svg" alt="MusafirBaba" width={170} height={29} priority />
            <span className="mt-4 block border-l-2 border-white/60 pl-3">
              <span className="block text-xl font-bold leading-tight text-white">Business</span>
              <span className="block text-sm text-slate-300">Partner Portal</span>
            </span>
          </Link>
          <button aria-label="Close menu" onClick={onClose} className="text-slate-300 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-3">
          <NavList items={MAIN} pathname={pathname} permissions={permissions} onNavigate={onClose} />
          <div>
            <p className="border-t border-white/10 px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Administration</p>
            <NavList items={ADMIN} pathname={pathname} permissions={permissions} onNavigate={onClose} />
          </div>
        </nav>
        <div className="px-4 pb-3">
          <Mountains />
        </div>
      </aside>
    </>
  );
}

function AccountMenu({ data, onLogout }: { data: Me; onLogout: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = data.memberships.find((m) => m.orgId === data.currentOrgId);
  const initials = data.user.name.split(/\s+/).map((w) => w.charAt(0)).join("").slice(0, 2).toUpperCase();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-slate-50">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FE5300] text-sm font-semibold text-white">{initials || "?"}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold text-slate-900">{data.user.name}</span>
          <span className="block text-xs text-slate-500">{data.viewAs ? "MusafirBaba support" : current ? `Business ${roleName(current.roles[0] ?? "")}` : "No business selected"}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <p className="truncate px-4 py-2 text-xs text-slate-500">{data.user.email ?? data.user.phone}</p>
          <button onClick={() => (setOpen(false), router.push("/business/security"))} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50">
            <Settings className="h-4 w-4" /> Settings & Security
          </button>
          {!data.viewAs && (
            <button onClick={onLogout} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TopBar({ data, onMenu, onSwitch, onLogout }: { data: Me; onMenu: () => void; onSwitch: (orgId: string) => void; onLogout: () => void }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <button aria-label="Open menu" onClick={onMenu} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <span className="flex-1" />
      {!data.viewAs && data.memberships.length > 0 && (
        <select
          aria-label="Business"
          value={data.currentOrgId ?? ""}
          onChange={(e) => (e.target.value === "__add" ? router.push("/business/register") : e.target.value && onSwitch(e.target.value))}
          className="max-w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 sm:max-w-72"
        >
          <option value="" disabled>
            Choose business…
          </option>
          {data.memberships.map((m) => (
            <option key={m.orgId} value={m.orgId}>
              {m.displayName}
            </option>
          ))}
          <option value="__add">+ Add another business</option>
        </select>
      )}
      <Bell orgId={data.currentOrgId} />
      <span className="hidden h-8 w-px bg-slate-200 sm:block" />
      <AccountMenu data={data} onLogout={onLogout} />
    </header>
  );
}
