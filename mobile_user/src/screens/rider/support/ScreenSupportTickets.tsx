import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight, Ticket } from 'lucide-react-native';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import { getMySupportTickets, type SupportTicket } from '../../../api/support.api';
import { useSupportStore } from '../../../store/useSupportStore';
import { LoadingBlock } from '../tours/tourUi';
import { SupportHeader, SERVICE_LOOK, STATUS_LOOK, fmtDateTime, VC, SHADOW } from './supportUi';

const FILTERS = [
  ['ACTIVE', 'Active'],
  ['RESOLVED', 'Resolved'],
  ['ALL', 'All'],
] as const;

export default function ScreenSupportTickets({ onNavigate, onBack }: { onNavigate: (s: string) => void; onBack?: () => void }) {
  const openTicket = useSupportStore((s) => s.openTicket);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('ACTIVE');

  useEffect(() => {
    getMySupportTickets()
      .then((r) => setTickets(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shown = tickets.filter((t) =>
    filter === 'ALL' ? true : filter === 'ACTIVE' ? t.status === 'OPEN' || t.status === 'IN_PROGRESS' : t.status === 'RESOLVED' || t.status === 'CLOSED'
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <SupportHeader title="My Support Requests" subtitle="Track your requests and replies" onBack={onBack} />
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
          {FILTERS.map(([k, l]) => {
            const on = filter === k;
            return (
              <TouchableOpacity key={k} onPress={() => setFilter(k)} style={{ height: 36, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: on ? VC.orange : '#E2E8F0', backgroundColor: on ? VC.orange : '#FFFFFF', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: on ? '700' : '500', color: on ? '#FFFFFF' : VC.body }}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {loading ? (
            <LoadingBlock label="Loading your requests..." />
          ) : shown.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
              <Ticket size={34} color={VC.muted} />
              <Text style={{ fontSize: 14, color: VC.body }}>No {filter === 'ALL' ? '' : filter.toLowerCase() + ' '}requests</Text>
              <TouchableOpacity onPress={() => onNavigate('37')} style={{ paddingHorizontal: 18, height: 42, justifyContent: 'center', borderRadius: 12, backgroundColor: VC.orange }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Get help</Text>
              </TouchableOpacity>
            </View>
          ) : (
            shown.map((t) => {
              const look = SERVICE_LOOK[t.service] || SERVICE_LOOK.OTHER;
              const st = STATUS_LOOK[t.status];
              return (
                <TouchableOpacity
                  key={t._id}
                  onPress={() => {
                    openTicket(t._id);
                    onNavigate('support-ticket');
                  }}
                  activeOpacity={0.88}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: VC.hair, padding: 14, ...SHADOW }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <look.icon size={20} color={look.color} />
                    {t.riderUnread && <View style={{ position: 'absolute', top: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: VC.orange, borderWidth: 2, borderColor: '#FFFFFF' }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '800', color: VC.ink }}>{t.issueLabel}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 12, color: VC.body, marginTop: 1 }}>{t.ticketId} · {t.serviceLabel}{t.booking?.code ? ` · ${t.booking.code}` : ''}</Text>
                    <Text style={{ fontSize: 11.5, color: VC.muted, marginTop: 2 }}>Updated {fmtDateTime(t.lastActivityAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={{ backgroundColor: st.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: st.color }}>{st.label}</Text>
                    </View>
                    <ChevronRight size={16} color={VC.muted} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
      <RiderBottomNavbar activeScreen="37" onNavigate={onNavigate} />
    </View>
  );
}
