import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';

type DashboardData = {
  profile?: any;
  address?: any;
  bank?: any;
  completionPercentage?: number;
  auth?: { status: string };
  vehicles?: any[];
  drivers?: any[];
  documents?: any[];
};

type HomeScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Dashboard'>;

export const HomeScreen = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.status === 401 || (result.message && result.message.includes("token"))) {
        logout();
        return;
      }
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleSubmitForApproval = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        Alert.alert("Success", "Profile successfully submitted for approval!");
        fetchDashboard();
      } else {
        const result = await res.json();
        Alert.alert("Error", result.message || "Failed to submit profile.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to server.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const partnerStatus = data?.auth?.status || data?.profile?.status || "";
  const isPendingReview = partnerStatus === "PendingVerification";
  const completionPercentage = data?.completionPercentage || 0;
  const canSubmitForReview = completionPercentage === 100 && ["", "Draft", "Active", "Rejected", "Hold"].includes(partnerStatus);
  const activeVehiclesCount = data?.vehicles?.filter((v: any) => v.status === 'Active').length || 0;
  const totalVehiclesCount = data?.vehicles?.length || 0;

  const dashboardStatusLabel = isPendingReview
    ? "Pending Review"
    : partnerStatus === "Rejected"
      ? "Rejected"
      : partnerStatus === "Hold"
        ? "On Hold"
        : partnerStatus === "Approved"
          ? "Approved"
          : partnerStatus === "Blacklisted" || partnerStatus === "In-Active" || partnerStatus === "Suspended"
            ? "Restricted"
            : canSubmitForReview
              ? "Ready to Submit"
              : `${completionPercentage}% Complete`;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {data?.profile?.fullName || 'Partner'}</Text>
        <Text style={styles.subtitle}>Here is your fleet overview.</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Fleet</Text>
          <Text style={styles.cardNumber}>{activeVehiclesCount}</Text>
          <Text style={styles.cardSub}>Online</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Fleet</Text>
          <Text style={styles.cardNumber}>{totalVehiclesCount}</Text>
          <Text style={styles.cardSub}>Registered</Text>
        </View>
      </View>

      <View style={styles.fullCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.cardTitle}>Audit Status</Text>
            <Text style={[styles.statusText, isPendingReview && styles.statusPending, canSubmitForReview && styles.statusReady]}>
              {dashboardStatusLabel}
            </Text>
          </View>
          {canSubmitForReview && (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitForApproval}>
              <Text style={styles.submitBtnText}>{partnerStatus === 'Rejected' ? 'Resubmit' : 'Submit Now'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {completionPercentage < 100 && !isPendingReview && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>PROFILE INCOMPLETE</Text>
          <Text style={styles.warningDesc}>
            Complete Bank Settlement, upload identity cards, and register at least 1 fleet vehicle to submit your profile.
          </Text>
          <TouchableOpacity style={styles.warningBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.warningBtnText}>Configure Forms</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPendingReview && (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Awaiting Verification Review</Text>
          <Text style={styles.pendingDesc}>Your profile variables are under evaluation. Expected approval in under 12 hours.</Text>
        </View>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  card: { flex: 1, backgroundColor: colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  fullCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  cardTitle: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' },
  cardNumber: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginVertical: 4 },
  cardSub: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 4, textTransform: 'uppercase' },
  statusPending: { color: '#D97706' },
  statusReady: { color: '#059669' },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  submitBtnText: { color: colors.surface, fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  warningCard: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, padding: 16, borderRadius: 12, marginBottom: 16 },
  warningTitle: { fontSize: 10, fontWeight: 'bold', color: colors.text, backgroundColor: '#E2E8F0', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  warningDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  warningBtn: { backgroundColor: colors.text, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  warningBtnText: { color: colors.surface, fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  pendingCard: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, padding: 16, borderRadius: 12 },
  pendingTitle: { fontSize: 12, fontWeight: 'bold', color: '#065F46', textTransform: 'uppercase', marginBottom: 4 },
  pendingDesc: { fontSize: 12, color: '#047857' }
});
