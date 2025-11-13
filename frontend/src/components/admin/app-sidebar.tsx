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
import { FaHome, FaCog, FaBox } from "react-icons/fa";

import {
  Home,
  Users,
  Box,
  Settings,
  ScrollText,
  MapPin,
  Tags,
  LayoutTemplate,
  Newspaper,
  UserRoundCheck,
  ListChecks,
  Rocket,
  Briefcase,
  Cog,
  CircleQuestionMark,
  CookingPot,
  MapPinPenIcon,
} from "lucide-react";
import { MdDashboardCustomize } from "react-icons/md";
import Link from "next/link";
import { FaChevronCircleDown } from "react-icons/fa";

const NAV_GROUPS = [
  {
    label: "Main",
    icon: FaHome,
    items: [
      { label: "Dashboard", href: "/admin", icon: Home },
      { label: "Enquiry", href: "/admin/enquiry", icon: CircleQuestionMark },
      { label: "Bookings", href: "/admin/bookings", icon: CookingPot },
    ],
  },
  {
    label: "Content Management",
    icon: ListChecks,
    items: [
      { label: "WebPages", href: "/admin/webpage", icon: LayoutTemplate },
      { label: "Blogs", href: "/admin/blogs", icon: ScrollText },
      { label: "News", href: "/admin/news", icon: Newspaper },
      { label: "Visa", href: "/admin/visa", icon: Rocket },
      { label: "Career", href: "/admin/career", icon: Briefcase },
      { label: "About Us", href: "/admin/about-us", icon: Users },
    ],
  },
  {
    label: "Packages",
    icon: FaBox,
    items: [
      { label: "All Packages", href: "/admin/holidays", icon: Box },
      {
        label: "Customized Packages",
        href: "/admin/customized-tour-package",
        icon: MdDashboardCustomize,
      },
      { label: "Plan My Trip", href: "/admin/customized-package", icon: Cog },
      { label: "Destinations", href: "/admin/destination", icon: MapPin },
      {
        label: "Destinations Meta",
        href: "/admin/destination-seo",
        icon: MapPinPenIcon,
      },
      { label: "Category", href: "/admin/category", icon: Tags },
    ],
  },
  {
    label: "Settings",
    icon: FaCog,
    items: [
      { label: "Authors", href: "/admin/authors", icon: Users },
      { label: "Role Management", href: "/admin/role", icon: Settings },
      { label: "Membership", href: "/admin/membership", icon: UserRoundCheck },
      { label: "Footer Items", href: "/admin/footer", icon: ListChecks },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          Admin Panel
        </h1>
      </SidebarHeader>

      <SidebarContent className="">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup
            key={group.label}
            className="space-y-0 py-1 border-b last:border-b-0 border-slate-200/40 dark:border-slate-800/60"
          >
            <SidebarGroupContent className="space-y-0">
              <SidebarMenu className="space-y-0">
                <Collapsible defaultOpen className="group">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full data-[state=open]:bg-[#87E87F] data-[state=open]:hover:bg-[#87E87F] flex items-center justify-between text-left text-sm font-medium">
                      <div className="flex gap-1 items-center">
                        <group.icon className="h-4 w-4 shrink-0" />
                        <span className="text-slate-900 dark:text-white text-md group-data-[collapsible=icon]:hidden">
                          {group.label}
                        </span>
                      </div>

                      <FaChevronCircleDown className="ml-2 h-4 w-4 transition-transform duration-500 group-data-[state=open]:rotate-180 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="pt-1 transition-all duration-300 ease-in-out">
                    <SidebarMenuSub className="pl-3 space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;
                        return (
                          <SidebarMenuSubItem key={item.href}>
                            <Link
                              href={item.href}
                              className={`flex items-center gap-3 rounded-md px-3 py-1.5 transition text-sm ${
                                active
                                  ? "bg-[#FE5300] text-white"
                                  : "hover:bg-[#FE5300]/10 dark:hover:bg-slate-800"
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="group-data-[collapsible=icon]:hidden">
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
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200/40 dark:border-slate-800/60">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Musafirbaba Pvt. Ltd
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
