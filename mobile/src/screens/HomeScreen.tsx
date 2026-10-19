import React, { useEffect, useState, useCallback } from 'react';
import { FINANCIAL_FEATURES_ENABLED } from '../config/features';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { API_BASE_URL } from '../utils/config';
import { getActivation, ActivationCard } from '../components/AccountActivation';
import { getWallet, walletBlockReason, type Wallet } from '../api/partnerWallet.api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';
import { SafeModal } from '../components/SafeModal';
import { Linking } from 'react-native';
import { loadPartnerAppHome, partnerAppHomeCache, type PartnerAppBanner, type PartnerAppAnnouncement } from '../api/partnerAppHome.api';
import { HomeBannerCarousel, ImportantUpdateBar } from '../components/HomeBannerCarousel';

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

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'Trip' | 'System' | 'Document' | 'Payout';
  read: boolean;
};

const RECENT_NOTIF_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  Trip: { icon: 'car-sport', color: '#FE5300', bg: '#fff7ed' },
  Payout: { icon: 'wallet', color: '#16a34a', bg: '#dcfce7' },
  Document: { icon: 'document-text', color: '#b45309', bg: '#fef3c7' },
  System: { icon: 'notifications', color: '#0284c7', bg: '#e0f2fe' },
};
const DEFAULT_NOTIF_ICON = { icon: 'notifications', color: '#64748b', bg: '#f1f5f9' };

type HomeScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Home'>;

const BRAND_LOGO = require('../../assets/branding/mbconnect-logo.png');
const HOME_HERO = require('../../assets/authBanner-v2.png');

export const HomeScreen = () => {
  // Same top spacing on every main screen: status bar height + 16.
  // Safe area: an <SafeAreaView edges={['top']}> spacer above reserves exactly the
  // status-bar overlap this screen really has (measured natively, so it's never
  // counted twice); this is just the header's own breathing room.
  const topInset = 12;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const storeFetchNotifications = useNotificationStore((state) => state.fetchNotifications);

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

  // Partner Wallet (only matters while the program is on).
  const [wallet, setWallet] = useState<Wallet | null>(null);
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      getWallet().then((r) => setWallet(r.data.data)).catch(() => {});
    }, [fetchDashboard])
  );

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    await storeFetchNotifications();
  }, [token, storeFetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Admin-managed banners + Important Update (admin → Connect App Home). Until
  // they load (or if the request fails) Home shows its built-in banners as before.
  const [adminBanners, setAdminBanners] = useState<PartnerAppBanner[]>(() => partnerAppHomeCache.banners);
  const [homeUpdate, setHomeUpdate] = useState<PartnerAppAnnouncement | null>(() => partnerAppHomeCache.announcement);
  useFocusEffect(
    useCallback(() => {
      loadPartnerAppHome()
        .then((c) => {
          setAdminBanners(c.banners);
          setHomeUpdate(c.announcement);
        })
        .catch(() => {});
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
    fetchNotifications();
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
  // Not approved yet: the floating bar and a Home card show what's left.
  const activation = getActivation(data);
  const openActivationStep = (screen: string) => navigation.navigate('Menu', { screen, initial: false, params: { returnTo: 'Home' } });

  // ---- Display-only values for the redesigned Home (no effect on data or actions) ----
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const partnerName = (data?.profile?.fullName || '').trim().split(/\s+/).slice(0, 2).join(' ');
  const showWalletCard = activation.state === 'approved' && !!wallet?.enabled;
  const walletReason = walletBlockReason(wallet);
  const walletMin = wallet?.rules?.minBalance || 0;
  const walletAvail = wallet?.available ?? wallet?.balance ?? 0;
  const walletShort = Math.max(0, walletMin - walletAvail);
  const walletPct = walletMin > 0 ? Math.min(1, Math.max(0, walletAvail / walletMin)) : 1;
  // Hero crop: the photo's right part (from 41% across, past its baked-in text) fills the
  // banner's right 62%; the photo already fades to white on that edge, so it blends in.
  const heroW = Dimensions.get('window').width - 32;
  const heroImgW = (0.62 * heroW) / 0.59;
  const heroImgH = heroImgW * (1632 / 2624);
  const heroImgStyle = { position: 'absolute' as const, width: heroImgW, height: heroImgH, left: -0.41 * heroImgW, top: -0.18 * heroImgH };
  const inrH = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const openAdminBanner = (b: PartnerAppBanner) => {
    if (b.action.type === 'URL' && b.action.url) {
      Linking.openURL(b.action.url).catch(() => {});
      return;
    }
    if (b.action.type !== 'SCREEN') return;
    const menu = (screen: string) => navigation.navigate('Menu', { screen, initial: false, params: { returnTo: 'Home' } });
    switch (b.action.screen) {
      case 'WALLET': return menu('PartnerWallet');
      case 'REFER_EARN': return menu('ReferEarn');
      case 'DOCUMENTS': return menu('IdentityProof');
      case 'VEHICLES': return menu('VehiclesList');
      case 'SUPPORT': return menu('TripSupport');
      case 'BOOKINGS': return navigation.navigate('Bookings');
      case 'EARNINGS': return navigation.navigate(FINANCIAL_FEATURES_ENABLED ? 'Earnings' : 'Bookings');
      case 'INBOX': return navigation.navigate('Inbox');
    }
  };
  const QUICK_ACTIONS: { label: string; icon: any; color: string; bg: string; go: () => void }[] = [
    { label: 'Add Vehicle', icon: 'car', color: '#16a34a', bg: '#dcfce7', go: () => navigation.navigate('Menu', { screen: 'VehiclesList', initial: false, params: { returnTo: 'Home' } }) },
    { label: 'Documents', icon: 'document-text', color: '#2563eb', bg: '#dbeafe', go: () => navigation.navigate('Menu', { screen: 'IdentityProof', initial: false, params: { returnTo: 'Home' } }) },
    { label: 'Bank Details', icon: 'business', color: '#9333ea', bg: '#f3e8ff', go: () => navigation.navigate('Menu', { screen: FINANCIAL_FEATURES_ENABLED ? 'BankDetails' : 'PersonalDetails', initial: false, params: { returnTo: 'Home' } }) },
    { label: 'Drivers', icon: 'people', color: '#FE5300', bg: '#ffedd5', go: () => navigation.navigate('Menu', { screen: 'FleetRegistry', initial: false, params: { returnTo: 'Home' } }) },
    { label: 'Support', icon: 'headset', color: '#dc2626', bg: '#fee2e2', go: () => navigation.navigate('Menu', { screen: 'TripSupport', initial: false, params: { returnTo: 'Home' } }) },
    { label: 'More', icon: 'grid', color: '#64748b', bg: '#f1f5f9', go: () => navigation.navigate('Menu') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#ffffff' }} />
      {/* Top Header Bar */}
      <View style={[styles.topHeader, { paddingTop: topInset }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Menu')} 
            style={styles.menuDrawerBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.brandContainer}>
            <Image source={BRAND_LOGO} style={{ width: 76, height: 46 }} resizeMode="contain" accessibilityLabel="MBConnect" />
          </View>
        </View>

        <View style={styles.headerRight}>
          {activation.state === 'approved' && (
            <View style={[styles.hStatusPill, !isOnline && styles.hStatusPillOff]} accessibilityLabel={isOnline ? 'Online' : 'Offline'}>
              <View style={[styles.hStatusDot, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]} />
              <Text style={[styles.hStatusText, !isOnline && { color: '#b91c1c' }]}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.headerIconBtn} 
            onPress={() => navigation.navigate('Inbox')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
            {unreadCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerIconBtn} 
            onPress={() => navigation.navigate('Menu', { screen: 'TripSupport', initial: false, params: { returnTo: 'Home' } })}
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
        {/* Greeting banner: right part of the existing auth banner photo (car + city),
            with a curved light panel on the left for the greeting. Display only. */}
        <View style={styles.hBanner}>
          <View style={styles.hHeroPhoto}>
            <Image source={HOME_HERO} style={heroImgStyle} resizeMode="stretch" />
          </View>
          {/* curved panel over the photo's left edge, with a thin brand-orange rim */}
          <View style={[styles.hCurve, { left: Math.round(0.55 * heroW) - 240 }]} />
          <View style={styles.hBannerText}>
            <Text style={styles.hGreetSmall}>{greeting},</Text>
            <Text style={styles.hGreetName} numberOfLines={2}>{partnerName || 'Partner'}{'\u00A0'}👋</Text>
            <Text style={styles.hGreetSub} numberOfLines={2}>
              {activation.state !== 'approved'
                ? 'Finish setting up your account to start taking rides.'
                : isOnline ? 'You are online and ready for new rides.' : 'Ready for new rides today?'}
            </Text>
            <View style={styles.hTagPill}>
              <Text style={styles.hTagPillText}>Drive More · Earn More</Text>
            </View>
          </View>

        </View>

        {/* Admin banners when live; otherwise the built-in carousel below (unchanged). */}
        {adminBanners.length > 0 ? (
          <HomeBannerCarousel banners={adminBanners} onOpen={openAdminBanner} />
        ) : (
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
        )}

        {/* Important Update from admin (full message is in the Inbox) */}
        {!!homeUpdate && <ImportantUpdateBar update={homeUpdate} onPress={() => navigation.navigate('Inbox')} />}

        {/* Account activation (only while the account isn't approved) */}
        <ActivationCard activation={activation} onOpen={openActivationStep} />

        {/* Partner Wallet card (approved partners, program on). Red when a recharge is needed. */}
        {showWalletCard && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Menu', { screen: 'PartnerWallet', initial: false, params: { returnTo: 'Home' } })}
            style={[styles.hWalletCard, !!walletReason && styles.hWalletCardLow]}
          >
            <View style={styles.hWalletTop}>
              <View style={styles.hWalletIcon}>
                <Ionicons name="wallet" size={24} color="#FE5300" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.hWalletLabel}>Wallet Balance</Text>
                <Text style={styles.hWalletAmt}>{inrH(walletAvail)}</Text>
              </View>
              <View style={styles.hRechargeBtn}>
                <Ionicons name="add" size={16} color="#ffffff" />
                <Text style={styles.hRechargeText}>Recharge</Text>
              </View>
            </View>
            {walletMin > 0 && (
              <View style={styles.hWalletTrack}>
                <View style={[styles.hWalletFill, { width: `${walletPct * 100}%`, backgroundColor: walletReason ? '#ef4444' : '#22c55e' }]} />
              </View>
            )}
            {walletReason ? (
              <View style={styles.hWalletAlert}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  {walletShort > 0 && <Text style={styles.hWalletAlertTitle}>Add {inrH(walletShort)} more</Text>}
                  <Text style={styles.hWalletAlertText}>{walletReason.replace(/^Low wallet balance\.\s*/, '')}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.hWalletOk}>
                <Ionicons name="checkmark-circle" size={13} color="#16a34a" /> You're all set to receive rides{walletMin > 0 ? ` · minimum ${inrH(walletMin)}` : ''}.
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={14} color="#FE5300" />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.hQuickGrid}>
          {QUICK_ACTIONS.map((qa) => (
            <TouchableOpacity key={qa.label} style={styles.hQuickCard} onPress={qa.go} activeOpacity={0.8}>
              <View style={[styles.hQuickIcon, { backgroundColor: qa.bg }]}>
                <Ionicons name={qa.icon} size={22} color={qa.color} />
              </View>
              <View style={styles.hQuickLabelRow}>
                <Text style={styles.hQuickLabel} numberOfLines={1}>{qa.label}</Text>
                <Ionicons name="chevron-forward" size={12} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

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

        <View style={styles.hEmptyCard}>
          <View style={[styles.hEmptyIcon, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="map" size={26} color="#FE5300" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.hEmptyTitle}>No live opportunities right now</Text>
            <Text style={styles.hEmptySub}>
              {activation.state === 'approved' && !isOnline ? 'Go online to start receiving new ride requests.' : 'New trips will appear here.'}
            </Text>
          </View>
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

        <View style={styles.hEmptyCard}>
          <View style={[styles.hEmptyIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="calendar" size={26} color="#2563eb" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.hEmptyTitle}>No upcoming bookings</Text>
            <Text style={styles.hEmptySub}>Accepted trips will show here with date, route and earnings.</Text>
          </View>
        </View>

        {/* Recent Notifications Section (Hidden as requested) */}
        {/* 
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Inbox')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={14} color="#FE5300" />
            </View>
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <View style={[styles.notifCard, { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }]}>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>No recent notifications</Text>
          </View>
        ) : (
          notifications.slice(0, 3).map((item) => {
            const iconConfig = RECENT_NOTIF_ICON[item.type] || DEFAULT_NOTIF_ICON;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.notifCard}
                onPress={() => navigation.navigate('Inbox')}
                activeOpacity={0.7}
              >
                <View style={[styles.notifIconBox, { backgroundColor: iconConfig.bg }]}>
                  <Ionicons name={iconConfig.icon as any} size={18} color={iconConfig.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )} 
        */}

        {/* Room for the floating Go Online bar (≈62px incl. its 12px offset) + a small gap */}
        <View style={{ height: 52 }} />
      </ScrollView>

      {/* Floating Go Online / Offline Toggle Bar -- until the account is approved
          it shows the activation status and opens the next step instead. */}
      <View style={styles.floatingCapsuleContainer}>
        {activation.state !== 'approved' ? (
          <View style={styles.floatingCapsule}>
            <View style={[styles.capsuleLeft, { flex: 1, marginRight: 8 }]}>
              <View style={styles.pulseContainer}>
                <View style={[styles.pulseDot, { backgroundColor: activation.state === 'review' ? '#3b82f6' : activation.state === 'ready' ? '#22c55e' : '#f59e0b' }]} />
              </View>
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.capsuleStatusTitle} numberOfLines={1}>{activation.title}</Text>
                <Text style={styles.capsuleStatusSub} numberOfLines={1}>{activation.subtitle}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.powerToggleBtn, { backgroundColor: activation.state === 'review' ? '#334155' : '#FE5300' }]}
              onPress={() => openActivationStep(activation.actionScreen)}
              activeOpacity={0.8}
            >
              <Ionicons name={activation.state === 'review' ? 'time-outline' : 'arrow-forward-circle-outline'} size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.powerToggleText}>{activation.actionLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
      </View>

      {/* Trip Details Modal Sheet */}
      <SafeModal
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
      </SafeModal>
    </View>
  );
};

const styles = StyleSheet.create({
  // ---- Home redesign styles ----
  hStatusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 4 },
  hStatusPillOff: { backgroundColor: '#fee2e2' },
  hStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  hStatusText: { fontSize: 12, fontWeight: '800', color: '#15803d' },
  hGreetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  hGreetSmall: { fontSize: 14, color: '#475569', fontWeight: '600' },
  hGreetName: { fontSize: 20, lineHeight: 24, fontWeight: '900', fontStyle: 'italic', color: '#0f172a', marginTop: 1 },
  hGreetSub: { fontSize: 12.5, color: '#64748b', marginTop: 2 },
  hGreetArt: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff4ec', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  hBanner: { minHeight: 150, borderRadius: 20, overflow: 'hidden', backgroundColor: '#f7f6fa', marginBottom: 14, borderWidth: 1, borderColor: '#eef0f4' },
  hCurve: { position: 'absolute', top: -32, width: 240, height: 240, borderRadius: 120, backgroundColor: '#f7f6fa', borderWidth: 3, borderColor: '#FE5300' },
  hHeroPhoto: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '62%', overflow: 'hidden' },
  hBannerText: { paddingLeft: 14, paddingVertical: 14, width: '50%' },
  hTagPill: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#FE5300', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  hTagPillText: { color: '#ffffff', fontSize: 11, fontWeight: '800', fontStyle: 'italic' },
  hWalletCard: { marginTop: 16, backgroundColor: '#ffffff', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#ffe4d1' },
  hWalletCardLow: { backgroundColor: '#fffaf6' },
  hWalletTop: { flexDirection: 'row', alignItems: 'center' },
  hWalletIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff1e8', justifyContent: 'center', alignItems: 'center' },
  hWalletLabel: { fontSize: 12.5, color: '#475569', fontWeight: '700' },
  hWalletAmt: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 1 },
  hRechargeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FE5300', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  hRechargeText: { color: '#ffffff', fontSize: 13, fontWeight: '800', marginLeft: 3 },
  hWalletTrack: { height: 6, borderRadius: 3, backgroundColor: '#f1f5f9', marginTop: 12, overflow: 'hidden' },
  hWalletFill: { height: 6, borderRadius: 3 },
  hWalletAlert: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fef2f2', borderRadius: 12, padding: 10, marginTop: 10 },
  hWalletAlertTitle: { fontSize: 13.5, fontWeight: '800', color: '#dc2626' },
  hWalletAlertText: { fontSize: 12, color: '#475569', marginTop: 1 },
  hWalletOk: { fontSize: 12, color: '#15803d', fontWeight: '600', marginTop: 10 },
  hQuickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  hQuickCard: { width: '31.5%', backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: '#eef2f7' },
  hQuickIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  hQuickLabelRow: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
  hQuickLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a', marginRight: 2, flexShrink: 1 },
  hEmptyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#eef2f7' },
  hEmptyIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  hEmptyTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  hEmptySub: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 17 },
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
