import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../store/useNotificationStore';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'Trip' | 'System' | 'Document' | 'Payout';
  read: boolean;
};

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Trip Fare Credited',
    message: '₹1,850 credited to your MB Wallet for completed trip #MB-89241.',
    time: '10 mins ago',
    type: 'Trip',
    read: false,
  },
  {
    id: 'n2',
    title: 'Weekly Payout Processed',
    message: 'Settlement of ₹12,850 successfully initiated to HDFC Bank (••4321).',
    time: '2 hours ago',
    type: 'Payout',
    read: false,
  },
  {
    id: 'n3',
    title: 'Vehicle Insurance Notice',
    message: 'Insurance policy for DL01AB1234 expires in 14 days. Upload renewal document.',
    time: '1 day ago',
    type: 'Document',
    read: true,
  },
  {
    id: 'n4',
    title: 'High Demand Surge Alert',
    message: '1.4x Surge active near IGI Airport Terminal 3. Go online to earn extra incentives.',
    time: '2 days ago',
    type: 'System',
    read: true,
  },
];

export const InboxScreen = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const storeFetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const storeMarkAllRead = useNotificationStore((state) => state.markAllRead);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLoading(true);
    storeFetchNotifications().finally(() => setLoading(false));
  }, []);

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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inbox & Notifications</Text>
          <Text style={styles.subtitle}>System alerts, trip dispatch & document updates.</Text>
        </View>
        <TouchableOpacity onPress={markAllRead} style={styles.readAllBtn}>
          <Text style={styles.readAllText}>Mark all read</Text>
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
            <View style={[styles.card, !item.read && styles.unreadCard]}>
              <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
                <Ionicons name={config.icon as any} size={20} color={config.color} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardMsg}>{item.message}</Text>
                <Text style={styles.cardTime}>{item.time}</Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
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
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#334155', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});
