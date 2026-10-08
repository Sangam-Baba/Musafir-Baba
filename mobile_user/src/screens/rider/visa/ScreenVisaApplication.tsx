import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { CheckCircle2, FileText, CalendarDays, IndianRupee, ListChecks, Mail, Headphones, Eye, AlertTriangle, XCircle, ArrowRight, Users, Crown, Luggage, Clock } from 'lucide-react-native';
import { getVisaApp, getResumeScreen, visaCardTitle, visaStatusLook, isVisaPaid, VISA_PHONE_DISPLAY, type Visa, type VisaApplication } from '../../../api/visa.api';
import { useVisaStore } from '../../../store/useVisaStore';
import { TourHeader, LoadingBlock, inr } from '../tours/tourUi';
import { Card, CountryBanner, VisaStepper, stepSubtitles, openWhatsApp, WhatsAppGlyph, formatYmd, NAVY, ORANGE, MUTED, BORDER, BLUE } from './visaUi';

const TIMELINE = [
  { title: 'Payment Confirmed', text: 'Your payment has been received.' },
  { title: 'Application Review', text: 'Our visa experts review your documents and application.', eta: '1 - 2 working days' },
  { title: 'Application Submission', text: 'We submit your application to the embassy/consulate.' },
  { title: 'Visa Processing', text: 'Your application is processed by the embassy/consulate.', eta: 'As per embassy timeline' },
  { title: 'Visa Decision', text: "We'll notify you as soon as the decision is received.", eta: 'Updates via App & WhatsApp' },
];

// How far along the timeline an application is (index of the step in progress).
const stageOf = (app: VisaApplication) => {
  switch (app.applicationStatus) {
    case 'Pending':
      return 0;
    case 'Submitted':
    case 'Under Review':
    case 'Returned':
      return 1;
    case 'Reviewed':
      return 2;
    case 'Applied':
    case 'Processing':
      return 3;
    case 'Rejected':
      return 4;
    case 'Approved':
      return 5;
    default:
      return 1;
  }
};

const fmtDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${formatYmd(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function ScreenVisaApplication({ variant, onNavigate, onBack }: { variant: 'success' | 'detail'; onNavigate: (screen: string) => void; onBack?: () => void }) {
  const viewed = useVisaStore((s) => s.viewedApp);
  const setViewedApp = useVisaStore((s) => s.setViewedApp);
  const loadApplication = useVisaStore((s) => s.loadApplication);
  const setOpenTripsOnVisa = useVisaStore((s) => s.setOpenTripsOnVisa);
  const storeVisa = useVisaStore((s) => s.visa);
  const [app, setApp] = useState<VisaApplication | null>(viewed);
  const [showDetails, setShowDetails] = useState(false);

  // Always show the latest status.
  useEffect(() => {
    if (!viewed?._id) return;
    let cancelled = false;
    getVisaApp(viewed._id)
      .then((res) => {
        if (!cancelled && res.data.data) {
          setApp(res.data.data);
          setViewedApp(res.data.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewed?._id]);

  if (!app) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <TourHeader onBack={onBack} onBell={() => onNavigate('38')} />
        <LoadingBlock label="Loading application..." />
      </View>
    );
  }

  const visa: Visa | null = typeof app.visaId === 'object' ? app.visaId : storeVisa;
  const card = visa?.visas?.find((c) => c._id === app.selectedVisaId);
  const paid = isVisaPaid(app);
  const stage = stageOf(app);
  const look = visaStatusLook(app);
  const returned = app.applicationStatus === 'Returned';
  const rejected = app.applicationStatus === 'Rejected';
  const isSuccess = variant === 'success' && paid;

  const continueApp = () => {
    loadApplication({ ...app, visaId: visa || app.visaId });
    onNavigate(getResumeScreen({ ...app, visaId: visa || app.visaId }));
  };
  const goToApplications = () => {
    setOpenTripsOnVisa(true);
    onNavigate('35');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#FFFFFF' }}>
          <TourHeader onBack={variant === 'detail' ? onBack : undefined} onBell={() => onNavigate('38')} />
          {visa && <VisaStepper current={paid ? 6 : 5} allDone={paid} subtitles={stepSubtitles(visa, card, paid ? 'Completed' : 'Pay & Submit')} />}
        </View>

        <View style={{ paddingHorizontal: 14, paddingTop: 8, gap: 12 }}>
          {/* Status header */}
          {isSuccess ? (
            <View style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={34} color="#FFFFFF" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: NAVY }}>Payment Successful!</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: NAVY }}>Your visa application has been submitted</Text>
                <Text style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 17 }}>Our visa experts will now process your application and keep you updated at every step.</Text>
              </View>
            </View>
          ) : (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY }}>Visa Application</Text>
                <Text style={{ fontSize: 12, color: MUTED }}>{app.applicationId || 'Draft'}</Text>
              </View>
              <View style={{ backgroundColor: look.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: look.color }}>{look.label}</Text>
              </View>
            </Card>
          )}

          {returned && (
            <View style={{ backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 14, padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <AlertTriangle size={18} color="#C2410C" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#9A3412' }}>Our visa team needs a correction</Text>
                  <Text style={{ fontSize: 12.5, color: '#9A3412', lineHeight: 18, marginTop: 2 }}>{app.returnReason || 'Please check your details and documents.'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={continueApp} style={{ height: 44, borderRadius: 10, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Fix & Resubmit</Text>
                <ArrowRight size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {!paid && (
            <View style={{ backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 14, padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: NAVY }}>
                {app.paymentInfo?.status === 'Failed' ? 'Your last payment did not go through.' : 'Your application is saved as a draft.'}
              </Text>
              <Text style={{ fontSize: 12, color: '#475569' }}>Continue where you left off — nothing you've entered is lost.</Text>
              <TouchableOpacity onPress={continueApp} style={{ height: 44, borderRadius: 10, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{app.paymentInfo?.status === 'Failed' ? 'Retry Payment' : 'Continue Application'}</Text>
                <ArrowRight size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {!!app.resubmittedAt && !returned && stage < 5 && !rejected && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' }}>
              <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12.5, color: '#166534', lineHeight: 18 }}>Resubmitted on {fmtDateTime(app.resubmittedAt)}. Our visa team will review your corrections.</Text>
            </View>
          )}

          {/* Banner has its own side margin */}
          {visa && (
            <View style={{ marginHorizontal: -14 }}>
              <CountryBanner visa={visa} subtitle={card ? visaCardTitle(card) : 'Visa'} chips={[{ icon: Luggage, label: app.eligibility?.purpose || 'Tourism' }, { icon: Clock, label: app.eligibility?.stayDuration || 'Short stay' }]} />
            </View>
          )}

          {/* Key facts */}
          <Card style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
            {[
              { icon: FileText, label: 'Application ID', value: app.applicationId || '—', note: 'Keep for reference' },
              { icon: CalendarDays, label: 'Application Date', value: formatYmd(app.createdAt?.slice(0, 10)), note: fmtDateTime(app.createdAt).split(', ')[1] || '' },
              { icon: IndianRupee, label: paid ? 'Amount Paid' : 'Amount', value: inr(app.totalCost || 0), note: paid ? 'Paid via PayU' : 'Not paid yet' },
            ].map((f, i) => (
              <View key={f.label} style={{ flex: 1, paddingHorizontal: 6, borderLeftWidth: i ? 1 : 0, borderLeftColor: BORDER, gap: 2 }}>
                <f.icon size={18} color={BLUE} />
                <Text style={{ fontSize: 10.5, color: MUTED, marginTop: 2 }}>{f.label}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 13.5, fontWeight: '800', color: NAVY }}>{f.value}</Text>
                <Text numberOfLines={1} style={{ fontSize: 9.5, color: MUTED }}>{f.note}</Text>
              </View>
            ))}
          </Card>

          {/* Timeline */}
          {paid && (
            <Card style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <ListChecks size={20} color={BLUE} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: NAVY }}>{stage >= 5 ? 'Your visa is approved' : 'What Happens Next?'}</Text>
              </View>
              {TIMELINE.map((t, i) => {
                const done = i < stage || stage >= 5;
                const current = i === stage && stage < 5;
                const failed = rejected && i === 4;
                const color = failed ? '#DC2626' : done ? '#16A34A' : current ? BLUE : '#CBD5E1';
                const title = failed ? 'Visa Decision: Rejected' : i === 4 && stage >= 5 ? 'Visa Decision: Approved' : t.title;
                return (
                  <View key={t.title} style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                        {failed ? <XCircle size={14} color="#FFFFFF" /> : done ? <CheckCircle2 size={14} color="#FFFFFF" /> : <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{i + 1}</Text>}
                      </View>
                      {i < TIMELINE.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: done ? '#86EFAC' : '#E2E8F0' }} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 12, flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: failed ? '#B91C1C' : done ? '#15803D' : NAVY }}>{title}</Text>
                        <Text style={{ fontSize: 11.5, color: MUTED, lineHeight: 16 }}>{i === 1 && returned ? 'Waiting for your correction.' : t.text}</Text>
                      </View>
                      <Text style={{ width: 92, fontSize: 10.5, color: current ? BLUE : MUTED, textAlign: 'right' }}>
                        {i === 0 ? 'Done' : current ? `In progress${t.eta ? `\n${t.eta}` : ''}` : done ? 'Done' : t.eta || 'Upcoming'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12 }}>
            <Mail size={22} color={BLUE} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: NAVY }}>You will receive updates at every step!</Text>
              <Text style={{ fontSize: 11.5, color: '#475569' }}>Via the MBGO app, WhatsApp and email ({app.email}).</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { icon: <WhatsAppGlyph size={24} />, title: 'Chat on WhatsApp', text: 'Instant support', onPress: () => openWhatsApp(`Hi MBGO, I have a question about my visa application ${app.applicationId || ''}.`) },
              { icon: <Headphones size={24} color={BLUE} />, title: 'Talk to Visa Expert', text: VISA_PHONE_DISPLAY, onPress: () => Linking.openURL(`tel:${VISA_PHONE_DISPLAY.replace(/\s/g, '')}`).catch(() => {}) },
              { icon: <Eye size={24} color={BLUE} />, title: showDetails ? 'Hide Details' : 'View Application', text: 'Travellers & files', onPress: () => setShowDetails((v) => !v) },
            ].map((a) => (
              <TouchableOpacity key={a.title} onPress={a.onPress} activeOpacity={0.85} style={{ flex: 1, alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4 }}>
                {a.icon}
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: NAVY, textAlign: 'center' }}>{a.title}</Text>
                <Text style={{ fontSize: 10, color: MUTED, textAlign: 'center' }}>{a.text}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {showDetails && (
            <Card style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Users size={18} color={BLUE} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: NAVY }}>Travellers</Text>
              </View>
              {app.travellers.map((t, i) => (
                <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: '#F1F5F9', paddingTop: i ? 8 : 0, gap: 4 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: NAVY }}>{i + 1}. {t.firstName} {t.lastName}</Text>
                  <Text style={{ fontSize: 11.5, color: MUTED }}>{t.gender} · Born {formatYmd(t.dob)}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {app.documents.filter((d) => d.travellerId === String(i)).map((d) => (
                      <TouchableOpacity key={d.name} onPress={() => Linking.openURL(d.media.url).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <FileText size={12} color={BLUE} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: BLUE }}>{d.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </Card>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
            <Crown size={22} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>Relax, we are with you!</Text>
              <Text style={{ fontSize: 11.5, color: '#92400E', lineHeight: 16 }}>Our visa experts handle the complete process and guide you till your visa is approved.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEF2F6', padding: 12 }}>
        <TouchableOpacity onPress={goToApplications} activeOpacity={0.85} style={{ height: 50, borderRadius: 12, backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Go to My Applications</Text>
          <ArrowRight size={17} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
