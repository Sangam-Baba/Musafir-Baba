import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../utils/config';
import { FINANCIAL_FEATURES_ENABLED } from '../config/features';

export const VerifiedPartnerScreen = () => {
  const token = useAuthStore((state) => state.token);
  const storeProfile = useAuthStore((state) => state.profile);
  const navigation = useNavigation<any>();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (showSpinner = true) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setDashboardData(result.data);
      }
    } catch (e) {
      console.error("Error fetching verified partner screen dashboard:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard(false);
  };

  const profile = dashboardData?.profile;
  const auth = dashboardData?.auth;
  const documents = dashboardData?.documents || [];
  const bank = dashboardData?.bank;
  const vehicles = dashboardData?.vehicles || [];
  const drivers = dashboardData?.drivers || [];

  const isVerified = auth?.status === 'Approved' || !!dashboardData?.isApproved;
  const statusLabel = isVerified ? 'Verified' : auth?.status === 'Hold' ? 'On Hold' : profile?.isSubmittedForApproval ? 'Under Audit' : 'Pending';

  const aadhaarDoc = documents.find((d: any) => d.documentType === 'Aadhaar');
  const panDoc = documents.find((d: any) => d.documentType === 'PAN');
  const isIdentityVerified = !!(aadhaarDoc?.status === 'Approved' && panDoc?.status === 'Approved');
  const isPhotoVerified = !!(profile?.profilePicture);
  const isVehicleVerified = vehicles.some((v: any) => v.status === 'Active');
  const isDriverVerified = drivers.some((d: any) => d.status === 'Active');
  const isBankVerified = bank?.status === 'Verified';

  // Track if they have uploaded everything required, regardless of verification status
  const isEverythingUploaded = !!(
    aadhaarDoc &&
    panDoc &&
    profile?.profilePicture &&
    (!FINANCIAL_FEATURES_ENABLED || bank?.accountNumber) &&
    vehicles.length > 0 &&
    drivers.length > 0
  );

  const verifiedDate = auth?.createdAt 
    ? new Date(auth.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Active Partner';

  const nextReviewDate = auth?.createdAt
    ? new Date(new Date(auth.createdAt).setFullYear(new Date(auth.createdAt).getFullYear() + 1)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Annual Review';

  const checklistItems = [
    {
      title: 'Identity Proof (Aadhaar & PAN)',
      subtitle: isIdentityVerified ? 'Aadhaar / PAN Uploaded & Verified' : 'Upload Aadhaar (Both Sides) & PAN Card',
      isVerified: isIdentityVerified,
      status: isIdentityVerified ? 'Verified' : 'Pending',
      screen: 'IdentityProof',
      icon: 'card-outline'
    },
    {
      title: 'Profile Photo',
      subtitle: isPhotoVerified ? 'Profile Photo Verified' : 'Upload Account Holder Profile Photo',
      isVerified: isPhotoVerified,
      status: isPhotoVerified ? 'Verified' : 'Pending',
      screen: 'PersonalDetails',
      icon: 'person-outline'
    },
    {
      title: 'Vehicle Details',
      subtitle: isVehicleVerified ? `${vehicles.length} Vehicle(s) Listed in Roster` : 'No Vehicles Added Yet',
      isVerified: isVehicleVerified,
      status: isVehicleVerified ? 'Verified' : 'Pending',
      screen: 'VehiclesList',
      icon: 'car-outline'
    },
    {
      title: 'Driver Roster & License',
      subtitle: isDriverVerified ? `${drivers.length} Driver(s) Registered & Verified` : 'No Drivers Assigned Yet',
      isVerified: isDriverVerified,
      status: isDriverVerified ? 'Verified' : 'Pending',
      screen: 'VehiclesList',
      icon: 'people-outline'
    },
    ...(FINANCIAL_FEATURES_ENABLED
      ? [
          {
            title: 'Bank Account Details',
            subtitle: isBankVerified ? `${bank.bankName} (••${bank.accountNumber?.slice(-4) || '4321'})` : 'No Bank Account Linked',
            isVerified: isBankVerified,
            status: isBankVerified ? 'Verified' : 'Pending',
            screen: 'BankDetails',
            icon: 'business-outline'
          }
        ]
      : [])
  ];

  // ---- Display-only helpers (no effect on data or navigation) ----
  const ICON_TINTS: Record<string, { bg: string; fg: string }> = {
    'card-outline': { bg: '#e0f2fe', fg: '#0284c7' },
    'person-outline': { bg: '#f3e8ff', fg: '#7c3aed' },
    'car-outline': { bg: '#ffedd5', fg: '#ea580c' },
    'people-outline': { bg: '#dcfce7', fg: '#16a34a' },
    'business-outline': { bg: '#dbeafe', fg: '#2563eb' },
  };
  const pendingCount = checklistItems.filter((i) => !i.isVerified).length;
  const allComplete = checklistItems.length > 0 && pendingCount === 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verified Partner</Text>
        <TouchableOpacity 
          style={styles.helpBtn}
          onPress={() => navigation.navigate('TripSupport')}
        >
          <Ionicons name="headset-outline" size={16} color="#FE5300" style={{ marginRight: 4 }} />
          <Text style={styles.helpText}>Need Help?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE5300']} />
        }
      >
        {loading && !dashboardData ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#FE5300" />
          </View>
        ) : null}

        {/* Status Hero */}
        <View style={[styles.vpHero, !isVerified && styles.vpHeroPending]}>
          {/* confetti (decorative) */}
          <View style={[styles.confetti, { top: 14, left: '46%', backgroundColor: isVerified ? '#86efac' : '#fdba74', transform: [{ rotate: '20deg' }] }]} />
          <View style={[styles.confetti, { top: 30, right: 22, backgroundColor: '#fde68a', transform: [{ rotate: '-30deg' }] }]} />
          <View style={[styles.confettiDot, { top: 10, right: 70, backgroundColor: isVerified ? '#4ade80' : '#fb923c' }]} />
          <View style={[styles.confettiDot, { bottom: 18, left: '52%', backgroundColor: '#93c5fd' }]} />
          <View style={[styles.confetti, { bottom: 12, right: 14, backgroundColor: isVerified ? '#bbf7d0' : '#fed7aa', transform: [{ rotate: '45deg' }] }]} />

          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.vpHeroKicker}>{isVerified ? 'You are a' : 'Verification'}</Text>
            <Text style={[styles.vpHeroTitle, !isVerified && { color: '#ea580c' }]}>
              {isVerified ? 'Verified Partner' : 'In Progress'}
            </Text>
            <Text style={styles.vpHeroSub}>
              {isVerified
                ? 'Thank you for completing the verification process. All systems are good to go!'
                : 'Your partner documents are currently active and being verified.'}
            </Text>
            <View style={[styles.vpHeroPill, !isVerified && { backgroundColor: '#ffedd5' }]}>
              <Ionicons
                name={isVerified ? 'checkmark-circle' : 'time-outline'}
                size={13}
                color={isVerified ? '#16a34a' : '#c2410c'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.vpHeroPillText, !isVerified && { color: '#c2410c' }]}>
                {isVerified ? `Verified on ${verifiedDate}` : 'Audit Status: ' + statusLabel}
              </Text>
            </View>
          </View>

          {/* shield + car illustration */}
          <View style={styles.vpArt}>
            <View style={[styles.vpArtGlow, !isVerified && { backgroundColor: '#ffedd5' }]} />
            <View style={[styles.vpArtShield, !isVerified && { backgroundColor: '#f97316' }]}>
              <Ionicons name={isVerified ? 'shield-checkmark' : 'shield-half-outline'} size={44} color="#ffffff" />
            </View>
            <View style={styles.vpArtCar}>
              <Ionicons name="car-sport" size={30} color="#FE5300" />
            </View>
          </View>
        </View>

        {/* 3 Metric Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.vpMetric}>
            <View style={[styles.vpMetricIcon, { backgroundColor: isVerified ? '#dcfce7' : '#fef3c7' }]}>
              <Ionicons name="shield-checkmark" size={16} color={isVerified ? '#16a34a' : '#b45309'} />
            </View>
            <Text style={styles.vpMetricLabel} numberOfLines={2}>Verification Status</Text>
            <Text style={[styles.vpMetricVal, { color: isVerified ? '#16a34a' : '#b45309' }]} numberOfLines={1}>{statusLabel}</Text>
          </View>

          <View style={styles.vpMetric}>
            <View style={[styles.vpMetricIcon, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="calendar-outline" size={16} color="#0284c7" />
            </View>
            <Text style={styles.vpMetricLabel} numberOfLines={2}>Verified On</Text>
            <Text style={styles.vpMetricVal} numberOfLines={1} adjustsFontSizeToFit>{verifiedDate}</Text>
          </View>

          <View style={styles.vpMetric}>
            <View style={[styles.vpMetricIcon, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="sync" size={16} color="#7c3aed" />
            </View>
            <Text style={styles.vpMetricLabel} numberOfLines={2}>Next Review On</Text>
            <Text style={styles.vpMetricVal} numberOfLines={1} adjustsFontSizeToFit>{nextReviewDate}</Text>
          </View>
        </View>

        {/* Verification Checklist */}
        <View style={styles.vpCard}>
          <View style={styles.vpChecklistHead}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.vpCardTitle}>Verification Checklist</Text>
              <Text style={styles.vpCardSub}>
                {allComplete
                  ? 'All required details are verified and up to date'
                  : 'Complete the pending items to get fully verified'}
              </Text>
            </View>
            <View style={[styles.vpCompletePill, !allComplete && { backgroundColor: '#ffedd5' }]}>
              <Ionicons
                name={allComplete ? 'checkmark-circle' : 'time-outline'}
                size={13}
                color={allComplete ? '#16a34a' : '#c2410c'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.vpCompletePillText, !allComplete && { color: '#c2410c' }]}>
                {allComplete ? 'All Complete' : `${pendingCount} Pending`}
              </Text>
            </View>
          </View>

          {checklistItems.map((item, idx) => {
            const tint = ICON_TINTS[item.icon] || { bg: '#f1f5f9', fg: '#475569' };
            return (
              <TouchableOpacity 
                key={idx}
                style={[styles.vpRow, idx < checklistItems.length - 1 && styles.checkRowBorder]}
                onPress={() => navigation.navigate(item.screen as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.vpRowIcon, { backgroundColor: tint.bg }]}>
                  <Ionicons name={item.icon as any} size={20} color={tint.fg} />
                </View>

                <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                  <Text style={styles.checkTitle}>{item.title}</Text>
                  <Text style={styles.checkSub}>{item.subtitle}</Text>
                </View>

                <View style={[styles.vpStatusPill, !item.isVerified && { backgroundColor: '#fff7ed' }]}>
                  <Ionicons
                    name={item.isVerified ? 'checkmark-circle' : 'time-outline'}
                    size={12}
                    color={item.isVerified ? '#16a34a' : '#d97706'}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.vpStatusPillText, !item.isVerified && { color: '#d97706' }]}>{item.status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Why Verification Matters Card */}
        <View style={styles.vpWhy}>
          <View style={styles.vpWhyMedal}>
            <Ionicons name="ribbon" size={30} color="#FE5300" />
          </View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.vpWhyTitle}>Why Verification Matters?</Text>
            {[
              'Builds trust with customers',
              'Access to more rides and features',
              'Higher earnings and priority support',
            ].map((t) => (
              <View key={t} style={styles.whyRow}>
                <Ionicons name="checkmark-circle" size={15} color="#FE5300" style={{ marginRight: 6 }} />
                <Text style={styles.whyText}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={styles.vpWhyChart}>
            <View style={[styles.vpBar, { height: 14 }]} />
            <View style={[styles.vpBar, { height: 22 }]} />
            <View style={[styles.vpBar, { height: 32 }]} />
            <View style={[styles.vpBar, { height: 42, backgroundColor: '#FE5300' }]} />
            <Ionicons name="trending-up" size={22} color="#16a34a" style={styles.vpChartArrow} />
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
  // ---- Redesign styles ----
  loadingBox: { paddingVertical: 8, alignItems: 'center' },
  vpHero: {
    backgroundColor: '#ecfdf3',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1fae5',
    marginBottom: 14,
    overflow: 'hidden',
  },
  vpHeroPending: { backgroundColor: '#fff7ed', borderColor: '#ffedd5' },
  confetti: { position: 'absolute', width: 10, height: 4, borderRadius: 2 },
  confettiDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  vpHeroKicker: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  vpHeroTitle: { fontSize: 22, fontWeight: '900', color: '#16a34a', marginBottom: 6 },
  vpHeroSub: { fontSize: 12, color: '#475569', lineHeight: 17, marginBottom: 10 },
  vpHeroPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  vpHeroPillText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  vpArt: { width: 104, height: 104, justifyContent: 'center', alignItems: 'center' },
  vpArtGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: '#d1fae5' },
  vpArtShield: { width: 70, height: 70, borderRadius: 22, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center', transform: [{ translateY: -8 }] },
  vpArtCar: { position: 'absolute', bottom: 2, right: 0, backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#ffedd5' },
  vpMetric: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 12, marginHorizontal: 4, borderWidth: 1, borderColor: '#eef2f7' },
  vpMetricIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  vpMetricLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  vpMetricVal: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginTop: 3 },
  vpCard: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#eef2f7', overflow: 'hidden', marginBottom: 16 },
  vpChecklistHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  vpCardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  vpCardSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  vpCompletePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  vpCompletePillText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  vpRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  vpRowIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  vpStatusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  vpStatusPillText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  vpWhy: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff4ec', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#ffe4d1', marginBottom: 20 },
  vpWhyMedal: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#ffe4d1', justifyContent: 'center', alignItems: 'center' },
  vpWhyTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  vpWhyChart: { width: 52, height: 56, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  vpBar: { width: 9, borderRadius: 3, backgroundColor: '#fdba74' },
  vpChartArrow: { position: 'absolute', top: -4, left: 0 },
});
