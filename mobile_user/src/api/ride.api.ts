import { apiClient } from './axios';

export interface LocationSuggestion {
  address: string;
  lat: number;
  lng: number;
}

export const searchLocations = (query: string) =>
  apiClient.get<{ success: boolean; data: LocationSuggestion[] }>('/ride/geocode/search', {
    params: { q: query },
  });

export const reverseGeocode = (lat: number, lng: number) =>
  apiClient.get<{ success: boolean; data: LocationSuggestion }>('/ride/geocode/reverse', {
    params: { lat, lng },
  });

export interface RideOffer {
  category: string;
  vehicleName: string;
  seatingCapacity: number;
  baseFare: number;
  driverAllowance: number;
  totalAmount: number;
  eligibleCount: number;
  // Only present when the backend prices from the admin rate card.
  pricingVersion?: number;
  partnerCategory?: string;
  fare?: RideFareBreakdown;
}

export interface RideFareBreakdown {
  tripType: 'ONE_WAY' | 'ROUND_TRIP';
  actualKm: number;
  billableKm: number;
  days: number;
  nights: number;
  ratePerKm: number;
  vehicleFare: number;
  driverAllowance: number;
  nightAllowance: number;
  platformCharges: number;
  taxes: number;
  totalAmount: number;
}

export interface RideQuote {
  distanceKm: number;
  durationMin: number;
  offers: RideOffer[];
  // Only present when the backend prices from the admin rate card.
  pricingVersion?: number;
  tripType?: 'ONE_WAY' | 'ROUND_TRIP';
  days?: number;
  payableOnTripNote?: string;
}

// True when an offer carries the admin rate-card breakdown.
export const isRateCardOffer = (offer?: RideOffer | null): offer is RideOffer & { fare: RideFareBreakdown } =>
  !!offer && offer.pricingVersion === 2 && !!offer.fare;

interface LocationPayload {
  address: string;
  lat?: number;
  lng?: number;
}

export const getRideQuote = (payload: {
  pickup: LocationPayload;
  drop: LocationPayload;
  // Optional trip details -- used by the admin rate card (round trips are
  // priced by days). Ignored by the backend's original pricing.
  tripType?: 'ONE_WAY' | 'ROUND_TRIP';
  rideDate?: string;
  rideTime?: string;
  returnDate?: string;
}) => apiClient.post<{ success: boolean; data: RideQuote }>('/ride/quote', payload);

export const createRide = (payload: {
  pickup: LocationPayload;
  drop: LocationPayload;
  rideDate: string;
  rideTime: string;
  vehicleCategory: string;
  passengerCount?: number;
  tripType?: 'ONE_WAY' | 'ROUND_TRIP';
  returnDate?: string;
  returnTime?: string;
}) => apiClient.post<{ success: boolean; data: { rideId: string; totalAmount: number } }>('/ride', payload);

export const getRideById = (id: string) => apiClient.get(`/ride/${id}`);

export const getMyRides = (status?: 'upcoming' | 'completed' | 'cancelled') =>
  apiClient.get('/ride/my', { params: status ? { status } : {} });

export const cancelRide = (id: string, reason?: string) =>
  apiClient.patch(`/ride/${id}/cancel`, { reason });
