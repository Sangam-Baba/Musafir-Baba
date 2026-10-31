// Shared between the visa detail page (VisaClient.tsx) and the admin "Tabs"
// editor (VisaTabsEditor.tsx), same idea as lib/packageTabs.ts for packages.
// A visa with no `tabsConfig` renders exactly as it always has; this config
// only takes effect once an admin saves a custom order/visibility for it.

export type VisaBuiltinTabKey =
  | "visasList"
  | "whyThisVisa"
  | "description"
  | "eligibility"
  | "documents"
  | "feesAndCharges"
  | "howToApply"
  | "process"
  | "rejectionReasons"
  | "expertTips"
  | "gallery"
  | "faqs";

export interface VisaTabConfigItem {
  key: string;
  label: string;
  type: "builtin" | "custom";
  builtinKey?: VisaBuiltinTabKey;
  // Custom tabs only: the tab's rich-text body
  content?: string;
  hidden?: boolean;
  // h2 heading above the section; empty falls back to the default heading
  // (built-ins) or the tab label (custom tabs)
  sectionTitle?: string;
}

// Same tabs, same order as the visa page has always shown
export const DEFAULT_VISA_TABS_CONFIG: VisaTabConfigItem[] = [
  { key: "visasList", label: "Visa Types", type: "builtin", builtinKey: "visasList" },
  { key: "whyThisVisa", label: "Why Visit", type: "builtin", builtinKey: "whyThisVisa" },
  { key: "description", label: "Visa Info", type: "builtin", builtinKey: "description" },
  { key: "eligibility", label: "Eligibility", type: "builtin", builtinKey: "eligibility" },
  { key: "documents", label: "Documents", type: "builtin", builtinKey: "documents" },
  { key: "feesAndCharges", label: "Fees & Charges", type: "builtin", builtinKey: "feesAndCharges" },
  { key: "howToApply", label: "How to Apply", type: "builtin", builtinKey: "howToApply" },
  { key: "process", label: "Process", type: "builtin", builtinKey: "process" },
  { key: "rejectionReasons", label: "Rejection Reasons", type: "builtin", builtinKey: "rejectionReasons" },
  { key: "expertTips", label: "Expert Tips", type: "builtin", builtinKey: "expertTips" },
  { key: "gallery", label: "Gallery", type: "builtin", builtinKey: "gallery" },
  { key: "faqs", label: "FAQs", type: "builtin", builtinKey: "faqs" },
];

const BUILTIN_KEYS = new Set<string>(DEFAULT_VISA_TABS_CONFIG.map((e) => e.builtinKey as string));

// Visa Types holds the pricing cards (and feeds the fee calculator), so it
// can be reordered but never hidden.
export const VISA_ALWAYS_VISIBLE_BUILTIN_KEYS = new Set<VisaBuiltinTabKey>(["visasList"]);

// Built-ins whose content is a single rich-text field on the visa, edited
// inline in the Tabs panel.
export const VISA_BUILTIN_RICH_TEXT_FIELD: Partial<Record<VisaBuiltinTabKey, string>> = {
  whyThisVisa: "whyThisVisa",
  description: "content",
  eligibility: "eligibility",
  documents: "documentsContent",
  feesAndCharges: "feesAndCharges",
  howToApply: "howToApply",
  process: "process",
};

export function getVisaTabDisplayLabel(entry: Pick<VisaTabConfigItem, "type" | "builtinKey" | "label">, country?: string): string {
  if (entry.type === "builtin") {
    if (entry.builtinKey === "whyThisVisa") return `Why Visit ${country || "Destination"}`;
    const def = DEFAULT_VISA_TABS_CONFIG.find((e) => e.builtinKey === entry.builtinKey);
    if (def) return def.label;
  }
  return entry.label;
}

// The heading each built-in section has always shown
export function getVisaDefaultSectionTitle(builtinKey: VisaBuiltinTabKey, country?: string): string {
  switch (builtinKey) {
    case "whyThisVisa": return `Why Visit ${country || "Destination"}`;
    case "process": return "Step-by-Step Process";
    case "rejectionReasons": return "Common Rejection Reasons";
    case "gallery": return country ? `${country} Gallery` : "Gallery";
    default: return DEFAULT_VISA_TABS_CONFIG.find((e) => e.builtinKey === builtinKey)?.label || "";
  }
}

export function makeVisaCustomTabKey(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Turns a stored tabsConfig into the full list: drops unknown/duplicate
// entries and slots in any built-in the stored list doesn't have yet (e.g. a
// built-in added after the admin saved), right after its default neighbour.
// So adding a new built-in later never makes it vanish from customised visas.
export function resolveVisaTabsConfig(stored?: VisaTabConfigItem[] | null): VisaTabConfigItem[] {
  if (!Array.isArray(stored) || stored.length === 0) return DEFAULT_VISA_TABS_CONFIG.map((e) => ({ ...e }));

  const seen = new Set<string>();
  const result: VisaTabConfigItem[] = [];
  for (const entry of stored) {
    if (!entry?.key || seen.has(entry.key)) continue;
    if (entry.type === "builtin" && (!entry.builtinKey || !BUILTIN_KEYS.has(entry.builtinKey) || entry.key !== entry.builtinKey)) continue;
    if (entry.type !== "builtin" && entry.type !== "custom") continue;
    seen.add(entry.key);
    result.push(entry);
  }

  DEFAULT_VISA_TABS_CONFIG.forEach((def, defIndex) => {
    if (seen.has(def.key)) return;
    let insertAt = 0;
    for (let i = defIndex - 1; i >= 0; i--) {
      const idx = result.findIndex((e) => e.key === DEFAULT_VISA_TABS_CONFIG[i].key);
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

// What the admin pages send on save: [] when nothing differs from the default
// (so the visa keeps the original, non-customised page), otherwise the list
// with empty custom tab names filled in (label is required by the schema).
export function toSavedTabsConfig(config: VisaTabConfigItem[]): VisaTabConfigItem[] {
  if (isDefaultVisaTabsConfig(config)) return [];
  return config.map((e) =>
    e.type === "custom"
      ? { key: e.key, label: e.label?.trim() || "Untitled Tab", type: "custom", content: e.content || "", hidden: !!e.hidden, sectionTitle: e.sectionTitle || "" }
      : { key: e.key, label: e.label, type: "builtin", builtinKey: e.builtinKey, hidden: !!e.hidden, sectionTitle: e.sectionTitle || "" }
  );
}

// True when a config is just the default (same order, nothing hidden, no
// titles, no custom tabs) — the admin pages save it as "not customised".
export function isDefaultVisaTabsConfig(config: VisaTabConfigItem[]): boolean {
  if (config.length !== DEFAULT_VISA_TABS_CONFIG.length) return false;
  return config.every(
    (e, i) =>
      e.type === "builtin" &&
      e.key === DEFAULT_VISA_TABS_CONFIG[i].key &&
      !e.hidden &&
      !e.sectionTitle?.trim()
  );
}
