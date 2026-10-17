import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';
import { getGoogleIdToken, isGoogleSignInAvailable, isGoogleWebSignInAvailable, renderGoogleWebButton } from '../utils/googleSignIn';

// "Continue with Google" for the Login and Register screens. Exchanges the
// Google ID token at POST /partner/auth/google, which returns the same tokens
// as email login, then signs in through the same setToken. Email + OTP sign-in
// is untouched; this only adds another way in.

type Props = {
  mode: 'signin' | 'signup';
  onError: (message: string) => void;
  disabled?: boolean;
  onStart?: () => void | Promise<void>; // e.g. Register: mark a typed referral code as a Google sign-up
};

export function GoogleSignInButton({ mode, onError, disabled, onStart }: Props) {
  const setToken = useAuthStore((state) => state.setToken);
  const [busy, setBusy] = useState(false);

  const exchange = async (idToken: string) => {
    await onStart?.();
    const res = await fetch(`${API_BASE_URL}/partner/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.accessToken) {
      await setToken(data.accessToken, data.refreshToken);
      return;
    }
    onError(data.message || 'Google sign-in failed. Please try again.');
  };

  const handleNative = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      if (idToken) await exchange(idToken); // null = driver closed the account picker
    } catch (error: any) {
      console.error('Google sign-in error:', error?.code || '', error?.message || error);
      onError('Google sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleWebToken = async (idToken: string) => {
    setBusy(true);
    try {
      await exchange(idToken);
    } catch {
      onError('Unable to connect to server. Please check your network connection.');
    } finally {
      setBusy(false);
    }
  };

  if (isGoogleWebSignInAvailable) {
    return <GoogleWebButton text={mode === 'signup' ? 'signup_with' : 'continue_with'} onIdToken={handleWebToken} busy={busy} />;
  }
  if (!isGoogleSignInAvailable) return null;

  return (
    <TouchableOpacity style={[styles.btn, (busy || disabled) && { opacity: 0.6 }]} onPress={handleNative} disabled={busy || disabled} activeOpacity={0.85}>
      {busy ? (
        <ActivityIndicator color="#0f172a" size="small" />
      ) : (
        <View style={styles.row}>
          <Image source={require('../../assets/google-g.png')} style={styles.logo} />
          <Text style={styles.text}>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Web preview: Google renders its own button (Google Identity Services).
function GoogleWebButton({ onIdToken, text, busy }: { onIdToken: (idToken: string) => void; text: 'continue_with' | 'signup_with'; busy: boolean }) {
  const ref = useRef<any>(null);
  const cb = useRef(onIdToken);
  cb.current = onIdToken;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    renderGoogleWebButton(el, (t) => cb.current(t), text).catch(() => setFailed(true));
  }, [text]);
  if (failed) return null;
  return (
    <View style={{ width: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View ref={ref} style={{ width: '100%', alignItems: 'center', opacity: busy ? 0.5 : 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 18, height: 18, marginRight: 10 },
  text: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
});
