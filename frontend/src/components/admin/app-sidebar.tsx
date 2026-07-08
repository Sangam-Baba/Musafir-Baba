"use client";

import { usePathname } from "next/navigation";
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
import { FaChevronCircleDown } from "react-icons/fa";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";


export function AdminSidebar() {
  const role = useAdminAuthStore((s) => s.role);
  const permissions = useAdminAuthStore((s) => s.permissions) as string[];
  const pathname = usePathname();

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
      <SidebarHeader className="h-20 flex items-center px-6 border-b border-slate-200/40 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl overflow-hidden shadow-lg shadow-orange-500/10 ring-1 ring-slate-200/50 dark:ring-white/10 flex items-center justify-center bg-white dark:bg-slate-800">
            <img src="/favicon.ico" alt="MusafirBaba" className="h-6 w-6 object-contain" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h1 className="text-md font-bold tracking-tight text-slate-900 dark:text-white leading-none">
              MusafirBaba
            </h1>
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-widest uppercase mt-1">
              Admin Portal
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6 gap-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
        {filteredNavGroups.map((group) => (
          <SidebarGroup
            key={group.label}
            className="p-0 border-none"
          >
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible defaultOpen className="group/collapsible">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between px-4 py-2.5 transition-all duration-300 rounded-full group-data-[state=open]/collapsible:bg-[#f4fcf4] group-data-[state=open]/collapsible:shadow-sm">
                      <div className="flex gap-3.5 items-center">
                        <div className={`p-1.5 rounded-lg transition-colors duration-300 ${
                          "group-data-[state=open]/collapsible:bg-[#87E87F]/20 group-data-[state=open]/collapsible:text-[#2d5a27]"
                        }`}>
                          <group.icon className="h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover/collapsible:scale-110" />
                        </div>
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold tracking-[0.1em] uppercase group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:text-slate-900 dark:group-data-[state=open]/collapsible:text-white transition-colors">
                          {group.label}
                        </span>
                      </div>

                      <FaChevronCircleDown className="ml-2 h-4 w-4 text-slate-400 bg-white rounded-full transition-all duration-500 group-data-[state=open]/collapsible:rotate-180 group-data-[state=open]/collapsible:text-[#87E87F] group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden">
                    <SidebarMenuSub className="ml-6 pl-4 border-l-2 border-slate-100 dark:border-slate-800 group-data-[state=open]/collapsible:border-[#87E87F]/30 space-y-1.5 my-2 transition-colors duration-500">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;
                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <Link
                              href={item.href}
                              className={`flex items-center gap-3 rounded-full px-3.5 py-2 transition-all duration-300 text-[13px] font-semibold group/item relative ${
                                active
                                  ? "bg-gradient-to-r from-[#FE5300] to-[#ff7a3d] text-white shadow-lg shadow-orange-500/30 scale-[1.02]"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-[#87E87F]/10 hover:text-slate-900 dark:hover:text-white active:scale-[0.98]"
                              }`}
                            >
                              <Icon className={`h-4.5 w-4.5 shrink-0 transition-all duration-300 ${
                                active ? "text-white scale-110" : "text-slate-400 group-hover/item:text-[#87E87F] group-hover/item:scale-110"
                              }`} />
                              <span className="group-data-[collapsible=icon]:hidden">
                                {item.label}
                              </span>
                              {active && (
                                <div className="absolute left-[-17px] w-[3px] h-6 bg-[#FE5300] rounded-r-full shadow-[2px_0_8px_rgba(254,83,0,0.5)]" />
                              )}
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
        ))}
      </SidebarContent>

      <SidebarFooter className="p-8 border-t border-slate-200/40 dark:border-slate-800/40 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md rounded-b-2xl">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#87E87F] animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              System Active
            </p>
          </div>
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 opacity-80">
            © {new Date().getFullYear()} MusafirBaba Pvt. Ltd
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
