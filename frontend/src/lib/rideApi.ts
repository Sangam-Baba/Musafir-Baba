import { riderFetchJson } from "@/lib/riderFetch";

export interface LocationSuggestion {
  address: string;
  lat: number;
  lng: number;
}

export interface RideOffer {
  category: string;
  vehicleName: string;
  seatingCapacity: number;
  baseFare: number;
  driverAllowance: number;
  totalAmount: number;
  eligibleCount: number;
}

export interface RideQuote {
  distanceKm: number;
  durationMin: number;
  offers: RideOffer[];
}

export interface LocationPayload {
  address: string;
  lat?: number;
  lng?: number;
}

export const searchLocations = (query: string) =>
  riderFetchJson<{ success: boolean; data: LocationSuggestion[] }>(
    `/ride/geocode/search?q=${encodeURIComponent(query)}`,
  );

export const reverseGeocode = (lat: number, lng: number) =>
  riderFetchJson<{ success: boolean; data: LocationSuggestion }>(
    `/ride/geocode/reverse?lat=${lat}&lng=${lng}`,
  );

export const getRideQuote = (payload: { pickup: LocationPayload; drop: LocationPayload }) =>
  riderFetchJson<{ success: boolean; data: RideQuote }>("/ride/quote", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createRide = (payload: {
  pickup: LocationPayload;
  drop: LocationPayload;
  rideDate: string;
  rideTime: string;
  vehicleCategory: string;
  passengerCount?: number;
  tripType?: "ONE_WAY" | "ROUND_TRIP";
  returnDate?: string;
  returnTime?: string;
}) =>
  riderFetchJson<{ success: boolean; data: { rideId: string; totalAmount: number } }>("/ride", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getRideById = (id: string) =>
  riderFetchJson<{ success: boolean; data: Record<string, unknown> }>(`/ride/${id}`);

export const getMyRides = (status?: "upcoming" | "completed" | "cancelled") =>
  riderFetchJson<{ success: boolean; data: unknown[] }>(
    `/ride/my${status ? `?status=${status}` : ""}`,
  );
