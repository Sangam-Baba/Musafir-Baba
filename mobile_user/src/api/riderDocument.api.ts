import { Platform } from 'react-native';
import { apiClient } from './axios';
import { nativeMultipartUpload } from '../utils/nativeUpload';

export interface RiderDocumentData {
  documentType: string;
  documentName?: string;
  documentIdNumber?: string;
  fileUrlFront?: string;
  fileUrlBack?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
}

export const getMyDocument = () =>
  apiClient.get<{ success: boolean; data: RiderDocumentData | null }>('/rider/documents');

// `frontUri`/`backUri` are local file uris from expo-image-picker. Either
// (or both) may be provided -- the backend keeps whichever side isn't
// re-uploaded unchanged.
export const uploadMyDocument = async (
  documentName: string,
  documentIdNumber: string,
  frontUri?: string | null,
  backUri?: string | null
): Promise<{ data: { success: boolean; data: RiderDocumentData } }> => {
  if (Platform.OS === 'web') {
    const formData = new FormData();
    formData.append('documentName', documentName);
    formData.append('documentIdNumber', documentIdNumber);

    const appendSide = async (field: 'front' | 'back', uri: string) => {
      const fileName = uri.split('/').pop()?.split('?')[0] || `${field}.jpg`;
      // On web, expo-image-picker returns a blob:/data: uri -- RN's native
      // {uri, name, type} shape isn't recognized by the browser's FormData,
      // so the actual file bytes must be fetched and appended as a real Blob.
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append(field, blob, fileName);
    };
    if (frontUri) await appendSide('front', frontUri);
    if (backUri) await appendSide('back', backUri);

    return apiClient.post<{ success: boolean; data: RiderDocumentData }>(
      '/rider/documents',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  }

  // Native: axios/RN FormData uploads have proven unreliable for real
  // on-device photos in Expo Go -- expo-file-system's uploadAsync is a
  // dedicated native multipart uploader that avoids that failure mode.
  // The backend supports partial updates (front-only / back-only), so
  // front and back go as two sequential requests when both are provided;
  // each response reflects the full current document, so the last call
  // made is the correct final result.
  const parameters = { documentName, documentIdNumber };
  let response: { data: { success: boolean; data: RiderDocumentData } } | null = null;
  if (frontUri) {
    response = await nativeMultipartUpload('/rider/documents', frontUri, 'front', parameters);
  }
  if (backUri) {
    response = await nativeMultipartUpload('/rider/documents', backUri, 'back', parameters);
  }
  return response as { data: { success: boolean; data: RiderDocumentData } };
};
