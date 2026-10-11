import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Search, Phone, ChevronRight, ChevronDown, Ticket, X, CalendarDays } from 'lucide-react-native';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import { getSupportCatalog, getMySupportTickets, SUPPORT_PHONE_DISPLAY, type SupportService, type SupportTicket } from '../../../api/support.api';
import { useSupportStore } from '../../../store/useSupportStore';
import { LoadingBlock } from '../tours/tourUi';
import { SupportHeader, SupportHero, SectionTitle, PillButton, SERVICE_LOOK, SUPPORT_FAQS, STATUS_LOOK, callSupport, chatSupport, VC, SHADOW } from './supportUi';
import { WhatsAppGlyph } from '../visa/visaUi';

const HOME_SERVICES = ['CAB', 'TOUR', 'FLIGHT', 'TRAIN', 'HOTEL', 'VISA', 'PAYMENT', 'SAFETY'];

export default function ScreenSupportHome({ onNavigate, onBack }: { onNavigate: (s: string) => void; onBack?: () => void }) {
  const catalog = useSupportStore((s) => s.catalog);
  const setCatalog = useSupportStore((s) => s.setCatalog);
  const startService = useSupportStore((s) => s.startService);
  const chooseIssue = useSupportStore((s) => s.chooseIssue);
  const openTicket = useSupportStore((s) => s.openTicket);
  const [loading, setLoading] = useState(!catalog.length);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    getSupportCatalog()
      .then((r) => !cancelled && setCatalog(r.data.data || []))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    getMySupportTickets()
      .then((r) => !cancelled && setTickets(r.data.data || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setCatalog]);

  const services = useMemo(() => {
    const byKey = new Map(catalog.map((s) => [s.key, s]));
    const main = HOME_SERVICES.map((k) => byKey.get(k)).filter(Boolean) as SupportService[];
    return showAll ? [...main, ...catalog.filter((s) => !HOME_SERVICES.includes(s.key))] : main;
  }, [catalog, showAll]);

  // Search across every service's issues.
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out: { service: SupportService; issue: SupportService['issues'][number] }[] = [];
    for (const s of catalog) for (const i of s.issues) if (`${s.label} ${i.label} ${i.hint}`.toLowerCase().includes(term)) out.push({ service: s, issue: i });
    return out.slice(0, 8);
  }, [q, catalog]);

  const active = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const unread = tickets.some((t) => t.riderUnread);

  const openService = (s: SupportService) => {
    startService(s);
    onNavigate('support-service');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SupportHeader title="Help & Support" subtitle="We're here to help you travel better" onBack={onBack} />
        <View style={{ paddingTop: 4 }}>
          <SupportHero line1="Your journey," line2="our support." sub="Any question, any booking. We're just a tap away, 24x7." />
        </View>

        {/* Search */}
        <View style={{ marginHorizontal: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: VC.surface, borderRadius: 16, paddingHorizontal: 16, height: 52 }}>
          <Search size={19} color={VC.muted} strokeWidth={2.2} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search: refund, cancellation, driver…" placeholderTextColor={VC.muted} style={{ flex: 1, fontSize: 14.5, color: VC.ink, marginLeft: 10, paddingVertical: 0 }} />
          {!!q && (
            <TouchableOpacity onPress={() => setQ('')}>
              <X size={18} color={VC.muted} />
            </TouchableOpacity>
          )}
        </View>
        {results.length > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: VC.hair, ...SHADOW }}>
            {results.map(({ service, issue }, i) => (
              <TouchableOpacity
                key={`${service.key}-${issue.key}`}
                onPress={() => {
                  startService(service);
                  if (service.bookingKind) onNavigate('support-service');
                  else {
                    chooseIssue(issue);
                    onNavigate('support-details');
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: VC.hair }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: VC.ink }}>{issue.label}</Text>
                  <Text style={{ fontSize: 12, color: VC.body }}>{service.label} · {issue.hint}</Text>
                </View>
                <ChevronRight size={16} color={VC.muted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 22 }}>
          {/* Immediate help */}
          <View>
            <SectionTitle title="Need immediate help?" subtitle="Our support team is available 24x7" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={callSupport} activeOpacity={0.88} style={{ flex: 1, borderRadius: 20, backgroundColor: VC.orange, padding: 16, gap: 10, shadowColor: VC.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 4 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={19} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>Call us</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{SUPPORT_PHONE_DISPLAY}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => chatSupport()} activeOpacity={0.88} style={{ flex: 1, borderRadius: 20, backgroundColor: VC.greenSoft, padding: 16, gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  <WhatsAppGlyph size={22} color="#1FA855" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: VC.ink }}>Chat with us</Text>
                  <Text style={{ fontSize: 12, color: VC.body, marginTop: 2 }}>On WhatsApp</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* My support requests */}
          <TouchableOpacity onPress={() => onNavigate('support-tickets')} activeOpacity={0.88} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: VC.hair, borderRadius: 20, padding: 16, ...SHADOW }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: VC.orangeSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={21} color={VC.orange} />
              {unread && <View style={{ position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 5, backgroundColor: VC.orange }} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: VC.ink }}>My support requests</Text>
              <Text style={{ fontSize: 12.5, color: VC.body, marginTop: 1 }}>
                {tickets.length ? `${active.length} active · ${tickets.length} total` : 'Track the status of your requests'}
              </Text>
            </View>
            <ChevronRight size={18} color={VC.ink} />
          </TouchableOpacity>
          {active[0] && (
            <TouchableOpacity
              onPress={() => {
                openTicket(active[0]._id);
                onNavigate('support-ticket');
              }}
              style={{ marginTop: -12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: VC.surface, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: VC.ink }}>{active[0].ticketId} · {active[0].issueLabel}</Text>
                <Text numberOfLines={1} style={{ fontSize: 12, color: VC.body }}>{active[0].serviceLabel}</Text>
              </View>
              <View style={{ backgroundColor: STATUS_LOOK[active[0].status].bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: STATUS_LOOK[active[0].status].color }}>{STATUS_LOOK[active[0].status].label}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Services */}
          <View>
            <SectionTitle
              title="Get help with your booking"
              subtitle="Select a service to find relevant support options"
              right={<PillButton label={showAll ? 'Show less' : 'View all'} onPress={() => setShowAll((v) => !v)} />}
            />
            {loading ? (
              <LoadingBlock label="Loading..." />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 }}>
                {services.map((s) => {
                  const look = SERVICE_LOOK[s.key] || SERVICE_LOOK.OTHER;
                  return (
                    <TouchableOpacity key={s.key} onPress={() => openService(s)} activeOpacity={0.8} style={{ width: '23.5%', alignItems: 'center', paddingVertical: 4 }}>
                      <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <look.icon size={25} color={look.color} strokeWidth={2.1} />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: VC.ink, marginTop: 8 }}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Recent booking */}
          <TouchableOpacity onPress={() => onNavigate('35')} activeOpacity={0.88} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: VC.blueSoft, borderRadius: 20, padding: 16 }}>
            <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={22} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: VC.ink }}>Help with a recent booking?</Text>
              <Text style={{ fontSize: 12.5, color: VC.body, marginTop: 2 }}>Open My Trips to find your booking</Text>
            </View>
            <ChevronRight size={18} color="#2563EB" />
          </TouchableOpacity>

          {/* FAQ */}
          <View>
            <SectionTitle title="Frequently asked questions" />
            <View style={{ borderWidth: 1, borderColor: VC.hair, borderRadius: 20, overflow: 'hidden' }}>
              {SUPPORT_FAQS.GENERAL.map((f, i) => (
                <TouchableOpacity key={i} onPress={() => setOpenFaq(openFaq === i ? null : i)} activeOpacity={0.8} style={{ paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: VC.hair }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: VC.ink }}>{f.q}</Text>
                    <ChevronDown size={16} color={VC.muted} style={{ transform: [{ rotate: openFaq === i ? '180deg' : '0deg' }] }} />
                  </View>
                  {openFaq === i && <Text style={{ fontSize: 13, color: VC.body, lineHeight: 19, marginTop: 6 }}>{f.a}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <RiderBottomNavbar activeScreen="37" onNavigate={onNavigate} />
    </View>
  );
}
