import {
  Mountain,
  Landmark,
  Palmtree,
  Building2,
  Sparkles,
  Sun,
  CalendarClock,
  Backpack,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export interface NavDropdownItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  emoji?: string;
}

export interface NavLink {
  label: string;
  href: string;
  dropdown?: NavDropdownItem[];
}

// Every href below points at a route that already exists in the app today —
// verified against src/app/(user)/{destinations,holidays,visa,rental,blog,about-us}
// so the dropdowns can't introduce a 404 that wasn't there before.
export const NAV_LINKS: NavLink[] = [
  {
    label: "Destinations",
    href: "/destinations",
    dropdown: [
      { label: "Uttarakhand", href: "/destinations/uttarakhand", icon: Mountain },
      { label: "Rajasthan", href: "/destinations/rajasthan", icon: Landmark },
      { label: "Kerala", href: "/destinations/kerala", icon: Palmtree },
      { label: "Singapore", href: "/destinations/singapore", icon: Building2, emoji: "🇸🇬" },
      { label: "Dubai", href: "/destinations/dubai", icon: Sparkles, emoji: "🇦🇪" },
      { label: "Bali", href: "/destinations/bali", icon: Sun, emoji: "🇮🇩" },
      { label: "View all destinations", href: "/destinations", icon: ArrowRight },
    ],
  },
  {
    label: "Holidays",
    href: "/holidays",
    dropdown: [
      { label: "Weekend Getaways", href: "/holidays/weekend-getaways", icon: CalendarClock },
      { label: "Mountain Treks", href: "/holidays/mountain-treks", icon: Mountain },
      { label: "Religious Tours", href: "/holidays/religious-tours", icon: Landmark },
      { label: "Backpacking Trips", href: "/holidays/backpacking-trips", icon: Backpack },
      { label: "Early Bird Deals", href: "/holidays/early-bird", icon: Sparkles },
      { label: "View all packages", href: "/holidays", icon: ArrowRight },
    ],
  },
  {
    label: "Visa",
    href: "/visa",
    dropdown: [
      { label: "UAE Visa", href: "/visa/uae-visa", icon: FileCheck, emoji: "🇦🇪" },
      { label: "Schengen Visa", href: "/visa/schengen-visa", icon: FileCheck, emoji: "🇪🇺" },
      { label: "USA Visa", href: "/visa/us-visa", icon: FileCheck, emoji: "🇺🇸" },
      { label: "UK Visa", href: "/visa/uk-visa", icon: FileCheck, emoji: "🇬🇧" },
      { label: "Singapore Visa", href: "/visa/singapore-visa", icon: FileCheck, emoji: "🇸🇬" },
      { label: "Japan Visa", href: "/visa/japan-visa", icon: FileCheck, emoji: "🇯🇵" },
      { label: "View all visas", href: "/visa", icon: ShieldCheck },
    ],
  },
  // No dropdown: /rental has no working category/query-param routes today
  { label: "Car Rentals", href: "/rental" },
  { label: "Travel Stories", href: "/blog" },
  { label: "About Us", href: "/about-us" },
];
