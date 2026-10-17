import React, { useCallback, useState } from 'react';
import { Platform, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getWallet, startRecharge, walletBlockReason, type Wallet, type WalletTxn } from '../api/partnerWallet.api';

// MBConnect Partner Wallet: the driver's one wallet. Released trip earnings and
// recharges go in; the per-km platform fee and cancellation charges come out.
// Recharge opens PayU in the phone browser.

const inr = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const TXN: Record<WalletTxn['type'], { label: string; icon: keyof typeof Ionicons.glyphMap; out?: boolean; pending?: boolean }> = {
  trip_pending_credit: { label: 'Trip earning (pending)', icon: 'time', pending: true },
  admin_release: { label: 'Earnings added to wallet', icon: 'checkmark-circle' },
  admin_credit: { label: 'Credited by MBConnect', icon: 'gift' },
  admin_debit: { label: 'Debited by MBConnect', icon: 'remove-circle', out: true },
  recharge: { label: 'Wallet recharge', icon: 'add-circle' },
  platform_fee: { label: 'Trip platform fee', icon: 'car-sport', out: true },
  cancel_charge: { label: 'Cancellation charge', icon: 'close-circle', out: true },
  cancel_charge_refund: { label: 'Cancellation charge refunded', icon: 'refresh-circle' },
  payout: { label: 'Withdrawal to bank', icon: 'business', out: true },
  payout_reversed: { label: 'Withdrawal cancelled (returned)', icon: 'arrow-undo-circle' },
  referral_bonus: { label: 'Referral reward (locked)', icon: 'lock-closed', pending: true },
  referral_reward: { label: 'Referral reward', icon: 'gift' },
  referral_joining_bonus: { label: 'Referral joining bonus', icon: 'gift' },
  referral_unlock: { label: 'Referral bonus unlocked', icon: 'lock-open' },
  referral_reversal: { label: 'Referral reward reversed', icon: 'remove-circle', out: true },
};

export const PartnerWalletScreen = () => {
  const navigation = useNavigation<any>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [starting, setStarting] = useState(false);
  const [awaitingPayment, setAwaitingPayment] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getWallet();
      setWallet(res.data.data);
    } catch (e) {
      console.error('Error loading wallet:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refreshes when coming back from the PayU browser tab.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const minNow = wallet ? (wallet.firstRechargeDone ? wallet.rules.minRecharge : wallet.rules.firstRechargeMin) : 0;
  const presets = wallet ? Array.from(new Set([minNow, 1000, 2000, 5000].filter((v) => v >= minNow && v <= wallet.rules.maxRecharge))).slice(0, 4) : [];

  const recharge = async () => {
    const value = Math.round(Number(amount));
    if (!wallet) return;
    if (!value || value < minNow) return Alert.alert('Enter amount', `Minimum recharge is ${inr(minNow)}.`);
    if (value > wallet.rules.maxRecharge) return Alert.alert('Enter amount', `Maximum recharge is ${inr(wallet.rules.maxRecharge)}.`);
    setStarting(true);
    try {
      const res = await startRecharge(value);
      await Linking.openURL(res.data.checkoutUrl);
      setAwaitingPayment(true);
    } catch (e: any) {
      Alert.alert('Could not start payment', e?.response?.data?.message || 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const blocked = walletBlockReason(wallet);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Wallet</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#FE5300" /></View>
      ) : !wallet ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}><Text style={styles.muted}>Could not load your wallet. Pull to retry.</Text></View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          {!wallet.enabled && (
            <View style={styles.infoCard}>
              <Ionicons name="time-outline" size={18} color="#2563eb" />
              <Text style={styles.infoText}>The Partner Wallet isn't active yet. You can take rides as usual — we'll notify you before it starts.</Text>
            </View>
          )}

          {/* Balance */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Wallet balance</Text>
            <Text style={[styles.balanceValue, wallet.balance < 0 && { color: '#fecaca' }]}>{inr(wallet.balance)}</Text>
            <View style={styles.balanceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceSub}>Available</Text>
                <Text style={styles.balanceSubVal}>{inr(wallet.available)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceSub}>Held for trips</Text>
                <Text style={styles.balanceSubVal}>{inr(wallet.reserved)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceSub}>Pending earnings</Text>
                <Text style={styles.balanceSubVal}>{inr(wallet.pending)}</Text>
              </View>
            </View>
          </View>

          {(wallet.referralLocked || 0) > 0 && !wallet.referralUnlocked && (
            <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.85} onPress={() => navigation.navigate('ReferEarn')}>
              <Ionicons name="lock-closed" size={18} color="#b45309" />
              <Text style={styles.withdrawText}>Referral bonus (locked) {inr(wallet.referralLocked)}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.85} onPress={() => navigation.navigate('PayoutHistory')}>
            <Ionicons name="business-outline" size={18} color="#0f172a" />
            <Text style={styles.withdrawText}>Withdraw to bank</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          {wallet.enabled && !!blocked && (
            <View style={styles.warnCard}>
              <Ionicons name="alert-circle" size={18} color="#b45309" />
              <Text style={styles.warnText}>{blocked}</Text>
            </View>
          )}

          {awaitingPayment && (
            <View style={styles.infoCard}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#2563eb" />
              <Text style={styles.infoText}>Finished paying? Pull down to refresh your balance. It updates as soon as PayU confirms.</Text>
            </View>
          )}

          {/* Recharge */}
          {wallet.enabled && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{wallet.firstRechargeDone ? 'Add money' : 'First recharge'}</Text>
              <Text style={styles.muted}>
                {wallet.firstRechargeDone
                  ? `Minimum ${inr(minNow)}. Added to your wallet balance.`
                  : `Your first recharge must be at least ${inr(minNow)}. It's added to your wallet balance — not a registration fee.`}
              </Text>
              <View style={styles.presetRow}>
                {presets.map((p) => (
                  <TouchableOpacity key={p} style={[styles.preset, Number(amount) === p && styles.presetOn]} onPress={() => setAmount(String(p))}>
                    <Text style={[styles.presetText, Number(amount) === p && styles.presetTextOn]}>{inr(p)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                inputMode="numeric"
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/\D/g, '').slice(0, 6))}
              />
              <TouchableOpacity style={[styles.primaryBtn, starting && { opacity: 0.6 }]} disabled={starting} onPress={recharge}>
                {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Recharge with PayU</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Rules */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How it works</Text>
            {[
              `One wallet: your released trip earnings and recharges are added here, and fees are taken from here.`,
              `Platform fee: ${inr(wallet.rules.feePerKm)}/km of the booked trip distance — held when you accept, charged when you complete. No commission is cut from your trip earnings.`,
              `Keep at least ${inr(wallet.rules.minBalance)} available after the trip fee to accept a ride. Pending earnings count once they're added to your wallet.`,
              `Your first recharge must be at least ${inr(wallet.rules.firstRechargeMin)}.`,
              `If a ride is cancelled by the rider or MBConnect, the held fee comes back to you.`,
              `Cancelling within ${wallet.rules.cancellation.freeMinutes} minutes of accepting is free. After that: city rides ${inr(wallet.rules.cancellation.regularWithin24h)} (within 24h of accepting) or ${inr(wallet.rules.cancellation.regularAfter24h)}; outstation rides free if more than ${wallet.rules.cancellation.outstationFreeDays} days before pickup, else ${inr(wallet.rules.cancellation.outstationMidPerKm)}/km (24h–${wallet.rules.cancellation.outstationFreeDays} days) or ${inr(wallet.rules.cancellation.outstationLatePerKm)}/km (within 24h of pickup).`,
            ].map((t, i) => (
              <View key={i} style={styles.ruleRow}>
                <Ionicons name="checkmark-circle" size={15} color="#16a34a" style={{ marginTop: 1 }} />
                <Text style={styles.ruleText}>{t}</Text>
              </View>
            ))}
          </View>

          {/* History */}
          <Text style={styles.section}>WALLET HISTORY</Text>
          {wallet.transactions.length === 0 ? (
            <Text style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>No transactions yet.</Text>
          ) : (
            <View style={styles.card}>
              {wallet.transactions.map((t, i) => {
                const look = TXN[t.type] || { label: t.type, icon: 'ellipse' as const };
                const plus = !look.out;
                const color = look.pending ? '#b45309' : plus ? '#16a34a' : '#dc2626';
                return (
                  <View key={t._id} style={[styles.txnRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}>
                    <Ionicons name={look.icon} size={22} color={color} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.txnTitle}>{look.label}</Text>
                      <Text style={styles.txnMeta} numberOfLines={2}>{fmt(t.createdAt)}{t.note ? ` · ${t.note}` : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txnAmt, { color }]}>{plus ? '+' : '−'}{inr(Math.abs(t.amount))}</Text>
                      <Text style={styles.txnMeta}>Bal {inr(t.walletBalanceAfter)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 12 : 44, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  muted: { fontSize: 12.5, color: '#64748b', lineHeight: 18 },
  balanceCard: { backgroundColor: '#0f172a', borderRadius: 22, padding: 18 },
  balanceLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  balanceValue: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginTop: 4, letterSpacing: -0.5 },
  balanceRow: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12 },
  balanceSub: { fontSize: 11, color: '#94a3b8' },
  balanceSubVal: { fontSize: 15, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  infoCard: { flexDirection: 'row', gap: 8, backgroundColor: '#eff6ff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { flex: 1, fontSize: 12.5, color: '#1e3a8a', lineHeight: 18 },
  warnCard: { flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fde68a' },
  warnText: { flex: 1, fontSize: 12.5, color: '#92400e', lineHeight: 18, fontWeight: '600' },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0' },
  presetOn: { backgroundColor: '#FE5300', borderColor: '#FE5300' },
  presetText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  presetTextOn: { color: '#ffffff' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, fontWeight: '700', marginTop: 12, color: '#0f172a' },
  primaryBtn: { marginTop: 12, backgroundColor: '#FE5300', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  ruleRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ruleText: { flex: 1, fontSize: 12.5, color: '#334155', lineHeight: 18 },
  section: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginLeft: 4, marginTop: 4 },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txnTitle: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },
  txnMeta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  txnAmt: { fontSize: 14, fontWeight: '800' },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  withdrawText: { flex: 1, fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
});
