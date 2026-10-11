import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { AlertTriangle, CheckCircle2, Info, Car, Mountain, Globe, Clock, ChevronRight } from 'lucide-react-native';
import { getCancelReasons, checkCancellation, createCancellation, type CancelReason, type CancelCheck } from '../../../api/cancellation.api';
import { useCancelStore } from '../../../store/useCancelStore';
import { useToast, RadioDot } from '../visa/visaUi';
import { LoadingBlock } from '../tours/tourUi';
import { SupportHeader, SCard, ContactButtons, VC } from '../support/supportUi';

const LOOK = {
  CAB: { icon: Car, color: '#EA580C', bg: '#FFEDD5', noun: 'ride' },
  TOUR: { icon: Mountain, color: '#16A34A', bg: '#DCFCE7', noun: 'booking' },
  VISA: { icon: Globe, color: '#1D4ED8', bg: '#DBEAFE', noun: 'application' },
} as const;

export default function ScreenCancelBooking({ onNavigate, onBack }: { onNavigate: (s: string) => void; onBack?: () => void }) {
  const service = useCancelStore((s) => s.service);
  const bookingId = useCancelStore((s) => s.bookingId);
  const [reasons, setReasons] = useState<CancelReason[]>([]);
  const [check, setCheck] = useState<CancelCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [reasonKey, setReasonKey] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ requestId: string; type: 'INSTANT' | 'REQUEST'; isPaid: boolean } | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!service || !bookingId) return;
    let cancelled = false;
    Promise.all([getCancelReasons(service), checkCancellation(service, bookingId)])
      .then(([r, c]) => {
        if (cancelled) return;
        setReasons(r.data.data || []);
        setCheck(c.data.data);
      })
      .catch(() => !cancelled && toast.show('Could not load. Please try again.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, bookingId]);

  if (!service || !bookingId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ color: VC.body }}>Choose a booking from My Trips.</Text>
        <TouchableOpacity onPress={() => onNavigate('35')} style={{ paddingHorizontal: 18, height: 42, justifyContent: 'center', borderRadius: 12, backgroundColor: VC.orange }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>My Trips</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const look = LOOK[service];
  const isRequest = check?.type === 'REQUEST';
  const title = service === 'CAB' ? 'Cancel ride' : service === 'TOUR' ? 'Cancel booking' : 'Cancel application';
  const needsComment = reasonKey === 'OTHER';
  const canSubmit = !!reasonKey && (!needsComment || comment.trim().length >= 3);

  const submit = async () => {
    if (!reasonKey) return;
    setSubmitting(true);
    try {
      const r = await createCancellation({ service, bookingId, reasonKey, comment: comment.trim() || undefined });
      setConfirm(false);
      setDone({ requestId: r.data.data.requestId, type: r.data.data.type, isPaid: r.data.data.isPaid });
    } catch (e: any) {
      setConfirm(false);
      toast.show(e?.response?.data?.message || 'Could not cancel. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Done ----------
  if (done) {
    const instant = done.type === 'INSTANT';
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <SupportHeader title={instant ? 'Cancelled' : 'Request received'} />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 20 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: instant ? VC.greenSoft : '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
              {instant ? <CheckCircle2 size={44} color="#16A34A" strokeWidth={2} /> : <Clock size={42} color={VC.orange} strokeWidth={2} />}
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: VC.ink, textAlign: 'center' }}>
              {instant ? `Your ${look.noun} is cancelled` : 'Cancellation requested'}
            </Text>
            <Text style={{ fontSize: 14, color: VC.body, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 }}>
              {instant
                ? done.isPaid
                  ? 'Any eligible refund will be processed by our team as per our cancellation policy. We\'ll notify you once it\'s done.'
                  : 'No payment was made, so nothing more is needed.'
                : 'Our team will review your request and get back to you shortly. Your booking stays active until then.'}
            </Text>
            <View style={{ backgroundColor: VC.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontSize: 13, color: VC.body }}>Reference <Text style={{ fontWeight: '800', color: VC.ink }}>{done.requestId}</Text></Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => onNavigate('35')} style={{ height: 54, borderRadius: 16, backgroundColor: VC.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#FFFFFF' }}>Back to My Trips</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <ContactButtons context={`about cancellation ${done.requestId}`} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SupportHeader title={title} subtitle="We're sorry to see you go" onBack={onBack} />
      {loading ? (
        <LoadingBlock label="Loading..." />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 130 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {check?.booking && (
              <SCard style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <look.icon size={22} color={look.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: VC.ink }}>{check.booking.title}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 12.5, color: VC.body, marginTop: 2 }}>{check.booking.subtitle}</Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: VC.muted, marginTop: 3 }}>{check.booking.code}</Text>
                </View>
              </SCard>
            )}

            {check && !check.allowed ? (
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14 }}>
                <AlertTriangle size={20} color="#DC2626" />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#B91C1C' }}>Can't cancel this {look.noun}</Text>
                  <Text style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 19 }}>{check.message}</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 10, backgroundColor: isRequest ? '#FFF7ED' : VC.blueSoft, borderRadius: 16, padding: 14 }}>
                  <Info size={18} color={isRequest ? VC.orange : '#2563EB'} />
                  <Text style={{ flex: 1, fontSize: 13, color: VC.body, lineHeight: 19 }}>
                    {isRequest
                      ? 'Our team will review your cancellation request. Your booking stays active until it is approved.'
                      : check?.isPaid
                        ? `Your ${look.noun} will be cancelled right away. Any eligible refund is processed by our team as per our cancellation policy.`
                        : `Your ${look.noun} will be cancelled right away.`}
                  </Text>
                </View>

                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: VC.ink, letterSpacing: -0.3 }}>Why are you cancelling?</Text>
                  <Text style={{ fontSize: 13, color: VC.body, marginTop: 3 }}>Your answer helps us improve.</Text>
                </View>
                <View style={{ borderWidth: 1, borderColor: VC.hair, borderRadius: 20, overflow: 'hidden' }}>
                  {reasons.map((r, i) => {
                    const on = reasonKey === r.key;
                    return (
                      <TouchableOpacity key={r.key} onPress={() => setReasonKey(r.key)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15, borderTopWidth: i ? 1 : 0, borderTopColor: VC.hair, backgroundColor: on ? '#FFF8F4' : '#FFFFFF' }}>
                        <RadioDot active={on} />
                        <Text style={{ flex: 1, fontSize: 14.5, fontWeight: on ? '700' : '500', color: VC.ink }}>{r.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: VC.ink }}>
                    Anything else? {needsComment ? <Text style={{ color: '#E5484D' }}>*</Text> : <Text style={{ fontWeight: '400', color: VC.muted }}>(optional)</Text>}
                  </Text>
                  <TextInput value={comment} onChangeText={setComment} multiline maxLength={500} placeholder="Tell us more…" placeholderTextColor={VC.muted} style={{ minHeight: 90, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 12, fontSize: 14, color: VC.ink, textAlignVertical: 'top' }} />
                </View>
              </>
            )}

            <ContactButtons context={check?.booking ? `I need help with ${check.booking.code}` : undefined} />
          </ScrollView>

          {check?.allowed && (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 18, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: VC.hair }}>
              <TouchableOpacity onPress={onBack} style={{ flex: 1, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: VC.ink }}>Keep {look.noun}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!canSubmit} onPress={() => setConfirm(true)} style={{ flex: 1, height: 52, borderRadius: 16, backgroundColor: canSubmit ? '#DC2626' : '#FCA5A5', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{isRequest ? 'Request cancellation' : `Cancel ${look.noun}`}</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* Confirm */}
      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(11,27,63,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
              <AlertTriangle size={26} color="#DC2626" />
            </View>
            <Text style={{ fontSize: 19, fontWeight: '800', color: VC.ink, textAlign: 'center' }}>{isRequest ? 'Request cancellation?' : `Cancel this ${look.noun}?`}</Text>
            <Text style={{ fontSize: 13.5, color: VC.body, textAlign: 'center', lineHeight: 20 }}>
              {isRequest ? 'Our team will review it and get back to you.' : 'This can\'t be undone.'}
            </Text>
            <TouchableOpacity disabled={submitting} onPress={submit} style={{ height: 50, borderRadius: 14, backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              {submitting && <ActivityIndicator color="#FFFFFF" />}
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{submitting ? 'Please wait' : 'Yes, cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={submitting} onPress={() => setConfirm(false)} style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: VC.body }}>No, keep it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {toast.node}
    </View>
  );
}
