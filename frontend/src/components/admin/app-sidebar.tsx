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
  Video,
  IndianRupee,
  Images,
  NewspaperIcon,
  Car,
  Database,
  KeyRound,
} from "lucide-react";
import { MdDashboardCustomize } from "react-icons/md";
import Link from "next/link";
import { FaChevronCircleDown } from "react-icons/fa";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

const NAV_GROUPS = [
  {
    label: "Main",
    icon: FaHome,
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: Home,
        permission: "dashboard",
      },
      {
        label: "Enquiry",
        href: "/admin/enquiry",
        icon: CircleQuestionMark,
        permission: "enquiry",
      },
      {
        label: "Bookings",
        href: "/admin/bookings",
        icon: CookingPot,
        permission: "bookings",
      },
    ],
  },
  {
    label: "Content Management",
    icon: ListChecks,
    items: [
      {
        label: "WebPages",
        href: "/admin/webpage",
        icon: LayoutTemplate,
        permission: "webpage",
      },
      {
        label: "Blogs",
        href: "/admin/blogs",
        icon: ScrollText,
        permission: "blogs",
      },
      {
        label: "News",
        href: "/admin/news",
        icon: Newspaper,
        permission: "news",
      },
      { label: "Visa", href: "/admin/visa", icon: Rocket, permission: "visa" },
      {
        label: "Vehicle",
        href: "/admin/vehicle",
        icon: Car,
        permission: "vehicle",
      },
      {
        label: "Career",
        href: "/admin/career",
        icon: Briefcase,
        permission: "career",
      },
      {
        label: "Gallery",
        href: "/admin/gallery",
        icon: Images,
        permission: "gallery",
      },
      {
        label: "About Us",
        href: "/admin/about-us",
        icon: Users,
        permission: "about-us",
      },
      {
        label: "Video Banner",
        href: "/admin/video-banner",
        icon: Video,
        permission: "video-banner",
      },
      {
        label: "Footer Items",
        href: "/admin/footer",
        icon: ListChecks,
        permission: "footer",
      },
    ],
  },
  {
    label: "Packages",
    icon: FaBox,
    items: [
      {
        label: "All Packages",
        href: "/admin/holidays",
        icon: Box,
        permission: "holidays",
      },
      {
        label: "Customized Packages",
        href: "/admin/customized-tour-package",
        icon: MdDashboardCustomize,
        permission: "customized-tour-package",
      },
      {
        label: "Plan My Trip",
        href: "/admin/customized-package",
        icon: Cog,
        permission: "plan-my-trip",
      },
      {
        label: "Destinations",
        href: "/admin/destination",
        icon: MapPin,
        permission: "destination",
      },
      {
        label: "Destinations Meta",
        href: "/admin/destination-seo",
        icon: MapPinPenIcon,
        permission: "destination-seo",
      },
      {
        label: "Category",
        href: "/admin/category",
        icon: Tags,
        permission: "category",
      },
    ],
  },
  {
    label: "Master Data",
    icon: Database,
    items: [
      {
        label: "Vehicle Brands",
        href: "/admin/master-data/brand",
        icon: Tags,
        permission: "vehicle",
      },
      {
        label: "Vehicle Types",
        href: "/admin/master-data/type",
        icon: ListChecks,
        permission: "vehicle",
      },
      {
        label: "Pickup Destinations",
        href: "/admin/master-data/pickup-destination",
        icon: MapPin,
        permission: "vehicle",
      },
      {
        label: "Fuel Types",
        href: "/admin/master-data/fuel-type",
        icon: Database,
        permission: "vehicle",
      },
      {
        label: "Transmissions",
        href: "/admin/master-data/transmission",
        icon: Settings,
        permission: "vehicle",
      },
    ],
  },
  {
    label: "Settings",
    icon: FaCog,
    items: [
      {
        label: "Authors",
        href: "/admin/authors",
        icon: Users,
        permission: "authors",
      },
      {
        label: "Role Management",
        href: "/admin/role",
        icon: Settings,
        permission: "role",
      },
      {
        label: "Coupons",
        href: "/admin/coupon",
        icon: IndianRupee,
        permission: "coupon",
      },
      {
        label: "Membership",
        href: "/admin/membership",
        icon: UserRoundCheck,
        permission: "membership",
      },
      {
        label: "Newsletter",
        href: "/admin/newsletter",
        icon: NewspaperIcon,
        permission: "newsletter",
      },
      {
        label: "Change Password",
        href: "/admin/update-password",
        icon: KeyRound,
        permission: "dashboard", // Everyone with dashboard access (likely all admins) can change their password
      },
    ],
  },
];

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
      return permissions.includes(item.permission);
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
                    <SidebarMenuButton className="w-full hover:bg-white dark:hover:bg-slate-800/40 flex items-center justify-between px-4 py-2.5 transition-all duration-300 rounded-xl group-data-[state=open]/collapsible:bg-[#87E87F]/5 group-data-[state=open]/collapsible:shadow-sm">
                      <div className="flex gap-3.5 items-center">
                        <div className={`p-1.5 rounded-lg transition-colors duration-300 ${
                          "group-data-[state=open]/collapsible:bg-[#87E87F]/20 group-data-[state=open]/collapsible:text-[#2d5a27]"
                        }`}>
                          <group.icon className="h-4.5 w-4.5 shrink-0 transition-transform duration-300 group-hover/collapsible:scale-110" />
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold tracking-[0.1em] uppercase group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:text-slate-900 dark:group-data-[state=open]/collapsible:text-white transition-colors">
                          {group.label}
                        </span>
                      </div>

                      <FaChevronCircleDown className="ml-2 h-4 w-4 text-slate-400 transition-all duration-500 group-data-[state=open]/collapsible:rotate-180 group-data-[state=open]/collapsible:text-[#87E87F] group-data-[collapsible=icon]:hidden" />
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
                              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-300 text-sm group/item relative ${
                                active
                                  ? "bg-gradient-to-r from-[#FE5300] to-[#ff7a3d] text-white shadow-lg shadow-orange-500/30 scale-[1.02]"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-[#87E87F]/10 hover:text-slate-900 dark:hover:text-white active:scale-[0.98]"
                              }`}
                            >
                              <Icon className={`h-4.5 w-4.5 shrink-0 transition-all duration-300 ${
                                active ? "text-white scale-110" : "text-slate-400 group-hover/item:text-[#87E87F] group-hover/item:scale-110"
                              }`} />
                              <span className="group-data-[collapsible=icon]:hidden font-medium">
                                {item.label}
                              </span>
                              {active && (
                                <div className="absolute left-[-22px] w-1.5 h-6 bg-[#FE5300] rounded-r-full shadow-[2px_0_8px_rgba(254,83,0,0.5)]" />
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
