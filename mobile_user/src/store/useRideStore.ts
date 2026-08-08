import { create } from 'zustand';
import type { RideOffer, RideQuote } from '../api/ride.api';

interface RideDraftState {
  pickup: string;
  drop: string;
  rideDate: string;
  rideTime: string;
  quote: RideQuote | null;
  selectedOffer: RideOffer | null;
  rideId: string | null;
  totalAmount: number | null;

  passengerCount: number;

  setSearch: (fields: Partial<Pick<RideDraftState, 'pickup' | 'drop' | 'rideDate' | 'rideTime' | 'passengerCount'>>) => void;
  setQuote: (quote: RideQuote, preferredCategory?: string) => void;
  setSelectedOffer: (offer: RideOffer) => void;
  setRide: (rideId: string, totalAmount: number) => void;
  reset: () => void;
}

const initialState = {
  pickup: '',
  drop: '',
  rideDate: '',
  rideTime: '',
  quote: null,
  selectedOffer: null,
  rideId: null,
  totalAmount: null,
  passengerCount: 1,
};

export const useRideStore = create<RideDraftState>((set) => ({
  ...initialState,
  setSearch: (fields) => set((state) => ({ ...state, ...fields })),
  setQuote: (quote, preferredCategory) =>
    set({
      quote,
      selectedOffer: (preferredCategory && quote.offers.find((o) => o.category === preferredCategory)) || quote.offers[0] || null,
    }),
  setSelectedOffer: (offer) => set({ selectedOffer: offer }),
  setRide: (rideId, totalAmount) => set({ rideId, totalAmount }),
  reset: () => set(initialState),
}));
