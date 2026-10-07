// Shared between the package detail page (SlugClients.tsx, which renders
// tabs in this order) and the admin "Tabs" editor (which lets an admin
// reorder/hide built-ins and add custom tabs). Keeping the type and default
// order in one place means both sides can never drift out of sync.

export type BuiltinTabKey =
  | "whychoose"
  | "description"
  | "itineraries"
  | "hotels"
  | "includeexclude"
  | "whychoosemusafirbaba"
  | "faqs"
  | "helpfulresources";

export interface TabConfigItem {
  key: string;
  label: string;
  type: "builtin" | "custom";
  builtinKey?: BuiltinTabKey;
  content?: string;
  hidden?: boolean;
}

// The tab order/set every package used before per-package customization
// existed. A package's own `tabsConfig` (set via the admin "Tabs" tab)
// overrides this; packages that have never touched that feature have no
// `tabsConfig`, so they resolve to exactly this list, in this order.
export const DEFAULT_TABS_CONFIG: TabConfigItem[] = [
  { key: "whychoose", label: "Why Choose", type: "builtin", builtinKey: "whychoose" },
  { key: "description", label: "Overview", type: "builtin", builtinKey: "description" },
  { key: "itineraries", label: "Itinerary", type: "builtin", builtinKey: "itineraries" },
  { key: "hotels", label: "Hotels", type: "builtin", builtinKey: "hotels" },
  { key: "includeexclude", label: "Inclusions", type: "builtin", builtinKey: "includeexclude" },
  { key: "whychoosemusafirbaba", label: "Why Us", type: "builtin", builtinKey: "whychoosemusafirbaba" },
  { key: "faqs", label: "FAQs", type: "builtin", builtinKey: "faqs" },
  { key: "helpfulresources", label: "Resources", type: "builtin", builtinKey: "helpfulresources" },
];

// Overview, Itinerary and Inclusions carry a package's core required content
// — there was never an admin-facing way to make the page not show them, so
// they can be reordered but never deleted or hidden.
export const ALWAYS_VISIBLE_BUILTIN_KEYS = new Set<BuiltinTabKey>([
  "description",
  "itineraries",
  "includeexclude",
]);

export function makeCustomTabKey(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Built-in tabs whose content is a single rich-text field — these can be
// edited inline in the Tabs panel the same way a custom tab is, since
// there's no dedicated structured editor elsewhere for them (unlike e.g.
// Itinerary or FAQs, which have their own array-based editors with
// image uploaders, batch pickers, etc. that aren't worth duplicating here).
export const BUILTIN_RICH_TEXT_FIELD: Partial<Record<BuiltinTabKey, string>> = {
  whychoose: "whyChooseThisPackage",
  description: "description",
  hotels: "hotelsAndAccommodation",
};
