import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { User, Mail, Info, Luggage, Clock } from 'lucide-react-native';
import { saveVisaDraft, visaCardTitle, type VisaCard, type VisaGender, type VisaTraveller } from '../../../api/visa.api';
import { useVisaStore, resizeTravellers } from '../../../store/useVisaStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { TourHeader } from '../tours/tourUi';
import { Card, CardTitle, CountryBanner, VisaFooter, VisaStepper, PageTitle, DateField, Chip, stepSubtitles, useToast, NAVY, ORANGE, MUTED } from './visaUi';

const GENDERS: VisaGender[] = ['Male', 'Female', 'Other'];
const inputStyle = { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#DCE3EC', backgroundColor: '#FFFFFF', paddingHorizontal: 12, fontSize: 14, color: '#0F172A' } as const;
const Label = ({ text }: { text: string }) => (
  <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#334155' }}>
    {text} <Text style={{ color: '#DC2626' }}>*</Text>
  </Text>
);

export default function ScreenVisaDetails({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const visa = useVisaStore((s) => s.visa);
  const selection = useVisaStore((s) => s.selection);
  const eligibility = useVisaStore((s) => s.eligibility);
  const storedTravellers = useVisaStore((s) => s.travellers);
  const setStoredTravellers = useVisaStore((s) => s.setTravellers);
  const contact = useVisaStore((s) => s.contact);
  const setContact = useVisaStore((s) => s.setContact);
  const documents = useVisaStore((s) => s.documents);
  const application = useVisaStore((s) => s.application);
  const setSaved = useVisaStore((s) => s.setSaved);
  const mode = useVisaStore((s) => s.mode);
  const profile = useAuthStore((s) => s.profile);

  const count = eligibility.travellerCount || 1;
  const [travellers, setTravellers] = useState<VisaTraveller[]>(() => resizeTravellers(storedTravellers, count));
  const [email, setEmail] = useState(contact.email || profile?.email || '');
  const [phone, setPhone] = useState(contact.phone || profile?.mobileNumber || '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setTravellers((t) => resizeTravellers(t, count));
  }, [count]);

  if (!visa) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' }}>
        <Text style={{ color: MUTED }}>Please choose a country first.</Text>
        <TouchableOpacity onPress={() => onNavigate('visa')} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: ORANGE }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Browse visas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card: VisaCard | undefined = (visa.visas || []).find((c) => c._id === selection.selectedVisaId);
  const today = new Date();

  const update = (i: number, patch: Partial<VisaTraveller>) => setTravellers((list) => list.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const validate = (): string | null => {
    for (let i = 0; i < travellers.length; i++) {
      const t = travellers[i];
      const who = travellers.length > 1 ? `Traveller ${i + 1}: ` : '';
      if (!t.firstName.trim() || !t.lastName.trim()) return `${who}enter first and last name as on passport`;
      if (!t.dob) return `${who}select date of birth`;
      if (!t.gender) return `${who}select gender`;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
    if (phone.replace(/\D/g, '').length < 10) return 'Enter a valid 10-digit phone number';
    return null;
  };

  const save = async () => {
    const error = validate();
    if (error) return toast.show(error);
    setSaving(true);
    try {
      const clean = travellers.map((t) => ({ ...t, firstName: t.firstName.trim(), lastName: t.lastName.trim() }));
      const res = await saveVisaDraft(application?._id || null, {
        visaId: visa._id,
        selectedVisaId: selection.selectedVisaId,
        selectedValidityIndex: selection.selectedValidityIndex,
        isExpress: selection.isExpress,
        eligibility,
        travellers: clean,
        email: email.trim(),
        phone,
        // Drop files of travellers that were removed.
        documents: documents.filter((d) => Number(d.travellerId) < clean.length),
        currentStep: 2,
      });
      setStoredTravellers(clean);
      setContact({ email: res.data.data.email || email.trim(), phone: res.data.data.phone || phone });
      setSaved(res.data.data, res.data.fee);
      onNavigate('visa-documents');
    } catch (e: any) {
      toast.show(e?.response?.data?.message || 'Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: '#FFFFFF' }}>
            <TourHeader onBack={onBack} onBell={() => onNavigate('38')} />
            <VisaStepper current={3} subtitles={stepSubtitles(visa, card)} />
          </View>
          <View style={{ paddingTop: 10 }}>
            <CountryBanner visa={visa} subtitle={card ? visaCardTitle(card) : 'Visa'} chips={[{ icon: Luggage, label: eligibility.purpose || 'Tourism' }, { icon: Clock, label: eligibility.stayDuration || 'Short stay' }]} />
          </View>
          <PageTitle title="Traveller Details" subtitle="Enter each traveller's details exactly as printed on their passport." />

          <View style={{ paddingHorizontal: 14, gap: 12 }}>
            {mode === 'fix' && !!application?.returnReason && (
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                <Info size={16} color="#B91C1C" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 12.5, color: '#991B1B', lineHeight: 18 }}>Returned by our visa team: {application.returnReason}</Text>
              </View>
            )}

            {travellers.map((t, i) => (
              <Card key={i} style={{ gap: 10 }}>
                <CardTitle icon={User} title={`Traveller ${i + 1}`} subtitle={i === 0 ? 'Primary applicant' : undefined} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Label text="First name" />
                    <TextInput value={t.firstName} onChangeText={(v) => update(i, { firstName: v })} placeholder="As on passport" placeholderTextColor="#94A3B8" autoCapitalize="words" style={inputStyle} />
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Label text="Last name" />
                    <TextInput value={t.lastName} onChangeText={(v) => update(i, { lastName: v })} placeholder="As on passport" placeholderTextColor="#94A3B8" autoCapitalize="words" style={inputStyle} />
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <Label text="Date of birth" />
                  <DateField value={t.dob} onChange={(v) => update(i, { dob: v })} placeholder="Select date of birth" maximumDate={today} />
                </View>
                <View style={{ gap: 6 }}>
                  <Label text="Gender" />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {GENDERS.map((g) => (
                      <Chip key={g} label={g} active={t.gender === g} onPress={() => update(i, { gender: g })} />
                    ))}
                  </View>
                </View>
              </Card>
            ))}

            <Card style={{ gap: 10 }}>
              <CardTitle icon={Mail} title="Contact Details" subtitle="We'll send application updates here." />
              <View style={{ gap: 6 }}>
                <Label text="Email" />
                <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" style={inputStyle} />
              </View>
              <View style={{ gap: 6 }}>
                <Label text="Phone" />
                <TextInput value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" maxLength={14} style={inputStyle} />
              </View>
            </Card>
            <Text style={{ fontSize: 11.5, color: MUTED, textAlign: 'center' }}>Your progress is saved — you can continue anytime from My Trips.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <VisaFooter whatsappMessage={`Hi MBGO, I need help filling my ${visa.country} visa application.`} label="Save & Upload Documents" onPress={save} loading={saving} />
      {toast.node}
    </View>
  );
}
