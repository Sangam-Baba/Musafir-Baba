import { HelpCircle, Image as ImageIcon, Info, Sparkles } from "lucide-react";
import type { FormTab } from "./FormBits";

// Sub-tab layout shared by the Create / Edit Destination forms.
export type DestinationFormTab = "basic" | "highlights" | "seo" | "faq";

export const DESTINATION_TABS: FormTab[] = [
  { value: "basic", label: "Basic Detail", icon: Info },
  { value: "highlights", label: "Highlights", icon: Sparkles },
  { value: "seo", label: "Media & SEO", icon: ImageIcon },
  { value: "faq", label: "FAQ", icon: HelpCircle },
];

export const DESTINATION_TAB_ORDER = DESTINATION_TABS.map((t) => t.value);

// Top-level form field -> tab it is rendered in.
export const DESTINATION_FIELD_TABS: Record<string, string> = {
  name: "basic",
  description: "basic",
  content: "basic",
  country: "basic",
  state: "basic",
  city: "basic",
  status: "basic",
  popularAttractions: "highlights",
  thingsToDo: "highlights",
  coverImage: "seo",
  gallery: "seo",
  metaTitle: "seo",
  metaDescription: "seo",
  schemaType: "seo",
  keywords: "seo",
  faqSchema: "faq",
};
