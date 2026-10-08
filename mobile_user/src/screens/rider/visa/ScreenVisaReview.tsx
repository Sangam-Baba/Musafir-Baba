import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { CheckCircle2, Users, ClipboardCheck, FileSearch, Pencil, Luggage, Clock, Mail, Phone } from 'lucide-react-native';
import { getRequiredDocuments, saveVisaDraft, resubmitVisaApp, visaCardTitle, type VisaCard } from '../../../api/visa.api';
import { useVisaStore } from '../../../store/useVisaStore';
import { TourHeader } from '../tours/tourUi';
import { Card, CardTitle, CountryBanner, VisaFooter, VisaStepper, PageTitle, CheckBox, documentLook, stepSubtitles, useToast, formatYmd, NAVY, ORANGE, MUTED, BORDER, BLUE } from './visaUi';

const CHECKS = ['Names and passport details are correct', 'Travel dates are as planned', 'Documents are clear and valid', 'All required documents are uploaded'];

export default function ScreenVisaReview({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const visa = useVisaStore((s) => s.visa);
  const selection = useVisaStore((s) => s.selection);
  const eligibility = useVisaStore((s) => s.eligibility);
  const travellers = useVisaStore((s) => s.travellers);
  const contact = useVisaStore((s) => s.contact);
  const documents = useVisaStore((s) => s.documents);
  const application = useVisaStore((s) => s.application);
  const setSaved = useVisaStore((s) => s.setSaved);
  const setViewedApp = useVisaStore((s) => s.setViewedApp);
  const mode = useVisaStore((s) => s.mode);
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!visa || !application) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' }}>
        <Text style={{ color: MUTED }}>Nothing to review yet.</Text>
        <TouchableOpacity onPress={() => onNavigate('visa')} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: ORANGE }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Browse visas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card: VisaCard | undefined = (visa.visas || []).find((c) => c._id === selection.selectedVisaId);
  const required = getRequiredDocuments(visa);
  const allChecked = checked.every(Boolean);

  const proceed = async () => {
    if (!allChecked) return toast.show('Please confirm the checklist to continue');
    setBusy(true);
    try {
      if (mode === 'fix') {
        const res = await resubmitVisaApp(application._id);
        setViewedApp({ ...res.data.data, visaId: visa });
        // Root-level screen, so back goes Home rather than to this review.
        onNavigate('visa-resubmitted');
      } else {
        // Re-save to get the server's final fee for the payment screen.
        const res = await saveVisaDraft(application._id, { currentStep: 3 });
        setSaved(res.data.data, res.data.fee);
        onNavigate('visa-payment');
      }
    } catch (e: any) {
      toast.show(e?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#FFFFFF' }}>
          <TourHeader onBack={onBack} onBell={() => onNavigate('38')} />
          <VisaStepper current={4} subtitles={stepSubtitles(visa, card)} />
        </View>
        <PageTitle title="Review Your Application" subtitle="Check everything once before you submit it to our visa experts." />
        <CountryBanner visa={visa} subtitle={card ? visaCardTitle(card) : 'Visa'} chips={[{ icon: Luggage, label: eligibility.purpose || 'Tourism' }, { icon: Clock, label: eligibility.stayDuration || 'Short stay' }]} />

        <View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 12 }}>
          {/* Travellers */}
          <Card style={{ gap: 10 }}>
            <CardTitle
              icon={Users}
              title="Travellers & Contact"
              right={
                <TouchableOpacity onPress={() => onNavigate('visa-details')} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: ORANGE }}>Edit</Text>
                  <Pencil size={12} color={ORANGE} />
                </TouchableOpacity>
              }
            />
            {travellers.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: BLUE }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: NAVY }}>{t.firstName} {t.lastName}</Text>
                  <Text style={{ fontSize: 11.5, color: MUTED }}>{t.gender} · Born {formatYmd(t.dob)}</Text>
                </View>
              </View>
            ))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Mail size={13} color={MUTED} />
                <Text style={{ fontSize: 12, color: '#334155' }}>{contact.email || application.email}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Phone size={13} color={MUTED} />
                <Text style={{ fontSize: 12, color: '#334155' }}>{contact.phone || application.phone}</Text>
              </View>
            </View>
          </Card>

          {/* Documents */}
          <Card style={{ gap: 4, paddingHorizontal: 0, paddingBottom: 4 }}>
            <View style={{ paddingHorizontal: 14, paddingBottom: 6 }}>
              <CardTitle
                icon={FileSearch}
                title="Your Documents"
                subtitle="Our visa experts verify every file after you submit."
                right={
                  <TouchableOpacity onPress={() => onNavigate('visa-documents')} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: ORANGE }}>Edit</Text>
                    <Pencil size={12} color={ORANGE} />
                  </TouchableOpacity>
                }
              />
            </View>
            {travellers.map((t, ti) => (
              <View key={ti}>
                {travellers.length > 1 && <Text style={{ paddingHorizontal: 14, paddingTop: 8, fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.firstName} {t.lastName}</Text>}
                {required.map((name) => {
                  const look = documentLook(name);
                  const doc = documents.find((d) => d.travellerId === String(ti) && d.name === name);
                  return (
                    <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                      <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <look.icon size={17} color={look.color} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: NAVY }}>{name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: doc ? '#DCFCE7' : '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        {doc ? <CheckCircle2 size={12} color="#16A34A" /> : null}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: doc ? '#15803D' : '#B45309' }}>{doc ? 'Uploaded' : 'Missing'}</Text>
                      </View>
                      {doc && (
                        <TouchableOpacity onPress={() => Linking.openURL(doc.media.url).catch(() => {})} style={{ borderWidth: 1, borderColor: BLUE, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: BLUE }}>View</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </Card>

          {/* Expert review note */}
          <View style={{ flexDirection: 'row', gap: 10, backgroundColor: '#F5F9FF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#DBEAFE' }}>
            <Users size={26} color={BLUE} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: NAVY }}>Visa Expert Review</Text>
              <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>After you submit, our specialists check every document for completeness and clarity. If anything needs changes, we'll notify you here and on WhatsApp.</Text>
            </View>
          </View>

          {/* Checklist */}
          <Card style={{ gap: 10 }}>
            <CardTitle icon={ClipboardCheck} title="Final Review Checklist" subtitle="Please confirm before you proceed." />
            {CHECKS.map((c, i) => (
              <TouchableOpacity key={c} onPress={() => setChecked((list) => list.map((v, idx) => (idx === i ? !v : v)))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CheckBox checked={checked[i]} />
                <Text style={{ flex: 1, fontSize: 13, color: '#334155' }}>{c}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setChecked(CHECKS.map(() => !allChecked))}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: BLUE }}>{allChecked ? 'Clear all' : 'Confirm all'}</Text>
            </TouchableOpacity>
          </Card>
          {mode === 'fix' && <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center', paddingHorizontal: 10 }}>No extra payment is needed. Your corrected application goes straight back to our visa team.</Text>}
        </View>
      </ScrollView>

      <VisaFooter
        whatsappMessage={`Hi MBGO, I have a question about my ${visa.country} visa application ${application.applicationId || ''}.`}
        label={mode === 'fix' ? 'Resubmit Application' : 'Continue to Payment'}
        onPress={proceed}
        loading={busy}
        disabled={!allChecked}
      />
      {toast.node}
    </View>
  );
}
