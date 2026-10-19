import React, { useCallback, useRef, useState } from 'react';
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
  // Display-only state for the redesigned layout.
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [rechargeY, setRechargeY] = useState(0);

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

  const r = wallet?.rules;
  const lowTitle = wallet && wallet.balance <= 0 ? 'Recharge to start taking rides' : 'Low wallet balance';
  const history = wallet ? (showAllHistory ? wallet.transactions : wallet.transactions.slice(0, 5)) : [];
  const STEPS = r
    ? [
        { n: 1, icon: 'wallet' as const, color: '#FE5300', bg: '#fff1e6', title: 'Add Money', sub: 'Choose an amount and pay with PayU.' },
        { n: 2, icon: 'checkmark-circle' as const, color: '#16a34a', bg: '#e8f8ee', title: 'Wallet Updated', sub: 'Added as soon as PayU confirms.' },
        { n: 3, icon: 'receipt' as const, color: '#7c3aed', bg: '#f1ebff', title: 'Fees from wallet', sub: `${inr(r.feePerKm)}/km platform fee, no commission.` },
        { n: 4, icon: 'car' as const, color: '#2563eb', bg: '#e8f0ff', title: 'Maintain Balance', sub: `Keep ${inr(r.minBalance)} after the trip fee.` },
        { n: 5, icon: 'cash' as const, color: '#f59e0b', bg: '#fff6e0', title: 'Earn and Reuse', sub: 'Released earnings stay in the same wallet.' },
      ]
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Wallet</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => navigation.navigate('TripSupport')} activeOpacity={0.8}>
          <Ionicons name="help-circle-outline" size={20} color="#475569" />
          <Text style={styles.helpText}>Need Help?</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#FE5300" /></View>
      ) : !wallet ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}><Text style={styles.muted}>Could not load your wallet. Pull to retry.</Text></View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={['#FE5300']} />}
        >
          {!wallet.enabled && (
            <View style={styles.infoCard}>
              <Ionicons name="time-outline" size={18} color="#2563eb" />
              <Text style={styles.infoText}>The Partner Wallet isn't active yet. You can take rides as usual — we'll notify you before it starts.</Text>
            </View>
          )}

          {/* Low balance alert */}
          {wallet.enabled && !!blocked && (
            <TouchableOpacity style={styles.alertCard} activeOpacity={0.85} onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, rechargeY - 12), animated: true })}>
              <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{lowTitle}</Text>
                <Text style={styles.alertText}>{blocked.replace(/^Low wallet balance\.\s*/i, '')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ea580c" />
            </TouchableOpacity>
          )}

          {/* Balance */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={[styles.balanceValue, wallet.balance < 0 && { color: '#dc2626' }]}>{inr(wallet.balance)}</Text>
              </View>
              {wallet.enabled && (
                <View style={styles.minCol}>
                  <Text style={styles.balanceLabel}>Minimum Required</Text>
                  <Text style={styles.minValue}>{inr(wallet.rules.minBalance)}</Text>
                  <Text style={styles.minSub}>to continue receiving rides</Text>
                </View>
              )}
              <View style={styles.illustration}>
                <View style={styles.illoWallet}><Ionicons name="wallet" size={34} color="#ea580c" /></View>
                <View style={styles.illoCoin}><Text style={styles.illoCoinText}>₹</Text></View>
              </View>
            </View>
            <View style={styles.balanceSplit}>
              {[
                ['Available', wallet.available],
                ['Held for trips', wallet.reserved],
                ['Pending', wallet.pending],
              ].map(([k, v], i) => (
                <View key={String(k)} style={[styles.splitItem, i > 0 && styles.splitDivider]}>
                  <Text style={styles.splitLabel}>{k}</Text>
                  <Text style={styles.splitValue}>{inr(Number(v))}</Text>
                </View>
              ))}
            </View>
          </View>

          {(wallet.referralLocked || 0) > 0 && !wallet.referralUnlocked && (
            <TouchableOpacity style={styles.linkRow} activeOpacity={0.85} onPress={() => navigation.navigate('ReferEarn')}>
              <View style={[styles.linkIcon, { backgroundColor: '#fef3c7' }]}><Ionicons name="lock-closed" size={16} color="#b45309" /></View>
              <Text style={styles.linkText}>Referral bonus (locked) {inr(wallet.referralLocked)}</Text>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.linkRow} activeOpacity={0.85} onPress={() => navigation.navigate('PayoutHistory')}>
            <View style={[styles.linkIcon, { backgroundColor: '#eff6ff' }]}><Ionicons name="business-outline" size={16} color="#2563eb" /></View>
            <Text style={styles.linkText}>Withdraw to bank</Text>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          {awaitingPayment && (
            <View style={styles.infoCard}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#2563eb" />
              <Text style={styles.infoText}>Finished paying? Pull down to refresh your balance. It updates as soon as PayU confirms.</Text>
            </View>
          )}

          {/* Recharge */}
          {wallet.enabled && (
            <View style={styles.card} onLayout={(e) => setRechargeY(e.nativeEvent.layout.y)}>
              <View style={styles.rechargeHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Recharge Wallet</Text>
                  <Text style={styles.muted}>Choose a quick amount or enter your own.</Text>
                </View>
              </View>
              <View style={styles.minNote}>
                <Ionicons name="information-circle-outline" size={15} color="#ea580c" />
                <Text style={styles.minNoteText}>
                  {wallet.firstRechargeDone ? `Minimum recharge ${inr(minNow)}` : `First recharge must be at least ${inr(minNow)}`} — added to your wallet, not a fee.
                </Text>
              </View>
              <View style={styles.presetRow}>
                {presets.map((p) => {
                  const on = !customMode && Number(amount) === p;
                  return (
                    <TouchableOpacity key={p} style={[styles.preset, on && styles.presetOn]} onPress={() => { setCustomMode(false); setAmount(String(p)); }} activeOpacity={0.85}>
                      <Text style={[styles.presetText, on && styles.presetTextOn]}>{inr(p)}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={[styles.preset, customMode && styles.presetOn]} onPress={() => { setCustomMode(true); setAmount(''); }} activeOpacity={0.85}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="pencil" size={13} color={customMode ? '#FE5300' : '#0f172a'} />
                    <Text style={[styles.presetText, customMode && styles.presetTextOn]}>Custom</Text>
                  </View>
                </TouchableOpacity>
              </View>
              {customMode && (
                <View style={styles.amountBox}>
                  <View style={styles.rupeeBox}><Text style={styles.rupee}>₹</Text></View>
                  <TextInput
                    style={styles.amountInput}
                    placeholder={`Enter amount (min ${inr(minNow)})`}
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    inputMode="numeric"
                    autoFocus
                    value={amount}
                    onChangeText={(t) => setAmount(t.replace(/\D/g, '').slice(0, 6))}
                  />
                </View>
              )}
              <TouchableOpacity style={[styles.primaryBtn, starting && { opacity: 0.6 }]} disabled={starting} onPress={recharge} activeOpacity={0.85}>
                {starting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="wallet-outline" size={19} color="#ffffff" />
                    <Text style={styles.primaryBtnText}>Recharge with PayU{Number(amount) > 0 ? ` · ${inr(Number(amount))}` : ''}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 'auto' }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* How it works */}
          <View style={styles.card}>
            <Text style={styles.howTitle}>How it works</Text>
            <Text style={styles.muted}>A simple process to keep your wallet active and receive rides.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepsRow}>
              {STEPS.map((st, i) => (
                <View key={st.n} style={styles.stepWrap}>
                  <View style={styles.step}>
                    <View style={[styles.stepCircle, { backgroundColor: st.bg }]}>
                      <Ionicons name={st.icon} size={26} color={st.color} />
                      <View style={[styles.stepNum, { backgroundColor: st.color }]}><Text style={styles.stepNumText}>{st.n}</Text></View>
                    </View>
                    <Text style={styles.stepTitle}>{st.title}</Text>
                    <Text style={styles.stepSub}>{st.sub}</Text>
                  </View>
                  {i < STEPS.length - 1 && <Ionicons name="arrow-forward" size={14} color="#fdba74" style={{ marginTop: 26 }} />}
                </View>
              ))}
            </ScrollView>
            <View style={styles.trust}>
              {[
                { icon: 'shield-checkmark-outline' as const, color: '#ea580c', text: 'Secure Payments' },
                { icon: 'flash-outline' as const, color: '#f59e0b', text: 'Updated after payment' },
                { icon: 'stats-chart-outline' as const, color: '#2563eb', text: 'One wallet for all rides' },
                { icon: 'lock-closed-outline' as const, color: '#dc2626', text: 'Full history' },
              ].map((t) => (
                <View key={t.text} style={styles.trustItem}>
                  <Ionicons name={t.icon} size={20} color={t.color} />
                  <Text style={styles.trustText}>{t.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* History */}
          <View style={styles.historyHead}>
            <Text style={styles.historyTitle}>Wallet History</Text>
            {wallet.transactions.length > 5 && (
              <TouchableOpacity onPress={() => setShowAllHistory((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={styles.viewAll}>{showAllHistory ? 'Show less' : 'View All'}</Text>
                <Ionicons name={showAllHistory ? 'chevron-up' : 'chevron-forward'} size={16} color="#FE5300" />
              </TouchableOpacity>
            )}
          </View>
          {wallet.transactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={34} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No transactions yet.</Text>
              <Text style={styles.emptySub}>Your recharges, fees and earnings will appear here.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {history.map((t, i) => {
                const look = TXN[t.type] || { label: t.type, icon: 'ellipse' as const };
                const plus = !look.out;
                const color = look.pending ? '#b45309' : plus ? '#16a34a' : '#dc2626';
                return (
                  <View key={t._id} style={[styles.txnRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}>
                    <View style={[styles.txnIcon, { backgroundColor: look.pending ? '#fef3c7' : plus ? '#dcfce7' : '#fee2e2' }]}>
                      <Ionicons name={look.icon} size={18} color={color} />
                    </View>
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1, marginLeft: 10 },
  helpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helpText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  muted: { fontSize: 12.5, color: '#64748b', lineHeight: 18 },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  infoCard: { flexDirection: 'row', gap: 8, backgroundColor: '#eff6ff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { flex: 1, fontSize: 12.5, color: '#1e3a8a', lineHeight: 18 },
  // Alert
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff7ed', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fed7aa' },
  alertIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  alertIconText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  alertTitle: { fontSize: 15, fontWeight: '800', color: '#ea580c' },
  alertText: { fontSize: 12.5, color: '#334155', marginTop: 2, lineHeight: 17 },
  // Balance
  balanceCard: { backgroundColor: '#fff4ec', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#ffe4d1', overflow: 'hidden' },
  balanceTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  balanceValue: { fontSize: 30, fontWeight: '900', color: '#0f172a', marginTop: 2, letterSpacing: -0.5 },
  minCol: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#fed7aa', paddingLeft: 12 },
  minValue: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  minSub: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  illustration: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  illoWallet: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#ffd9bf', alignItems: 'center', justifyContent: 'center' },
  illoCoin: { position: 'absolute', right: -4, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#fbbf24', borderWidth: 2, borderColor: '#fde68a', alignItems: 'center', justifyContent: 'center' },
  illoCoinText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
  balanceSplit: { flexDirection: 'row', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingVertical: 10 },
  splitItem: { flex: 1, paddingHorizontal: 10 },
  splitDivider: { borderLeftWidth: 1, borderLeftColor: '#fde3cf' },
  splitLabel: { fontSize: 11, color: '#64748b' },
  splitValue: { fontSize: 14.5, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  // Links
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  linkIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  linkText: { flex: 1, fontSize: 14.5, fontWeight: '700', color: '#0f172a' },
  // Recharge
  rechargeHead: { flexDirection: 'row', alignItems: 'flex-start' },
  minNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#fff7ed', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  minNoteText: { flex: 1, fontSize: 12, color: '#c2410c', fontWeight: '600' },
  presetRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  preset: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  presetOn: { backgroundColor: '#fff7ed', borderColor: '#FE5300', borderWidth: 1.5 },
  presetText: { fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  presetTextOn: { color: '#FE5300' },
  amountBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  rupeeBox: { width: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  rupee: { fontSize: 16, fontWeight: '800', color: '#64748b' },
  amountInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 13, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  primaryBtn: { marginTop: 14, backgroundColor: '#FE5300', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryBtnText: { color: '#ffffff', fontSize: 15.5, fontWeight: '800' },
  // How it works
  howTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  stepsRow: { paddingVertical: 14, gap: 4 },
  stepWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { width: 108, alignItems: 'center' },
  stepCircle: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  stepNum: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' },
  stepNumText: { color: '#ffffff', fontSize: 10.5, fontWeight: '900' },
  stepTitle: { fontSize: 12.5, fontWeight: '800', color: '#0f172a', marginTop: 8, textAlign: 'center' },
  stepSub: { fontSize: 11, color: '#64748b', marginTop: 3, textAlign: 'center', lineHeight: 15 },
  trust: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#f8fafc', borderRadius: 14, padding: 10, gap: 8 },
  trustItem: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  trustText: { flex: 1, fontSize: 12, color: '#334155', fontWeight: '600' },
  // History
  historyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  historyTitle: { fontSize: 19, fontWeight: '900', color: '#0f172a' },
  viewAll: { fontSize: 14, fontWeight: '800', color: '#FE5300' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 18, paddingVertical: 26, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  emptyTitle: { fontSize: 14.5, fontWeight: '800', color: '#475569', marginTop: 8 },
  emptySub: { fontSize: 12.5, color: '#64748b', marginTop: 4 },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },
  txnMeta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  txnAmt: { fontSize: 14, fontWeight: '800' },
});
