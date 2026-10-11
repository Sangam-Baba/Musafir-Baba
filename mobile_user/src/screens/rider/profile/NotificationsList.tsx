// Notifications list (Screen 38): grouped by day, category icons, tap opens
// the related screen and marks it read.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { ArrowLeft, Check, Bell, Car, Mountain, Globe, Headphones, Ban, CreditCard, FileText, Megaphone, ChevronRight, BellRing } from 'lucide-react-native';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { getNotificationCategory, openNotificationTarget, type NotificationCategory } from '../../../utils/notificationRoute';
import type { RiderNotificationData } from '../../../api/riderNotification.api';

const INK = '#0B1B3F';
const BODY = '#475467';
const MUTED = '#8A94A6';
const HAIR = '#EDF1F6';
const ORANGE = '#FF4500';

const LOOK: Record<NotificationCategory, { icon: any; color: string; bg: string; label: string }> = {
  RIDE: { icon: Car, color: '#EA580C', bg: '#FFEDD5', label: 'Ride' },
  TOUR: { icon: Mountain, color: '#16A34A', bg: '#DCFCE7', label: 'Tour' },
  VISA: { icon: Globe, color: '#1D4ED8', bg: '#DBEAFE', label: 'Visa' },
  SUPPORT: { icon: Headphones, color: '#7C3AED', bg: '#EDE9FE', label: 'Support' },
  CANCELLATION: { icon: Ban, color: '#DC2626', bg: '#FEE2E2', label: 'Cancellation' },
  PAYMENT: { icon: CreditCard, color: '#0284C7', bg: '#E0F2FE', label: 'Payment' },
  DOCUMENT: { icon: FileText, color: '#0D9488', bg: '#CCFBF1', label: 'Documents' },
  UPDATE: { icon: Megaphone, color: '#D97706', bg: '#FEF3C7', label: 'Update' },
};

const TABS: { key: string; label: string; match: NotificationCategory[] }[] = [
  { key: 'ALL', label: 'All', match: [] },
  { key: 'TRIPS', label: 'Trips', match: ['RIDE', 'TOUR', 'VISA', 'CANCELLATION'] },
  { key: 'SUPPORT', label: 'Support', match: ['SUPPORT'] },
  { key: 'PAYMENTS', label: 'Payments', match: ['PAYMENT'] },
  { key: 'UPDATES', label: 'Updates', match: ['UPDATE', 'DOCUMENT'] },
];

const dayKey = (iso?: string) => {
  if (!iso) return 'Earlier';
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return 'Earlier';
};

export default function NotificationsList({ onNavigate, onBack }: { onNavigate: (s: string) => void; onBack?: () => void }) {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const markRead = useNotificationStore((s) => s.markRead);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');
  const [opening, setOpening] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'undetermined' | 'unsupported'>('unsupported');

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  // Real push permission state (native only).
  const notificationsApi = useMemo(() => {
    if (Platform.OS === 'web') return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('expo-notifications');
    } catch {
      return null;
    }
  }, []);
  useEffect(() => {
    notificationsApi?.getPermissionsAsync?.().then((p: any) => setPushStatus(p?.status || 'undetermined')).catch(() => {});
  }, [notificationsApi]);

  const shown = useMemo(() => {
    const t = TABS.find((x) => x.key === tab)!;
    return t.match.length ? notifications.filter((n) => t.match.includes(getNotificationCategory(n))) : notifications;
  }, [notifications, tab]);

  const groups = useMemo(() => {
    const out: { title: string; items: RiderNotificationData[] }[] = [];
    for (const n of shown) {
      const k = dayKey(n.createdAt);
      const g = out.find((x) => x.title === k);
      if (g) g.items.push(n);
      else out.push({ title: k, items: [n] });
    }
    return out;
  }, [shown]);

  const open = async (n: RiderNotificationData) => {
    if (opening) return;
    markRead(n.id);
    setOpening(n.id);
    try {
      await openNotificationTarget(n, onNavigate);
    } finally {
      setOpening(null);
    }
  };

  const enablePush = async () => {
    if (!notificationsApi) return;
    const p = await notificationsApi.requestPermissionsAsync().catch(() => null);
    if (p?.status) setPushStatus(p.status);
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => (onBack ? onBack() : onNavigate('36'))} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F7FB', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={20} color={INK} strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: INK, letterSpacing: -0.3 }}>Notifications</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</Text>
        </View>
        <TouchableOpacity disabled={!unreadCount} onPress={markAllRead} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 999, backgroundColor: unreadCount ? '#FFF1EA' : '#F5F7FB' }}>
          <Check size={14} color={unreadCount ? ORANGE : MUTED} strokeWidth={2.6} />
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: unreadCount ? ORANGE : MUTED }}>Read all</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#F5F7FB', borderRadius: 14, padding: 4 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#FFFFFF' : 'transparent' }}>
              <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: on ? '700' : '500', color: on ? INK : MUTED }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Push permission (native only, when not granted) */}
      {(pushStatus === 'undetermined' || pushStatus === 'denied') && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EAF1FF', borderRadius: 18, padding: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <BellRing size={19} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: INK }}>Turn on notifications</Text>
            <Text style={{ fontSize: 12, color: BODY, marginTop: 1 }}>{pushStatus === 'denied' ? 'Allow MBGO in your phone settings to get trip alerts.' : 'Get driver, trip and support updates instantly.'}</Text>
          </View>
          {pushStatus === 'undetermined' && (
            <TouchableOpacity onPress={enablePush} style={{ paddingHorizontal: 14, height: 36, justifyContent: 'center', borderRadius: 10, backgroundColor: '#2563EB' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Enable</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading && !notifications.length ? (
        <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={ORANGE} />
          <Text style={{ fontSize: 12.5, color: MUTED }}>Loading notifications...</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={{ paddingVertical: 50, alignItems: 'center', gap: 10 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF1EA', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={28} color={ORANGE} strokeWidth={1.9} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: INK }}>You're all caught up</Text>
          <Text style={{ fontSize: 13, color: BODY, textAlign: 'center' }}>Updates about your trips and requests will appear here.</Text>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.title} style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 4 }}>{g.title}</Text>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: HAIR, overflow: 'hidden' }}>
              {g.items.map((n, i) => {
                const cat = getNotificationCategory(n);
                const look = LOOK[cat];
                const actionable = cat !== 'UPDATE';
                return (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => open(n)}
                    activeOpacity={0.75}
                    style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: HAIR, backgroundColor: n.read ? '#FFFFFF' : '#FFF9F5' }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <look.icon size={20} color={look.color} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, fontWeight: n.read ? '600' : '800', color: INK }}>{n.title}</Text>
                        {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE }} />}
                      </View>
                      <Text numberOfLines={3} style={{ fontSize: 13, color: BODY, lineHeight: 18 }}>{n.message}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={{ backgroundColor: look.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: look.color }}>{look.label}</Text>
                        </View>
                        <Text style={{ fontSize: 11.5, color: MUTED }}>{n.time}</Text>
                        <View style={{ flex: 1 }} />
                        {opening === n.id ? <ActivityIndicator size="small" color={ORANGE} /> : actionable ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: ORANGE }}>View</Text>
                            <ChevronRight size={14} color={ORANGE} />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}
