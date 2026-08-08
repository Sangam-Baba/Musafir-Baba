import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Live Server API URL for production APK builds
const PROD_API_URL = 'https://musafir-baba-backend.onrender.com/api';

// "localhost" only resolves to the backend when the client and the backend
// share the same machine (true for the web preview). A physical device or
// simulator running through Expo Go has its own "localhost", so a
// EXPO_PUBLIC_API_URL of http://localhost:8000/api silently fails to
// connect there and callers see a network error, which login/register
// screens then mis-report as "Invalid email/OTP" since there's no
// server response to read a real message from.
// Expo Go always knows the dev machine's LAN IP (it's how it fetched the JS
// bundle in the first place), exposed as Constants.expoConfig.hostUri in the
// form "<lan-ip>:<metro-port>" — reuse that IP for the API host on native
// platforms instead of trusting a hardcoded "localhost" in the env file.
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

// Expo loads ".env.local" (which currently points at the dev machine's
// localhost, for the workflow above) in every environment except "test" —
// that includes a release build, so "npm run build:apk" (gradlew
// assembleRelease) would otherwise still pick it up and ship an APK that
// tries to talk to localhost. `__DEV__` is set by the bundler itself based
// on the actual build type (true for Expo Go / dev/debug builds, false for
// release bundles) regardless of which .env file is present, so gating on
// it here guarantees a release APK always uses the production backend.
export const API_BASE_URL = (__DEV__ ? resolveDevApiUrl() : undefined) || PROD_API_URL;
