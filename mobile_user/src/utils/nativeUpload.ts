import * as FileSystem from 'expo-file-system/legacy';
import axios from 'axios';
import { getItem, setItem } from './storage';
import { API_BASE_URL } from './config';

// React Native's own networking layer + axios's FormData handling has
// repeatedly proven unreliable for real on-device photo uploads in Expo Go
// (uploads that appear to succeed client-side but never actually reach the
// server) -- expo-file-system's uploadAsync is Expo's own purpose-built,
// native multipart uploader and sidesteps that whole class of issue. Used
// only on native; the web platform keeps using fetch+Blob+axios, which
// tests have shown works fine there.
export async function nativeMultipartUpload(
  path: string,
  fileUri: string,
  fieldName: string,
  parameters: Record<string, string> = {}
): Promise<{ data: any }> {
  const url = `${API_BASE_URL}${path}`;

  const doUpload = async (token: string | null) =>
    FileSystem.uploadAsync(url, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName,
      parameters,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  let token = await getItem('rider_token');
  let result = await doUpload(token);

  // Access tokens are short-lived (15m) -- if it expired between login and
  // this upload, refresh once (mirroring apiClient's interceptor) and retry.
  if (result.status === 401) {
    const refreshToken = await getItem('rider_refresh_token');
    try {
      const refreshResponse = await axios.post(
        `${API_BASE_URL}/rider/auth/refresh`,
        refreshToken ? { refreshToken } : {},
        { withCredentials: true }
      );
      token = refreshResponse.data.accessToken;
      await setItem('rider_token', token as string);
      result = await doUpload(token);
    } catch {
      // fall through with the original 401 result below
    }
  }

  let body: any = {};
  try {
    body = result.body ? JSON.parse(result.body) : {};
  } catch {
    // non-JSON response body, leave body as {}
  }

  if (result.status < 200 || result.status >= 300) {
    const error: any = new Error(body?.message || 'Upload failed');
    error.response = { status: result.status, data: body };
    throw error;
  }

  return { data: body };
}
