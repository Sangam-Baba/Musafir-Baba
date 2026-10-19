import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Platform, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getPayouts, requestWithdrawal, cancelWithdrawal, type PayoutsData, type PayoutItem, type PayoutStatus } from '../api/partnerWallet.api';

// Payout & Bank Details: withdraw wallet money to the bank account on file.
// MBConnect transfers it manually; the driver is notified at each step.

const inr = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
// Short name shown in the bank "logo" circle (display only).
const KNOWN_BANKS: [RegExp, string][] = [
  [/state bank/i, 'SBI'], [/punjab national/i, 'PNB'], [/bank of baroda/i, 'BOB'], [/bank of india/i, 'BOI'],
  [/union bank/i, 'UBI'], [/canara/i, 'CAN'], [/indian overseas/i, 'IOB'], [/central bank/i, 'CBI'], [/indusind/i, 'IIB'],
  [/hdfc/i, 'HDFC'], [/icici/i, 'ICICI'], [/axis/i, 'AXIS'], [/kotak/i, 'KOTAK'], [/idfc/i, 'IDFC'], [/yes bank/i, 'YES'],
  [/paytm/i, 'PAYTM'], [/airtel/i, 'AIRTEL'], [/federal/i, 'FED'], [/bandhan/i, 'BDN'], [/au small/i, 'AU'],
];
function bankShortName(name?: string) {
  const n = String(name || '').trim();
  const known = KNOWN_BANKS.find(([rx]) => rx.test(n));
  if (known) return known[1];
  const words = n.replace(/\b(bank|of|the|ltd\.?|limited)\b/gi, ' ').trim().split(/\s+/).filter(Boolean);
  return (words.map((w) => w[0]).join('').slice(0, 3) || 'BK').toUpperCase();
}

const STATUS: Record<PayoutStatus, { label: string; bg: string; fg: string; hint: string }> = {
  REQUESTED: { label: 'Requested', bg: '#fef3c7', fg: '#b45309', hint: 'Waiting for MBConnect to transfer it.' },
  PROCESSING: { label: 'Processing', bg: '#e0f2fe', fg: '#0369a1', hint: 'Transfer to your bank has started.' },
  PAID: { label: 'Paid', bg: '#dcfce7', fg: '#16a34a', hint: '' },
  CANCELLED: { label: 'Cancelled', bg: '#f1f5f9', fg: '#64748b', hint: '' },
};

// Web preview: Alert buttons don't run there, so use the browser dialog.
const confirmAction = (title: string, message: string, ok: string, onOk: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [{ text: 'Back', style: 'cancel' }, { text: ok, onPress: onOk }]);
};

export const PayoutHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const [info, setInfo] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  // Display-only state for the redesigned layout.
  const [tab, setTab] = useState<'withdraw' | 'bank'>('withdraw');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | PayoutStatus>('ALL');
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getPayouts();
      setInfo(res.data.data);
    } catch (e) {
      console.error('Error loading payouts:', e);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const withdraw = () => {
    if (!info) return;
    const value = Math.floor(Number(amount));
    if (!value || value < info.minWithdrawal) return Alert.alert('Enter amount', `Minimum withdrawal is ${inr(info.minWithdrawal)}.`);
    if (value > info.available) return Alert.alert('Enter amount', `You can withdraw up to ${inr(Math.floor(info.available))}.`);
    confirmAction(
      'Withdraw to bank?',
      `${inr(value)} will be sent to ${info.bank?.bankName} ${info.bank?.accountEnding}. It leaves your wallet now; if the transfer is cancelled it comes back.`,
      'Withdraw',
      async () => {
        setBusy(true);
        try {
          const res = await requestWithdrawal(value);
          setAmount('');
          Alert.alert('Withdrawal requested', res.data.message || 'We will notify you when it is sent to your bank.');
        } catch (e: any) {
          Alert.alert('Could not request withdrawal', e?.response?.data?.message || 'Please try again.');
        } finally {
          setBusy(false);
          load();
        }
      }
    );
  };

  const cancel = (item: PayoutItem) =>
    confirmAction('Cancel withdrawal?', `${inr(item.amount)} will go back to your wallet.`, 'Cancel withdrawal', async () => {
      try {
        const res = await cancelWithdrawal(item._id);
        Alert.alert('Withdrawal cancelled', res.data.message);
      } catch (e: any) {
        Alert.alert('Could not cancel', e?.response?.data?.message || 'Please try again.');
      } finally {
        load();
      }
    });

  const bank = info?.bank;
  const bankUsable = !!bank && bank.status !== 'Rejected';
  const available = Math.floor(info?.available || 0);
  const min = info?.minWithdrawal || 100;
  const value = Math.floor(Number(amount) || 0);
  const canWithdraw = !!info && bankUsable && !info.hasOpenRequest && !busy && value >= min && value <= available;
  const presets = [500, 1000, 2000, 5000];
  const items = (info?.items || []).filter((i) => historyFilter === 'ALL' || i.status === historyFilter);
  const bankInitials = bankShortName(bank?.bankName);
  const bankStatus =
    bank?.status === 'Verified'
      ? { label: 'Verified', bg: '#dcfce7', fg: '#16a34a' }
      : bank?.status === 'Rejected'
        ? { label: 'Rejected', bg: '#fee2e2', fg: '#b91c1c' }
        : { label: 'Pending verification', bg: '#fef3c7', fg: '#b45309' };
  const FILTERS: { key: 'ALL' | PayoutStatus; label: string }[] = [
    { key: 'ALL', label: 'All Transactions' },
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'PAID', label: 'Paid' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  const bankCard = !bank ? (
    <TouchableOpacity style={[styles.card, styles.bankRow]} onPress={() => navigation.navigate('BankDetails')} activeOpacity={0.85}>
      <View style={[styles.bankLogo, { backgroundColor: '#fff7ed' }]}>
        <Ionicons name="business-outline" size={22} color="#FE5300" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bankName}>Add your bank account</Text>
        <Text style={styles.muted}>Needed to withdraw your earnings</Text>
      </View>
      <View style={styles.editBtn}>
        <Ionicons name="add" size={16} color="#2563eb" />
        <Text style={styles.editText}>Add</Text>
      </View>
    </TouchableOpacity>
  ) : (
    <View style={[styles.card, styles.bankRow]}>
      <View style={styles.bankLogo}>
        <Text style={styles.bankLogoText}>{bankInitials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={styles.bankName} numberOfLines={1}>{bank.bankName}</Text>
          <View style={[styles.pill, { backgroundColor: '#dcfce7' }]}><Text style={[styles.pillText, { color: '#16a34a' }]}>Primary</Text></View>
        </View>
        <Text style={styles.bankNumber}>{bank.accountEnding.replace(/^••/, '•••• ')}</Text>
        <Text style={styles.bankHolder} numberOfLines={1}>{(bank.accountHolderName || '').toUpperCase()}</Text>
      </View>
      <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('BankDetails')} activeOpacity={0.8}>
        <Ionicons name="pencil" size={14} color="#2563eb" />
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>
    </View>
  );

  const withdrawTab = info ? (
    <>
      {/* Balance */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <View style={styles.walletBubble}>
            <Ionicons name="wallet" size={26} color="#FE5300" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>{inr(info.available)}</Text>
          </View>
          <View style={styles.illustration}>
            <View style={styles.illoWallet}>
              <Ionicons name="wallet" size={40} color="#ea580c" />
            </View>
            <View style={styles.illoCoin}>
              <Text style={styles.illoCoinText}>₹</Text>
            </View>
          </View>
        </View>
        {info.available < min && (
          <View style={styles.alertChip}>
            <Ionicons name="alert-circle" size={16} color="#dc2626" />
            <Text style={styles.alertChipText}>{info.available <= 0 ? "You don't have any balance to withdraw yet." : `You need at least ${inr(min)} to withdraw.`}</Text>
          </View>
        )}
        {info.pending > 0 && <Text style={styles.pendingNote}>+ {inr(info.pending)} pending earnings (added after release)</Text>}
      </View>

      {bankCard}

      {info.hasOpenRequest ? (
        <View style={styles.infoBox}>
          <Ionicons name="time-outline" size={18} color="#2563eb" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Withdrawal in progress</Text>
            <Text style={styles.infoText}>You can request again once it's paid or cancelled. Track it below.</Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Withdraw Amount</Text>
            <Text style={styles.sectionMeta}>
              Available Balance: <Text style={{ color: '#FE5300', fontWeight: '800' }}>{inr(info.available)}</Text>
            </Text>
          </View>
          <View style={styles.presetRow}>
            {presets.map((p) => {
              const on = value === p;
              const off = p > available;
              return (
                <TouchableOpacity key={p} style={[styles.preset, on && styles.presetOn, off && { opacity: 0.45 }]} disabled={off || !bankUsable} onPress={() => setAmount(String(p))} activeOpacity={0.8}>
                  <Text style={[styles.presetText, on && styles.presetTextOn]}>{inr(p)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.amountBox}>
            <View style={styles.rupeeBox}><Text style={styles.rupee}>₹</Text></View>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter custom amount"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              inputMode="numeric"
              editable={bankUsable}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/\D/g, '').slice(0, 7))}
            />
            {available >= min && bankUsable && (
              <TouchableOpacity onPress={() => setAmount(String(available))} style={{ paddingHorizontal: 12 }}>
                <Text style={styles.allText}>All</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Minimum withdrawal amount is {inr(min)}</Text>
              <Text style={styles.infoText}>You can withdraw any amount up to your available balance.</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.withdrawBtn, !canWithdraw && styles.withdrawBtnOff]} disabled={!canWithdraw} onPress={withdraw} activeOpacity={0.85}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#ffffff" />
                <Text style={styles.withdrawText}>Withdraw to Bank</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Trust strip */}
      <View style={styles.trust}>
        {[
          { icon: 'shield-checkmark', color: '#16a34a', title: 'Safe & Secure', sub: 'Sent only to your bank' },
          { icon: 'flash', color: '#f59e0b', title: 'Track every step', sub: 'Status & UTR shared' },
          { icon: 'business', color: '#2563eb', title: 'Direct to Bank', sub: 'No extra charges' },
        ].map((t, i) => (
          <View key={t.title} style={[styles.trustItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: '#dcfce7' }]}>
            <Ionicons name={t.icon as any} size={22} color={t.color} />
            <View style={{ flex: 1 }}>
              <Text style={styles.trustTitle}>{t.title}</Text>
              <Text style={styles.trustSub}>{t.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* History */}
      <View style={[styles.sectionRow, { marginTop: 8 }]}>
        <Text style={styles.historyTitle}>Withdrawal History</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen((o) => !o)} activeOpacity={0.8}>
          <Text style={styles.filterText}>{FILTERS.find((f) => f.key === historyFilter)?.label}</Text>
          <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#0f172a" />
        </TouchableOpacity>
      </View>
      {filterOpen && (
        <View style={styles.filterMenu}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f.key} style={styles.filterOption} onPress={() => { setHistoryFilter(f.key); setFilterOpen(false); }}>
              <Text style={[styles.filterOptionText, historyFilter === f.key && { color: '#FE5300', fontWeight: '800' }]}>{f.label}</Text>
              {historyFilter === f.key && <Ionicons name="checkmark" size={16} color="#FE5300" />}
            </TouchableOpacity>
          ))}
        </View>
      )}
      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBubble}>
            <Ionicons name="receipt-outline" size={42} color="#64748b" />
            <View style={styles.emptyCoin}><Text style={styles.emptyCoinText}>₹</Text></View>
          </View>
          <Text style={styles.emptyTitle}>{historyFilter === 'ALL' ? 'No withdrawals yet' : 'Nothing here'}</Text>
          <Text style={styles.emptySub}>{historyFilter === 'ALL' ? 'Your bank transfers will appear here once you withdraw your earnings.' : 'No withdrawals with this status.'}</Text>
        </View>
      ) : (
        items.map((item) => {
          const st = STATUS[item.status];
          return (
            <View key={item._id} style={styles.histCard}>
              <View style={styles.cardHeader}>
                <View style={styles.idRow}>
                  <Ionicons name="receipt-outline" size={16} color="#FE5300" style={{ marginRight: 6 }} />
                  <Text style={styles.settlementId}>{item.code}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                </View>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.histAmount}>{inr(item.amount)}</Text>
                <Text style={styles.date}>{fmt(item.paidAt || item.cancelledAt || item.createdAt)}</Text>
              </View>
              <View style={styles.bankRowSmall}>
                <Ionicons name="business-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.bankText}>
                  {item.bankName} ({item.accountEnding}){item.utr ? ` • UTR ${item.utr}` : ''}
                </Text>
              </View>
              {!!st.hint && <Text style={styles.hint}>{st.hint}</Text>}
              {item.status === 'CANCELLED' && (
                <Text style={styles.hint}>
                  {item.cancelledBy === 'ADMIN' ? `Cancelled by MBConnect: ${item.cancelReason}` : 'Cancelled by you'}. The money was returned to your wallet.
                </Text>
              )}
              {item.status === 'REQUESTED' && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(item)} activeOpacity={0.8}>
                  <Text style={styles.cancelText}>Cancel withdrawal</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </>
  ) : null;

  const bankTab = info ? (
    <>
      {bankCard}
      {bank && (
        <View style={styles.card}>
          <View style={[styles.sectionRow, { marginBottom: 8 }]}>
            <Text style={styles.sectionTitle}>Account details</Text>
            <View style={[styles.pill, { backgroundColor: bankStatus.bg }]}><Text style={[styles.pillText, { color: bankStatus.fg }]}>{bankStatus.label}</Text></View>
          </View>
          {[
            ['Account holder', bank.accountHolderName],
            ['Bank', bank.bankName],
            ['Account number', bank.accountEnding.replace(/^••/, '•••• ')],
            ['IFSC', bank.ifsc],
          ].map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={styles.detailVal}>{v || '—'}</Text>
            </View>
          ))}
          <TouchableOpacity style={[styles.withdrawBtn, { marginTop: 14 }]} onPress={() => navigation.navigate('BankDetails')} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color="#ffffff" />
            <Text style={styles.withdrawText}>Update bank details</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark" size={18} color="#2563eb" />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>Withdrawals go only to this account</Text>
          <Text style={styles.infoText}>Changing bank details sends them for verification again before the next payout.</Text>
        </View>
      </View>
    </>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout & Bank Details</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => navigation.navigate('TripSupport')}>
          <Ionicons name="help-circle-outline" size={18} color="#FE5300" style={{ marginRight: 3 }} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([['withdraw', 'Withdraw'], ['bank', 'Bank Details']] as const).map(([k, l]) => (
          <TouchableOpacity key={k} style={styles.tab} onPress={() => setTab(k)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>{l}</Text>
            {tab === k && <View style={styles.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#FE5300" style={{ marginTop: 40 }} />
      ) : !info ? (
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Ionicons name="cloud-offline-outline" size={32} color="#94a3b8" />
          <Text style={[styles.emptyTitle, { marginTop: 8 }]}>Could not load. Pull to retry.</Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE5300']} />}
        >
          {tab === 'withdraw' ? withdrawTab : bankTab}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 12 : 44, paddingBottom: 10, backgroundColor: '#ffffff' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  helpBtn: { flexDirection: 'row', alignItems: 'center' },
  helpText: { fontSize: 14, fontWeight: '700', color: '#FE5300' },
  tabs: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 12 },
  tabText: { fontSize: 14.5, fontWeight: '700', color: '#64748b' },
  tabTextOn: { color: '#FE5300' },
  tabLine: { position: 'absolute', bottom: 0, left: '22%', right: '22%', height: 3, borderRadius: 2, backgroundColor: '#FE5300' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  muted: { fontSize: 12.5, color: '#64748b' },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  // Balance
  balanceCard: { backgroundColor: '#fff4ec', borderRadius: 20, padding: 16, overflow: 'hidden' },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletBubble: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffe4d1', alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 13.5, fontWeight: '600', color: '#64748b' },
  balanceValue: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginTop: 2, letterSpacing: -0.5 },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fee2e2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  alertChipText: { fontSize: 12, color: '#b91c1c', fontWeight: '600', flexShrink: 1 },
  pendingNote: { fontSize: 11.5, color: '#9a3412', marginTop: 6, fontWeight: '600' },
  illustration: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center' },
  illoWallet: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ffd9bf', alignItems: 'center', justifyContent: 'center' },
  illoCoin: { position: 'absolute', right: -2, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: '#fbbf24', borderWidth: 2, borderColor: '#fde68a', alignItems: 'center', justifyContent: 'center' },
  illoCoinText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },
  // Bank
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bankLogo: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  bankLogoText: { color: '#ffffff', fontWeight: '900', fontSize: 13, letterSpacing: 0.3 },
  bankName: { fontSize: 15, fontWeight: '800', color: '#0f172a', flexShrink: 1 },
  bankNumber: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 3, letterSpacing: 1 },
  bankHolder: { fontSize: 11.5, color: '#64748b', marginTop: 2, fontWeight: '600' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  editText: { color: '#2563eb', fontWeight: '800', fontSize: 13 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '800' },
  // Amount
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sectionMeta: { fontSize: 12.5, color: '#64748b', fontWeight: '600' },
  presetRow: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', alignItems: 'center' },
  presetOn: { borderColor: '#FE5300', backgroundColor: '#fff7ed', borderWidth: 1.5 },
  presetText: { fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  presetTextOn: { color: '#FE5300' },
  amountBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden' },
  rupeeBox: { width: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  rupee: { fontSize: 16, fontWeight: '800', color: '#64748b' },
  amountInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 13, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  allText: { color: '#FE5300', fontWeight: '800', fontSize: 13 },
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  infoText: { fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 17 },
  withdrawBtn: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FE5300', borderRadius: 14, paddingVertical: 15 },
  withdrawBtnOff: { backgroundColor: '#94a3b8' },
  withdrawText: { color: '#ffffff', fontSize: 15.5, fontWeight: '800' },
  // Trust strip
  trust: { flexDirection: 'row', backgroundColor: '#f0fdf4', borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#dcfce7' },
  trustItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  trustTitle: { fontSize: 11.5, fontWeight: '800', color: '#0f172a' },
  trustSub: { fontSize: 10.5, color: '#64748b', marginTop: 1 },
  // History
  historyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  filterText: { fontSize: 12.5, fontWeight: '700', color: '#0f172a' },
  filterMenu: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  filterOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterOptionText: { fontSize: 13.5, color: '#334155', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 18 },
  emptyBubble: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#fff4ec', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyCoin: { position: 'absolute', right: 18, bottom: 18, width: 30, height: 30, borderRadius: 15, backgroundColor: '#64748b', borderWidth: 2, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  emptyCoinText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', marginTop: 6, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },
  histCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  idRow: { flexDirection: 'row', alignItems: 'center' },
  settlementId: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  histAmount: { fontSize: 22, fontWeight: '800', color: '#FE5300' },
  date: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  bankRowSmall: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginBottom: 8 },
  bankText: { fontSize: 12, color: '#64748b', flexShrink: 1 },
  hint: { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 6 },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  cancelText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 12 },
  detailKey: { fontSize: 13, color: '#64748b' },
  detailVal: { fontSize: 13.5, fontWeight: '700', color: '#0f172a', flexShrink: 1, textAlign: 'right' },
});
