import { create } from "zustand";
import type { RideOffer, RideQuote } from "@/lib/rideApi";

interface Coords {
  lat: number;
  lng: number;
}

interface RideBookingState {
  activeTab: "local" | "outstation" | "airport";
  pickup: string;
  drop: string;
  pickupCoords: Coords | null;
  dropCoords: Coords | null;
  rideDate: string;
  rideTime: string;
  tripType: "ONE_WAY" | "ROUND_TRIP";
  returnDate: string;
  returnTime: string;
  quote: RideQuote | null;
  selectedOffer: RideOffer | null;
  rideId: string | null;
  totalAmount: number | null;

  setSearch: (
    fields: Partial<
      Pick<
        RideBookingState,
        | "activeTab"
        | "pickup"
        | "drop"
        | "pickupCoords"
        | "dropCoords"
        | "rideDate"
        | "rideTime"
        | "tripType"
        | "returnDate"
        | "returnTime"
      >
    >,
  ) => void;
  setQuote: (quote: RideQuote) => void;
  setSelectedOffer: (offer: RideOffer) => void;
  setRide: (rideId: string, totalAmount: number) => void;
  reset: () => void;
}

const initialState = {
  activeTab: "local" as const,
  pickup: "",
  drop: "",
  pickupCoords: null,
  dropCoords: null,
  rideDate: "",
  rideTime: "",
  tripType: "ONE_WAY" as const,
  returnDate: "",
  returnTime: "",
  quote: null,
  selectedOffer: null,
  rideId: null,
  totalAmount: null,
};

// Mirrors useBookingStore.ts's per-flow-store pattern; deliberately not
// persisted so a stale quote/rideId never survives a full page reload.
export const useRideBookingStore = create<RideBookingState>((set) => ({
  ...initialState,
  setSearch: (fields) => set((state) => ({ ...state, ...fields })),
  setQuote: (quote) =>
    set({
      quote,
      selectedOffer: quote.offers[0] || null,
    }),
  setSelectedOffer: (offer) => set({ selectedOffer: offer }),
  setRide: (rideId, totalAmount) => set({ rideId, totalAmount }),
  reset: () => set(initialState),
}));
