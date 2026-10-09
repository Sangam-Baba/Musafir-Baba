"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import Link from "next/link";
import { NAV_GROUPS } from "@/config/navigation";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";


// Each nav section gets its own accent (header + guide line only — items
// stay neutral). Full class strings so Tailwind keeps them.
type SectionTone = { band: string; tile: string; label: string; chevron: string; line: string };
const SECTION_TONES: Record<string, SectionTone> = {
  "Main": { band: "bg-orange-50/80 hover:bg-orange-50", tile: "bg-orange-500", label: "text-orange-700", chevron: "text-orange-400", line: "border-orange-200" },
  "Content Management": { band: "bg-sky-50/80 hover:bg-sky-50", tile: "bg-sky-500", label: "text-sky-700", chevron: "text-sky-400", line: "border-sky-200" },
  "Fleet Management": { band: "bg-emerald-50/80 hover:bg-emerald-50", tile: "bg-emerald-500", label: "text-emerald-700", chevron: "text-emerald-400", line: "border-emerald-200" },
  "Packages": { band: "bg-violet-50/80 hover:bg-violet-50", tile: "bg-violet-500", label: "text-violet-700", chevron: "text-violet-400", line: "border-violet-200" },
  "Bills & Invoice": { band: "bg-amber-50/80 hover:bg-amber-50", tile: "bg-amber-500", label: "text-amber-700", chevron: "text-amber-400", line: "border-amber-200" },
  "Master Data": { band: "bg-rose-50/80 hover:bg-rose-50", tile: "bg-rose-500", label: "text-rose-700", chevron: "text-rose-400", line: "border-rose-200" },
  "Settings": { band: "bg-slate-100/80 hover:bg-slate-100", tile: "bg-slate-600", label: "text-slate-700", chevron: "text-slate-400", line: "border-slate-200" },
};
const FALLBACK_TONES: SectionTone[] = [
  { band: "bg-teal-50/80 hover:bg-teal-50", tile: "bg-teal-500", label: "text-teal-700", chevron: "text-teal-400", line: "border-teal-200" },
  { band: "bg-indigo-50/80 hover:bg-indigo-50", tile: "bg-indigo-500", label: "text-indigo-700", chevron: "text-indigo-400", line: "border-indigo-200" },
  { band: "bg-fuchsia-50/80 hover:bg-fuchsia-50", tile: "bg-fuchsia-500", label: "text-fuchsia-700", chevron: "text-fuchsia-400", line: "border-fuchsia-200" },
];
const sectionTone = (label: string, index: number) => SECTION_TONES[label] || FALLBACK_TONES[index % FALLBACK_TONES.length];

export function AdminSidebar() {
  const role = useAdminAuthStore((s) => s.role);
  const permissions = useAdminAuthStore((s) => s.permissions) as string[];
  const pathname = usePathname();

  // Link navigation is client-side but the active-pill highlight only
  // updates once usePathname() reflects the new route, so a click had no
  // visible feedback until the page finished transitioning. Tracking the
  // just-clicked href here gives an immediate pressed/loading state, which
  // clears itself as soon as the route actually changes.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const filteredNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      // "Change Password" is visible to any admin/superadmin
      if (item.label === "Change Password") {
        return role === "admin" || role === "superadmin";
      }
      const hasPermission = role === "superadmin" || role === "admin" || permissions.includes(item.permission);
      return hasPermission && !(item as any).hideInSidebar;
    }),
  })).filter((group) => group.items.length > 0);
  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r-0 bg-transparent">
      <SidebarHeader className="flex h-14 flex-row items-center gap-2.5 rounded-t-xl border-b border-slate-200/70 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 group-data-[collapsible=icon]:px-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-white/10">
          <img src="/favicon.ico" alt="MusafirBaba" className="h-5 w-5 object-contain" />
        </div>
        <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
          <span className="truncate text-[14px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
            MusafirBaba
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            Admin Portal
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-3 bg-white px-2 py-3 dark:bg-slate-900">
        {filteredNavGroups.map((group, groupIndex) => {
          const tone = sectionTone(group.label, groupIndex);
          return (
          <SidebarGroup
            key={group.label}
            className="border-none p-0"
          >
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible defaultOpen className="group/collapsible">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`h-10 w-full justify-between rounded-lg px-2 transition-colors dark:bg-slate-800/40 dark:hover:bg-slate-800/70 ${tone.band}`}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white shadow-sm ${tone.tile}`}>
                          <group.icon className="h-4 w-4" />
                        </span>
                        <span className={`truncate text-[12px] font-bold uppercase tracking-[0.06em] group-data-[collapsible=icon]:hidden ${tone.label}`}>
                          {group.label}
                        </span>
                      </div>
                      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90 group-data-[collapsible=icon]:hidden ${tone.chevron}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="overflow-hidden">
                    <SidebarMenuSub className={`mb-1 ml-[21px] mr-0 mt-1.5 gap-0.5 border-l-2 py-0 pl-2.5 pr-0 ${tone.line}`}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;
                        const isPendingItem = !active && pendingHref === item.href;
                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => {
                                if (!active) setPendingHref(item.href);
                              }}
                              title={item.label}
                              className={`group/item relative flex h-8 items-center gap-2 rounded-md px-2 text-[12.5px] transition-colors duration-150 ${
                                active
                                  ? "bg-slate-900/[0.04] font-semibold text-slate-900 dark:bg-white/10 dark:text-white"
                                  : isPendingItem
                                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                                  : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 active:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
                              }`}
                            >
                              {active && (
                                <span className="absolute -left-[12px] top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#FE5300]" />
                              )}
                              {isPendingItem ? (
                                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#FE5300]" />
                              ) : (
                                <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                                  active ? "text-[#FE5300]" : "text-slate-400 group-hover/item:text-slate-600 dark:group-hover/item:text-slate-200"
                                }`} />
                              )}
                              <span className="truncate group-data-[collapsible=icon]:hidden">
                                {item.label}
                              </span>
                            </Link>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="rounded-b-xl border-t border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">System active</p>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} MusafirBaba
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
