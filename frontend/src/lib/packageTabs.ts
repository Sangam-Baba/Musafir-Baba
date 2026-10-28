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
  // Custom tabs: the tab's rich-text body. Built-in "itineraries": optional
  // rich-text intro shown above the itinerary steps. Unused by other built-ins.
  content?: string;
  hidden?: boolean;
  // The h2 heading shown above the tab's content on the page. `label` is the
  // short name on the tab pill. Custom tabs fall back to `label` when empty;
  // built-ins in BUILTIN_DEFAULT_SECTION_TITLE fall back to their old fixed
  // heading, so packages that never set it render exactly as before.
  sectionTitle?: string;
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
  { key: "includeexclude", label: "Inclusions/Exclusions", type: "builtin", builtinKey: "includeexclude" },
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

// Built-in sections with a single h2 heading, mapped to the heading the page
// has always shown. An admin can override it per package via `sectionTitle`.
// Inclusions/Exclusions (two headings), Resources (no h2) and Why Us (fixed
// site-wide block) aren't listed, so their headings stay fixed.
export const BUILTIN_DEFAULT_SECTION_TITLE: Partial<Record<BuiltinTabKey, string>> = {
  whychoose: "Why Choose This Package?",
  description: "Package Overview",
  itineraries: "Journey Route",
  hotels: "Hotels & Accommodation",
  faqs: "FAQs",
};

// Built-in tab names are fixed (not editable in the admin Tabs editor), so a
// built-in tab always shows its default name — any name stored from before
// renaming was disabled (e.g. "Best Time to Visit Chardham") is ignored for
// display. Display-only: saved data is never changed. Custom tabs keep their
// own label.
const BUILTIN_DEFAULT_LABEL: Record<string, string> = Object.fromEntries(
  DEFAULT_TABS_CONFIG.map((entry) => [entry.builtinKey as string, entry.label])
);

export function getTabDisplayLabel(entry: Pick<TabConfigItem, "type" | "builtinKey" | "label">): string {
  if (entry.type === "builtin" && entry.builtinKey && BUILTIN_DEFAULT_LABEL[entry.builtinKey]) {
    return BUILTIN_DEFAULT_LABEL[entry.builtinKey];
  }
  return entry.label;
}
