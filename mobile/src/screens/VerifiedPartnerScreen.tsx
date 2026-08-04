import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';

export const VerifiedPartnerScreen = () => {
  const profile = useAuthStore((state) => state.profile);
  const navigation = useNavigation<any>();

  const checklistItems = [
    { title: 'Identity Proof', subtitle: 'Aadhaar Card', status: 'Verified', screen: 'PersonalDetails' },
    { title: 'Vehicle Details', subtitle: 'Vehicle RC Verified', status: 'Verified', screen: 'VehicleSettings' },
    { title: 'Driving License', subtitle: 'DL Verified', status: 'Verified', screen: 'PersonalDetails' },
    { title: 'Insurance', subtitle: 'Valid till 18 May 2026', status: 'Verified', screen: 'FleetRegistry' },
    { title: 'PUC Certificate', subtitle: 'Valid till 18 May 2026', status: 'Verified', screen: 'FleetRegistry' },
    { title: 'Bank Account', subtitle: 'Account Verified', status: 'Verified', screen: 'PayoutHistory' },
    { title: 'Profile Photo', subtitle: 'Profile photo verified', status: 'Verified', screen: 'ProfilePhoto' },
    { title: 'Background Check', subtitle: 'Completed', status: 'Verified', screen: 'BackgroundCheck' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verified Partner</Text>
        <TouchableOpacity 
          style={styles.helpBtn}
          onPress={() => navigation.navigate('TripSupport')}
        >
          <Ionicons name="notifications-outline" size={16} color="#0f172a" style={{ marginRight: 4 }} />
          <Text style={styles.helpText}>Need Help?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Status Banner Card */}
        <View style={styles.heroBanner}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={styles.shieldBox}>
              <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
            </View>
            <Text style={styles.heroBannerTitle}>You are a Verified Partner</Text>
            <Text style={styles.heroBannerSub}>
              Thank you for completing the verification process. All systems are good to go!
            </Text>
            <View style={styles.verifiedPill}>
              <Text style={styles.verifiedPillText}>Verified on 18 May 2025</Text>
            </View>
          </View>

          <View style={styles.illustrationCircle}>
            <Ionicons name="checkmark-circle" size={32} color="#16a34a" />
          </View>
        </View>

        {/* 3 Metric Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="shield-checkmark" size={14} color="#16a34a" />
            </View>
            <Text style={styles.metricCardLabel}>Verification Status</Text>
            <Text style={[styles.metricCardVal, { color: '#16a34a' }]}>Verified</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="calendar" size={14} color="#0284c7" />
            </View>
            <Text style={styles.metricCardLabel}>Verified On</Text>
            <Text style={styles.metricCardVal}>18 May 2025</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="sync" size={14} color="#7c3aed" />
            </View>
            <Text style={styles.metricCardLabel}>Next Review On</Text>
            <Text style={styles.metricCardVal}>18 May 2026</Text>
          </View>
        </View>

        {/* Verification Checklist */}
        <Text style={styles.sectionHeader}>Verification Checklist</Text>
        <View style={styles.checklistCard}>
          {checklistItems.map((item, idx) => (
            <TouchableOpacity 
              key={idx}
              style={[styles.checkRow, idx < checklistItems.length - 1 && styles.checkRowBorder]}
              onPress={() => navigation.navigate(item.screen as any)}
              activeOpacity={0.8}
            >
              <View style={styles.checkIconBox}>
                <Ionicons name="person-outline" size={18} color="#16a34a" />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.checkTitle}>{item.title}</Text>
                <Text style={styles.checkSub}>{item.subtitle}</Text>
              </View>

              <View style={styles.verifiedBadgeRow}>
                <Text style={styles.verifiedGreenText}>Verified</Text>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" style={{ marginHorizontal: 4 }} />
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Why Verification Matters Card */}
        <View style={styles.whyCard}>
          <View style={styles.whyHeaderRow}>
            <View style={styles.whyBadgeBox}>
              <Ionicons name="ribbon-outline" size={20} color="#16a34a" />
            </View>
            <Text style={styles.whyTitle}>Why Verification Matters?</Text>
          </View>

          <View style={styles.whyList}>
            <View style={styles.whyRow}>
              <Ionicons name="checkmark" size={14} color="#16a34a" style={{ marginRight: 8 }} />
              <Text style={styles.whyText}>Builds trust with customers</Text>
            </View>
            <View style={styles.whyRow}>
              <Ionicons name="checkmark" size={14} color="#16a34a" style={{ marginRight: 8 }} />
              <Text style={styles.whyText}>Access to more rides and features</Text>
            </View>
            <View style={styles.whyRow}>
              <Ionicons name="checkmark" size={14} color="#16a34a" style={{ marginRight: 8 }} />
              <Text style={styles.whyText}>Higher earnings and priority support</Text>
            </View>
          </View>
        </View>

        {/* Download Certificate Action */}
        <TouchableOpacity 
          style={styles.downloadBtn}
          onPress={() => Alert.alert("Verification Certificate", "Verification Certificate downloaded successfully to your device!")}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
          <Text style={styles.downloadBtnText}>Download Verification Certificate</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
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
  helpBtn: { flexDirection: 'row', alignItems: 'center' },
  helpText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  heroBanner: {
    backgroundColor: '#f4fbf7',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginBottom: 16,
  },
  shieldBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  heroBannerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  heroBannerSub: { fontSize: 12, color: '#475569', lineHeight: 16, marginBottom: 8 },
  verifiedPill: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  verifiedPillText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  illustrationCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metricCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 10, marginHorizontal: 3, borderWidth: 1, borderColor: '#f1f5f9' },
  metricIconBox: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  metricCardLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  metricCardVal: { fontSize: 11, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10, marginLeft: 4 },
  checklistCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden', marginBottom: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  checkRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  checkIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  checkTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  checkSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  verifiedBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  verifiedGreenText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  whyCard: { backgroundColor: '#f4fbf7', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#dcfce7', marginBottom: 20 },
  whyHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  whyBadgeBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  whyTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  whyList: { marginTop: 4 },
  whyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  whyText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  downloadBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#16a34a', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  downloadBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '800' },
});
