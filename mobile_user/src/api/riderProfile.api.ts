import { apiClient } from './axios';

export interface RiderProfileData {
  fullName: string;
  mobileNumber: string;
  profilePicture?: string;
  walletBalance: number;
  email: string;
  isEmailVerified: boolean;
}

export const updateRiderPushToken = (pushToken: string) =>
  apiClient.patch('/rider/profile/push-token', { pushToken });

export const getRiderProfile = () =>
  apiClient.get<{ success: boolean; data: RiderProfileData }>('/rider/profile');

export const updateRiderProfile = (payload: { fullName?: string; mobileNumber?: string }) =>
  apiClient.patch<{ success: boolean; data: RiderProfileData }>('/rider/profile', payload);

// `imageUri` is the local file uri returned by expo-image-picker.
export const uploadRiderProfilePicture = (imageUri: string) => {
  const formData = new FormData();
  const fileName = imageUri.split('/').pop() || 'profile.jpg';
  const fileType = fileName.includes('.') ? `image/${fileName.split('.').pop()}` : 'image/jpeg';
  formData.append('profilePicture', {
    uri: imageUri,
    name: fileName,
    type: fileType,
  } as any);

  return apiClient.post<{ success: boolean; data: { profilePicture: string } }>(
    '/rider/profile/picture',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
};
