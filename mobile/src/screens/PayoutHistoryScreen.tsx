import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Platform, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getPayouts, requestWithdrawal, cancelWithdrawal, type PayoutsData, type PayoutItem, type PayoutStatus } from '../api/partnerWallet.api';

// Payout & Bank Details: withdraw wallet money to the bank account on file.
// MBConnect transfers it manually; the driver is notified at each step.

const inr = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
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

  const header = info ? (
    <View style={{ gap: 12, marginBottom: 12 }}>
      {/* Withdraw */}
      <View style={styles.withdrawCard}>
        <Text style={styles.wLabel}>Available to withdraw</Text>
        <Text style={styles.wValue}>{inr(info.available)}</Text>
        {info.pending > 0 && <Text style={styles.wSub}>{inr(info.pending)} pending earnings will be added after MBConnect releases them.</Text>}

        {!bank ? (
          <TouchableOpacity style={styles.bankWarn} onPress={() => navigation.navigate('BankDetails')}>
            <Ionicons name="alert-circle" size={16} color="#b45309" />
            <Text style={styles.bankWarnText}>Add your bank account to withdraw.</Text>
            <Ionicons name="chevron-forward" size={14} color="#b45309" />
          </TouchableOpacity>
        ) : (
          <View style={styles.bankLine}>
            <Ionicons name="business-outline" size={15} color="#cbd5e1" />
            <Text style={styles.bankLineText} numberOfLines={1}>
              {bank.bankName} {bank.accountEnding} · {bank.accountHolderName}
            </Text>
            {bank.status === 'Rejected' && <Text style={styles.bankRejected}>Rejected</Text>}
          </View>
        )}

        {info.hasOpenRequest ? (
          <Text style={styles.wNote}>You have a withdrawal in progress. You can request again once it's paid or cancelled.</Text>
        ) : bankUsable ? (
          <>
            <TextInput
              style={styles.wInput}
              placeholder={`Amount (min ${inr(info.minWithdrawal)})`}
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              inputMode="numeric"
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/\D/g, '').slice(0, 7))}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.wAll} onPress={() => setAmount(String(Math.floor(info.available)))}>
                <Text style={styles.wAllText}>Withdraw all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wBtn, (busy || info.available < info.minWithdrawal) && { opacity: 0.5 }]} disabled={busy || info.available < info.minWithdrawal} onPress={withdraw}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.wBtnText}>Withdraw to bank</Text>}
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>

      <Text style={styles.section}>WITHDRAWAL HISTORY</Text>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout & Bank Details</Text>
        <TouchableOpacity 
          style={styles.helpBtn}
          onPress={() => navigation.navigate('TripSupport')}
        >
          <Ionicons name="help-circle-outline" size={16} color="#0f172a" style={{ marginRight: 2 }} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Payouts</Text>
              <Text style={styles.subtitle}>Withdraw your wallet money to your bank account.</Text>
            </View>
            <TouchableOpacity style={styles.updateBankBtn} onPress={() => navigation.navigate('BankDetails')}>
              <Text style={styles.updateBankText}>Update Bank Info</Text>
            </TouchableOpacity>
          </View>
        </View>

      {loading ? (
        <ActivityIndicator color="#FE5300" style={{ marginTop: 40 }} />
      ) : (
      <FlatList
        data={info?.items || []}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingTop: 4, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 30 }}>
            <Ionicons name="receipt-outline" size={32} color="#94a3b8" style={{ marginBottom: 10 }} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155' }}>{info ? 'No withdrawals yet' : 'Could not load. Pull to retry.'}</Text>
            {!!info && (
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
                Your bank transfers will appear here.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const st = STATUS[item.status];
          return (
            <View style={styles.card}>
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
                <Text style={styles.amount}>{inr(item.amount)}</Text>
                <Text style={styles.date}>{fmt(item.paidAt || item.cancelledAt || item.createdAt)}</Text>
              </View>

              <View style={styles.bankRow}>
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
        }}
      />
      )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 44,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  helpBtn: { flexDirection: 'row', alignItems: 'center' },
  helpText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b' },
  updateBankBtn: { backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 4 },
  updateBankText: { color: '#0284c7', fontSize: 11, fontWeight: '800' },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  idRow: { flexDirection: 'row', alignItems: 'center' },
  settlementId: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  statusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  amount: { fontSize: 22, fontWeight: '800', color: '#FE5300' },
  date: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  bankRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginBottom: 10 },
  bankText: { fontSize: 12, color: '#64748b' },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff7ed', borderRadius: 10, paddingVertical: 8 },
  receiptText: { fontSize: 12, fontWeight: '700', color: '#FE5300' },
  section: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginLeft: 4, marginTop: 6 },
  withdrawCard: { backgroundColor: '#0f172a', borderRadius: 22, padding: 18, gap: 10 },
  wLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  wValue: { fontSize: 30, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5, marginTop: -6 },
  wSub: { fontSize: 11.5, color: '#94a3b8', lineHeight: 16 },
  wNote: { fontSize: 12.5, color: '#fde68a', lineHeight: 18, fontWeight: '600' },
  bankLine: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 10 },
  bankLineText: { flex: 1, fontSize: 12.5, color: '#e2e8f0', fontWeight: '600' },
  bankRejected: { fontSize: 11, fontWeight: '800', color: '#fca5a5' },
  bankWarn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', borderRadius: 12, padding: 10 },
  bankWarnText: { flex: 1, fontSize: 12.5, color: '#92400e', fontWeight: '700' },
  wInput: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  wAll: { paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  wAllText: { color: '#e2e8f0', fontSize: 13, fontWeight: '700' },
  wBtn: { flex: 1, backgroundColor: '#FE5300', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  wBtnText: { color: '#ffffff', fontSize: 14.5, fontWeight: '800' },
  hint: { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 6 },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  cancelText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
});
