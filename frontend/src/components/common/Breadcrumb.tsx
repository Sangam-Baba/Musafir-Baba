"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRightIcon,
  House,
  TreePalm,
  Tag,
  MapPin,
  Luggage,
  Stamp,
  BookOpen,
  Newspaper,
  Car,
  Ticket,
  Info,
  Phone,
  Briefcase,
  Crown,
  UserRound,
  Building2,
  Map as MapIcon,
  FileText,
  CreditCard,
  Compass,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";

// Icon for the first path segment (the section)
const SECTION_ICONS: Record<string, LucideIcon> = {
  holidays: TreePalm,
  visa: Stamp,
  blog: BookOpen,
  news: Newspaper,
  rental: Car,
  bookings: Ticket,
  destinations: Compass,
  "about-us": Info,
  "contact-us": Phone,
  career: Briefcase,
  membership: Crown,
  author: UserRound,
  "travel-agency": Building2,
  "plan-my-trip": MapIcon,
  payment: CreditCard,
  "thank-you": CircleCheck,
};

// Icons for deeper segments, by position, for sections with a known shape
// e.g. /holidays/[category]/[destination]/[package]
const DEPTH_ICONS: Record<string, LucideIcon[]> = {
  holidays: [TreePalm, Tag, MapPin, Luggage],
  rental: [Car, Tag, MapPin, Car],
  destinations: [Compass, MapPin],
};

function getSegmentIcon(pathSegments: string[], index: number): LucideIcon {
  const section = pathSegments[0];
  const byDepth = DEPTH_ICONS[section]?.[index];
  if (byDepth) return byDepth;
  if (index === 0) return SECTION_ICONS[section] ?? FileText;
  return FileText;
}

// Slightly smaller on phones so long trails wrap less; md+ unchanged
const iconClass = "w-3.5 h-3.5 md:w-4 md:h-4 shrink-0";

export default function Breadcrumb({ title }: { title?: string }) {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);

  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const name =
      segment.split("-").join(" ").charAt(0).toUpperCase() +
      segment.split("-").join(" ").slice(1);
    return { name, href, Icon: getSegmentIcon(pathSegments, index) };
  });

  return (
    <nav aria-label="Breadcrumb" className="text-[13px] md:text-sm text-gray-600 my-2 z-10">
      <ol className="flex flex-wrap items-center gap-y-0.5">
        <li className="flex items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-0.5 md:gap-1 text-gray-800 hover:text-blue-600 text-md hover:underline"
          >
            <House className={iconClass} aria-hidden="true" />
            Home
          </Link>

          {breadcrumbs.length > 0 && (
            <ChevronRightIcon
              size={16}
              color="#FE5300"
              className="mx-0.5 md:mx-1 w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"
            />
          )}
        </li>

        {breadcrumbs.map((bc, i) => {
          const isLast = i === breadcrumbs.length - 1;
          const { Icon } = bc;

          return (
            <li key={`${bc.href}-${i}`} className="flex items-center">
              {isLast ? (
                <span className="inline-flex items-center gap-0.5 md:gap-1 text-gray-800 text-md">
                  <Icon className={iconClass} aria-hidden="true" />
                  {title ?? bc.name}
                </span>
              ) : (
                <>
                  <Link
                    href={bc.href}
                    className="inline-flex items-center gap-0.5 md:gap-1 text-gray-800 hover:text-blue-600 text-md hover:underline z-10"
                  >
                    <Icon className={iconClass} aria-hidden="true" />
                    {bc.name}
                  </Link>

                  <ChevronRightIcon
                    size={16}
                    color="#FE5300"
                    className="mx-0.5 md:mx-1 w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
