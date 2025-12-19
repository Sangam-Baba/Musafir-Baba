"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

import {
  Home,
  User,
  Heart,
  Wallet,
  TicketPercent,
  FileText,
  Clock,
  HandCoins,
  History,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/user", icon: Home },
  { label: "Profile", href: "/user/profile", icon: User },
  { label: "Booking History", href: "/user/bookings", icon: History },
  // { label: "Transaction History", href: "/user/transactions", icon: History },
  { label: "Membership", href: "/user/membership", icon: HandCoins },
  { label: "Documents", href: "/user/documents", icon: FileText },
  { label: "Wishlist", href: "/user/wishlist", icon: Heart },
  { label: "Offers", href: "/user/my-offers", icon: TicketPercent },
  { label: "Wallet", href: "/user/wallet", icon: Wallet },
];

export function UserSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon" className="shadow-md">
      <SidebarHeader className="px-4 py-3 border-b-2 group-data-[collapsible=icon]:hidden">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Welcome!
        </h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;

                return (
                  <SidebarMenuButton
                    asChild
                    key={item.href}
                    className="hover:bg-[#FE5300]/50 "
                  >
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 rounded-md px-3 py-5 text-lg font-medium transition-all
                        ${
                          active
                            ? "bg-[#FE5300]/90 text-white shadow-sm hover:bg-[#FE5300]/100"
                            : "text-slate-700 dark:text-slate-200 hover:bg-[#FE5300]/40"
                        }
                      `}
                    >
                      <Icon
                        strokeWidth={3}
                        className={`h-5 w-5 transition
                          ${active ? "text-white" : "text-[#FE5300]"}
                        `}
                      />

                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200/50 dark:border-slate-800/50 px-4 py-3 group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Musafirbaba Pvt. Ltd
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
