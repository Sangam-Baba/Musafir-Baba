import { create } from "zustand";
import { persist } from "zustand/middleware";
interface GroupState {
  batchId: string;
  packageId: string;
  travellers: {
    quad: number;
    triple: number;
    double: number;
    child: number;
  };
}
interface BookingState {
  formData: GroupState;
  setGroup: (data: GroupState) => void;
  resetGroup: () => void;
}
export const useGroupBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      formData: {
        batchId: "",
        packageId: "",
        travellers: {
          quad: 0,
          triple: 0,
          double: 0,
          child: 0,
        },
      },
      setGroup: (data) => set({ formData: data }),
      resetGroup: () =>
        set({
          formData: {
            batchId: "",
            packageId: "",
            travellers: {
              quad: 0,
              triple: 0,
              double: 0,
              child: 0,
            },
          },
        }),
    }),
    {
      name: "group-booking-storage",
    }
  )
);
