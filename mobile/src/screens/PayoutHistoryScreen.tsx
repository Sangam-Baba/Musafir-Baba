import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';

type PayoutRecord = {
  id: string;
  settlementId: string;
  amount: number;
  date: string;
  bankName: string;
  accountEnding: string;
  status: 'Completed' | 'Processing';
  utrNumber: string;
};

const MOCK_SETTLEMENTS: PayoutRecord[] = [
  { id: 's1', settlementId: 'SET-9901', amount: 12850, date: '28 Jul 2026', bankName: 'HDFC Bank', accountEnding: '4321', status: 'Completed', utrNumber: 'UTR-982104928172' },
  { id: 's2', settlementId: 'SET-9900', amount: 9400, date: '21 Jul 2026', bankName: 'HDFC Bank', accountEnding: '4321', status: 'Completed', utrNumber: 'UTR-982101189230' },
  { id: 's3', settlementId: 'SET-9899', amount: 14200, date: '14 Jul 2026', bankName: 'HDFC Bank', accountEnding: '4321', status: 'Completed', utrNumber: 'UTR-982098877123' },
  { id: 's4', settlementId: 'SET-9898', amount: 11600, date: '07 Jul 2026', bankName: 'HDFC Bank', accountEnding: '4321', status: 'Completed', utrNumber: 'UTR-982091122334' },
];

export const PayoutHistoryScreen = () => {
  const [records] = useState<PayoutRecord[]>(MOCK_SETTLEMENTS);

  const downloadReceipt = (record: PayoutRecord) => {
    Alert.alert("Receipt Downloaded", `Settlement receipt for ${record.settlementId} saved to downloads.`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payout Settlement History</Text>
        <Text style={styles.subtitle}>Bank transfers, UTR reference numbers & tax invoices.</Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.idRow}>
                <Ionicons name="receipt-outline" size={16} color="#FE5300" style={{ marginRight: 6 }} />
                <Text style={styles.settlementId}>{item.settlementId}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.amount}>₹{item.amount.toLocaleString('en-IN')}.00</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>

            <View style={styles.bankRow}>
              <Ionicons name="business-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
              <Text style={styles.bankText}>{item.bankName} (••{item.accountEnding}) • {item.utrNumber}</Text>
            </View>

            <TouchableOpacity style={styles.receiptBtn} onPress={() => downloadReceipt(item)} activeOpacity={0.8}>
              <Ionicons name="download-outline" size={14} color="#FE5300" style={{ marginRight: 4 }} />
              <Text style={styles.receiptText}>Download Receipt PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b' },
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
});
