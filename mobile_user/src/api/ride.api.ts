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
}

export interface RideQuote {
  distanceKm: number;
  durationMin: number;
  offers: RideOffer[];
}

interface LocationPayload {
  address: string;
  lat?: number;
  lng?: number;
}

export const getRideQuote = (payload: {
  pickup: LocationPayload;
  drop: LocationPayload;
}) => apiClient.post<{ success: boolean; data: RideQuote }>('/ride/quote', payload);

export const createRide = (payload: {
  pickup: LocationPayload;
  drop: LocationPayload;
  rideDate: string;
  rideTime: string;
  vehicleCategory: string;
  passengerCount?: number;
}) => apiClient.post<{ success: boolean; data: { rideId: string; totalAmount: number } }>('/ride', payload);

export const getRideById = (id: string) => apiClient.get(`/ride/${id}`);

export const getMyRides = (status?: 'upcoming' | 'completed' | 'cancelled') =>
  apiClient.get('/ride/my', { params: status ? { status } : {} });

export const cancelRide = (id: string, reason?: string) =>
  apiClient.patch(`/ride/${id}/cancel`, { reason });
