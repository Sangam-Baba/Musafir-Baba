import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { ChevronRight, ChevronDown, Siren, MessageSquareText, X, Check } from 'lucide-react-native';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import { getSupportBookings, type SupportBooking } from '../../../api/support.api';
import { useSupportStore } from '../../../store/useSupportStore';
import { LoadingBlock } from '../tours/tourUi';
import { SupportHeader, SupportHero, SupportStepper, SCard, SectionTitle, BookingRow, ContactButtons, IssueRow, SERVICE_LOOK, SUPPORT_FAQS, callSupport, VC } from './supportUi';

const HERO: Record<string, [string, string, string]> = {
  CAB: ['Hassle-free', 'Rides, Always', "We're here to ensure your journey is smooth and stress-free."],
  TOUR: ['Holidays', 'Made Easy', 'Help with your holiday package, any time.'],
  VISA: ['Visa Help,', 'Every Step', 'Status, documents or payments, we have you covered.'],
  SAFETY: ['Your Safety', 'Comes First', 'Tell us what happened. Urgent issues are handled first.'],
};

export default function ScreenSupportService({ onNavigate, onBack }: { onNavigate: (s: string) => void; onBack?: () => void }) {
  const service = useSupportStore((s) => s.service);
  const booking = useSupportStore((s) => s.booking);
  const setBooking = useSupportStore((s) => s.setBooking);
  const chooseIssue = useSupportStore((s) => s.chooseIssue);
  const [bookings, setBookings] = useState<SupportBooking[]>([]);
  const [loading, setLoading] = useState(!!service?.bookingKind);
  const [picker, setPicker] = useState(false);
  const [custom, setCustom] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!service?.bookingKind) return;
    let cancelled = false;
    getSupportBookings(service.key)
      .then((r) => {
        if (cancelled) return;
        const list = r.data.data || [];
        setBookings(list);
        if (!useSupportStore.getState().booking && list[0]) setBooking(list[0]);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [service?.key, service?.bookingKind, setBooking]);

  if (!service) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ color: VC.body }}>Choose a service first.</Text>
        <TouchableOpacity onPress={() => onNavigate('37')} style={{ paddingHorizontal: 18, height: 42, justifyContent: 'center', borderRadius: 12, backgroundColor: VC.orange }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Help & Support</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const issues = service.issues.filter((i) => i.key !== 'OTHER');
  const otherIssue = service.issues.find((i) => i.key === 'OTHER') || (service.issues.length === 1 ? service.issues[0] : null);
  const hero = HERO[service.key] || ['How can we', 'help you?', `Get help with ${service.label.toLowerCase()}.`];
  const faqs = SUPPORT_FAQS[service.key] || SUPPORT_FAQS.GENERAL;
  const showEmergency = service.key === 'CAB' || service.key === 'SAFETY';

  const pick = (issue: (typeof service.issues)[number], description?: string) => {
    chooseIssue(issue, description);
    onNavigate('support-details');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: '#FFFFFF', paddingBottom: 4 }}>
          <SupportHeader title={`${service.label} Support`} subtitle={`Get help with your ${service.label.toLowerCase()} booking`} onBack={onBack} />
          <SupportStepper current={1} />
          <SupportHero icon={(SERVICE_LOOK[service.key] || SERVICE_LOOK.OTHER).icon} line1={hero[0]} line2={hero[1]} sub={hero[2]} />
        </View>

        <View style={{ paddingHorizontal: 16, gap: 20, marginTop: 16 }}>
          {/* Booking */}
          {service.bookingKind && (
            <SCard style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: VC.ink }}>{booking ? 'Selected Booking' : 'Select a booking to get help'}</Text>
                {bookings.length > 0 && (
                  <TouchableOpacity onPress={() => setPicker(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: VC.orange }}>{booking ? 'Change Booking' : 'View all'}</Text>
                    <ChevronRight size={15} color={VC.orange} />
                  </TouchableOpacity>
                )}
              </View>
              {loading ? (
                <LoadingBlock label="Loading your bookings..." />
              ) : booking ? (
                <BookingRow kind={booking.kind} title={booking.title} subtitle={booking.subtitle} code={booking.code} status={booking.status} />
              ) : (
                <Text style={{ fontSize: 13, color: VC.body }}>{bookings.length ? 'Choose the booking your issue is about, or continue without one.' : `No ${service.label.toLowerCase()} bookings yet. You can still raise a request.`}</Text>
              )}
            </SCard>
          )}

          {/* Issues */}
          <View>
            <SectionTitle title="What seems to be the issue?" subtitle="Choose the option that best describes your concern." />
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: VC.hair, overflow: 'hidden' }}>
              {issues.map((issue, i) => (
                <IssueRow key={issue.key} issueKey={issue.key} label={issue.label} hint={issue.hint} first={i === 0} onPress={() => pick(issue)} />
              ))}
            </View>
          </View>

          {/* Emergency */}
          {showEmergency && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF2F2', borderRadius: 18, padding: 14 }}>
              <Siren size={28} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#B91C1C' }}>Emergency & Safety</Text>
                <Text style={{ fontSize: 12, color: '#7F1D1D', marginTop: 2 }}>Urgent help 24x7. For police/medical emergencies dial 112.</Text>
              </View>
              <TouchableOpacity onPress={callSupport} style={{ backgroundColor: '#DC2626', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>Call Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Can't find */}
          {otherIssue && (
            <View style={{ backgroundColor: VC.blueSoft, borderRadius: 18, padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MessageSquareText size={22} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: VC.ink }}>Can't find your issue?</Text>
                  <Text style={{ fontSize: 12.5, color: VC.body }}>Describe your problem in your own words.</Text>
                </View>
              </View>
              <TextInput
                value={custom}
                onChangeText={setCustom}
                multiline
                maxLength={500}
                placeholder="Type your issue here..."
                placeholderTextColor={VC.muted}
                style={{ minHeight: 84, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, fontSize: 14, color: VC.ink, textAlignVertical: 'top' }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11.5, color: VC.muted }}>{custom.length}/500</Text>
                <TouchableOpacity disabled={custom.trim().length < 3} onPress={() => pick(otherIssue, custom.trim())} style={{ backgroundColor: custom.trim().length < 3 ? '#FFB394' : VC.orange, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#FFFFFF' }}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* FAQs */}
          <View>
            <SectionTitle title="Related FAQs" subtitle="Quick answers to common questions" />
            <View style={{ borderWidth: 1, borderColor: VC.hair, borderRadius: 18, overflow: 'hidden' }}>
              {faqs.map((f, i) => (
                <TouchableOpacity key={i} onPress={() => setOpenFaq(openFaq === i ? null : i)} style={{ paddingHorizontal: 14, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: VC.hair }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: VC.ink }}>{f.q}</Text>
                    <ChevronDown size={16} color={VC.muted} style={{ transform: [{ rotate: openFaq === i ? '180deg' : '0deg' }] }} />
                  </View>
                  {openFaq === i && <Text style={{ fontSize: 13, color: VC.body, lineHeight: 19, marginTop: 6 }}>{f.a}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <ContactButtons context={`I need help with ${service.label}${booking ? ` (${booking.code})` : ''}`} />
        </View>
      </ScrollView>
      <RiderBottomNavbar activeScreen="37" onNavigate={onNavigate} />

      {/* Booking picker */}
      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setPicker(false)} style={{ flex: 1, backgroundColor: 'rgba(11,27,63,0.45)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} style={{ maxHeight: '75%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: VC.ink }}>Select a booking</Text>
              <TouchableOpacity onPress={() => setPicker(false)}>
                <X size={20} color={VC.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              {bookings.map((b) => {
                const on = booking?.id === b.id;
                return (
                  <TouchableOpacity key={b.id} onPress={() => { setBooking(b); setPicker(false); }} style={{ borderWidth: 1.5, borderColor: on ? VC.orange : VC.hair, borderRadius: 16, padding: 10, backgroundColor: on ? '#FFF7F2' : '#FFFFFF' }}>
                    <BookingRow kind={b.kind} title={b.title} subtitle={b.subtitle} code={b.code} status={b.status} right={on ? <Check size={18} color={VC.orange} /> : null} />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={() => { setBooking(null); setPicker(false); }} style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: VC.body }}>My issue isn't about a specific booking</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
