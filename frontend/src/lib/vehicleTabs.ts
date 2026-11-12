// Shared between the rental vehicle page (rental/.../[slug]/pageClient.tsx)
// and the admin "Tabs" editor (VehicleTabsEditor.tsx), same idea as
// lib/visaTabs.ts and lib/packageTabs.ts. A vehicle with no `tabsConfig`
// renders exactly as it always has; this only takes effect once an admin
// saves a custom order/visibility for it.

export type VehicleBuiltinTabKey =
  | "description"
  | "features"
  | "includeexclude"
  | "availablefor"
  | "rentaloptions"
  | "howbookingworks"
  | "faqs"
  | "resources";

export interface VehicleTabConfigItem {
  key: string;
  label: string;
  type: "builtin" | "custom";
  builtinKey?: VehicleBuiltinTabKey;
  // Custom tabs only: the tab's rich-text body
  content?: string;
  hidden?: boolean;
  // Heading above the section; empty falls back to the default heading
  // (built-ins) or the tab label (custom tabs)
  sectionTitle?: string;
}

// Same sections, same order as the rental page has always shown
export const DEFAULT_VEHICLE_TABS_CONFIG: VehicleTabConfigItem[] = [
  { key: "description", label: "Overview", type: "builtin", builtinKey: "description" },
  { key: "features", label: "Features", type: "builtin", builtinKey: "features" },
  { key: "includeexclude", label: "Includes & Excludes", type: "builtin", builtinKey: "includeexclude" },
  { key: "availablefor", label: "Available For", type: "builtin", builtinKey: "availablefor" },
  { key: "rentaloptions", label: "Rental Options", type: "builtin", builtinKey: "rentaloptions" },
  { key: "howbookingworks", label: "How Booking Works", type: "builtin", builtinKey: "howbookingworks" },
  { key: "faqs", label: "FAQs", type: "builtin", builtinKey: "faqs" },
  { key: "resources", label: "Helpful Resources", type: "builtin", builtinKey: "resources" },
];

const BUILTIN_KEYS = new Set<string>(DEFAULT_VEHICLE_TABS_CONFIG.map((e) => e.builtinKey as string));

// The heading each built-in section has always shown. Sections without a
// single heading (Inclusions/Exclusions, Helpful Resources) have none, so
// they get no Section title override.
export const VEHICLE_DEFAULT_SECTION_TITLE: Partial<Record<VehicleBuiltinTabKey, string>> = {
  description: "Overview",
  features: "Key Features",
  availablefor: "Available For",
  rentaloptions: "Rental Options",
  howbookingworks: "How Booking Works",
  faqs: "Frequently Asked Questions",
};

// Built-ins whose content is a single rich-text field on the vehicle
export const VEHICLE_BUILTIN_RICH_TEXT_FIELD: Partial<Record<VehicleBuiltinTabKey, string>> = {
  description: "content",
  availablefor: "availableFor",
  rentaloptions: "rentalOptions",
  howbookingworks: "howBookingWorks",
};

// Where the other built-ins' content is edited in the admin form
export const VEHICLE_BUILTIN_EDIT_NOTE: Partial<Record<VehicleBuiltinTabKey, string>> = {
  features: "Content is edited in the Additional tab (Vehicle Features).",
  includeexclude: "Content is edited in the Additional tab (Inclusions / Exclusions).",
  faqs: "Content is edited in the Additional tab (FAQs).",
  resources: "Content is edited in the Additional tab (Helpful Resources).",
};

export function getVehicleTabDisplayLabel(entry: Pick<VehicleTabConfigItem, "type" | "builtinKey" | "label">): string {
  if (entry.type === "builtin") {
    const def = DEFAULT_VEHICLE_TABS_CONFIG.find((e) => e.builtinKey === entry.builtinKey);
    if (def) return def.label;
  }
  return entry.label;
}

export function makeVehicleCustomTabKey(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Turns a stored tabsConfig into the full list: drops unknown/duplicate
// entries and slots in any built-in the stored list doesn't have yet, right
// after its default neighbour.
export function resolveVehicleTabsConfig(stored?: VehicleTabConfigItem[] | null): VehicleTabConfigItem[] {
  if (!Array.isArray(stored) || stored.length === 0) return DEFAULT_VEHICLE_TABS_CONFIG.map((e) => ({ ...e }));

  const seen = new Set<string>();
  const result: VehicleTabConfigItem[] = [];
  for (const entry of stored) {
    if (!entry?.key || seen.has(entry.key)) continue;
    if (entry.type === "builtin" && (!entry.builtinKey || !BUILTIN_KEYS.has(entry.builtinKey) || entry.key !== entry.builtinKey)) continue;
    if (entry.type !== "builtin" && entry.type !== "custom") continue;
    seen.add(entry.key);
    result.push(entry);
  }

  DEFAULT_VEHICLE_TABS_CONFIG.forEach((def, defIndex) => {
    if (seen.has(def.key)) return;
    let insertAt = 0;
    for (let i = defIndex - 1; i >= 0; i--) {
      const idx = result.findIndex((e) => e.key === DEFAULT_VEHICLE_TABS_CONFIG[i].key);
      if (idx !== -1) {
        insertAt = idx + 1;
        break;
      }
    }
    result.splice(insertAt, 0, { ...def });
    seen.add(def.key);
  });

  return result;
}

// True when a config is just the default (same order, nothing hidden, no
// titles, no custom tabs)
export function isDefaultVehicleTabsConfig(config: VehicleTabConfigItem[]): boolean {
  if (config.length !== DEFAULT_VEHICLE_TABS_CONFIG.length) return false;
  return config.every(
    (e, i) =>
      e.type === "builtin" &&
      e.key === DEFAULT_VEHICLE_TABS_CONFIG[i].key &&
      !e.hidden &&
      !e.sectionTitle?.trim()
  );
}

// What the admin form sends on save: [] when nothing differs from the default
// (so the vehicle keeps the original, non-customised page)
export function toSavedVehicleTabsConfig(config: VehicleTabConfigItem[]): VehicleTabConfigItem[] {
  if (isDefaultVehicleTabsConfig(config)) return [];
  return config.map((e) =>
    e.type === "custom"
      ? { key: e.key, label: e.label?.trim() || "Untitled Tab", type: "custom", content: e.content || "", hidden: !!e.hidden, sectionTitle: e.sectionTitle || "" }
      : { key: e.key, label: e.label, type: "builtin", builtinKey: e.builtinKey, hidden: !!e.hidden, sectionTitle: e.sectionTitle || "" }
  );
}
