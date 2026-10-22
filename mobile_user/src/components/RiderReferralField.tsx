// Optional "Referral code" field for Create Account. A valid code is kept on
// the phone and added right after the first sign-in (OTP or Google) -- see
// applyPendingRiderReferral in App.tsx. Hidden while the program is off.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { Gift, CheckCircle2 } from 'lucide-react-native';
import { validateRiderReferralCode, savePendingRiderReferral } from '../api/riderReferral.api';

export default function RiderReferralField() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const seq = useRef(0);

  // Is the program on? (an empty code just answers "enabled or not")
  useEffect(() => {
    validateRiderReferralCode('')
      .then((res) => setEnabled(res.data.enabled !== false))
      .catch(() => setEnabled(false));
    return () => {
      seq.current++;
    };
  }, []);

  useEffect(() => {
    const c = code.trim().toUpperCase();
    const mine = ++seq.current;
    if (c.length < 8) {
      setResult(null);
      setChecking(false);
      savePendingRiderReferral(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await validateRiderReferralCode(c);
        if (mine !== seq.current) return;
        if (res.data.valid) {
          await savePendingRiderReferral(res.data.code || c);
          setResult({ ok: true, text: `Referred by ${res.data.referrerName}${res.data.joiningBonus ? ` · you'll get ₹${res.data.joiningBonus} in your MB Wallet` : ''}` });
        } else {
          await savePendingRiderReferral(null);
          setResult({ ok: false, text: res.data.message || "This referral code doesn't exist." });
        }
      } catch (e: any) {
        if (mine !== seq.current) return;
        setResult({ ok: false, text: e?.response?.data?.message || "Couldn't check the code. Please try again." });
      } finally {
        if (mine === seq.current) setChecking(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [code]);

  if (!enabled) return null;

  return (
    <View style={{ gap: 3 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
        Referral code <Text style={{ fontWeight: '500', color: '#94A3B8' }}>(optional)</Text>
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: result?.ok ? '#86EFAC' : '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, height: 44, backgroundColor: '#FAFAFC' }}>
        <View style={{ marginRight: 8 }}>
          <Gift size={16} color="#94A3B8" />
        </View>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
          placeholder="e.g. MBG7K4Q2"
          placeholderTextColor="#94A3B8"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '600', fontSize: 13, color: '#0F172A', letterSpacing: 1 }}
        />
        {checking ? <ActivityIndicator size="small" color="#FF5500" /> : result?.ok ? <CheckCircle2 size={16} color="#16A34A" /> : null}
      </View>
      {!!result && <Text style={{ fontSize: 11, fontWeight: '600', color: result.ok ? '#16A34A' : '#DC2626' }}>{result.text}</Text>}
    </View>
  );
}
