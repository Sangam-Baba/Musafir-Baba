import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Pencil, Phone, MessageCircle, Clock, ShieldCheck, ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react-native';
import { createSupportTicket } from '../../../api/support.api';
import { useSupportStore } from '../../../store/useSupportStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToast } from '../visa/visaUi';
import { SupportHeader, SupportHero, SupportStepper, SCard, BookingRow, issueLook, VC } from './supportUi';

function EditHead({ title, onEdit }: { title: string; onEdit?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 15.5, fontWeight: '800', color: VC.ink }}>{title}</Text>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pencil size={14} color={VC.orange} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: VC.orange }}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ScreenSupportReview({ onNavigate, onBack }: { onNavigate: (s: string) => void; onBack?: () => void }) {
  const st = useSupportStore();
  const profile = useAuthStore((s) => s.profile);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!st.contactValue && profile?.mobileNumber) st.patch({ contactValue: profile.mobileNumber });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.mobileNumber]);

  if (!st.service || !st.issue) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ color: VC.body }}>Nothing to review yet.</Text>
        <TouchableOpacity onPress={() => onNavigate('37')} style={{ paddingHorizontal: 18, height: 42, justifyContent: 'center', borderRadius: 12, backgroundColor: VC.orange }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Help & Support</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const { service, issue, booking } = st;
  const look = issueLook(issue.key);

  const submit = async () => {
    if (st.contactValue.replace(/\D/g, '').length < 10) return toast.show('Enter a valid 10-digit contact number');
    setSubmitting(true);
    try {
      const res = await createSupportTicket({
        service: service.key,
        issueKey: issue.key,
        bookingId: booking?.id,
        quickOptions: st.quickOptions,
        description: st.description.trim(),
        attachments: st.attachments,
        preferredContact: { method: st.contactMethod, value: st.contactValue.trim() },
        expectedResolution: st.expectedResolution.trim(),
      });
      st.openTicket(res.data.data._id, res.data.data);
      onNavigate('support-submitted');
    } catch (e: any) {
      toast.show(e?.response?.data?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: '#FFFFFF', paddingBottom: 4 }}>
            <SupportHeader title={`${service.label} Support`} subtitle={`Get help with your ${service.label.toLowerCase()} booking`} onBack={onBack} />
            <SupportStepper current={3} />
            <SupportHero icon={look.icon} overline="STEP 3 OF 4" line1="Review & submit" line2="your request" sub="Check the details once before you submit." />
          </View>

          <View style={{ paddingHorizontal: 16, gap: 14, marginTop: 16 }}>
            {booking && (
              <SCard style={{ gap: 10 }}>
                <EditHead title="Booking Details" />
                <BookingRow kind={booking.kind} title={booking.title} subtitle={booking.subtitle} code={booking.code} status={booking.status} />
              </SCard>
            )}

            <SCard style={{ gap: 10 }}>
              <EditHead title="Issue Details" onEdit={() => onNavigate('support-service')} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <look.icon size={20} color={look.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: VC.ink }}>{issue.label}</Text>
                  <Text style={{ fontSize: 12.5, color: VC.body }}>{st.quickOptions.length ? st.quickOptions.join(' · ') : issue.hint}</Text>
                </View>
              </View>
            </SCard>

            <SCard style={{ gap: 10 }}>
              <EditHead title="Your Description" onEdit={onBack} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <MessageSquareText size={20} color={VC.orange} />
                <Text style={{ flex: 1, fontSize: 13.5, color: VC.body, lineHeight: 20 }}>{st.description}</Text>
              </View>
            </SCard>

            {st.attachments.length > 0 && (
              <SCard style={{ gap: 10 }}>
                <EditHead title={`Attachments (${st.attachments.length})`} onEdit={onBack} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {st.attachments.map((a) => (
                    <Image key={a.url} source={{ uri: a.url }} style={{ width: 88, height: 88, borderRadius: 12, backgroundColor: '#F1F5F9' }} />
                  ))}
                </ScrollView>
              </SCard>
            )}

            <SCard style={{ gap: 12 }}>
              <EditHead title="Preferred Contact Method" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([
                  ['CALL', 'Call me', Phone],
                  ['WHATSAPP', 'WhatsApp', MessageCircle],
                ] as const).map(([key, label, Icon]) => {
                  const on = st.contactMethod === key;
                  return (
                    <TouchableOpacity key={key} onPress={() => st.patch({ contactMethod: key })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: on ? VC.orange : '#E2E8F0', backgroundColor: on ? VC.orangeSoft : '#FFFFFF' }}>
                      <Icon size={16} color={on ? VC.orange : VC.body} />
                      <Text style={{ fontSize: 13.5, fontWeight: on ? '800' : '500', color: on ? VC.orange : VC.body }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput value={st.contactValue} onChangeText={(t) => st.patch({ contactValue: t })} keyboardType="phone-pad" maxLength={14} placeholder="10-digit mobile number" placeholderTextColor={VC.muted} style={{ height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, fontSize: 15, color: VC.ink }} />
            </SCard>

            <SCard style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color={VC.orange} />
                <Text style={{ fontSize: 15.5, fontWeight: '800', color: VC.ink }}>Expected Resolution <Text style={{ fontSize: 12, fontWeight: '400', color: VC.muted }}>(optional)</Text></Text>
              </View>
              <TextInput value={st.expectedResolution} onChangeText={(t) => st.patch({ expectedResolution: t })} multiline maxLength={300} placeholder="e.g. Please send another driver or refund the extra amount" placeholderTextColor={VC.muted} style={{ minHeight: 70, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, color: VC.ink, textAlignVertical: 'top' }} />
            </SCard>

            <View style={{ flexDirection: 'row', gap: 10, backgroundColor: '#FFF4EE', borderRadius: 16, padding: 14 }}>
              <ShieldCheck size={22} color={VC.orange} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#C2410C' }}>We're on it!</Text>
                <Text style={{ fontSize: 12.5, color: '#9A3412' }}>Our support team will review your request and get back to you shortly.</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={onBack} style={{ flex: 1, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ChevronLeft size={18} color={VC.ink} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: VC.ink }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={submitting} onPress={submit} style={{ flex: 1.2, height: 52, borderRadius: 16, backgroundColor: submitting ? '#FFB394' : VC.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {submitting && <ActivityIndicator color="#FFFFFF" />}
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{submitting ? 'Submitting' : 'Submit Request'}</Text>
                {!submitting && <ChevronRight size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {toast.node}
    </View>
  );
}
