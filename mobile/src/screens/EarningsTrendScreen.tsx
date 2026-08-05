import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const EarningsTrendScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Earnings Trend Analytics</Text>
        <Text style={styles.subtitle}>Peak demand hours, top performing routes & revenue analysis.</Text>
      </View>

      {/* Top Performing Routes Card */}
      <Text style={styles.sectionTitle}>TOP PERFORMING ROUTES</Text>
      <View style={styles.card}>
        {[
          { route: "Delhi T3 Airport → Noida Sec 62", rides: 28, revenue: "₹42,500" },
          { route: "Gurugram Cyber Hub → Delhi Airport", rides: 22, revenue: "₹31,200" },
          { route: "Delhi → Agra Outstation", rides: 8, revenue: "₹28,400" },
        ].map((item, idx) => (
          <View key={idx} style={styles.routeRow}>
            <View style={styles.iconBox}>
              <Ionicons name="navigate" size={16} color="#FE5300" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeName}>{item.route}</Text>
              <Text style={styles.routeSub}>{item.rides} Trips Completed</Text>
            </View>
            <Text style={styles.revenue}>{item.revenue}</Text>
          </View>
        ))}
      </View>

      {/* Peak Hours Surge Insights */}
      <Text style={styles.sectionTitle}>PEAK HOURLY SURGE INSIGHTS</Text>
      <View style={styles.card}>
        <View style={styles.insightRow}>
          <Ionicons name="flame" size={20} color="#dc2626" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Morning Airport Peak (06:00 AM - 09:30 AM)</Text>
            <Text style={styles.insightSub}>High demand from Delhi T3 & Aerocity hotels. Average 1.5x surge fares.</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.insightRow}>
          <Ionicons name="time" size={20} color="#FE5300" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Evening Outstation Peak (05:00 PM - 08:30 PM)</Text>
            <Text style={styles.insightSub}>High demand for Agra, Jaipur, and Chandigarh one-way outstation trips.</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b' },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  routeName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  routeSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  revenue: { fontSize: 14, fontWeight: '800', color: '#FE5300' },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  insightTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  insightSub: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 17 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
});
