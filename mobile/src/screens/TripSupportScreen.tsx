import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Button } from '../components/Button';
import {
  getSupportCategories,
  getSupportTrips,
  getMyTickets,
  getTicket,
  createTicket,
  replyToTicket,
  PARTNER_SUPPORT_PHONE,
  PARTNER_SUPPORT_PHONE_DISPLAY,
  PARTNER_SUPPORT_EMAIL,
  type PartnerTicket,
  type SupportTrip,
  type TicketStatus,
} from '../api/partnerSupport.api';

type Tab = 'FAQ' | 'Tickets' | 'Contact';

const FAQS = [
  { q: 'How are trip payouts settled?', a: 'Trip earnings first appear as a pending balance in your wallet, then our team reviews and releases them to your available balance, which you can withdraw to your registered bank account.' },
  { q: 'What should I do if a passenger cancels?', a: 'Raise a ticket from the Tickets tab and pick the trip -- any applicable cancellation charge is reviewed and credited to your wallet by our team.' },
  { q: 'How to renew expired vehicle RC/Insurance?', a: 'Go to Menu -> My Vehicles, open the vehicle and upload a clear photo of the new document.' },
  { q: 'Why can\'t I go online?', a: 'Your account must be approved first. Home shows the steps that are still pending -- complete them and send your profile for approval.' },
];

const STATUS_LOOK: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: '#b45309', bg: '#fef3c7' },
  IN_PROGRESS: { label: 'In progress', color: '#0369a1', bg: '#e0f2fe' },
  RESOLVED: { label: 'Resolved', color: '#15803d', bg: '#dcfce7' },
  CLOSED: { label: 'Closed', color: '#475569', bg: '#f1f5f9' },
};

const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || fallback;

export const TripSupportScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [activeTab, setActiveTab] = useState<Tab>('FAQ');

  // Tickets
  const [tickets, setTickets] = useState<PartnerTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<{ key: string; label: string }[]>([]);
  const [trips, setTrips] = useState<SupportTrip[]>([]);
  const [issueKey, setIssueKey] = useState('');
  const [rideId, setRideId] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Open ticket (conversation)
  const [openTicket, setOpenTicket] = useState<PartnerTicket | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const res = await getMyTickets();
      setTickets(res.data.data || []);
    } catch (e) {
      console.error('Error loading support tickets:', e);
    } finally {
      setLoadingTickets(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [loadTickets])
  );

  const openTicketById = async (id: string) => {
    setActiveTab('Tickets');
    try {
      const res = await getTicket(id);
      setOpenTicket(res.data.data);
      setTickets((list) => list.map((t) => (t._id === id ? { ...t, unread: false } : t)));
    } catch (e) {
      Alert.alert('Error', errorMessage(e, 'Could not open this ticket.'));
    }
  };

  // Opened from a notification ("Reply on MBGT...") -> show that ticket.
  useEffect(() => {
    const id = route.params?.ticketId;
    if (id) {
      openTicketById(String(id));
      navigation.setParams({ ticketId: undefined });
    }
  }, [route.params?.ticketId]);

  const startNewTicket = async () => {
    setShowForm(true);
    setOpenTicket(null);
    try {
      const [cats, myTrips] = await Promise.all([getSupportCategories(), getSupportTrips()]);
      setCategories(cats.data.data || []);
      setTrips(myTrips.data.data || []);
    } catch (e) {
      console.error('Error loading ticket options:', e);
    }
  };

  const handleRaiseTicket = async () => {
    if (!issueKey) return Alert.alert('Choose a topic', 'Please choose what your issue is about.');
    if (ticketSubject.trim().length < 3) return Alert.alert('Add a subject', 'Please add a short subject.');
    if (ticketDescription.trim().length < 10) return Alert.alert('Describe the issue', 'Please describe the issue (at least 10 characters).');
    setSubmitting(true);
    try {
      const res = await createTicket({ issueKey, subject: ticketSubject.trim(), description: ticketDescription.trim(), ...(rideId ? { rideId } : {}) });
      const ticket = res.data.data;
      Alert.alert('Ticket submitted', `Ticket ${ticket.ticketId} created. Our partner support team will get back to you here and by notification.`);
      setShowForm(false);
      setIssueKey('');
      setRideId('');
      setTicketSubject('');
      setTicketDescription('');
      loadTickets();
    } catch (e) {
      Alert.alert('Could not submit', errorMessage(e, 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!openTicket || !reply.trim()) return;
    setSending(true);
    try {
      const res = await replyToTicket(openTicket._id, reply.trim());
      setOpenTicket(res.data.data);
      setReply('');
      loadTickets();
    } catch (e) {
      Alert.alert('Could not send', errorMessage(e, 'Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const callSupport = () => Linking.openURL(`tel:${PARTNER_SUPPORT_PHONE}`).catch(() => Alert.alert('Call support', PARTNER_SUPPORT_PHONE_DISPLAY));
  const whatsappSupport = () =>
    Linking.openURL(`https://wa.me/${PARTNER_SUPPORT_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent('Hi MBConnect Partner Support,')}`).catch(() => {});
  const emailSupport = () => Linking.openURL(`mailto:${PARTNER_SUPPORT_EMAIL}`).catch(() => Alert.alert('Email support', PARTNER_SUPPORT_EMAIL));

  const renderStatus = (status: TicketStatus) => {
    const look = STATUS_LOOK[status] || STATUS_LOOK.OPEN;
    return (
      <View style={[styles.statusPill, { backgroundColor: look.bg }]}>
        <Text style={[styles.statusText, { color: look.color }]}>{look.label}</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => (openTicket ? setOpenTicket(null) : showForm ? setShowForm(false) : navigation.goBack())}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={activeTab === 'Tickets' ? <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTickets(); }} /> : undefined}
      >
        <Text style={styles.subtitle}>FAQs, support tickets and direct contact with the MBConnect partner team.</Text>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          {(['FAQ', 'Tickets', 'Contact'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => { setActiveTab(tab); setOpenTicket(null); setShowForm(false); }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'FAQ' && (
          <View>
            <Text style={styles.sectionTitle}>FREQUENTLY ASKED QUESTIONS</Text>
            {FAQS.map((item, idx) => (
              <View key={idx} style={styles.faqCard}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Text style={styles.faqA}>{item.a}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.linkRow} onPress={() => { setActiveTab('Tickets'); startNewTicket(); }}>
              <Text style={styles.linkText}>Still need help? Raise a ticket</Text>
              <Ionicons name="chevron-forward" size={16} color="#FE5300" />
            </TouchableOpacity>
          </View>
        )}

        {/* Ticket conversation */}
        {activeTab === 'Tickets' && openTicket && (
          <View>
            <View style={styles.formCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.ticketCode}>{openTicket.ticketId}</Text>
                {renderStatus(openTicket.status)}
              </View>
              <Text style={styles.ticketSubject}>{openTicket.subject || openTicket.issueLabel}</Text>
              <Text style={styles.ticketMeta}>{openTicket.issueLabel} · {fmt(openTicket.createdAt)}</Text>
              {!!openTicket.booking?.code && <Text style={styles.ticketMeta}>Trip {openTicket.booking.code} · {openTicket.booking.title}</Text>}
              <Text style={styles.ticketDesc}>{openTicket.description}</Text>
              {!!openTicket.resolutionNote && openTicket.status === 'RESOLVED' && (
                <View style={styles.resolutionBox}>
                  <Text style={styles.resolutionTitle}>Resolution</Text>
                  <Text style={styles.ticketDesc}>{openTicket.resolutionNote}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>CONVERSATION</Text>
            {(openTicket.messages || []).length === 0 && <Text style={styles.emptyText}>No replies yet. Our team will respond here.</Text>}
            {(openTicket.messages || []).map((m) => (
              <View key={m._id} style={[styles.bubble, m.from === 'ADMIN' ? styles.bubbleAdmin : styles.bubbleMe]}>
                <Text style={styles.bubbleWho}>{m.from === 'ADMIN' ? m.staffName || 'MBConnect Support' : 'You'} · {fmt(m.at)}</Text>
                {!!m.text && <Text style={styles.bubbleText}>{m.text}</Text>}
              </View>
            ))}

            {openTicket.status !== 'CLOSED' ? (
              <View style={styles.replyRow}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Write a message..." placeholderTextColor="#94a3b8" value={reply} onChangeText={setReply} multiline />
                <TouchableOpacity style={[styles.sendBtn, (!reply.trim() || sending) && { opacity: 0.5 }]} disabled={!reply.trim() || sending} onPress={sendReply}>
                  {sending ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="send" size={18} color="#ffffff" />}
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.emptyText}>This ticket is closed. Raise a new ticket if you need more help.</Text>
            )}
          </View>
        )}

        {/* New ticket form */}
        {activeTab === 'Tickets' && !openTicket && showForm && (
          <View>
            <Text style={styles.sectionTitle}>RAISE A SUPPORT TICKET</Text>
            <View style={styles.formCard}>
              <Text style={styles.label}>What is it about? *</Text>
              <View style={styles.chipWrap}>
                {categories.map((c) => (
                  <TouchableOpacity key={c.key} style={[styles.chip, issueKey === c.key && styles.chipActive]} onPress={() => setIssueKey(c.key)}>
                    <Text style={[styles.chipText, issueKey === c.key && styles.chipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
                {categories.length === 0 && <ActivityIndicator size="small" color="#FE5300" />}
              </View>

              {trips.length > 0 && (
                <>
                  <Text style={styles.label}>Related trip (optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    {trips.map((t) => (
                      <TouchableOpacity key={t.id} style={[styles.tripChip, rideId === t.id && styles.chipActive]} onPress={() => setRideId(rideId === t.id ? '' : t.id)}>
                        <Text style={[styles.tripCode, rideId === t.id && styles.chipTextActive]}>{t.code}</Text>
                        <Text style={[styles.tripTitle, rideId === t.id && styles.chipTextActive]} numberOfLines={1}>{t.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.label}>Subject *</Text>
              <TextInput style={styles.input} placeholder="e.g. Fare discrepancy in trip" placeholderTextColor="#94a3b8" value={ticketSubject} onChangeText={setTicketSubject} maxLength={150} />

              <Text style={styles.label}>Describe the issue *</Text>
              <TextInput style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]} placeholder="Describe the issue in detail..." placeholderTextColor="#94a3b8" multiline value={ticketDescription} onChangeText={setTicketDescription} maxLength={2000} />

              <Button title={submitting ? 'Submitting...' : 'Submit Support Ticket'} onPress={handleRaiseTicket} disabled={submitting} style={{ marginTop: 4 }} />
            </View>
          </View>
        )}

        {/* My tickets */}
        {activeTab === 'Tickets' && !openTicket && !showForm && (
          <View>
            <Button title="Raise a New Ticket" onPress={startNewTicket} style={{ marginBottom: 16 }} />
            <Text style={styles.sectionTitle}>MY TICKETS</Text>
            {loadingTickets && tickets.length === 0 ? (
              <ActivityIndicator size="small" color="#FE5300" style={{ marginTop: 16 }} />
            ) : tickets.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubbles-outline" size={28} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No tickets yet</Text>
                <Text style={styles.emptyText}>Raise a ticket and our team will reply here.</Text>
              </View>
            ) : (
              tickets.map((t) => (
                <TouchableOpacity key={t._id} style={styles.ticketCard} onPress={() => openTicketById(t._id)} activeOpacity={0.8}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.ticketCode}>{t.ticketId}{t.unread ? '  •' : ''}</Text>
                    {renderStatus(t.status)}
                  </View>
                  <Text style={styles.ticketSubject} numberOfLines={1}>{t.subject || t.issueLabel}</Text>
                  <Text style={styles.ticketMeta}>{t.issueLabel} · Updated {fmt(t.lastActivityAt)}</Text>
                  {t.unread && <Text style={styles.newReply}>New reply from support</Text>}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'Contact' && (
          <View>
            <Text style={styles.sectionTitle}>CONTACT PARTNER SUPPORT</Text>
            <TouchableOpacity style={styles.callCard} onPress={callSupport}>
              <Ionicons name="call" size={20} color="#FE5300" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.callTitle}>Call Partner Support</Text>
                <Text style={styles.callSub}>{PARTNER_SUPPORT_PHONE_DISPLAY}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.callCard} onPress={whatsappSupport}>
              <Ionicons name="logo-whatsapp" size={20} color="#16a34a" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.callTitle}>Chat on WhatsApp</Text>
                <Text style={styles.callSub}>{PARTNER_SUPPORT_PHONE_DISPLAY}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.callCard} onPress={emailSupport}>
              <Ionicons name="mail" size={20} color="#2563eb" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.callTitle}>Email us</Text>
                <Text style={styles.callSub}>{PARTNER_SUPPORT_EMAIL}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
            <View style={styles.noteBox}>
              <Ionicons name="information-circle-outline" size={16} color="#b45309" />
              <Text style={styles.noteText}>In a medical or safety emergency, call 112 first.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 44, // same as the other Menu screens
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 4, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabItemActive: { backgroundColor: '#FE5300' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#ffffff' },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 },
  faqCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  faqQ: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  faqA: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  linkText: { fontSize: 13, fontWeight: '700', color: '#FE5300' },
  formCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  label: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 14, color: '#0f172a' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#FE5300', borderColor: '#FE5300' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#ffffff' },
  tripChip: { width: 170, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', marginRight: 8 },
  tripCode: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  tripTitle: { fontSize: 11, color: '#64748b', marginTop: 2 },
  ticketCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketCode: { fontSize: 12, fontWeight: '800', color: '#0f172a', letterSpacing: 0.3 },
  ticketSubject: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 6 },
  ticketMeta: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  ticketDesc: { fontSize: 13, color: '#334155', marginTop: 8, lineHeight: 19 },
  newReply: { fontSize: 11.5, fontWeight: '700', color: '#FE5300', marginTop: 6 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  resolutionBox: { marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 10 },
  resolutionTitle: { fontSize: 11, fontWeight: '800', color: '#15803d' },
  bubble: { maxWidth: '88%', borderRadius: 14, padding: 10, marginBottom: 8 },
  bubbleAdmin: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9', alignSelf: 'flex-start' },
  bubbleMe: { backgroundColor: '#fff7ed', alignSelf: 'flex-end' },
  bubbleWho: { fontSize: 10.5, fontWeight: '700', color: '#94a3b8', marginBottom: 3 },
  bubbleText: { fontSize: 13, color: '#0f172a', lineHeight: 18 },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FE5300', alignItems: 'center', justifyContent: 'center' },
  emptyCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 8 },
  emptyText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  callCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 10 },
  callTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  callSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, marginTop: 4 },
  noteText: { flex: 1, fontSize: 12, color: '#92400e' },
});
