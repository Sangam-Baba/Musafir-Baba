import { create } from "zustand";
interface BookingState {
    adults: number;
    children: number;
    infants: number;
    price: number;
    date:string;
    setDate: (date: string) => void;
    setPrice: (price: number) => void;
    setAdults: (adults: number) => void;
    setChildren: (children: number) => void;
    setInfants: (infants: number) => void;
}
export const useBookingStore = create<BookingState>((set, get) => ({
    adults: 0,
    children: 0,
    infants: 0,
    price: 0,
    date: "",
    setDate: (date) => set({ date }),
    setPrice: (price) => set({ price }),
    setAdults: (adults) => set({ adults }),
    setChildren: (children) => set({ children }),
    setInfants: (infants) => set({ infants }),
}));