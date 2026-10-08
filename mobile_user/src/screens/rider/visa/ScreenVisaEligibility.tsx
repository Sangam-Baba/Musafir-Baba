import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import {
  Luggage,
  Users,
  Briefcase,
  GraduationCap,
  HardHat,
  MoreHorizontal,
  CalendarDays,
  Lightbulb,
  Check,
  Info,
  Pencil,
  FileText,
  Headphones,
  ChevronRight,
  Minus,
  Plus,
  Clock,
  Lock,
} from 'lucide-react-native';
import { ELIGIBILITY_PURPOSES, STAY_DURATIONS, VISA_MAX_TRAVELLERS, getRequiredDocuments, visaCardTitle, type VisaCard } from '../../../api/visa.api';
import { useVisaStore, resizeTravellers } from '../../../store/useVisaStore';
import { Card, CardTitle, CountryBanner, VisaFooter, VisaHeader, VisaStepper, PageTitle, DateField, Chip, RadioDot, ProgressBar, ProgressRing, stepSubtitles, openWhatsApp, useToast, formatYmd, toYmd, VC } from './visaUi';

const PURPOSE_LOOK: Record<string, { icon: any; text: string }> = {
  'Holiday / Tourism': { icon: Luggage, text: 'Leisure travel, sightseeing and vacation' },
  'Visit Family or Friends': { icon: Users, text: 'Meeting family or friends' },
  'Business Visit': { icon: Briefcase, text: 'Meetings, conferences or business work' },
  Study: { icon: GraduationCap, text: 'Courses or higher education' },
  Work: { icon: HardHat, text: 'Employment or work permit' },
  Other: { icon: MoreHorizontal, text: 'Any other purpose of travel' },
};

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: VC.ink, marginBottom: 8 }}>
      {text} <Text style={{ color: '#E5484D' }}>*</Text>
    </Text>
  );
}

function Overline({ text, color = VC.orange }: { text: string; color?: string }) {
  return <Text style={{ fontSize: 11, fontWeight: '700', color, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>{text}</Text>;
}

function Tick() {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: VC.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Check size={13} color="#16A34A" strokeWidth={3} />
    </View>
  );
}

export default function ScreenVisaEligibility({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const visa = useVisaStore((s) => s.visa);
  const selection = useVisaStore((s) => s.selection);
  const eligibility = useVisaStore((s) => s.eligibility);
  const setEligibility = useVisaStore((s) => s.setEligibility);
  const travellers = useVisaStore((s) => s.travellers);
  const setTravellers = useVisaStore((s) => s.setTravellers);
  const documents = useVisaStore((s) => s.documents);
  const application = useVisaStore((s) => s.application);
  const [phase, setPhase] = useState<'questions' | 'result'>(eligibility.purpose && eligibility.travelDate && eligibility.stayDuration ? 'result' : 'questions');
  const narrow = useWindowDimensions().width < 400;
  const toast = useToast();

  if (!visa) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 14, color: VC.body }}>Please choose a country first.</Text>
        <TouchableOpacity onPress={() => onNavigate('visa')} style={{ paddingHorizontal: 20, height: 42, justifyContent: 'center', borderRadius: 12, backgroundColor: VC.orange }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Browse visas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card: VisaCard | undefined = (visa.visas || []).find((c) => c._id === selection.selectedVisaId);
  const typeLabel = card ? visaCardTitle(card) : 'Visa';
  // After payment the number of travellers is fixed.
  const countLocked = application?.paymentInfo?.status === 'Paid';
  const answered = [eligibility.purpose, eligibility.travelDate, eligibility.stayDuration, eligibility.travellerCount > 0].filter(Boolean).length;
  const docsRequired = getRequiredDocuments(visa);
  const totalDocs = docsRequired.length * eligibility.travellerCount;
  const uploaded = documents.filter((d) => Number(d.travellerId) < eligibility.travellerCount && docsRequired.includes(d.name)).length;
  const readiness = totalDocs ? (uploaded / totalDocs) * 100 : 0;
  const today = new Date();
  const banner = <CountryBanner visa={visa} subtitle={typeLabel} chips={[{ icon: Luggage, label: card?.visaPurpose || 'Tourism' }, { icon: Clock, label: card?.validityEntries?.[selection.selectedValidityIndex]?.visaDuration || visa.duration || 'Short stay' }]} />;
  const top = (
    <View style={{ backgroundColor: '#FFFFFF' }}>
      <VisaHeader onBack={onBack} onBell={() => onNavigate('38')} />
      <VisaStepper current={3} subtitles={stepSubtitles(visa, card)} />
    </View>
  );

  const setCount = (n: number) => {
    if (countLocked) return;
    const count = Math.max(1, Math.min(VISA_MAX_TRAVELLERS, n));
    setEligibility({ travellerCount: count });
    setTravellers(resizeTravellers(travellers, count));
  };

  const check = () => {
    if (!eligibility.purpose) return toast.show('Please choose the purpose of your trip');
    if (!eligibility.travelDate) return toast.show('Please choose your planned travel date');
    if (eligibility.travelDate < toYmd(today)) return toast.show('Travel date must be in the future');
    if (!eligibility.stayDuration) return toast.show('Please choose how long you plan to stay');
    setPhase('result');
  };

  const whatsapp = `Hi MBGO, I need help with my ${visa.country} ${typeLabel} application.`;

  // ---------------- Result ----------------
  if (phase === 'result') {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ScrollView key="result" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {top}
          {banner}
          <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 16 }}>
            {/* Result */}
            <View style={{ backgroundColor: '#ECFDF3', borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: '#CDEFD9' }}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#D1F5DE', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={26} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Overline text="Great news" color="#15803D" />
                  <Text style={{ fontSize: narrow ? 18 : 19.5, fontWeight: '800', color: VC.ink, letterSpacing: -0.4, lineHeight: 25 }}>You appear eligible to proceed</Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, color: VC.body, lineHeight: 21 }}>
                Based on your answers, your profile looks suitable for a {visa.country} {typeLabel} application.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 14, padding: 12 }}>
                <Info size={16} color="#15803D" strokeWidth={2.2} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 12.5, color: '#166534', lineHeight: 18 }}>This is a preliminary assessment and doesn't guarantee approval. The final decision is taken by the embassy/consulate.</Text>
              </View>
            </View>

            {/* Profile summary */}
            <Card style={{ gap: 14 }}>
              <CardTitle
                icon={FileText}
                title="Your profile summary"
                subtitle="Here's what you told us."
                right={
                  <TouchableOpacity onPress={() => setPhase('questions')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: VC.orangeSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Pencil size={12} color={VC.orange} strokeWidth={2.4} />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: VC.orange }}>Edit</Text>
                  </TouchableOpacity>
                }
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { icon: Luggage, label: 'Purpose', value: eligibility.purpose, color: VC.orange, bg: VC.orangeSoft },
                  { icon: CalendarDays, label: 'Travel', value: `${formatYmd(eligibility.travelDate)}\n${eligibility.stayDuration}`, color: '#2563EB', bg: VC.blueSoft },
                  { icon: Users, label: 'Travellers', value: `${eligibility.travellerCount} ${eligibility.travellerCount > 1 ? 'people' : 'person'}`, color: '#16A34A', bg: VC.greenSoft },
                ].map((x) => (
                  <View key={x.label} style={{ flex: 1, backgroundColor: VC.surface, borderRadius: 16, padding: 12, gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: x.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <x.icon size={16} color={x.color} strokeWidth={2.2} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 11.5, color: VC.muted }}>{x.label}</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: VC.ink, lineHeight: 19, marginTop: 1 }}>{x.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {/* Documents to keep ready */}
            <Card style={{ gap: 14 }}>
              <CardTitle icon={FileText} title="Documents you'll need" subtitle="Keep these ready for each traveller." />
              <View style={{ gap: 12 }}>
                {docsRequired.map((d) => (
                  <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Tick />
                    <Text style={{ flex: 1, fontSize: 14, color: VC.ink }}>{d}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: VC.hair, paddingTop: 12 }}>
                <Info size={13} color={VC.muted} strokeWidth={2.2} />
                <Text style={{ fontSize: 12, color: VC.muted }}>PDF, JPG or PNG · up to 5 MB per file</Text>
              </View>
            </Card>

            {/* Readiness */}
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <ProgressRing percent={readiness} size={68} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: VC.ink }}>Document readiness</Text>
                <Text style={{ fontSize: 13, color: VC.body }}>{uploaded} of {totalDocs} documents uploaded</Text>
                <View style={{ marginTop: 4 }}>
                  <ProgressBar percent={readiness} />
                </View>
              </View>
            </Card>

            {/* Help */}
            <TouchableOpacity onPress={() => openWhatsApp(`Hi MBGO, I need help with documents for my ${visa.country} visa.`)} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: VC.surface, borderRadius: 20, padding: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: VC.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Headphones size={21} color="#2563EB" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: VC.ink }}>Need help with documents?</Text>
                <Text style={{ fontSize: 12.5, color: VC.body, marginTop: 2, lineHeight: 18 }}>Our visa experts will guide you through the checklist.</Text>
              </View>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={16} color={VC.ink} strokeWidth={2.4} />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <VisaFooter whatsappMessage={whatsapp} label="Continue to Your Details" onPress={() => onNavigate('visa-details')} />
        {toast.node}
      </View>
    );
  }

  // ---------------- Questions ----------------
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView key="questions" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {top}
        {banner}
        <PageTitle title="Check your eligibility" subtitle="Answer a few quick questions so our experts understand your trip." />

        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {/* Progress */}
          <View style={{ backgroundColor: VC.surface, borderRadius: 18, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: VC.ink }}>
                {answered} of 4 <Text style={{ fontWeight: '500', color: VC.body }}>answered</Text>
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: answered === 4 ? '#16A34A' : VC.orange }}>{Math.round((answered / 4) * 100)}%</Text>
            </View>
            <ProgressBar percent={(answered / 4) * 100} />
          </View>

          {/* Purpose */}
          <Card style={{ gap: 16 }}>
            <View>
              <Overline text="Question 1" />
              <Text style={{ fontSize: 17, fontWeight: '700', color: VC.ink, letterSpacing: -0.3, lineHeight: 23 }}>What's the main purpose of your trip to {visa.country}?</Text>
              <Text style={{ fontSize: 13, color: VC.body, marginTop: 4 }}>Choose the option that best describes it.</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
              {ELIGIBILITY_PURPOSES.map((p) => {
                const look = PURPOSE_LOOK[p];
                const active = eligibility.purpose === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setEligibility({ purpose: p })}
                    activeOpacity={0.88}
                    style={{ width: '48.5%', minHeight: 112, borderRadius: 18, borderWidth: 1.5, borderColor: active ? VC.orange : 'transparent', backgroundColor: active ? VC.orangeSoft : VC.surface, padding: 12, gap: 8 }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                        <look.icon size={18} color={active ? VC.orange : '#2563EB'} strokeWidth={2.2} />
                      </View>
                      <RadioDot active={active} />
                    </View>
                    <View>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: VC.ink }}>{p}</Text>
                      <Text style={{ fontSize: 11.5, color: VC.body, lineHeight: 16, marginTop: 2 }}>{look.text}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Travel details */}
          <Card style={{ gap: 18 }}>
            <View>
              <Overline text="Questions 2 – 4" />
              <Text style={{ fontSize: 17, fontWeight: '700', color: VC.ink, letterSpacing: -0.3 }}>Your travel details</Text>
              <Text style={{ fontSize: 13, color: VC.body, marginTop: 4 }}>Help us understand your planned trip to {visa.country}.</Text>
            </View>
            <View>
              <FieldLabel text="Planned travel date" />
              <DateField value={eligibility.travelDate} onChange={(v) => setEligibility({ travelDate: v })} placeholder="Select date" minimumDate={today} />
            </View>
            <View>
              <FieldLabel text="Intended stay" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {STAY_DURATIONS.map((d) => (
                  <Chip key={d} label={d} active={eligibility.stayDuration === d} onPress={() => setEligibility({ stayDuration: d })} />
                ))}
              </View>
            </View>
            <View>
              <FieldLabel text="Number of travellers" />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: VC.surface, borderRadius: 16, padding: 8, opacity: countLocked ? 0.6 : 1 }}>
                <TouchableOpacity disabled={countLocked || eligibility.travellerCount <= 1} onPress={() => setCount(eligibility.travellerCount - 1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...(eligibility.travellerCount <= 1 ? { opacity: 0.45 } : {}) }}>
                  <Minus size={18} color={VC.ink} strokeWidth={2.4} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: VC.ink }}>{eligibility.travellerCount}</Text>
                  <Text style={{ fontSize: 12, color: VC.muted }}>{eligibility.travellerCount > 1 ? 'Travellers' : 'Traveller'}</Text>
                </View>
                <TouchableOpacity disabled={countLocked} onPress={() => setCount(eligibility.travellerCount + 1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: VC.orange, alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
              {countLocked && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                  <Lock size={12} color={VC.muted} />
                  <Text style={{ fontSize: 12, color: VC.muted }}>Fixed after payment</Text>
                </View>
              )}
            </View>
          </Card>

          {/* Note */}
          <View style={{ flexDirection: 'row', gap: 12, backgroundColor: '#F2F6FF', borderRadius: 18, padding: 16 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <Lightbulb size={18} color="#2563EB" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: VC.ink, lineHeight: 20 }}>Your answers help us recommend the right application and documents.</Text>
              <Text style={{ fontSize: 12.5, color: VC.body, lineHeight: 18, marginTop: 4 }}>Guidance only — the final decision is taken by the embassy/consulate.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <VisaFooter whatsappMessage={whatsapp} label="Check Eligibility" onPress={check} disabled={answered < 4} />
      {toast.node}
    </View>
  );
}
