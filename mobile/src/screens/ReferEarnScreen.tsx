import React, { useCallback, useState } from 'react';
import { Platform, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getMyReferral, applyReferralCode, type MyReferral, type ReferralStatus } from '../api/referral.api';

// Refer & Earn: my code + share, progress to unlock, locked bonus, people I
// referred, and (until profile submission) entering someone else's code.

const inr = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const STATUS: Record<ReferralStatus, { label: string; bg: string; fg: string }> = {
  LINKED: { label: 'Pending approval', bg: '#f1f5f9', fg: '#475569' },
  QUALIFIED: { label: 'Approved · processing', bg: '#e0f2fe', fg: '#0369a1' },
  IN_REVIEW: { label: 'Under review', bg: '#fef3c7', fg: '#b45309' },
  REWARDED: { label: 'Rewarded', bg: '#dcfce7', fg: '#16a34a' },
  REJECTED: { label: 'Not rewarded', bg: '#fee2e2', fg: '#b91c1c' },
  EXPIRED: { label: 'Expired', bg: '#f1f5f9', fg: '#64748b' },
  REVERSED: { label: 'Reversed', bg: '#ede9fe', fg: '#6d28d9' },
};

export const ReferEarnScreen = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<MyReferral | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData((await getMyReferral()).data.data);
    } catch (e) {
      console.error('Error loading referral:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const share = async () => {
    if (!data) return;
    const msg = `Join MBConnect as a partner and earn more! Use my referral code ${data.code} when you sign up${data.rules.joiningBonus ? ` and get ₹${data.rules.joiningBonus} joining bonus after your account is approved` : ''}.`;
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard) {
        await (navigator as any).clipboard.writeText(msg);
        Alert.alert('Copied', 'Invite message copied.');
        return;
      }
      await Share.share({ message: msg });
    } catch {}
  };

  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 8) return Alert.alert('Referral code', 'Enter the full code (e.g. MBC7K4Q2).');
    setBusy(true);
    try {
      const res = await applyReferralCode(c, 'later');
      setCode('');
      Alert.alert('Referral code added', res.data.referrerName ? `Referred by ${res.data.referrerName}. ${res.data.message}` : res.data.message);
      load();
    } catch (e: any) {
      Alert.alert('Referral code not added', e?.response?.data?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const r = data?.rules;
  const s = data?.stats;
  const progress = s && r ? Math.min(1, s.rewarded / r.unlockAfter) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#FE5300" /></View>
      ) : !data ? (
        <View style={styles.center}><Text style={styles.muted}>Could not load. Pull to retry.</Text></View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          {!data.enabled && (
            <View style={styles.infoCard}>
              <Ionicons name="time-outline" size={18} color="#2563eb" />
              <Text style={styles.infoText}>Refer & Earn isn't active right now. We'll let you know when it starts.</Text>
            </View>
          )}

          {/* My code */}
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Your referral code</Text>
            <Text style={styles.heroCode} selectable>{data.code}</Text>
            <Text style={styles.heroSub}>
              Earn {inr(r!.referrerReward)} for every partner who joins with your code and gets approved
              {r!.joiningBonus ? ` — they get ${inr(r!.joiningBonus)} too.` : '.'}
            </Text>
            <TouchableOpacity style={[styles.shareBtn, !data.enabled && { opacity: 0.5 }]} disabled={!data.enabled} onPress={share} activeOpacity={0.85}>
              <Ionicons name="share-social" size={18} color="#ffffff" />
              <Text style={styles.shareText}>Share invite</Text>
            </TouchableOpacity>
          </View>

          {/* Progress + locked */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Your referrals</Text>
              <Text style={styles.count}>{s!.rewarded} / {r!.unlockAfter}</Text>
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>
            {s!.unlocked ? (
              <Text style={styles.okText}>🎉 Unlocked — your referral rewards go straight to your wallet.</Text>
            ) : (
              <>
                <View style={styles.lockRow}>
                  <Ionicons name="lock-closed" size={16} color="#b45309" />
                  <Text style={styles.lockText}>Referral bonus (locked): <Text style={{ fontWeight: '900' }}>{inr(s!.lockedBalance)}</Text></Text>
                </View>
                <Text style={styles.muted}>Unlocks to your wallet when you reach {r!.unlockAfter} approved referrals. {Math.max(0, r!.unlockAfter - s!.rewarded)} to go.</Text>
              </>
            )}
            {s!.pending > 0 && <Text style={[styles.muted, { marginTop: 6 }]}>{s!.pending} waiting for approval.</Text>}
          </View>

          {/* Enter a code (until submission) */}
          {data.referredBy ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>You joined with a referral</Text>
              <Text style={styles.muted}>Referred by {data.referredBy.name} ({data.referredBy.code}) · {STATUS[data.referredBy.status].label}</Text>
              {data.referredBy.joiningBonus > 0 && data.referredBy.status !== 'REWARDED' && (
                <Text style={styles.muted}>Your {inr(data.referredBy.joiningBonus)} joining bonus is added once your account is approved.</Text>
              )}
            </View>
          ) : data.canEnterCode ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Have a referral code?</Text>
              <Text style={styles.muted}>Add it before you submit your profile for approval{r!.joiningBonus ? ` to get ${inr(r!.joiningBonus)} joining bonus once approved` : ''}.</Text>
              <View style={styles.inputRow}>
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
                <TouchableOpacity style={[styles.applyBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={apply}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.applyText}>Add</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* People I referred */}
          <Text style={styles.section}>PEOPLE YOU REFERRED</Text>
          {data.referrals.length === 0 ? (
            <Text style={[styles.muted, { textAlign: 'center', marginTop: 4 }]}>No referrals yet. Share your code to start earning.</Text>
          ) : (
            <View style={styles.card}>
              {data.referrals.map((x, i) => (
                <View key={x._id} style={[styles.refRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.refName}>{x.name}</Text>
                    <Text style={styles.refMeta}>Joined {fmt(x.createdAt)}{x.rejectReason ? ` · ${x.rejectReason}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.badge, { backgroundColor: STATUS[x.status].bg }]}><Text style={[styles.badgeText, { color: STATUS[x.status].fg }]}>{STATUS[x.status].label}</Text></View>
                    {x.status === 'REWARDED' && <Text style={styles.refAmt}>+{inr(x.reward)}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Rules + T&C */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How it works</Text>
            {[
              `Share your code. Your friend adds it when signing up (email or Google), or in Refer & Earn before submitting their profile.`,
              `When MBConnect approves their account, you earn ${inr(r!.referrerReward)}${r!.joiningBonus ? ` and they get ${inr(r!.joiningBonus)} in their wallet` : ''}.`,
              `Your referral rewards stay locked until you have ${r!.unlockAfter} approved referrals, then they move to your wallet and can be withdrawn.`,
              `Their account must be approved within ${r!.expiryDays} days of adding your code.`,
            ].map((t, i) => (
              <View key={i} style={styles.ruleRow}>
                <Ionicons name="checkmark-circle" size={15} color="#16a34a" style={{ marginTop: 1 }} />
                <Text style={styles.ruleText}>{t}</Text>
              </View>
            ))}
            {!!data.terms && <Text style={[styles.muted, { marginTop: 10 }]}>{data.terms}</Text>}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 12 : 44, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  muted: { fontSize: 12.5, color: '#64748b', lineHeight: 18 },
  infoCard: { flexDirection: 'row', gap: 8, backgroundColor: '#eff6ff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { flex: 1, fontSize: 12.5, color: '#1e3a8a', lineHeight: 18 },
  hero: { backgroundColor: '#0f172a', borderRadius: 22, padding: 18, alignItems: 'center' },
  heroLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  heroCode: { fontSize: 30, fontWeight: '900', color: '#ffffff', letterSpacing: 3, marginTop: 6 },
  heroSub: { fontSize: 12.5, color: '#cbd5e1', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FE5300', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22, marginTop: 14 },
  shareText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { fontSize: 15, fontWeight: '900', color: '#FE5300' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', marginTop: 8, marginBottom: 10, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#FE5300' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  lockText: { fontSize: 13.5, color: '#92400e', fontWeight: '600' },
  okText: { fontSize: 13, color: '#16a34a', fontWeight: '700' },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, fontSize: 15, fontWeight: '700', letterSpacing: 1, color: '#0f172a', minHeight: 46 },
  applyBtn: { backgroundColor: '#FE5300', borderRadius: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  section: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginLeft: 4, marginTop: 4 },
  refRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  refName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  refMeta: { fontSize: 11.5, color: '#94a3b8', marginTop: 2 },
  refAmt: { fontSize: 13, fontWeight: '800', color: '#16a34a', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  ruleRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ruleText: { flex: 1, fontSize: 12.5, color: '#334155', lineHeight: 18 },
});
