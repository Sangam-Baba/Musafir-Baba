import type { IconType } from "react-icons";
import {
  PiMapTrifoldDuotone,
  PiSuitcaseRollingDuotone,
  PiIdentificationCardDuotone,
  PiCarProfileDuotone,
  PiMountainsDuotone,
  PiCastleTurretDuotone,
  PiSnowflakeDuotone,
  PiTreePalmDuotone,
  PiBuildingsDuotone,
  PiCityDuotone,
  PiIslandDuotone,
  PiGlobeHemisphereEastDuotone,
  PiCalendarStarDuotone,
  PiPersonSimpleHikeDuotone,
  PiHandsPrayingDuotone,
  PiBackpackDuotone,
  PiSealPercentDuotone,
  PiAirplaneTiltDuotone,
  PiStampDuotone,
  PiShieldCheckDuotone,
} from "react-icons/pi";

export interface NavDropdownItem {
  label: string;
  href: string;
  icon?: IconType;
  emoji?: string;
}

export interface NavLink {
  label: string;
  href: string;
  icon?: IconType;
  dropdown?: NavDropdownItem[];
}

// Every href below points at a route that already exists in the app today —
// verified against src/app/(user)/{destinations,holidays,visa,rental,blog,about-us}
// so the dropdowns can't introduce a 404 that wasn't there before.
//
// Icons are Phosphor duotone SVGs (via react-icons) — no flag emojis. Windows
// has no flag-emoji glyphs, so 🇦🇪 etc. rendered as raw letter pairs ("AE",
// "SG") there. SVGs look identical on every OS.
export const NAV_LINKS: NavLink[] = [
  {
    label: "Travel Destinations",
    href: "/destinations",
    icon: PiMapTrifoldDuotone,
    dropdown: [
      { label: "Uttarakhand", href: "/destinations/uttarakhand", icon: PiMountainsDuotone },
      { label: "Rajasthan", href: "/destinations/rajasthan", icon: PiCastleTurretDuotone },
      { label: "Himachal", href: "/destinations/himachal-pradesh", icon: PiSnowflakeDuotone },
      { label: "Kerala", href: "/destinations/kerala", icon: PiTreePalmDuotone },
      { label: "Dubai", href: "/destinations/dubai", icon: PiBuildingsDuotone },
      { label: "Singapore", href: "/destinations/singapore", icon: PiCityDuotone },
      { label: "Thailand", href: "/destinations/thailand", icon: PiIslandDuotone },
      { label: "View all destinations", href: "/destinations", icon: PiGlobeHemisphereEastDuotone },
    ],
  },
  {
    label: "Holiday Packages",
    href: "/holidays",
    icon: PiSuitcaseRollingDuotone,
    dropdown: [
      { label: "Weekend Getaways", href: "/holidays/weekend-getaways", icon: PiCalendarStarDuotone },
      { label: "Mountain Treks", href: "/holidays/mountain-treks", icon: PiPersonSimpleHikeDuotone },
      { label: "Religious Tours", href: "/holidays/religious-tours", icon: PiHandsPrayingDuotone },
      { label: "Backpacking Trips", href: "/holidays/backpacking-trips", icon: PiBackpackDuotone },
      { label: "Early Bird Deals", href: "/holidays/early-bird", icon: PiSealPercentDuotone },
      { label: "View all packages", href: "/holidays", icon: PiAirplaneTiltDuotone },
    ],
  },
  {
    label: "Visa",
    href: "/visa",
    icon: PiIdentificationCardDuotone,
    dropdown: [
      { label: "UAE Visa", href: "/visa/uae-visa", icon: PiStampDuotone },
      { label: "Schengen Visa", href: "/visa/schengen-visa", icon: PiStampDuotone },
      { label: "USA Visa", href: "/visa/us-visa", icon: PiStampDuotone },
      { label: "UK Visa", href: "/visa/uk-visa", icon: PiStampDuotone },
      { label: "Singapore Visa", href: "/visa/singapore-visa", icon: PiStampDuotone },
      { label: "Japan Visa", href: "/visa/japan-visa", icon: PiStampDuotone },
      { label: "View all visas", href: "/visa", icon: PiShieldCheckDuotone },
    ],
  },
  // No dropdown: /rental has no working category/query-param routes today
  { label: "Car Rentals", href: "/rental", icon: PiCarProfileDuotone },
  // { label: "Travel Stories", href: "/blog" },
  // { label: "About Us", href: "/about-us" },
];
