"use client";
// The partner portal frame: dark sidebar (only pages that work today), top bar with the business switcher,
// the bell and the account menu. Behaviour (switching business, log out, view-as) stays in BusinessShell.
import { Activity, Building2, CalendarCheck, ClipboardList, FileSpreadsheet, Hotel, Headphones, Home, LogOut, Menu, Percent, Search, Settings, ShieldCheck, Users, Wallet, BarChart3, CreditCard, X, Banknote, PieChart, Palette, Code2, BookOpen, BusFront, Route, CalendarRange, type LucideIcon } from "lucide-react";
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
  { href: "/business/buses", label: "My Buses", icon: BusFront, permission: "bus-catalog.vehicle.read" }, // Stage 18: bus operators only
  { href: "/business/bus-routes", label: "Routes & schedules", icon: Route, permission: "bus-catalog.route.read" }, // Stage 18 B3
  { href: "/business/bus-trips", label: "Trips & seats", icon: CalendarRange, permission: "bus-inventory.trip.read" }, // Stage 18 B3
  // hotels (Stage 08): confirmed bookings to acknowledge — the acknowledge permission is hotel-only, so clients never see it
  { href: "/business/bookings", label: "Bookings", icon: CalendarCheck, permission: "hotel-booking.booking.acknowledge" },
  { href: "/business/statement", label: "Statement", icon: FileSpreadsheet, permission: "wallet.statement.read" },
  { href: "/business/payouts", label: "Payouts", icon: Banknote, permission: "wallet.statement.read" }, // Stage 15: hotels
  // B2B clients (Stage 12 part A) — shown only to roles that have these permissions, so hotels never see them
  { href: "/business/hotels", label: "Search Hotels", icon: Search, permission: "hotel-search.search.use" },
  // Stage 18 B5: bus search for clients — only while the bus feature is switched on for the website
  ...(process.env.NEXT_PUBLIC_FEATURE_BUS === "true" ? [{ href: "/business/bus-search", label: "Search Buses", icon: BusFront, permission: "bus-booking.search.use" }] : []),
  { href: "/business/my-bookings", label: "My Bookings", icon: CalendarCheck, permission: "orders.order.read" }, // Stage 12B: clients
  { href: "/business/booking-requests", label: "Booking Requests", icon: ClipboardList, permission: "hotel-booking.request.read" },
  { href: "/business/markup", label: "My Markup", icon: Percent, permission: "pricing.markup.read" },
  { href: "/business/wallet", label: "Wallet", icon: Wallet, permission: "wallet.account.read" }, // Stage 11: clients only
  { href: "/business/usage", label: "Usage", icon: BarChart3, permission: "metering.usage.read" }, // Stage 12B: clients
  { href: "/business/plan", label: "Plan & Billing", icon: CreditCard, permission: "subscriptions.subscription.read" }, // Stage 13: clients
  { href: "/business/reports", label: "Reports", icon: PieChart, permission: "orders.export.read" }, // Stage 15: clients
  { href: "/business/branding", label: "Voucher Branding", icon: Palette, permission: "orders.order.read" }, // Stage 15: clients (orders.order.read is client-only)
  { href: "/business/developers", label: "Developers", icon: Code2, permission: "api-access.key.read" }, // Stage 14: client Owner
];
const ADMIN: NavItem[] = [
  { href: "/business/team", label: "Team & Access", icon: Users },
  { href: "/business/activity", label: "Activity", icon: Activity },
  { href: "/business/security", label: "Settings & Security", icon: Settings },
  { href: "/business/how-it-works", label: "How it works", icon: BookOpen }, // guide with a worked example
  { href: "/business/help", label: "Help & Support", icon: Headphones },
];

const isActive = (href: string, pathname: string) => pathname === href || (href !== "/business" && pathname.startsWith(`${href}/`));

function NavList({ items, pathname, permissions, onNavigate }: { items: NavItem[]; pathname: string; permissions: string[]; onNavigate: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items
        .filter((n) => !n.permission || permissions.includes(n.permission))
        .map((n) => (
          <li key={n.href}>
            <Link
              href={n.href}
              onClick={onNavigate}
              className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition ${isActive(n.href, pathname) ? "bg-white/[0.08] font-medium text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[#FE5300]" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}
            >
              <n.icon className={`h-4 w-4 ${isActive(n.href, pathname) ? "text-[#FE5300]" : ""}`} />
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
    <svg viewBox="0 0 240 70" className="h-9 w-full text-[#FE5300] opacity-70" aria-hidden="true">
      <path d="M0 70 L40 32 L58 46 L92 12 L120 40 L140 28 L178 60 L200 44 L240 70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M86 18 L92 12 L100 20 M134 32 L140 28 L146 34" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".6" />
    </svg>
  );
}

export function Sidebar({ permissions, pathname, open, onClose }: { permissions: string[]; pathname: string; open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <button aria-label="Close menu" onClick={onClose} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/5 bg-[#0f1a33] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-start justify-between px-4 pt-5">
          <Link href="/business" onClick={onClose} className="block">
            <Image src="/logo-white.svg" alt="MusafirBaba" width={140} height={24} priority />
            <span className="mt-3 block border-l-2 border-[#FE5300] pl-2.5">
              <span className="block text-[13px] font-semibold leading-tight text-white">Business</span>
              <span className="block text-[11px] text-slate-400">Partner Portal</span>
            </span>
          </Link>
          <button aria-label="Close menu" onClick={onClose} className="text-slate-300 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="mt-4 flex-1 space-y-4 overflow-y-auto px-3">
          <NavList items={MAIN} pathname={pathname} permissions={permissions} onNavigate={onClose} />
          <div>
            <p className="border-t border-white/10 px-2.5 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">Administration</p>
            <NavList items={ADMIN} pathname={pathname} permissions={permissions} onNavigate={onClose} />
          </div>
        </nav>
        <div className="px-3 pb-3">
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
    <div ref={box} className="relative shrink-0">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-slate-50 sm:px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FE5300] to-[#ff7a3d] text-xs font-semibold text-white ring-2 ring-orange-100">{initials || "?"}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-[13px] font-medium leading-tight text-slate-900">{data.user.name}</span>
          <span className="block text-[11px] text-slate-500">{data.viewAs ? "MusafirBaba support" : current ? `Business ${roleName(current.roles[0] ?? "")}` : "No business selected"}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <p className="truncate px-3 py-1.5 text-xs text-slate-500">{data.user.email ?? data.user.phone}</p>
          <button onClick={() => (setOpen(false), router.push("/business/security"))} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-slate-50">
            <Settings className="h-4 w-4" /> Settings & Security
          </button>
          {!data.viewAs && (
            <button onClick={onLogout} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50">
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
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md sm:gap-3 sm:px-6">
      <button aria-label="Open menu" onClick={onMenu} className="shrink-0 rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
        <Menu className="h-4 w-4" />
      </button>
      <span className="hidden flex-1 sm:block" />
      {!data.viewAs && data.memberships.length > 0 && (
        <select
          aria-label="Business"
          value={data.currentOrgId ?? ""}
          onChange={(e) => (e.target.value === "__add" ? router.push("/business/register") : e.target.value && onSwitch(e.target.value))}
          className="w-0 min-w-0 flex-1 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[13px] text-slate-800 outline-none hover:bg-white focus:border-[#FE5300] focus:ring-[3px] focus:ring-[#FE5300]/15 sm:w-auto sm:max-w-64 sm:flex-none sm:px-2.5"
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
      <span className="hidden h-7 w-px bg-slate-200 sm:block" />
      <AccountMenu data={data} onLogout={onLogout} />
    </header>
  );
}
