import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Live Server API URL for production APK builds
const PROD_API_URL = 'https://musafirbabaserver.3mongoose.online/api';

function resolveDevApiUrl(): string | undefined {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!envUrl || Platform.OS === 'web') return envUrl;

  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/i.test(envUrl);
  if (!isLocalhost) return envUrl;

  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  const lanIp = hostUri?.split(':')?.[0];
  if (!lanIp) return envUrl;

  return envUrl.replace(/(localhost|127\.0\.0\.1)/i, lanIp);
}

// In release builds (__DEV__ === false), always use PROD_API_URL so the APK connects to the live server.
// In development (__DEV__ === true), resolve LAN IP for physical device / simulator testing.
export const API_BASE_URL = (__DEV__ ? resolveDevApiUrl() : undefined) || PROD_API_URL;
