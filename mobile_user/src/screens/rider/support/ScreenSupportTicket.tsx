import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { FileText, Copy, Bell, Send, ChevronRight, ListChecks, CalendarDays, CheckCircle2 } from 'lucide-react-native';
import { getSupportTicket, replySupportTicket, type SupportTicket } from '../../../api/support.api';
import { useSupportStore } from '../../../store/useSupportStore';
import { useToast } from '../visa/visaUi';
import { LoadingBlock } from '../tours/tourUi';
import { SupportHeader, SupportHero, SupportStepper, SCard, BookingRow, issueLook, ContactButtons, STATUS_LOOK, fmtDateTime, VC } from './supportUi';

const TIMELINE = [
  { title: 'Request submitted', sub: '' },
  { title: 'Being reviewed by support team', sub: "We'll get back to you shortly." },
  { title: 'Resolution in progress', sub: "We'll update you once we have a solution." },
  { title: 'Issue resolved', sub: "You'll receive a confirmation." },
];
// Index of the step in progress for each status (4 = all done).
const STAGE: Record<string, number> = { OPEN: 1, IN_PROGRESS: 2, RESOLVED: 4, CLOSED: 4 };

export default function ScreenSupportTicket({ variant, onNavigate, onBack }: { variant: 'submitted' | 'detail'; onNavigate: (s: string) => void; onBack?: () => void }) {
  const ticketId = useSupportStore((s) => s.ticketId);
  const initial = useSupportStore((s) => s.ticket);
  const [ticket, setTicket] = useState<SupportTicket | null>(initial && initial._id === ticketId ? initial : null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(() => {
    if (!ticketId) return;
    getSupportTicket(ticketId)
      .then((r) => setTicket(r.data.data))
      .catch(() => {});
  }, [ticketId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  if (!ticket) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <SupportHeader title="Support Request" onBack={onBack} />
        <LoadingBlock label="Loading..." />
      </View>
    );
  }

  const status = STATUS_LOOK[ticket.status];
  const stage = STAGE[ticket.status] ?? 1;
  const look = issueLook(ticket.issueKey);
  const submitted = variant === 'submitted';

  const send = async () => {
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    try {
      const r = await replySupportTicket(ticket._id, text);
      setTicket(r.data.data);
      setReply('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (e: any) {
      toast.show(e?.response?.data?.message || 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: '#FFFFFF', paddingBottom: 4 }}>
            <SupportHeader title={`${ticket.serviceLabel} Support`} subtitle={submitted ? `Get help with your ${ticket.serviceLabel.toLowerCase()} bookings` : 'Your support request'} onBack={submitted ? undefined : onBack} />
            {submitted && <SupportStepper current={4} />}
            {submitted ? <SupportHero icon={CheckCircle2} line1="Request submitted" line2="We're on it!" sub="Our support team has received your request and will get back to you shortly." /> : null}
          </View>

          <View style={{ paddingHorizontal: 16, gap: 14, marginTop: 16 }}>
            <SCard style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: VC.orangeSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} color={VC.orange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, color: VC.muted }}>Support Ticket ID</Text>
                  <TouchableOpacity onPress={() => toast.show(`Ticket ${ticket.ticketId}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: VC.ink, letterSpacing: -0.3 }}>{ticket.ticketId}</Text>
                    <Copy size={14} color={VC.muted} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11.5, color: VC.muted }}>Created on {fmtDateTime(ticket.createdAt)}</Text>
                </View>
                <View style={{ backgroundColor: status.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: status.color }}>{status.label}</Text>
                </View>
              </View>
              {ticket.booking?.title && (
                <View style={{ borderTopWidth: 1, borderTopColor: VC.hair, paddingTop: 12 }}>
                  <BookingRow kind={ticket.booking.kind} title={ticket.booking.title} subtitle={ticket.booking.subtitle} code={ticket.booking.code} status={ticket.booking.status} />
                </View>
              )}
            </SCard>

            <SCard style={{ gap: 10 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: VC.ink }}>Issue Details</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <look.icon size={20} color={look.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: VC.ink }}>{ticket.issueLabel}</Text>
                  <Text style={{ fontSize: 12.5, color: VC.body }} numberOfLines={3}>{ticket.description}</Text>
                </View>
              </View>
              {ticket.attachments?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {ticket.attachments.map((a) => (
                    <TouchableOpacity key={a.url} onPress={() => Linking.openURL(a.url).catch(() => {})}>
                      <Image source={{ uri: a.url }} style={{ width: 70, height: 70, borderRadius: 10, backgroundColor: '#F1F5F9' }} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </SCard>

            {/* Status */}
            <SCard style={{ gap: 4 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: VC.ink, marginBottom: 8 }}>Current Status</Text>
              {TIMELINE.map((step, i) => {
                const done = i < stage;
                const current = i === stage;
                const tag = done ? 'Completed' : current ? 'In Progress' : 'Pending';
                return (
                  <View key={step.title} style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: done || current ? VC.orange : '#CBD5E1', backgroundColor: done ? VC.orange : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                        {current && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: VC.orange }} />}
                      </View>
                      {i < TIMELINE.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: done ? VC.orange : '#E2E8F0' }} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 14 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: VC.ink }}>{step.title}</Text>
                      <Text style={{ fontSize: 12, color: VC.body, marginTop: 1 }}>{i === 0 ? fmtDateTime(ticket.createdAt) : i === 3 && ticket.resolvedAt && stage >= 4 ? fmtDateTime(ticket.resolvedAt) : step.sub}</Text>
                    </View>
                    <View style={{ alignSelf: 'flex-start', backgroundColor: done ? VC.orangeSoft : current ? '#FFF7ED' : VC.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: done || current ? VC.orange : VC.muted }}>{tag}</Text>
                    </View>
                  </View>
                );
              })}
              {!!ticket.resolutionNote && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                <View style={{ flexDirection: 'row', gap: 10, backgroundColor: '#ECFDF3', borderRadius: 12, padding: 12 }}>
                  <CheckCircle2 size={18} color="#16A34A" />
                  <Text style={{ flex: 1, fontSize: 13, color: '#166534', lineHeight: 19 }}>{ticket.resolutionNote}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: '#FFF4EE', borderRadius: 12, padding: 12, marginTop: 6 }}>
                <Bell size={18} color={VC.orange} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#C2410C' }}>We'll keep you updated</Text>
                  <Text style={{ fontSize: 12, color: '#9A3412' }}>You'll receive notifications in the app for any updates on this ticket.</Text>
                </View>
              </View>
            </SCard>

            {/* Conversation */}
            <SCard style={{ gap: 10 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: VC.ink }}>Conversation</Text>
              {(ticket.messages || []).length === 0 && <Text style={{ fontSize: 12.5, color: VC.muted }}>No messages yet. Our team will reply here.</Text>}
              {(ticket.messages || []).map((m) => {
                const mine = m.from === 'RIDER';
                return (
                  <View key={m._id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: mine ? VC.orangeSoft : VC.surface, borderRadius: 14, padding: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: mine ? VC.orange : '#2563EB' }}>{m.name}</Text>
                    {!!m.text && <Text style={{ fontSize: 13.5, color: VC.ink, marginTop: 2, lineHeight: 19 }}>{m.text}</Text>}
                    <Text style={{ fontSize: 10.5, color: VC.muted, marginTop: 4, alignSelf: 'flex-end' }}>{fmtDateTime(m.at)}</Text>
                  </View>
                );
              })}
              {ticket.status !== 'CLOSED' ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
                  <TextInput value={reply} onChangeText={setReply} multiline maxLength={1000} placeholder={ticket.status === 'RESOLVED' ? 'Still need help? Reply to reopen' : 'Type a message...'} placeholderTextColor={VC.muted} style={{ flex: 1, minHeight: 46, maxHeight: 120, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: VC.ink, textAlignVertical: 'top' }} />
                  <TouchableOpacity disabled={sending || !reply.trim()} onPress={send} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: reply.trim() ? VC.orange : '#FFB394', alignItems: 'center', justifyContent: 'center' }}>
                    {sending ? <ActivityIndicator color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ fontSize: 12.5, color: VC.muted }}>This ticket is closed. Raise a new request if you still need help.</Text>
              )}
            </SCard>

            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: VC.ink, marginBottom: 10 }}>Need immediate help?</Text>
              <ContactButtons context={`about ticket ${ticket.ticketId}`} />
            </View>

            <SCard style={{ padding: 0 }}>
              {[
                { icon: ListChecks, label: 'View all my support requests', sub: '', go: 'support-tickets' },
                { icon: CalendarDays, label: 'Go to My Trips', sub: 'View and manage your bookings', go: '35' },
              ].map((o, i) => (
                <TouchableOpacity key={o.label} onPress={() => onNavigate(o.go)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: VC.hair }}>
                  <o.icon size={20} color={VC.ink} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: VC.ink }}>{o.label}</Text>
                    {!!o.sub && <Text style={{ fontSize: 12, color: VC.body }}>{o.sub}</Text>}
                  </View>
                  <ChevronRight size={16} color={VC.muted} />
                </TouchableOpacity>
              ))}
            </SCard>

            <TouchableOpacity onPress={() => onNavigate('37')} style={{ height: 54, borderRadius: 16, backgroundColor: VC.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#FFFFFF' }}>Back to Support Home</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {toast.node}
    </View>
  );
}
