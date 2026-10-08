import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Users, CalendarDays, FileCheck2, CheckCircle2, Coins, Wallet, CreditCard, Landmark, Smartphone, ShieldCheck, Lock, Luggage, Clock, ReceiptText } from 'lucide-react-native';
import { getRequiredDocuments, getVisaApp, payVisaApp, saveVisaDraft, visaCardTitle, type VisaCard } from '../../../api/visa.api';
import { buildPayUAutoSubmitHtml } from '../../../api/payment.api';
import { useVisaStore } from '../../../store/useVisaStore';
import { TourHeader, InAppBrowser, inr } from '../tours/tourUi';
import { Card, CardTitle, CountryBanner, VisaFooter, VisaStepper, PageTitle, CheckBox, stepSubtitles, useToast, formatYmd, NAVY, ORANGE, MUTED, BORDER, BLUE } from './visaUi';

const TERMS_URL = 'https://musafirbaba.com/mbgo/terms-and-conditions';
const PRIVACY_URL = 'https://musafirbaba.com/mbgo/privacy-policies';

export default function ScreenVisaPayment({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const visa = useVisaStore((s) => s.visa);
  const selection = useVisaStore((s) => s.selection);
  const eligibility = useVisaStore((s) => s.eligibility);
  const travellers = useVisaStore((s) => s.travellers);
  const documents = useVisaStore((s) => s.documents);
  const application = useVisaStore((s) => s.application);
  const fee = useVisaStore((s) => s.fee);
  const setViewedApp = useVisaStore((s) => s.setViewedApp);
  const setSaved = useVisaStore((s) => s.setSaved);
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [checkoutBaseUrl, setCheckoutBaseUrl] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  // PayU can report several terminal URLs; handle the first only.
  const handled = useRef(false);
  const toast = useToast();

  if (!visa || !application || !fee) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' }}>
        <Text style={{ color: MUTED }}>Please review your application first.</Text>
        <TouchableOpacity onPress={() => onNavigate(visa ? 'visa-review' : 'visa')} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: ORANGE }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card: VisaCard | undefined = (visa.visas || []).find((c) => c._id === selection.selectedVisaId);
  const n = fee.travellerCount;
  const docsTotal = getRequiredDocuments(visa).length * travellers.length;
  const docsDone = Math.min(docsTotal, documents.length);
  const rows: [string, string, number][] = [
    ['MBGO Service Fee', 'Application assistance, documentation, form filling, expert support', fee.perPerson.serviceCharge * n],
    ['Government Fees', 'As per embassy/consulate', fee.perPerson.governmentFee * n],
    [`GST (${fee.perPerson.gstPercent}% on service fee)`, '', fee.perPerson.gst * n],
  ];

  const pay = async () => {
    if (!agreed) return toast.show('Please accept the terms to continue');
    setPaying(true);
    try {
      const res = await payVisaApp(application._id);
      const amount = Number(res.data.paymentData.amount);
      if (Math.round(amount) !== Math.round(fee.totalCost)) {
        const fresh = await saveVisaDraft(application._id, { currentStep: 3 });
        setSaved(fresh.data.data, fresh.data.fee);
        toast.show(`Amount updated to ${inr(amount)}. Please review and pay.`);
        return;
      }
      handled.current = false;
      setCheckoutBaseUrl(new URL(res.data.payuUrl).origin);
      setCheckoutHtml(buildPayUAutoSubmitHtml(res.data));
    } catch (e: any) {
      toast.show(e?.response?.data?.message || 'Could not start payment, please try again');
    } finally {
      setPaying(false);
    }
  };

  // Same terminal-URL detection as the tour/ride payments.
  const onNav = async ({ url }: { url: string }) => {
    const terminal = url.includes('/visa-app/payment/') || url.includes('/payment/success') || url.includes('/payment/failed') || url.includes('/payment/failure');
    if (!terminal || handled.current) return;
    handled.current = true;
    setCheckoutHtml(null);
    try {
      const res = await getVisaApp(application._id);
      const fresh = res.data.data;
      if (fresh.paymentInfo?.status === 'Paid') {
        setViewedApp(fresh);
        onNavigate('visa-success');
      } else {
        toast.show('Payment was not completed. You can try again.');
      }
    } catch {
      toast.show('Could not confirm payment status. Check My Trips in a moment.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#FFFFFF' }}>
          <TourHeader onBack={onBack} onBell={() => onNavigate('38')} />
          <VisaStepper current={5} subtitles={stepSubtitles(visa, card)} />
        </View>
        <PageTitle title="Application Summary & Payment" subtitle="Review your details and complete the payment to submit your visa application." />
        <CountryBanner visa={visa} subtitle={card ? visaCardTitle(card) : 'Visa'} chips={[{ icon: Luggage, label: eligibility.purpose || 'Tourism' }, { icon: Clock, label: eligibility.stayDuration || 'Short stay' }]} />

        <View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={{ flex: 1, flexDirection: 'row', gap: 8, padding: 12 }}>
              <Users size={22} color={BLUE} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: MUTED }}>No. of Travellers</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: NAVY }}>{n} Traveller{n > 1 ? 's' : ''}</Text>
                <Text numberOfLines={2} style={{ fontSize: 11, color: MUTED }}>{travellers.map((t) => t.firstName).join(', ')}</Text>
              </View>
            </Card>
            <Card style={{ flex: 1, flexDirection: 'row', gap: 8, padding: 12 }}>
              <CalendarDays size={22} color={BLUE} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: MUTED }}>Planned Travel</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: NAVY }}>{eligibility.travelDate ? formatYmd(eligibility.travelDate) : '—'}</Text>
                <Text style={{ fontSize: 11, color: MUTED }}>{eligibility.stayDuration ? `Stay ${eligibility.stayDuration}` : ''}</Text>
              </View>
            </Card>
          </View>

          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
            <FileCheck2 size={24} color="#16A34A" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: NAVY }}>Documents</Text>
              <Text style={{ fontSize: 11.5, color: MUTED }}>{docsDone} of {docsTotal} documents uploaded</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={15} color="#16A34A" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>Ready for Submission</Text>
            </View>
          </Card>

          {/* Fee breakdown (from the server) */}
          <Card style={{ gap: 10 }}>
            <CardTitle icon={Coins} title="Fee Breakdown" subtitle={n > 1 ? `${inr(fee.perPerson.total)} per person × ${n}` : undefined} />
            {rows.map(([label, note, amount]) => (
              <View key={label} style={{ flexDirection: 'row', gap: 10, paddingVertical: 2 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: NAVY }}>{label}</Text>
                  {!!note && <Text style={{ fontSize: 11, color: MUTED }}>{note}</Text>}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: NAVY }}>{inr(amount)}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12 }}>
              <ReceiptText size={22} color={BLUE} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: NAVY }}>Total Payable Amount</Text>
                <Text style={{ fontSize: 10.5, color: MUTED }}>Service fee + Government fees + GST</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: NAVY }}>{inr(fee.totalCost)}</Text>
            </View>
          </Card>

          {/* Payment method */}
          <Card style={{ gap: 10 }}>
            <CardTitle icon={Wallet} title="Payment Method" subtitle="Choose your preferred method on the secure PayU page." />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { icon: Smartphone, label: 'UPI' },
                { icon: CreditCard, label: 'Cards' },
                { icon: Landmark, label: 'Net Banking' },
                { icon: Wallet, label: 'Wallets' },
              ].map((m) => (
                <View key={m.label} style={{ flex: 1, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 10 }}>
                  <m.icon size={18} color={BLUE} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: NAVY }}>{m.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10 }}>
              <ShieldCheck size={18} color="#16A34A" />
              <Text style={{ flex: 1, fontSize: 11.5, color: '#166534' }}>Secure & encrypted payment. Your payment information is 100% safe.</Text>
            </View>
          </Card>

          <TouchableOpacity onPress={() => setAgreed((v) => !v)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <CheckBox checked={agreed} />
            <Text style={{ flex: 1, fontSize: 12, color: '#334155', lineHeight: 18 }}>
              I agree to the{' '}
              <Text onPress={() => setBrowserUrl(TERMS_URL)} style={{ color: BLUE, textDecorationLine: 'underline' }}>Terms & Conditions</Text> and{' '}
              <Text onPress={() => setBrowserUrl(PRIVACY_URL)} style={{ color: BLUE, textDecorationLine: 'underline' }}>Privacy Policy</Text>. I understand the visa decision is taken by the embassy/consulate.
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <VisaFooter whatsappMessage={`Hi MBGO, I have a question about paying for my ${visa.country} visa application ${application.applicationId || ''}.`} label={`Pay ${inr(fee.totalCost)} & Submit`} onPress={pay} loading={paying} disabled={!agreed} />

      <Modal visible={!!checkoutHtml} animationType="slide" onRequestClose={() => setCheckoutHtml(null)}>
        <View style={{ flex: 1, paddingTop: 40, backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Lock size={14} color="#059669" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>Secure payment</Text>
            </View>
            <TouchableOpacity onPress={() => setCheckoutHtml(null)}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: ORANGE }}>Close</Text>
            </TouchableOpacity>
          </View>
          {checkoutHtml && (
            <WebView
              source={{ html: checkoutHtml, baseUrl: checkoutBaseUrl ?? undefined }}
              onNavigationStateChange={onNav}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color={ORANGE} />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
      <InAppBrowser url={browserUrl} onClose={() => setBrowserUrl(null)} />
      {toast.node}
    </View>
  );
}
