import { create } from 'zustand';
import type { TourPackage, TourListParams, TourBatch, TourTravellers, TourAddOnPick, TourAppBooking } from '../api/tour.api';

export interface TourSelection {
  batch: TourBatch;
  travellers: TourTravellers;
  addOns: TourAddOnPick[];
}

// Shared state for the Tours screens (explore -> list -> details). Separate
// from the ride booking store; nothing else reads it.
interface TourState {
  // Filters the package list opens with (set by explore-screen taps).
  listParams: TourListParams;
  listTitle: string;
  // Package opened on the details screen (list data shown instantly while the
  // full package loads).
  selectedPackage: TourPackage | null;
  // Departure + travellers picked on the details screen, used by checkout.
  selection: TourSelection | null;
  // Unpaid booking created for `bookingKey` (reused if the rider retries the
  // exact same selection, so retries don't create duplicates).
  pendingBooking: TourAppBooking | null;
  bookingKey: string | null;
  // Booking shown on the success / trip-detail screens.
  viewedBooking: TourAppBooking | null;
  openList: (params: TourListParams, title?: string) => void;
  openPackage: (pkg: TourPackage) => void;
  setSelection: (selection: TourSelection | null) => void;
  setPendingBooking: (booking: TourAppBooking | null, key: string | null) => void;
  setViewedBooking: (booking: TourAppBooking | null) => void;
}

export const useTourStore = create<TourState>((set) => ({
  listParams: {},
  listTitle: 'Holiday Packages',
  selectedPackage: null,
  selection: null,
  pendingBooking: null,
  bookingKey: null,
  viewedBooking: null,
  openList: (params, title = 'Holiday Packages') => set({ listParams: params, listTitle: title }),
  openPackage: (pkg) => set({ selectedPackage: pkg, selection: null }),
  setSelection: (selection) => set({ selection }),
  setPendingBooking: (booking, key) => set({ pendingBooking: booking, bookingKey: key }),
  setViewedBooking: (booking) => set({ viewedBooking: booking }),
}));
