import { apiClient } from './axios';

export interface RiderProfileDto {
  fullName?: string;
  mobileNumber?: string;
  profilePicture?: string;
}

export const registerRider = (payload: {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
}) => apiClient.post('/rider/auth/register', payload);

export const verifyRiderOtp = (payload: { email: string; otp: string }) =>
  apiClient.post('/rider/auth/verify-otp', payload);

export const resendRiderOtp = (payload: { email: string }) =>
  apiClient.post('/rider/auth/resend-otp', payload);

export const loginRider = (payload: { email: string; password: string }) =>
  apiClient.post<{
    success: boolean;
    accessToken: string;
    profile: RiderProfileDto | null;
    message?: string;
  }>('/rider/auth/login', payload);

export const logoutRider = () => apiClient.post('/rider/auth/logout');

export const forgotRiderPassword = (payload: { email: string }) =>
  apiClient.post('/rider/auth/forgot-password', payload);

export const resetRiderPassword = (payload: { email: string; otp: string; newPassword: string }) =>
  apiClient.post('/rider/auth/reset-password', payload);

export const changeRiderPassword = (payload: { currentPassword: string; newPassword: string }) =>
  apiClient.post('/rider/auth/change-password', payload);
