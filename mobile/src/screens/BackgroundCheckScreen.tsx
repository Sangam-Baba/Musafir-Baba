import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';

export const BackgroundCheckScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Background Check Audit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Header Info */}
        <View style={styles.header}>
          <Text style={styles.title}>Background Check Audit</Text>
          <Text style={styles.subtitle}>Verification steps for driver safety & police clearance.</Text>
        </View>

      {/* Hero Status Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.shieldIconBox}>
            <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Police & Safety Verification</Text>
            <Text style={styles.heroSub}>Status: Under Government Audit</Text>
          </View>
          <View style={styles.badgeAmber}>
            <Text style={styles.badgeAmberText}>In Progress</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Verification Audit Progress</Text>
            <Text style={styles.progressPercent}>75%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: '75%' }]} />
          </View>
        </View>
      </View>

      {/* Audit Steps Timeline */}
      <Text style={styles.sectionTitle}>VERIFICATION TIMELINE & STEPS</Text>
      <View style={styles.timelineCard}>
        {/* Step 1 */}
        <View style={styles.stepRow}>
          <View style={[styles.stepIconCircle, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="checkmark" size={16} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>1. Identity & Government ID Check</Text>
            <Text style={styles.stepSub}>Aadhaar & PAN details verified automatically via UIDAI.</Text>
          </View>
          <Text style={styles.stepDate}>Passed</Text>
        </View>

        <View style={styles.line} />

        {/* Step 2 */}
        <View style={styles.stepRow}>
          <View style={[styles.stepIconCircle, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="checkmark" size={16} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>2. Driving Licence Verification</Text>
            <Text style={styles.stepSub}>DL transport category verified with RTO database.</Text>
          </View>
          <Text style={styles.stepDate}>Passed</Text>
        </View>

        <View style={styles.line} />

        {/* Step 3 */}
        <View style={styles.stepRow}>
          <View style={[styles.stepIconCircle, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="time" size={16} color="#b45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>3. Police Verification Certificate</Text>
            <Text style={styles.stepSub}>Character certificate submitted. Pending police station approval.</Text>
          </View>
          <Text style={[styles.stepDate, { color: '#b45309' }]}>In Review</Text>
        </View>

        <View style={styles.line} />

        {/* Step 4 */}
        <View style={styles.stepRow}>
          <View style={[styles.stepIconCircle, { backgroundColor: '#f1f5f9' }]}>
            <Ionicons name="ellipse-outline" size={16} color="#94a3b8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>4. Vehicle Safety & Fitness Audit</Text>
            <Text style={styles.stepSub}>On-site vehicle inspection by MB Connect partner executive.</Text>
          </View>
          <Text style={[styles.stepDate, { color: '#94a3b8' }]}>Pending</Text>
        </View>
      </View>

      {/* Action Footer */}
      <Button title="Upload Police Clearance Certificate" onPress={() => Alert.alert("Upload Document", "Please select your Police Character Certificate PDF or Image.")} style={{ marginTop: 20 }} />
      <Button title="Back to Dashboard" type="outline" onPress={() => navigation.goBack()} style={{ marginTop: 10 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b' },
  heroCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  shieldIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  heroTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  heroSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badgeAmber: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeAmberText: { fontSize: 11, fontWeight: '800', color: '#b45309' },
  progressSection: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  progressPercent: { fontSize: 12, fontWeight: '800', color: '#FE5300' },
  track: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#FE5300', borderRadius: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 },
  timelineCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#f1f5f9' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  stepSub: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 16 },
  stepDate: { fontSize: 11, fontWeight: '800', color: '#16a34a', marginLeft: 8 },
  line: { width: 2, height: 20, backgroundColor: '#e2e8f0', marginLeft: 15, marginVertical: 4 },
});
