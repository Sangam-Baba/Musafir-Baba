import { create } from "zustand";
import { persist } from "zustand/middleware"; // optional if you want user info persisted

interface FormData {
  date: string;
  noOfPeople: number;
  totalPrice: number;
  plan: string;
  packageId: string;
  status: string;
}
interface BookingsState {
  formData: FormData;
  setFormBookData: (data: FormData) => void;
  resetFormBookData: () => void;
}

export const useCustomizedBookingStore = create<BookingsState>()(
  persist(
    (set) => ({
      formData: {
        date: "",
        noOfPeople: 0,
        totalPrice: 0,
        plan: "",
        packageId: "",
        status: "pending",
      },
      setFormBookData: (data) => set({ formData: data }),
      resetFormBookData: () =>
        set({
          formData: {
            date: "",
            noOfPeople: 0,
            totalPrice: 0,
            plan: "",
            packageId: "",
            status: "",
          },
        }),
    }),
    {
      name: "customized-booking-storage",
    }
  )
);
