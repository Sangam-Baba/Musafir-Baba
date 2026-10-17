import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { validateReferralCode, savePendingReferral, clearPendingReferral } from '../api/referral.api';

// Optional "Referral code" on the Register screen. A valid code is kept on
// the phone and attached right after sign-up -- the same way for email and
// Google sign-up (see applyPendingReferral in RootNavigator). Hidden while
// the program is off.
export function ReferralCodeField() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [message, setMessage] = useState('');
  const [hidden, setHidden] = useState(false);
  const seq = useRef(0);

  // Is the program on? (probe with an empty code)
  useEffect(() => {
    validateReferralCode('')
      .then((r) => setHidden(r.enabled === false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const c = code.trim().toUpperCase();
    if (!c) {
      setState('idle');
      setMessage('');
      clearPendingReferral();
      return;
    }
    if (c.length < 8) {
      setState('idle');
      setMessage('');
      return;
    }
    const mine = ++seq.current;
    setState('checking');
    const t = setTimeout(async () => {
      try {
        const r = await validateReferralCode(c);
        if (mine !== seq.current) return;
        if (r.valid) {
          setState('valid');
          setMessage(`Referred by ${r.referrerName}${r.joiningBonus ? ` · ₹${r.joiningBonus} joining bonus after approval` : ''}`);
          await savePendingReferral(c, 'email');
        } else {
          setState('invalid');
          setMessage(r.message || "This referral code doesn't exist.");
          await clearPendingReferral();
        }
      } catch {
        if (mine === seq.current) {
          setState('invalid');
          setMessage('Could not check the code. Check your connection.');
        }
      }
    }, 450);
    return () => clearTimeout(t);
  }, [code]);

  if (hidden) return null;
  return (
    <View style={styles.group}>
      <Text style={styles.label}>Referral code (optional)</Text>
      <View style={[styles.box, state === 'valid' && styles.boxValid, state === 'invalid' && styles.boxInvalid]}>
        <Ionicons name="gift-outline" size={18} color="#FE5300" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.input}
          placeholder="e.g. MBC7K4Q2"
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
        />
        {state === 'checking' && <ActivityIndicator size="small" color="#94a3b8" />}
        {state === 'valid' && <Ionicons name="checkmark-circle" size={18} color="#16a34a" />}
        {state === 'invalid' && <Ionicons name="close-circle" size={18} color="#dc2626" />}
      </View>
      {!!message && <Text style={[styles.hint, { color: state === 'valid' ? '#16a34a' : '#dc2626' }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, minHeight: 50 },
  boxValid: { borderColor: '#86efac' },
  boxInvalid: { borderColor: '#fca5a5' },
  input: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a', letterSpacing: 1, paddingVertical: 12 },
  hint: { fontSize: 12, marginTop: 6, fontWeight: '600' },
});
