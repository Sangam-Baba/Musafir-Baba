import { create } from "zustand";

type Mode = "login" | "register" | "verify-otp" | "forgot-password";

interface AuthDialogState {
  isOpen: boolean;
  mode: Mode;
  email?: string;
  redirectUrl?: string;
  openDialog: (mode: Mode, email?: string, redirectUrl?: string) => void;
  closeDialog: () => void;
  toggleMode: () => void;
}

export const useAuthDialogStore = create<AuthDialogState>((set, get) => ({
  isOpen: false,
  mode: "login",
  redirectUrl: "/",
  openDialog: (mode, email, redirectUrl) =>
    set({
      isOpen: true,
      mode,
      email: email ?? get().email,
      redirectUrl: redirectUrl ?? get().redirectUrl,
    }),
  closeDialog: () => set({ isOpen: false }),
  toggleMode: () =>
    set({
      mode: get().mode === "login" ? "register" : "login",
    }),
}));
