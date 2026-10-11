import { create } from 'zustand';
import type { CancelService } from '../api/cancellation.api';

// Which booking the Cancel screen is for.
interface CancelState {
  service: CancelService | null;
  bookingId: string | null;
  open: (service: CancelService, bookingId: string) => void;
}
export const useCancelStore = create<CancelState>((set) => ({
  service: null,
  bookingId: null,
  open: (service, bookingId) => set({ service, bookingId }),
}));
