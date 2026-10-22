// MBGO Refer & Earn: my code + share, what I earned, people I referred, and
// (within the add-code window, before the first paid ride) entering a friend's code.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, RefreshControl, Share, Platform } from 'react-native';
import { ChevronLeft, Gift, Share2, Copy, Users, Wallet, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { getMyRiderReferral, applyRiderReferralCode, type MyRiderReferral, type RiderReferralStatus } from '../../../api/riderReferral.api';
import { useAuthStore } from '../../../store/useAuthStore';
import { getRiderProfile } from '../../../api/riderProfile.api';

const INK = '#0B1B3F';
const BODY = '#475467';
const MUTED = '#8A94A6';
const ORANGE = '#FF4500';
const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#EEF2F6',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
} as const;

const inr = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const STATUS: Record<RiderReferralStatus, { label: string; bg: string; fg: string }> = {
  LINKED: { label: 'Pending', bg: '#F1F5F9', fg: '#475569' },
  QUALIFIED: { label: 'Processing', bg: '#E0F2FE', fg: '#0369A1' },
  IN_REVIEW: { label: 'Under review', bg: '#FEF3C7', fg: '#B45309' },
  REWARDED: { label: 'Rewarded', bg: '#DCFCE7', fg: '#16A34A' },
  REJECTED: { label: 'Not rewarded', bg: '#FEE2E2', fg: '#B91C1C' },
  EXPIRED: { label: 'Expired', bg: '#F1F5F9', fg: '#64748B' },
  REVERSED: { label: 'Reversed', bg: '#EDE9FE', fg: '#6D28D9' },
};

export default function ScreenReferEarn({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack: () => void }) {
  const setProfile = useAuthStore((s) => s.setProfile);
  const [data, setData] = useState<MyRiderReferral | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const load = useCallback(async () => {
    try {
      setData((await getMyRiderReferral()).data.data);
    } catch {
      // keeps the previous data / shows the retry message
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const r = data?.rules;
  const inviteMessage = data
    ? `Join me on MBGO for cabs, tours & visas! Use my referral code ${data.code} when you sign up${r?.joiningBonus ? ` and get ${inr(r.joiningBonus)} in your MB Wallet` : ''}.`
    : '';

  const share = async () => {
    if (!data) return;
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard) {
        await (navigator as any).clipboard.writeText(inviteMessage);
        showToast('Invite message copied');
        return;
      }
      await Share.share({ message: inviteMessage });
    } catch {}
  };

  const copyCode = async () => {
    if (!data) return;
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard) {
        await (navigator as any).clipboard.writeText(data.code);
        showToast('Code copied');
        return;
      }
      await Share.share({ message: data.code });
    } catch {}
  };

  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 8) return showToast('Enter the full code (e.g. MBG7K4Q2)');
    setBusy(true);
    try {
      const res = await applyRiderReferralCode(c, 'later');
      setCode('');
      showToast(res.data.message);
      load();
      // Refresh the profile so the wallet balance shown elsewhere is current.
      getRiderProfile().then((p) => setProfile(p.data.data)).catch(() => {});
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Could not add the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEF2F6' }}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Back">
          <ChevronLeft size={26} color={INK} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: INK, marginRight: 40 }}>Refer & Earn</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={ORANGE} /></View>
      ) : !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: BODY, fontSize: 14 }}>Couldn't load. </Text>
          <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ marginTop: 10 }}><Text style={{ color: ORANGE, fontWeight: '700' }}>Try again</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[ORANGE]} />}
        >
          {!data.enabled && (
            <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 14, padding: 12 }}>
              <Text style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 18 }}>Refer & Earn isn't active right now. We'll let you know when it starts.</Text>
            </View>
          )}

          {/* Hero: code + share */}
          <View style={{ ...CARD, backgroundColor: '#FFF4EE', borderColor: '#FFE1D2', padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFE4D6', alignItems: 'center', justifyContent: 'center' }}>
                <Gift size={18} color={ORANGE} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#E8430B', letterSpacing: 0.6 }}>INVITE FRIENDS · EARN TOGETHER</Text>
            </View>
            <Text style={{ fontSize: 15, color: INK, fontWeight: '600', marginTop: 12, lineHeight: 21 }}>
              You get <Text style={{ color: ORANGE, fontWeight: '900' }}>{inr(r?.referrerReward)}</Text>
              {r?.joiningBonus ? <Text> and your friend gets <Text style={{ color: ORANGE, fontWeight: '900' }}>{inr(r.joiningBonus)}</Text></Text> : null} in your MB Wallet when they sign up with your code.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#FDBA74', paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600' }}>Your code</Text>
                <Text selectable style={{ fontSize: 24, fontWeight: '900', color: INK, letterSpacing: 2.5, marginTop: 2 }}>{data.code}</Text>
              </View>
              <TouchableOpacity onPress={copyCode} accessibilityLabel="Copy referral code" style={{ width: 52, height: 64, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', alignItems: 'center', justifyContent: 'center' }}>
                <Copy size={20} color={BODY} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={share}
              disabled={!data.enabled}
              activeOpacity={0.85}
              style={{ marginTop: 14, height: 50, borderRadius: 14, backgroundColor: ORANGE, opacity: data.enabled ? 1 : 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Share2 size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Share invite</Text>
            </TouchableOpacity>
          </View>

          {/* Earnings + wallet */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ ...CARD, flex: 1, padding: 14 }}>
              <Users size={18} color="#2563EB" />
              <Text style={{ fontSize: 22, fontWeight: '800', color: INK, marginTop: 6 }}>{data.stats.rewarded}</Text>
              <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600' }}>Friends joined{data.stats.pending ? ` · ${data.stats.pending} pending` : ''}</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigate('wallet')} activeOpacity={0.85} style={{ ...CARD, flex: 1, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Wallet size={18} color={ORANGE} />
                <ChevronRight size={16} color={MUTED} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: INK, marginTop: 6 }}>{inr(data.walletBalance)}</Text>
              <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600' }}>MB Wallet · earned {inr(data.stats.earned)}</Text>
            </TouchableOpacity>
          </View>

          {/* Joined with a code / enter a code */}
          {data.referredBy ? (
            <View style={{ ...CARD, padding: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: INK }}>You joined with a referral</Text>
              <Text style={{ fontSize: 13, color: BODY, marginTop: 4 }}>Referred by {data.referredBy.name} ({data.referredBy.code}) · {STATUS[data.referredBy.status].label}</Text>
            </View>
          ) : data.canEnterCode ? (
            <View style={{ ...CARD, padding: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: INK }}>Have a friend's code?</Text>
              <Text style={{ fontSize: 13, color: BODY, marginTop: 4, lineHeight: 18 }}>
                Add it within {r?.linkWindowDays} day{r?.linkWindowDays === 1 ? '' : 's'} of joining, before your first ride booking{r?.joiningBonus ? `, and get ${inr(r.joiningBonus)} in your MB Wallet` : ''}.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, fontSize: 15, fontWeight: '700', letterSpacing: 1, color: INK, minHeight: 46 }}
                  placeholder="e.g. MBG7K4Q2"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                />
                <TouchableOpacity onPress={apply} disabled={busy} style={{ backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Add</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* People I referred */}
          <View style={{ ...CARD, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: INK }}>Friends you referred</Text>
            {data.referrals.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 18 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF4EE', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} color={ORANGE} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: INK, marginTop: 8 }}>No friends yet</Text>
                <Text style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>Share your code to invite your first friend.</Text>
              </View>
            ) : (
              data.referrals.map((x, i) => (
                <View key={x._id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: '#F1F5F9', marginTop: i ? 0 : 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#EA580C' }}>{(x.name || '?').trim().charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: INK }}>{x.name}</Text>
                    <Text style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>Joined {fmt(x.createdAt)}{x.rejectReason ? ` · ${x.rejectReason}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ backgroundColor: STATUS[x.status].bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: STATUS[x.status].fg }}>{STATUS[x.status].label}</Text>
                    </View>
                    {x.status === 'REWARDED' && <Text style={{ fontSize: 13, fontWeight: '800', color: '#16A34A', marginTop: 4 }}>+{inr(x.reward)}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* How it works */}
          <View style={{ ...CARD, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: INK, marginBottom: 6 }}>How it works</Text>
            {[
              'Share your code. Your friend adds it on Create Account (email or Google), or in Refer & Earn soon after joining.',
              `When your friend's account is verified, you get ${inr(r?.referrerReward)}${r?.joiningBonus ? ` and they get ${inr(r.joiningBonus)}` : ''} in your MB Wallets.`,
              'Use MB Wallet money to pay part of your cab bill. It can\'t be withdrawn to a bank.',
            ].map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 13, color: BODY, lineHeight: 19 }}>{t}</Text>
              </View>
            ))}
            {!!data.terms && <Text style={{ fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 17 }}>{data.terms}</Text>}
          </View>
        </ScrollView>
      )}

      {toast ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 64, left: 16, right: 16, alignItems: 'center' }}>
          <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, maxWidth: '100%' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{toast}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
