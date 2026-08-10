import { Platform } from 'react-native';
import { apiClient } from './axios';
import { nativeMultipartUpload } from '../utils/nativeUpload';

export interface RiderProfileData {
  fullName: string;
  mobileNumber: string;
  profilePicture?: string;
  walletBalance: number;
  email: string;
  isEmailVerified: boolean;
  // Admin-controlled only -- see riderDocument.api.ts. Distinct from
  // isEmailVerified (which every logged-in rider already satisfies).
  isVerified: boolean;
}

export const updateRiderPushToken = (pushToken: string) =>
  apiClient.patch('/rider/profile/push-token', { pushToken });

export const getRiderProfile = () =>
  apiClient.get<{ success: boolean; data: RiderProfileData }>('/rider/profile');

export const updateRiderProfile = (payload: { fullName?: string; mobileNumber?: string }) =>
  apiClient.patch<{ success: boolean; data: RiderProfileData }>('/rider/profile', payload);

// `imageUri` is the local file uri returned by expo-image-picker.
export const uploadRiderProfilePicture = async (
  imageUri: string
): Promise<{ data: { success: boolean; data: { profilePicture: string } } }> => {
  if (Platform.OS === 'web') {
    const formData = new FormData();
    const fileName = imageUri.split('/').pop()?.split('?')[0] || 'profile.jpg';
    // On web, expo-image-picker returns a blob:/data: uri -- RN's native
    // {uri, name, type} shape isn't recognized by the browser's FormData,
    // so the actual file bytes must be fetched and appended as a real Blob.
    const response = await fetch(imageUri);
    const blob = await response.blob();
    formData.append('profilePicture', blob, fileName);

    return apiClient.post<{ success: boolean; data: { profilePicture: string } }>(
      '/rider/profile/picture',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  }

  // Native: axios/RN FormData uploads have proven unreliable for real
  // on-device photos in Expo Go -- expo-file-system's uploadAsync is a
  // dedicated native multipart uploader that avoids that failure mode.
  return nativeMultipartUpload('/rider/profile/picture', imageUri, 'profilePicture');
};
