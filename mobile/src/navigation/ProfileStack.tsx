import React, { useState, useEffect, useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileStackParamList } from './types';
import { PersonalDetailsScreen } from '../screens/PersonalDetailsScreen';
import { FleetRegistryScreen } from '../screens/FleetRegistryScreen';
import { VehicleSettingsScreen } from '../screens/VehicleSettingsScreen';
import { BackgroundCheckScreen } from '../screens/BackgroundCheckScreen';
import { TripSupportScreen } from '../screens/TripSupportScreen';
import { InboxScreen } from '../screens/InboxScreen';
import { PayoutHistoryScreen } from '../screens/PayoutHistoryScreen';
import { ProfilePhotoScreen } from '../screens/ProfilePhotoScreen';
import { VerifiedPartnerScreen } from '../screens/VerifiedPartnerScreen';
import { EarningsTrendScreen } from '../screens/EarningsTrendScreen';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { API_BASE_URL } from '../utils/config';
import { useCopilot, CopilotProvider, CopilotStep, walkthroughable } from 'react-native-copilot';
import * as SecureStore from 'expo-secure-store';

const WalkthroughableView = walkthroughable(View);
const WalkthroughableTouchableOpacity = walkthroughable(TouchableOpacity);

import { IdentityProofScreen } from '../screens/IdentityProofScreen';
import { VehicleDetailsScreen } from '../screens/VehicleDetailsScreen';
import { VehiclesListScreen } from '../screens/VehiclesListScreen';
import { AddVehicleScreen } from '../screens/AddVehicleScreen';
import { UpdateVehicleScreen } from '../screens/UpdateVehicleScreen';
import { BankDetailsScreen } from '../screens/BankDetailsScreen';
import { BankAccountScreen } from '../screens/BankAccountScreen';
import { ServiceAreaPricingScreen } from '../screens/ServiceAreaPricingScreen';

const Stack = createStackNavigator<ProfileStackParamList>();

type MenuNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileMenu'>;

const MenuScreen = ({ navigation }: any) => {
  const token = useAuthStore((state) => state.token);
  const storeProfile = useAuthStore((state) => state.profile);
  const logout = useAuthStore((state) => state.logout);
  const { start } = useCopilot();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const storeFetchNotifications = useNotificationStore((state) => state.fetchNotifications);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const checkMenuTour = async () => {
    try {
      const hasSeenMenuTour = await SecureStore.getItemAsync('hasSeenMenuTour');
      if (!hasSeenMenuTour) {
        setTimeout(() => start("stepProfile"), 500); // Start from the first step in the new flow
        await SecureStore.setItemAsync('hasSeenMenuTour', 'true');
      }
    } catch (e) {
      console.log('Error starting menu tour', e);
    }
  };

  const fetchMenuData = async (showSpinner = true) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    try {
      const [dashRes] = await Promise.all([
        fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        storeFetchNotifications(),
      ]);

      const dashResult = await dashRes.json();
      if (dashRes.ok && dashResult.success) {
        setDashboardData(dashResult.data);
      }
    } catch (error) {
      console.error("Error fetching menu dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMenuData();
      checkMenuTour();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenuData(false);
  };

  const partnerProfile = dashboardData?.profile;
  const partnerAuth = dashboardData?.auth;

  const derivedDefaultName = partnerAuth?.email
    ? partnerAuth.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'Partner Account';

  const fullName = partnerProfile?.fullName || storeProfile?.name || derivedDefaultName;
  const partnerId = partnerProfile?._id ? `MB-PTR-${partnerProfile._id.slice(-5).toUpperCase()}` : (partnerAuth?._id ? `MB-PTR-${partnerAuth._id.slice(-5).toUpperCase()}` : 'MB-PTR-ACCOUNT');
  const isVerified = partnerAuth?.status === 'Approved' || partnerProfile?.isSubmittedForApproval;
  const walletBalance = partnerProfile?.walletBalance ?? 0;

  const accountItems = [
    {
      title: 'My Profile',
      subtitle: 'View and update your profile',
      icon: 'person-outline' as const,
      iconBg: '#f3e8ff',
      iconColor: '#9333ea',
      onPress: () => navigation.navigate('PersonalDetails'),
    },
    {
      title: 'Documents',
      subtitle: 'Manage your documents',
      icon: 'card-outline' as const,
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      onPress: () => navigation.navigate('IdentityProof'),
    },
    {
      title: 'My Vehicles',
      subtitle: 'Manage vehicle roster & details',
      icon: 'car-outline' as const,
      iconBg: '#fff7ed',
      iconColor: '#FE5300',
      onPress: () => navigation.navigate('VehiclesList'),
    },
    {
      title: 'Service Area & Pricing',
      subtitle: 'Operational hubs & per-KM fare rules',
      icon: 'map-outline' as const,
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      onPress: () => navigation.navigate('ServiceAreaPricing'),
    },
    {
      title: 'Payout & Bank Details',
      subtitle: 'Manage bank accounts and payouts',
      icon: 'business-outline' as const,
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      onPress: () => navigation.navigate('PayoutHistory'),
    },
  ];

  const supportItems = [
    {
      title: 'Help Center',
      subtitle: 'Get help and view FAQs',
      icon: 'headset-outline' as const,
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      onPress: () => navigation.navigate('TripSupport'),
    },
    {
      title: 'Subscription',
      subtitle: 'Partner plans & exclusive benefits',
      icon: 'sparkles-outline' as const,
      iconBg: '#fff7ed',
      iconColor: '#FE5300',
      isComingSoon: true,
      onPress: () => Alert.alert("Subscription", "Partner subscription plans are coming soon! Stay tuned for exclusive benefits."),
    },
    {
      title: 'Contact Support',
      subtitle: 'Chat with our support team',
      icon: 'chatbubble-ellipses-outline' as const,
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      onPress: () => navigation.navigate('TripSupport'),
    },
    {
      title: 'Replay App Tour',
      subtitle: 'See the interactive tutorial again',
      icon: 'map-outline' as const,
      iconBg: '#ede9fe',
      iconColor: '#8b5cf6',
      onPress: () => {
        setTimeout(() => start("stepProfile"), 200); 
      },
    },
    {
      title: 'Terms & Conditions',
      subtitle: 'Read our terms and conditions',
      icon: 'document-text-outline' as const,
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      onPress: () => Alert.alert("Terms & Conditions", "MB Connect Partner Terms & Conditions v1.0.0"),
    },
    {
      title: 'Privacy Policy',
      subtitle: 'Read our privacy policy',
      icon: 'shield-outline' as const,
      iconBg: '#e0f2fe',
      iconColor: '#2563eb',
      onPress: () => Alert.alert("Privacy Policy", "MB Connect Privacy & Data Protection Policy v1.0.0"),
    },
    {
      title: 'About MBconnect',
      subtitle: 'App version 1.0.0',
      icon: 'information-circle-outline' as const,
      iconBg: '#f1f5f9',
      iconColor: '#64748b',
      onPress: () => Alert.alert("About MBconnect", "MB Connect Mobile App Version 1.0.0 (Build 104)"),
    },
  ];

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE5300']} />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.menuTitle}>Menu</Text>
          <Text style={styles.menuSubtitle}>Manage your account and app settings</Text>
        </View>
        <TouchableOpacity 
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Inbox')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#0f172a" />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <CopilotStep text="Fourth, once everything is completed below, tap here to send your profile for admin approval!" order={13} name="profileCard">
      <WalkthroughableTouchableOpacity 
        style={styles.profileCard}
        onPress={() => navigation.navigate('VerifiedPartner')}
        activeOpacity={0.85}
      >
        <View style={styles.profileTopRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={28} color="#16a34a" />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.profileName}>{fullName}</Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.driverId}>{partnerId}</Text>
            
            <View style={[styles.verifiedTag, !isVerified && { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.verifiedTagText, !isVerified && { color: '#b45309' }]}>
                {partnerAuth?.status === 'Approved' ? 'Verified Partner' : partnerProfile?.isSubmittedForApproval ? 'Under Audit' : 'Onboarding Pending'}
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </View>

        <View style={styles.walletBox}>
          <View style={styles.walletLeft}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet-outline" size={18} color="#16a34a" />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletVal}>₹{walletBalance.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewWalletBtn}
            onPress={() => navigation.navigate('PayoutHistory')}
            activeOpacity={0.8}
          >
            <Text style={styles.viewWalletText}>View Wallet &gt;</Text>
          </TouchableOpacity>
        </View>
      </WalkthroughableTouchableOpacity>
      </CopilotStep>

      <Text style={styles.groupHeader}>Account & Settings</Text>
      <View style={styles.cardGroup}>
        {accountItems.map((item, idx) => {
          let stepProps = null;
          // Grouping Profile (idx 0) and Bank (idx 4) instructions on the Profile step
          if (idx === 0) stepProps = { text: "First, complete your personal profile and add your bank details for payouts.", order: 10, name: "stepProfile" };
          else if (idx === 1) stepProps = { text: "Second, upload your identity and business documents.", order: 11, name: "stepDocs" };
          else if (idx === 2) stepProps = { text: "Third, add your vehicles and driver information here.", order: 12, name: "stepVehicles" };

          const row = (
            <WalkthroughableTouchableOpacity 
              key={idx}
              style={[styles.menuRow, idx < accountItems.length - 1 && styles.menuRowBorder]}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </WalkthroughableTouchableOpacity>
          );

          if (stepProps) {
            return (
              <CopilotStep key={idx} text={stepProps.text} order={stepProps.order} name={stepProps.name}>
                {row}
              </CopilotStep>
            );
          }

          // For items without a tour step, just return a regular TouchableOpacity
          return (
            <TouchableOpacity 
              key={idx}
              style={[styles.menuRow, idx < accountItems.length - 1 && styles.menuRowBorder]}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          );
        })}
      </View>

      <CopilotStep text="Need help? Access the help center or talk to our support team here." order={14} name="supportGroup">
      <WalkthroughableView>
        <Text style={[styles.groupHeader, { marginTop: 20 }]}>Support & Information</Text>
        <View style={styles.cardGroup}>
          {supportItems.map((item, idx) => (
          <TouchableOpacity 
            key={idx}
            style={[styles.menuRow, idx < supportItems.length - 1 && styles.menuRowBorder]}
            onPress={item.onPress}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={20} color={item.iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                {item.isComingSoon && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                  </View>
                )}
              </View>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </View>
      </WalkthroughableView>
      </CopilotStep>

      <TouchableOpacity 
        style={styles.logoutCard}
        onPress={logout}
        activeOpacity={0.8}
      >
        <View style={styles.logoutIconBox}>
          <Ionicons name="power-outline" size={20} color="#dc2626" />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.logoutTitle}>Logout</Text>
          <Text style={styles.logoutSub}>Safely logout from your account</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#dc2626" />
      </TouchableOpacity>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

export const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMenu" component={MenuScreen} />
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
      <Stack.Screen name="BankAccount" component={BankAccountScreen} />
      <Stack.Screen name="IdentityProof" component={IdentityProofScreen} />
      <Stack.Screen name="VehiclesList" component={VehiclesListScreen} />
      <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
      <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
      <Stack.Screen name="UpdateVehicle" component={UpdateVehicleScreen} />
      <Stack.Screen name="ServiceAreaPricing" component={ServiceAreaPricingScreen} />
      <Stack.Screen name="FleetRegistry" component={FleetRegistryScreen} />
      <Stack.Screen name="VehicleSettings" component={VehicleSettingsScreen} />
      <Stack.Screen name="BackgroundCheck" component={BackgroundCheckScreen} />
      <Stack.Screen name="TripSupport" component={TripSupportScreen} />
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen name="PayoutHistory" component={PayoutHistoryScreen} />
      <Stack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
      <Stack.Screen name="VerifiedPartner" component={VerifiedPartnerScreen} />
      <Stack.Screen name="EarningsTrend" component={EarningsTrendScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingTop: 48, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  menuTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
  menuSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  notifBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', position: 'relative' },
  notifBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ef4444', width: 15, height: 15, borderRadius: 7.5, justifyContent: 'center', alignItems: 'center' },
  notifBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '900' },
  profileCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  profileTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  driverId: { fontSize: 12, color: '#64748b', marginTop: 1 },
  verifiedTag: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  verifiedTagText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  walletBox: { backgroundColor: '#f4fbf7', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#dcfce7' },
  walletLeft: { flexDirection: 'row', alignItems: 'center' },
  walletIconCircle: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  walletLabel: { fontSize: 11, color: '#16a34a', fontWeight: '700' },
  walletVal: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 1 },
  viewWalletBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  viewWalletText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  groupHeader: { fontSize: 12, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  cardGroup: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  rowSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  comingSoonBadge: {
    backgroundColor: '#FE5300',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  comingSoonBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  logoutCard: { backgroundColor: '#fef2f2', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2', marginTop: 20 },
  logoutIconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  logoutTitle: { fontSize: 14, fontWeight: '800', color: '#dc2626' },
  logoutSub: { fontSize: 11, color: '#ef4444', marginTop: 2 },
});
