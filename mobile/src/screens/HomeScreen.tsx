import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  Modal,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';

const BANNER_IMAGES = [
  require('../../design/bannerImages/mbcb1.jpeg'),
  require('../../design/bannerImages/mbcb2.jpeg'),
  require('../../design/bannerImages/mbcb3.jpeg'),
  require('../../design/bannerImages/mbcb4.jpeg'),
  require('../../design/bannerImages/mbcb5.jpeg'),
  require('../../design/bannerImages/mbcb6.jpeg'),
  require('../../design/bannerImages/mbcb7.jpeg'),
  require('../../design/bannerImages/mbcb8.jpeg'),
  require('../../design/bannerImages/mbcb9.jpeg'),
];

// Infinite loop array: [Last Image Clone, ...Original Images, First Image Clone]
const INFINITE_BANNER_IMAGES = [
  BANNER_IMAGES[BANNER_IMAGES.length - 1],
  ...BANNER_IMAGES,
  BANNER_IMAGES[0],
];

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

type HomeScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export const HomeScreen = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Banner Carousel State (1-indexed for Infinite Loop)
  const bannerRef = React.useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(1);

  // Initial scroll position setup to index 1 (First real image)
  useEffect(() => {
    const cardWidth = Dimensions.get('window').width - 32;
    if (bannerRef.current) {
      bannerRef.current.scrollTo({ x: cardWidth, animated: false });
    }
  }, []);

  // Smooth Infinite Auto-scroll
  useEffect(() => {
    const timer = setInterval(() => {
      const cardWidth = Dimensions.get('window').width - 32;
      if (bannerRef.current && cardWidth > 0) {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          bannerRef.current?.scrollTo({ x: nextIndex * cardWidth, animated: true });

          // Seamless reset when transitioning past the last real image
          if (nextIndex >= INFINITE_BANNER_IMAGES.length - 1) {
            setTimeout(() => {
              bannerRef.current?.scrollTo({ x: 1 * cardWidth, animated: false });
              setCurrentIndex(1);
            }, 350);
          }
          return nextIndex;
        });
      }
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  const handleBannerScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const cardWidth = Dimensions.get('window').width - 32;
    if (cardWidth <= 0) return;

    let index = Math.round(contentOffsetX / cardWidth);

    // If scrolled to end clone (index 10), instantly jump to real index 1
    if (index >= INFINITE_BANNER_IMAGES.length - 1) {
      index = 1;
      bannerRef.current?.scrollTo({ x: 1 * cardWidth, animated: false });
    }
    // If scrolled to start clone (index 0), instantly jump to real index 9
    else if (index <= 0) {
      index = BANNER_IMAGES.length;
      bannerRef.current?.scrollTo({ x: BANNER_IMAGES.length * cardWidth, animated: false });
    }

    setCurrentIndex(index);
  };

  // Calculate active pagination dot index (0 to 8)
  const activeDotIndex = (currentIndex - 1 + BANNER_IMAGES.length) % BANNER_IMAGES.length;

  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const navigation = useNavigation<any>();


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
        setIsOnline(result.data.profile?.isOnline || false);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FE5300" />
      </View>
    );
  }

  const partnerStatus = data?.auth?.status || data?.profile?.status || "";
  const activeVehiclesCount = data?.vehicles?.filter((v: any) => v.status === 'Active').length || 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Menu')} 
            style={styles.menuDrawerBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.brandContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.brandMb}>mb</Text>
              <Text style={styles.brandConnect}>c</Text>
              <Ionicons name="disc-outline" size={16} color="#FE5300" style={{ marginHorizontal: -1 }} />
              <Text style={styles.brandConnect}>nnect</Text>
            </View>
            <Text style={styles.brandTagline}>— CONNECT. DRIVE. GROW. —</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerIconBtn} 
            onPress={() => navigation.navigate('Inbox')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>3</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerIconBtn} 
            onPress={() => navigation.navigate('Menu', { screen: 'TripSupport' })}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FE5300" />}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================================================
            TODAY'S OVERVIEW SECTION (Commented out as requested - preserved for future use)
           ========================================================= */}
        {/* 
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={14} color="#FE5300" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.darkOverviewCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
              <View style={styles.overviewCol}>
                <View style={[styles.metricIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <Text style={{ color: '#4ade80', fontWeight: '900', fontSize: 16 }}>₹</Text>
                </View>
                <Text style={styles.metricValText}>₹0</Text>
                <Text style={styles.metricLabelText}>Today's Earnings</Text>
                <View style={styles.metricGrowthRow}>
                  <Ionicons name="trending-up" size={12} color="#4ade80" />
                  <Text style={styles.growthGreen}>0% <Text style={styles.growthSub}>vs yesterday</Text></Text>
                </View>
              </View>

              <View style={[styles.overviewCol, styles.colBorder]}>
                <View style={[styles.metricIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Ionicons name="car-sport" size={16} color="#60a5fa" />
                </View>
                <Text style={styles.metricValText}>0</Text>
                <Text style={styles.metricLabelText}>Trips Today</Text>
                <View style={styles.metricGrowthRow}>
                  <Ionicons name="trending-up" size={12} color="#4ade80" />
                  <Text style={styles.growthGreen}>0% <Text style={styles.growthSub}>vs yesterday</Text></Text>
                </View>
              </View>

              <View style={[styles.overviewCol, styles.colBorder]}>
                <View style={[styles.metricIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                  <Ionicons name="trending-up" size={16} color="#c084fc" />
                </View>
                <Text style={styles.metricValText}>98%</Text>
                <Text style={styles.metricLabelText}>Acceptance Rate</Text>
                <View style={styles.metricGrowthRow}>
                  <Ionicons name="trending-up" size={12} color="#4ade80" />
                  <Text style={styles.growthGreen}>2% <Text style={styles.growthSub}>vs last 7 days</Text></Text>
                </View>
              </View>

              <View style={[styles.overviewCol, styles.colBorder]}>
                <View style={[styles.metricIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Ionicons name="star" size={16} color="#fbbf24" />
                </View>
                <Text style={styles.metricValText}>4.9 ★</Text>
                <Text style={styles.metricLabelText}>Your Rating</Text>
                <View style={styles.metricGrowthRow}>
                  <Ionicons name="trending-up" size={12} color="#4ade80" />
                  <Text style={styles.growthGreen}>0.1 <Text style={styles.growthSub}>vs last 7 days</Text></Text>
                </View>
              </View>
            </ScrollView>
          </View>
        */}

        {/* =========================================================
            BANNER CAROUSEL SECTION (Full-view images, Infinite Smooth Loop)
           ========================================================= */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleBannerScroll}
            scrollEventThrottle={16}
            contentOffset={{ x: Dimensions.get('window').width - 32, y: 0 }}
          >
            {INFINITE_BANNER_IMAGES.map((imgSource, index) => (
              <View key={index} style={styles.bannerSlide}>
                <Image 
                  source={imgSource} 
                  style={styles.bannerImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Carousel Pagination Dots below the image */}
          <View style={styles.paginationDotsContainer}>
            {BANNER_IMAGES.map((_, dotIdx) => (
              <View
                key={dotIdx}
                style={[
                  styles.dotItem,
                  activeDotIndex === dotIdx ? styles.activeDotItem : styles.inactiveDotItem
                ]}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions Grid */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <TouchableOpacity 
            style={styles.quickActionPill} 
            onPress={() => navigation.navigate('Menu', { screen: 'VehiclesList' })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="car" size={20} color="#16a34a" />
            </View>
            <Text style={styles.actionPillText}>Add Vehicle</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionPill} 
            onPress={() => navigation.navigate('Menu', { screen: 'PersonalDetails' })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="document-text" size={20} color="#2563eb" />
            </View>
            <Text style={styles.actionPillText}>Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionPill} 
            onPress={() => navigation.navigate('Menu', { screen: 'PersonalDetails' })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#faf5ff' }]}>
              <Ionicons name="business" size={20} color="#9333ea" />
            </View>
            <Text style={styles.actionPillText}>Bank Details</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionPill} 
            onPress={() => navigation.navigate('Menu', { screen: 'FleetRegistry' })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="person" size={20} color="#FE5300" />
            </View>
            <Text style={styles.actionPillText}>Drivers</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionPill} 
            onPress={() => navigation.navigate('Menu', { screen: 'TripSupport' })}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="headset" size={20} color="#dc2626" />
            </View>
            <Text style={styles.actionPillText}>Support</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionPill} 
            onPress={() => navigation.navigate('Menu')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#f8fafc' }]}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#64748b" />
            </View>
            <Text style={styles.actionPillText}>More</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Live Opportunities Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>Live Opportunities</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={14} color="#FE5300" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.liveOppCard, { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }]}>
          <Ionicons name="map-outline" size={32} color="#cbd5e1" style={{ marginBottom: 10 }} />
          <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '500' }}>No live opportunities right now</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>New trips will appear here</Text>
        </View>

        {/* Upcoming Bookings Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={14} color="#FE5300" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.upcomingCard, { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }]}>
          <Ionicons name="calendar-outline" size={32} color="#cbd5e1" style={{ marginBottom: 10 }} />
          <Text style={{ color: '#64748b', fontSize: 14, fontWeight: '500' }}>No upcoming bookings</Text>
        </View>

        {/* Banner Promo Pass */}
        <View style={styles.promoPassCard}>
          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>%</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>Unlock 0% Commission!</Text>
            <Text style={styles.promoSub}>Complete a trip to activate 24-hour pass for ₹0</Text>
          </View>

          <TouchableOpacity onPress={() => Alert.alert("Passes", "0% Commission Pass unlocked!")}>
            <Text style={styles.viewPassesText}>View Passes &gt;</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Notifications Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Inbox')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={14} color="#FE5300" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.notifCard, { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }]}>
           <Text style={{ color: '#94a3b8', fontSize: 13 }}>No recent notifications</Text>
        </View>

        {/* Extra spacing for floating capsule bar */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating Go Online / Offline Toggle Bar */}
      <View style={styles.floatingCapsuleContainer}>
          <View style={styles.floatingCapsule}>
            <View style={styles.capsuleLeft}>
            <View style={styles.pulseContainer}>
              <View style={[styles.pulseDot, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]} />
            </View>
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.capsuleStatusTitle}>{isOnline ? 'You are online' : 'You are offline'}</Text>
              <Text style={styles.capsuleStatusSub}>
                {isOnline ? 'Searching for trips nearby...' : 'Go online to start receiving bookings'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.powerToggleBtn, { backgroundColor: isOnline ? '#334155' : '#FE5300' }]}
            onPress={async () => {
              const newState = !isOnline;
              try {
                const res = await fetch(`${API_BASE_URL}/partner/status`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ isOnline: newState })
                });
                const result = await res.json();
                if (res.ok && result.success) {
                  setIsOnline(newState);
                  Alert.alert("Status Updated", newState ? "You are now ONLINE!" : "You are now OFFLINE");
                } else {
                  Alert.alert("Failed to Update Status", result.message || "Failed to update duty status.");
                }
              } catch (e) {
                console.error("Error updating online status:", e);
                setIsOnline(newState);
                Alert.alert("Status Updated", newState ? "You are now ONLINE!" : "You are now OFFLINE");
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="power" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.powerToggleText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trip Details Modal Sheet */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Trip Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close-circle" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContentBox}>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Route Type</Text>
                <Text style={styles.modalVal}>Outstation One-Way</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Pickup Date & Time</Text>
                <Text style={styles.modalVal}>Today, 03:30 PM</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Vehicle Category</Text>
                <Text style={styles.modalVal}>Sedan (Dzire / Etios)</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Base Fare Breakdown</Text>
                <Text style={[styles.modalVal, { color: '#16a34a' }]}>₹5,850 Inclusive of Tolls</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.confirmModalBtn}
              onPress={() => {
                setShowDetailsModal(false);
                Alert.alert("Trip Accepted!", "Navigating to passenger pickup location...");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmModalBtnText}>Confirm & Accept Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  topHeader: {
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
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuDrawerBtn: { padding: 4, marginRight: 10 },
  brandContainer: { justifyContent: 'center' },
  brandMb: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  brandConnect: { fontSize: 20, fontWeight: '900', color: '#FE5300', letterSpacing: -0.5 },
  brandTagline: { fontSize: 8, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.2, marginTop: -2 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: { padding: 6, marginLeft: 8, position: 'relative' },
  badgeCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeCountText: { color: '#ffffff', fontSize: 9, fontWeight: '900' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  viewAllText: { fontSize: 12, fontWeight: '700', color: '#FE5300', marginRight: 2 },
  darkOverviewCard: {
    backgroundColor: '#081122',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  overviewCol: { width: 100, paddingRight: 8 },
  colBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255, 255, 255, 0.1)', paddingLeft: 12 },
  metricIconBox: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  metricValText: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  metricLabelText: { fontSize: 10, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  metricGrowthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  growthGreen: { fontSize: 10, fontWeight: '700', color: '#4ade80' },
  growthSub: { color: '#94a3b8', fontWeight: '400' },
  quickActionPill: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    width: 82,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
  },
  actionIconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionPillText: { fontSize: 10, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  liveOppCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', marginTop: 8 },
  tagBadge: { backgroundColor: '#e6f4ea', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  tagBadgeText: { fontSize: 11, fontWeight: '800', color: '#137333' },
  oppContentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeCol: { flexDirection: 'row', flex: 1.4, marginRight: 8 },
  timelineGraphic: { alignItems: 'center', paddingVertical: 4, marginRight: 8 },
  greenCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#16a34a' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#cbd5e1', marginVertical: 2 },
  redCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FE5300' },
  routeAddressBox: { justifyContent: 'space-between' },
  locTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  locSub: { fontSize: 10, color: '#64748b' },
  distDurationCol: { flex: 0.9, borderLeftWidth: 1, borderLeftColor: '#f1f5f9', paddingLeft: 8, justifyContent: 'space-between' },
  distValue: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
  distSub: { fontSize: 10, color: '#64748b' },
  fareActionBox: { backgroundColor: '#eef7f2', borderRadius: 16, padding: 10, alignItems: 'center', minWidth: 100 },
  fareAmount: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  fareLabel: { fontSize: 9, color: '#64748b', marginBottom: 8 },
  acceptBtn: { backgroundColor: '#FE5300', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14, width: '100%', alignItems: 'center', marginBottom: 4 },
  acceptBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  viewDetailsBtn: { backgroundColor: '#ffffff', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#93c5fd' },
  viewDetailsBtnText: { color: '#2563eb', fontSize: 10, fontWeight: '700' },
  upcomingCard: { backgroundColor: '#f4f7ff', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dbeafe', marginTop: 8 },
  upcomingIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  roundTripBadge: { backgroundColor: '#2563eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  roundTripText: { fontSize: 9, fontWeight: '800', color: '#ffffff' },
  timeNotice: { fontSize: 11, fontWeight: '700', color: '#1e40af' },
  upcomingRouteText: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  upcomingMetaText: { fontSize: 11, color: '#64748b' },
  promoPassCard: { backgroundColor: '#fff4ed', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ffe3d1', marginTop: 16 },
  percentBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FE5300', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  percentText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  promoTitle: { fontSize: 13, fontWeight: '800', color: '#9a3412' },
  promoSub: { fontSize: 11, color: '#c2410c', marginTop: 2 },
  viewPassesText: { fontSize: 11, fontWeight: '800', color: '#FE5300' },
  notifCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginTop: 8 },
  notifIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notifTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  notifTime: { fontSize: 10, color: '#64748b', marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  floatingCapsuleContainer: { position: 'absolute', bottom: 12, left: 16, right: 16 },
  floatingCapsule: { backgroundColor: '#060d1a', borderRadius: 30, padding: 8, paddingLeft: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1e293b', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  capsuleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pulseContainer: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
  pulseDot: { width: 10, height: 10, borderRadius: 5 },
  capsuleStatusTitle: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  capsuleStatusSub: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
  powerToggleBtn: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  powerToggleText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalContentBox: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, marginBottom: 16 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalLabel: { fontSize: 12, color: '#64748b' },
  modalVal: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  confirmModalBtn: { backgroundColor: '#FE5300', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  confirmModalBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  carouselContainer: {
    width: '100%',
    marginBottom: 4,
  },
  bannerSlide: {
    width: Dimensions.get('window').width - 32,
    height: Math.round((Dimensions.get('window').width - 32) / 1.5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  paginationDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dotItem: {
    height: 6,
    borderRadius: 3,
  },
  activeDotItem: {
    width: 20,
    backgroundColor: '#FE5300',
  },
  inactiveDotItem: {
    width: 6,
    backgroundColor: '#cbd5e1',
  },
});
