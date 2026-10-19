import React, { useState, useCallback, useRef } from 'react';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useNotificationStore } from '../store/useNotificationStore';
import { getNotificationTarget, openNotificationTarget } from '../utils/notificationRoute';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'Trip' | 'System' | 'Document' | 'Payout';
  read: boolean;
  data?: Record<string, any>;
};

export const InboxScreen = () => {
  // Same top spacing on every main screen: status bar height + 16.
  // Safe area: an <SafeAreaView edges={['top']}> spacer above reserves exactly the
  // status-bar overlap this screen really has (measured natively, so it's never
  // counted twice); this is just the header's own breathing room.
  const topInset = 12;

  const navigation = useNavigation<any>();
  const notifications = useNotificationStore((state) => state.notifications);
  const storeFetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const storeMarkAllRead = useNotificationStore((state) => state.markAllRead);
  const storeMarkRead = useNotificationStore((state) => state.markRead);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load on open and whenever the inbox comes back into view.
  const loadedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!loadedOnce.current) setLoading(true);
      storeFetchNotifications().finally(() => {
        loadedOnce.current = true;
        setLoading(false);
      });
    }, [])
  );

  // Tap: mark it read and open the screen it's about.
  const openNotification = (item: NotificationItem) => {
    storeMarkRead(item.id);
    openNotificationTarget(navigation, getNotificationTarget(item));
  };

  const onRefresh = () => {
    setRefreshing(true);
    storeFetchNotifications().finally(() => setRefreshing(false));
  };

  const markAllRead = () => {
    storeMarkAllRead();
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'Trip': return { icon: 'car-sport', color: '#FE5300', bg: '#fff7ed' };
      case 'Payout': return { icon: 'wallet', color: '#16a34a', bg: '#dcfce7' };
      case 'Document': return { icon: 'document-text', color: '#b45309', bg: '#fef3c7' };
      case 'System': return { icon: 'notifications', color: '#0284c7', bg: '#e0f2fe' };
      // Backend's Notification model also allows "Ride"/"Payment"/"General" --
      // no current code creates those for partners, but this fallback keeps
      // the screen from crashing if one ever shows up.
      default: return { icon: 'notifications', color: '#64748b', bg: '#f1f5f9' };
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View>
          {/* Back only when opened from inside Menu (as a tab it's a top-level screen). */}
          {navigation.getState()?.type === 'stack' && navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Inbox & Notifications</Text>
          <Text style={styles.subtitle}>System alerts, trip dispatch & document updates.</Text>
        </View>
        <TouchableOpacity onPress={markAllRead} disabled={unreadCount === 0} style={[styles.readAllBtn, unreadCount === 0 && { opacity: 0.5 }]}>
          <Text style={[styles.readAllText, unreadCount === 0 && { color: '#94a3b8' }]}>
            {unreadCount > 0 ? `Mark all read (${unreadCount})` : 'All read'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          loading ? (
            <ActivityIndicator size="small" color="#FE5300" style={{ marginVertical: 10 }} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="notifications-off-outline" size={32} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>You're all caught up!</Text>
              <Text style={styles.emptySubtitle}>No new notifications right now. We'll alert you when there are important updates.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const config = getIcon(item.type);
          return (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.unreadCard]}
              onPress={() => openNotification(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
                <Ionicons name={config.icon as any} size={20} color={config.color} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { flex: 1, marginRight: 8 }, !item.read && { fontWeight: '800' }]}>{item.title}</Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardMsg}>{item.message}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTime}>{item.time}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!item.read && (
                      <TouchableOpacity
                        onPress={() => storeMarkRead(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.markReadBtn}
                      >
                        <Ionicons name="checkmark-done" size={13} color="#64748b" />
                        <Text style={styles.markReadText}>Mark as read</Text>
                      </TouchableOpacity>
                    )}
                    <View style={styles.openHint}>
                      <Text style={styles.openHintText}>Open</Text>
                      <Ionicons name="chevron-forward" size={13} color="#FE5300" />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8, padding: 4, marginLeft: -4 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#64748b' },
  readAllBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  readAllText: { fontSize: 11, fontWeight: '700', color: '#FE5300' },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#f1f5f9' },
  unreadCard: { borderColor: '#ffedd5', backgroundColor: '#fffcf7' },
  iconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FE5300' },
  cardMsg: { fontSize: 12, color: '#64748b', lineHeight: 18, marginBottom: 6 },
  cardTime: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  markReadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 },
  markReadText: { fontSize: 10.5, fontWeight: '700', color: '#64748b', marginLeft: 3 },
  openHint: { flexDirection: 'row', alignItems: 'center' },
  openHintText: { fontSize: 11, fontWeight: '800', color: '#FE5300' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#334155', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});
