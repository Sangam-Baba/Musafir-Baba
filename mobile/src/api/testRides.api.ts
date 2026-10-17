import { apiClient } from './axios';

// Admin-broadcast TEST RIDES (badged, never acceptable). Separate from real rides.
export interface TestRide {
  id: string;
  isTestRide: true;
  badge: string;
  riderName: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: string;
  date: string;
  fare: number;
  vehicleCategory: string;
  distance: string;
  tripType: 'ONE_WAY' | 'ROUND_TRIP' | 'OUTSTATION';
}

export const getMyTestRides = () => apiClient.get<{ success: boolean; data: TestRide[] }>('/partner/test-rides');
export const tapTestRide = (id: string) =>
  apiClient.post<{ success: boolean; accepted: false; isTestRide: true; message: string }>(`/partner/test-rides/${id}/accept`);
