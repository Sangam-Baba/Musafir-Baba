import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export const EarningsTrendScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Earnings Trend Analytics</Text>
        <Text style={styles.subtitle}>Peak demand hours, top performing routes & revenue analysis.</Text>
      </View>

      {/* Route and surge analytics require trip-route aggregation that
          isn't built on the backend yet -- showing an honest placeholder
          instead of fabricated routes/revenue until that exists. */}
      <View style={styles.card}>
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Ionicons name="analytics-outline" size={32} color="#94a3b8" style={{ marginBottom: 10 }} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155' }}>Analytics coming soon</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'center', paddingHorizontal: 24 }}>
            Route and peak-hour insights aren't available yet. Check back later.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8, padding: 4, marginLeft: -4 },
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
