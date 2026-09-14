import { create } from "zustand";

type Mode = "login" | "register" | "verify-otp" | "forgot-password";

interface RiderAuthDialogState {
  isOpen: boolean;
  mode: Mode;
  email?: string;
  onSuccess?: () => void;
  openDialog: (mode: Mode, options?: { email?: string; onSuccess?: () => void }) => void;
  closeDialog: () => void;
  toggleMode: () => void;
}

// Mirrors useAuthDialogStore.ts, kept separate so the MBGo rider login modal
// never touches the site's existing account-login dialog state.
export const useRiderAuthDialogStore = create<RiderAuthDialogState>((set, get) => ({
  isOpen: false,
  mode: "login",
  openDialog: (mode, options) =>
    set({
      isOpen: true,
      mode,
      email: options?.email ?? get().email,
      onSuccess: options?.onSuccess ?? get().onSuccess,
    }),
  closeDialog: () => set({ isOpen: false }),
  toggleMode: () =>
    set({
      mode: get().mode === "login" ? "register" : "login",
    }),
}));
