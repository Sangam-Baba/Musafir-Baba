import { Platform } from 'react-native';

// "Continue with Google" for MBConnect (native Android/iOS). Same Google Cloud
// project as MBGo: the ID token is requested for the shared Web client; the
// MBConnect Android app is recognised by its own Android OAuth clients
// (package com.musafirbaba.mobile + signing SHA-1). The library is loaded
// lazily so the web preview -- where the native module doesn't exist -- never
// imports it. The ID token is requested for the Google Cloud *Web* client
// (project mbgo); the backend verifies it against that same ID.
export const GOOGLE_WEB_CLIENT_ID = '574244144608-4ce8fh7vlauocu8tabtjuk29vci0voc2.apps.googleusercontent.com';

export const isGoogleSignInAvailable = Platform.OS === 'android' || Platform.OS === 'ios';

let configured = false;

// Returns the Google ID token, or null if the driver closed the account picker.
export async function getGoogleIdToken(): Promise<string | null> {
  if (!isGoogleSignInAvailable) throw new Error('Google sign-in is only available in the app');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GoogleSignin, statusCodes, isSuccessResponse } = require('@react-native-google-signin/google-signin');
  if (!configured) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    configured = true;
  }
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  // Always show the account chooser (don't silently reuse the last account).
  try {
    await GoogleSignin.signOut();
  } catch {}
  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null; // cancelled
    return response.data?.idToken || null;
  } catch (error: any) {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw error;
  }
}

// ---------- Web (browser preview / web build) ----------
// Uses Google Identity Services: Google renders its own "Sign in with
// Google" button and returns an ID token for the same Web client ID, which
// the backend verifies exactly like the native one. Requires the page origin
// (e.g. http://localhost:8081) in the Web client's "Authorised JavaScript origins".
export const isGoogleWebSignInAvailable = Platform.OS === 'web';

let gisLoading: Promise<any> | null = null;
function loadGoogleIdentityServices(): Promise<any> {
  const w: any = typeof window !== 'undefined' ? window : null;
  if (!w) return Promise.reject(new Error('No window'));
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(w.google);
      script.onerror = () => {
        gisLoading = null;
        reject(new Error('Could not load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  }
  return gisLoading;
}

// Renders Google's button into `container`; calls onIdToken when the driver signs in.
export async function renderGoogleWebButton(container: HTMLElement, onIdToken: (idToken: string) => void, text: 'continue_with' | 'signup_with' = 'continue_with') {
  const google = await loadGoogleIdentityServices();
  google.accounts.id.initialize({
    client_id: GOOGLE_WEB_CLIENT_ID,
    callback: (response: { credential?: string }) => {
      if (response?.credential) onIdToken(response.credential);
    },
    ux_mode: 'popup',
  });
  container.innerHTML = '';
  google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text,
    shape: 'rectangular',
    logo_alignment: 'center',
    width: Math.min(400, Math.max(200, Math.round(container.getBoundingClientRect().width || 320))),
  });
}
