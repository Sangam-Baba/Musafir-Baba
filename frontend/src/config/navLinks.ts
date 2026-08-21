export interface NavDropdownItem {
  label: string;
  href: string;
}

export interface NavLink {
  label: string;
  href: string;
  dropdown?: NavDropdownItem[];
}

// Every href below points at a route that already exists in the app today —
// verified against src/app/(user)/{destinations,holidays,visa,rental,blog,about-us}
// so the new dropdowns can't introduce a 404 that wasn't there before.
export const NAV_LINKS: NavLink[] = [
  {
    label: "Destinations",
    href: "/destinations",
    dropdown: [
      { label: "Uttarakhand", href: "/destinations/uttarakhand" },
      { label: "Rajasthan", href: "/destinations/rajasthan" },
      { label: "Kerala", href: "/destinations/kerala" },
      { label: "Singapore", href: "/destinations/singapore" },
      { label: "Dubai", href: "/destinations/dubai" },
      { label: "Bali", href: "/destinations/bali" },
      { label: "View all destinations", href: "/destinations" },
    ],
  },
  {
    label: "Holidays",
    href: "/holidays",
    dropdown: [
      { label: "Weekend Getaways", href: "/holidays/weekend-getaways" },
      { label: "Mountain Treks", href: "/holidays/mountain-treks" },
      { label: "Religious Tours", href: "/holidays/religious-tours" },
      { label: "Backpacking Trips", href: "/holidays/backpacking-trips" },
      { label: "Early Bird Deals", href: "/holidays/early-bird" },
      { label: "View all packages", href: "/holidays" },
    ],
  },
  {
    label: "Visa",
    href: "/visa",
    dropdown: [
      { label: "UAE Visa", href: "/visa/uae-visa" },
      { label: "Schengen Visa", href: "/visa/schengen-visa" },
      { label: "USA Visa", href: "/visa/us-visa" },
      { label: "UK Visa", href: "/visa/uk-visa" },
      { label: "Singapore Visa", href: "/visa/singapore-visa" },
      { label: "Japan Visa", href: "/visa/japan-visa" },
      { label: "View all visas", href: "/visa" },
    ],
  },
  // No dropdown: /rental has no working category/query-param routes today
  // (RentalsClient accepts an initialVehicleType prop but no page ever passes
  // it), so a dropdown here would just be decorative items linking to the
  // same page. Flat link until real rental subcategory pages exist.
  { label: "Car Rentals", href: "/rental" },
  { label: "Travel Stories", href: "/blog" },
  { label: "About Us", href: "/about-us" },
];
