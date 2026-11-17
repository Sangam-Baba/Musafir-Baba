// Hotel listings — shapes from /api/v1/hotel/properties (backend/src/b2b/modules/hotel-catalog).
export type ListingStatus = "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "LIVE" | "SUSPENDED" | "ARCHIVED";
export type Section = "basic" | "location" | "contacts" | "times" | "policies" | "amenities";

export interface PhotoSize { url: string; width: number; height: number }
export interface Photo {
  id: string;
  roomTypeId: string | null;
  category: string;
  caption: string | null;
  order: number;
  isCover: boolean;
  placeholder: string;
  sizes: Record<string, PhotoSize>;
}

export interface Policies {
  childrenAllowed: boolean;
  childFreeUntilAge: number;
  extraBeds: boolean;
  petsAllowed: boolean;
  coupleFriendly: boolean;
  localIdAccepted: boolean;
  smoking: "NO" | "DESIGNATED" | "YES";
  idProofs: string[];
  notes?: string | null;
}

export interface Property {
  id: string;
  publicRef: string;
  slug: string;
  status: ListingStatus;
  version: number;
  round: number;
  submittedAt: string | null;
  publishedAt: string | null;
  history: { at: string; action: string; status: string; note: string | null }[];
  pendingRevision: { revisionId: string; submittedAt: string; changes: Record<string, unknown> } | null;
  review: { comments: { section: string; note: string }[]; note: string | null; at: string } | null;
  name: string;
  propertyTypeKey: string;
  starRating: number;
  description: string;
  cityId: string | null;
  areaId: string | null;
  stateCode: string | null;
  address: { line1: string | null; line2: string | null; pin: string | null };
  lat: number | null;
  lng: number | null;
  contacts: { email: string | null; phone: string | null; whatsapp: string | null };
  checkInTime: string | null;
  checkOutTime: string | null;
  timeZone: string;
  policies: Policies | null;
  amenities: string[];
  visibility: { website: boolean; b2b: boolean; clientCategories: string[]; sellFrom: string | null };
  photos: Photo[];
  photoCounts: { property: number; perRoomType: Record<string, number> };
  gstin: string | null;
  gstinMissing: boolean;
  sections: Record<Section, boolean>;
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
  sizeSqm: number | null;
  beds: { bedTypeKey: string; count: number }[];
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  extraBeds: { allowed: boolean; max: number };
  amenities: string[];
  order: number;
  status: string;
  version: number;
}

export interface Masters {
  cities: { id: string; name: string; slug: string; stateCode: string; lat: number; lng: number; radiusKm: number; areas: { id: string; name: string }[] }[];
  amenities: { key: string; name: string; level: "PROPERTY" | "ROOM" | "BOTH"; group: string; icon: string | null }[];
  propertyTypes: { key: string; name: string }[];
  bedTypes: { key: string; name: string }[];
  mealPlans: { key: string; code: string; name: string }[];
}

export const STATUS: Record<ListingStatus, { label: string; tone: string; text: string }> = {
  DRAFT: { label: "Draft", tone: "bg-slate-100 text-slate-700", text: "Fill in every step, add room types and photos, then submit for approval." },
  SUBMITTED: { label: "Waiting for approval", tone: "bg-blue-50 text-blue-700", text: "MusafirBaba is reviewing your listing. You can withdraw it to make changes." },
  CHANGES_REQUESTED: { label: "Needs changes", tone: "bg-amber-50 text-amber-800", text: "See MusafirBaba's comments, make the changes and submit again." },
  LIVE: { label: "Live", tone: "bg-green-50 text-green-700", text: "Your listing is live. Changes to the name, star rating, location, check-in time or time zone are checked by MusafirBaba first; everything else is published at once." },
  SUSPENDED: { label: "Suspended", tone: "bg-red-50 text-red-700", text: "MusafirBaba has taken this listing off sale for now. Existing bookings are not affected." },
  ARCHIVED: { label: "Archived", tone: "bg-slate-100 text-slate-500", text: "This listing is archived." },
};

export const SECTION_LABEL: Record<Section | "roomTypes" | "photos", string> = {
  basic: "Basic info",
  location: "Location",
  contacts: "Reservation contacts",
  times: "Check-in & check-out",
  policies: "Policies",
  amenities: "Amenities",
  roomTypes: "Room types",
  photos: "Photos",
};

export const BLOCKER_TEXT: Record<string, (detail?: string) => string> = {
  BUSINESS_NOT_VERIFIED: () => "Your business verification must be approved first.",
  SECTION_INCOMPLETE: (d) => `Complete “${SECTION_LABEL[d as Section] ?? d}”.`,
  GSTIN_FOR_STATE_MISSING: () => "Add and verify your GSTIN for this property's state (Verification page).",
  NO_ROOM_TYPES: () => "Add at least one room type.",
  NOT_ENOUGH_PHOTOS: () => "Add at least 5 photos of the property.",
  NOT_ENOUGH_ROOM_PHOTOS: (d) => `Add at least 2 photos for “${d}”.`,
};

export const PHOTO_CATEGORIES = ["EXTERIOR", "LOBBY", "ROOM", "BATHROOM", "RESTAURANT", "POOL", "AMENITIES", "VIEW", "OTHER"] as const;
export const ID_PROOFS = [
  ["AADHAAR", "Aadhaar"],
  ["PASSPORT", "Passport"],
  ["DRIVING_LICENCE", "Driving licence"],
  ["VOTER_ID", "Voter ID"],
] as const;
export const EDITABLE: ListingStatus[] = ["DRAFT", "CHANGES_REQUESTED", "LIVE", "SUSPENDED"];
