// MusafirBaba's listing tools — shapes from /api/v1/admin/properties (backend/src/b2b/modules/hotel-catalog/admin-listing.service.js).
import type { ListingStatus, Property } from "./listing";

export interface ListingItem {
  id: string;
  publicRef: string;
  name: string;
  status: ListingStatus;
  hotelOrgId: string;
  city: string | null;
  round: number;
  submittedAt: string | null;
  hasPendingRevision: boolean;
  revisionSubmittedAt: string | null;
  coverUrl: string | null;
}

export interface ListingDetail {
  property: Property;
  organisation: { id: string; name: string; status: string } | null;
  roomTypes: { id: string; name: string; status: string; maxOccupancy: number; beds: { bedTypeKey: string; count: number }[]; sizeSqm: number | null }[];
  checklist: {
    blockers: { code: string; detail?: string }[];
    duplicates: { id: string; publicRef: string; name: string; status: string; sameOrganisation: boolean; distanceM: number }[];
  };
}

/** Admin action → API path segment. */
export const ACTIONS = {
  approve: { path: "approve", label: "Approve — go live", from: ["SUBMITTED"], needs: null },
  requestChanges: { path: "request-changes", label: "Request changes", from: ["SUBMITTED"], needs: "comments" },
  suspend: { path: "suspend", label: "Suspend", from: ["LIVE"], needs: "reason" },
  reactivate: { path: "reactivate", label: "Reactivate", from: ["SUSPENDED"], needs: null },
  archive: { path: "archive", label: "Archive", from: ["DRAFT", "SUBMITTED", "CHANGES_REQUESTED", "LIVE", "SUSPENDED"], needs: "reason" },
} as const;
export type AdminAction = keyof typeof ACTIONS;

/** Field names of a pending revision, in words. */
export const REVISION_FIELD: Record<string, string> = {
  name: "Name",
  starRating: "Star rating",
  cityId: "City",
  areaId: "Area",
  stateCode: "State",
  address: "Address",
  lat: "Latitude",
  lng: "Longitude",
  checkInTime: "Check-in time",
  timeZone: "Time zone",
};
