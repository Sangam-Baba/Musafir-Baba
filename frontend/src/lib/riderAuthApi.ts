import { riderFetchJson } from "@/lib/riderFetch";
import type { RiderProfileDto } from "@/store/useRiderAuthStore";

export const registerRider = (payload: {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
}) => riderFetchJson<{ success: boolean; message?: string }>("/rider/auth/register", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const verifyRiderOtp = (payload: { email: string; otp: string }) =>
  riderFetchJson<{
    success: boolean;
    accessToken: string;
    refreshToken: string;
    profile: RiderProfileDto | null;
    message?: string;
  }>("/rider/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const resendRiderOtp = (payload: { email: string }) =>
  riderFetchJson<{ success: boolean; message?: string }>("/rider/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const loginRider = (payload: { email: string; password: string }) =>
  riderFetchJson<{
    success: boolean;
    accessToken: string;
    refreshToken: string;
    profile: RiderProfileDto | null;
    message?: string;
  }>("/rider/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const logoutRider = (refreshToken?: string | null) =>
  riderFetchJson<{ success: boolean }>("/rider/auth/logout", {
    method: "POST",
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });

export const forgotRiderPassword = (payload: { email: string }) =>
  riderFetchJson<{ success: boolean; message?: string }>("/rider/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const resetRiderPassword = (payload: { email: string; otp: string; newPassword: string }) =>
  riderFetchJson<{ success: boolean; message?: string }>("/rider/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
