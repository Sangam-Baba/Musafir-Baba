import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

type PayoutItem = {
  id: string;
  amount: number;
  date: string;
  status: 'Completed' | 'Processing';
  bankName: string;
  accountEnding: string;
  referenceId: string;
};

const MOCK_PAYOUTS: PayoutItem[] = [
  {
    id: 'p1',
    amount: 12850,
    date: '28 Jul 2026',
    status: 'Completed',
    bankName: 'HDFC Bank',
    accountEnding: '4321',
    referenceId: 'UPI/628104928172',
  },
  {
    id: 'p2',
    amount: 9400,
    date: '21 Jul 2026',
    status: 'Completed',
    bankName: 'HDFC Bank',
    accountEnding: '4321',
    referenceId: 'UPI/628101189230',
  },
  {
    id: 'p3',
    amount: 14200,
    date: '14 Jul 2026',
    status: 'Completed',
    bankName: 'HDFC Bank',
    accountEnding: '4321',
    referenceId: 'UPI/628098877123',
  },
];

const WEEKLY_DATA = [
  { day: 'Mon', amount: 2400, height: 60 },
  { day: 'Tue', amount: 3100, height: 80 },
  { day: 'Wed', amount: 1800, height: 45 },
  { day: 'Thu', amount: 4200, height: 100 },
  { day: 'Fri', amount: 3500, height: 85 },
  { day: 'Sat', amount: 5100, height: 115 },
  { day: 'Sun', amount: 2840, height: 70 },
];

export const EarningsScreen = () => {
  const [timeframe, setTimeframe] = useState<'Week' | 'Month' | 'Year'>('Week');
  const navigation = useNavigation<any>();
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState<any>(null);

  const fetchEarnings = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/earnings?timeframe=${timeframe}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setEarnings(result.data);
      } else {
        setEarnings(null);
      }
    } catch (e) {
      console.error("Error fetching earnings data:", e);
      setEarnings(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [timeframe]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings(false);
  };

  const chartData = (earnings?.chartData || WEEKLY_DATA).map((item: any) => ({
    day: item.day,
    amount: item.amount,
    height: item.height || Math.min(115, Math.max(10, (item.amount / 50)))
  }));

  const recentPayouts = earnings?.recentPayouts || MOCK_PAYOUTS;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE5300']} />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#FE5300" />

      {/* Top Banner */}
      <View style={styles.header}>
        <Text style={styles.title}>Earnings & Payouts</Text>
        <Text style={styles.subtitle}>Track net earnings, trip fare breakdown & settlements.</Text>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {(['Week', 'Month', 'Year'] as const).map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[styles.tfTab, timeframe === tf && styles.tfTabActive]}
              onPress={() => setTimeframe(tf)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tfText, timeframe === tf && styles.tfTextActive]}>{tf}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hero Earnings Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroSub}>TOTAL NET EARNINGS ({timeframe.toUpperCase()})</Text>
            <Text style={styles.heroAmount}>₹{(earnings?.totalNetEarnings || 22940.00).toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity 
            style={styles.growthBadge}
            onPress={() => navigation.navigate('Menu', { screen: 'EarningsTrend' })}
          >
            <Ionicons name="trending-up" size={14} color="#16a34a" style={{ marginRight: 2 }} />
            <Text style={styles.growthText}>View Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Bar Chart Visual */}
        <View style={styles.chartSection}>
          <View style={styles.chartBarsRow}>
            {chartData.map((item: any) => (
              <View key={item.day} style={styles.barCol}>
                <Text style={styles.barVal}>₹{(item.amount / 1000).toFixed(1)}k</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: item.height }]} />
                </View>
                <Text style={styles.barDay}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Fare Breakdown Grid */}
      <Text style={styles.sectionHeader}>EARNINGS BREAKDOWN</Text>
      <View style={styles.breakdownCard}>
        <View style={styles.bdRow}>
          <View style={styles.bdIconBox}>
            <Ionicons name="car-outline" size={18} color="#FE5300" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bdTitle}>Trip Fares</Text>
            <Text style={styles.bdSub}>Gross fare from completed rides</Text>
          </View>
          <Text style={styles.bdAmount}>₹{(earnings?.grossTripFare || 19250.00).toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.bdDivider} />

        <View style={styles.bdRow}>
          <View style={[styles.bdIconBox, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="gift-outline" size={18} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bdTitle}>Bonuses & Incentives</Text>
            <Text style={styles.bdSub}>Peak hours & fleet milestone rewards</Text>
          </View>
          <Text style={[styles.bdAmount, { color: '#16a34a' }]}>+₹{(earnings?.taxes || 4200.00).toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.bdDivider} />

        <View style={styles.bdRow}>
          <View style={[styles.bdIconBox, { backgroundColor: '#fef2f2' }]}>
            <Ionicons name="wallet-outline" size={18} color="#dc2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bdTitle}>Platform & Commission</Text>
            <Text style={styles.bdSub}>Platform service fee deduction</Text>
          </View>
          <Text style={[styles.bdAmount, { color: '#dc2626' }]}>-₹{(earnings?.platformCommission || 510.00).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Recent Payouts */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.sectionHeader}>RECENT BANK SETTLEMENTS</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Menu', { screen: 'PayoutHistory' })}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FE5300', marginBottom: 12 }}>View History →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.payoutsCard}>
        {recentPayouts.map((payout: any, index: number) => (
          <View key={payout.id}>
            {index > 0 && <View style={styles.payoutDivider} />}
            <View style={styles.payoutRow}>
              <View style={styles.payoutBankIcon}>
                <Ionicons name="business-outline" size={20} color="#0284c7" />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.payoutTitleRow}>
                  <Text style={styles.payoutBank}>{payout.bankName} (••{payout.accountEnding})</Text>
                  <View style={styles.payoutBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#16a34a" style={{ marginRight: 3 }} />
                    <Text style={styles.payoutBadgeText}>{payout.status}</Text>
                  </View>
                </View>
                <Text style={styles.payoutDate}>{payout.date} • {payout.referenceId}</Text>
              </View>

              <Text style={styles.payoutAmount}>₹{payout.amount.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
  },
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  tfTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tfTabActive: {
    backgroundColor: '#FE5300',
  },
  tfText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tfTextActive: {
    color: '#ffffff',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16a34a',
  },
  chartSection: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 20,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barVal: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#FE5300',
    borderRadius: 7,
  },
  barDay: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 6,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  breakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bdIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bdTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  bdSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  bdAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  bdDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  payoutsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payoutBankIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payoutBank: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  payoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  payoutBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
  },
  payoutDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  payoutAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 8,
  },
  payoutDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
});
