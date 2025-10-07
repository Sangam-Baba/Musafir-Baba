"use client";
import { create } from "zustand";

interface AuthDialogStore {
  isOpen: boolean;
  redirectUrl: string | null;
  mode: "login" | "register";
  openDialog: (mode: "login" | "register", redirectUrl?: string) => void;
  closeDialog: () => void;
  toggleMode: () => void;
}

export const useAuthDialogStore = create<AuthDialogStore>((set) => ({
  isOpen: false,
  redirectUrl: null,
  mode: "login",
  openDialog: (mode, redirectUrl) =>
    set({ isOpen: true, mode, redirectUrl: redirectUrl || null }),
  closeDialog: () => set({ isOpen: false }),
  toggleMode: () =>
    set((state) => ({ mode: state.mode === "login" ? "register" : "login" })),
}));
