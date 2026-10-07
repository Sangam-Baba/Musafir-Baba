import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Modal, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Calendar, MapPin, Users, Pencil, Receipt, CreditCard, Info, Check, ShieldCheck, ArrowRight, Lock } from 'lucide-react-native';
import {
  createTourAppBooking,
  initiateTourAppPayment,
  getTourAppBooking,
  getTourImages,
  previewTourPrice,
  type TourPaymentOption,
} from '../../../api/tour.api';
import { buildPayUAutoSubmitHtml } from '../../../api/payment.api';
import { useTourStore } from '../../../store/useTourStore';
import { TourHeader, inr, PhotoPlaceholder } from './tourUi';

const fmt = (d: Date | string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ScreenTourCheckout({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const pkg = useTourStore((s) => s.selectedPackage);
  const selection = useTourStore((s) => s.selection);
  const pendingBooking = useTourStore((s) => s.pendingBooking);
  const bookingKey = useTourStore((s) => s.bookingKey);
  const setPendingBooking = useTourStore((s) => s.setPendingBooking);
  const setViewedBooking = useTourStore((s) => s.setViewedBooking);

  const quote = useMemo(
    () => (selection ? previewTourPrice(selection.batch, selection.travellers, selection.addOns || []) : null),
    [selection]
  );
  // Like the website, full payment is the default and partial (25%) is optional.
  const [paymentOption, setPaymentOption] = useState<TourPaymentOption>('FULL');
  const [agreed, setAgreed] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [checkoutBaseUrl, setCheckoutBaseUrl] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const goBack = () => (onBack ? onBack() : onNavigate('tour-detail'));

  if (!pkg || !selection || !quote) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ color: '#64748B' }}>Please choose a departure first.</Text>
        <TouchableOpacity onPress={goBack} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FF4500' }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { batch, travellers } = selection;
  const addOns = selection.addOns || [];
  const image = getTourImages(pkg)[0];
  const payNow = paymentOption === 'ADVANCE' ? quote.advance : quote.total;
  // Same trip + travellers + add-ons + option -> reuse the unpaid booking instead of creating another.
  const key = JSON.stringify([pkg._id, batch._id, travellers, addOns.map((a) => [a.itemId, a.noOfPeople]), paymentOption]);
  const roomsText = quote.lines.map((l) => `${l.count} ${l.label}`).join(', ');

  const handlePay = async () => {
    if (!agreed) {
      showToast('Please accept the terms to continue');
      return;
    }
    setIsPaying(true);
    try {
      let booking = pendingBooking && bookingKey === key && pendingBooking.bookingStatus === 'PaymentPending' ? pendingBooking : null;
      if (!booking) {
        const res = await createTourAppBooking({
          packageId: pkg._id,
          batchId: batch._id,
          travellers,
          addOns: addOns.map((a) => ({ itemId: a.itemId, noOfPeople: a.noOfPeople })),
          paymentOption,
        });
        booking = res.data.data;
        setPendingBooking(booking, key);
        if (booking.payNowAmount !== payNow) {
          showToast(`Amount updated to ${inr(booking.payNowAmount)}. Tap Pay to continue.`);
          return;
        }
      }
      const pay = await initiateTourAppPayment(booking._id);
      setCheckoutBaseUrl(new URL(pay.data.payuUrl).origin);
      setCheckoutHtml(buildPayUAutoSubmitHtml(pay.data));
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not start payment, please try again');
    } finally {
      setIsPaying(false);
    }
  };

  // Same terminal-URL detection approach as the ride payment.
  const handleWebViewNavigation = async (navState: { url: string }) => {
    const { url } = navState;
    const isTerminal = url.includes('/tour-booking/payment/success') || url.includes('/tour-booking/payment/failure') || url.includes('/payment/success') || url.includes('/payment/failed') || url.includes('/payment/failure');
    const current = useTourStore.getState().pendingBooking;
    if (!isTerminal || !current) return;
    setCheckoutHtml(null);
    try {
      const res = await getTourAppBooking(current._id);
      const fresh = res.data.data;
      if (fresh.bookingStatus === 'Confirmed') {
        setPendingBooking(null, null);
        setViewedBooking(fresh);
        onNavigate('tour-booking-success');
      } else {
        showToast('Payment was not completed. You can try again.');
      }
    } catch {
      showToast('Could not confirm payment status');
    }
  };

  const option = (opt: TourPaymentOption, title: string, amount: number, desc: string, disabled = false) => {
    const active = paymentOption === opt;
    return (
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setPaymentOption(opt)}
        style={{ flex: 1, borderRadius: 14, borderWidth: active ? 2 : 1, borderColor: active ? '#FF4500' : '#EEF2F6', backgroundColor: disabled ? '#F8FAFC' : active ? '#FFF5EF' : '#FFFFFF', padding: 12, gap: 6, opacity: disabled ? 0.6 : 1 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: active ? '#FF4500' : '#CBD5E1', alignItems: 'center', justifyContent: 'center' }}>
            {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4500' }} />}
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{title}</Text>
        </View>
        <Text style={{ fontSize: 11.5, color: '#64748B', lineHeight: 16 }}>{desc}</Text>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>{inr(amount)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <TourHeader onBack={goBack} onBell={() => onNavigate('38')} />
        <View style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#0B1E3D', letterSpacing: -0.5 }}>Payment & Final Summary</Text>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Review your booking details and complete the payment</Text>
        </View>

        <View style={{ paddingHorizontal: 14, gap: 12 }}>
          {/* Booking summary */}
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, padding: 12, flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
              {image ? <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <PhotoPlaceholder />}
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: '#0B1E3D', lineHeight: 19 }} numberOfLines={2}>{pkg.title}</Text>
                <TouchableOpacity onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF5EF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Pencil size={11} color="#FF4500" strokeWidth={2.2} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#FF4500' }}>Edit</Text>
                </TouchableOpacity>
              </View>
              {!!pkg.destination?.name && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MapPin size={12} color="#64748B" strokeWidth={2} />
                  <Text style={{ fontSize: 12, color: '#475569' }}>{pkg.destination.name.trim()}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Calendar size={12} color="#64748B" strokeWidth={2} />
                <Text style={{ fontSize: 12, color: '#475569' }}>{fmt(batch.startDate)} – {fmt(batch.endDate)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Users size={12} color="#64748B" strokeWidth={2} />
                <Text style={{ flex: 1, fontSize: 12, color: '#475569' }}>{roomsText}</Text>
              </View>
            </View>
          </View>

          {/* Price breakup */}
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Receipt size={20} color="#2563EB" strokeWidth={2} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0B1E3D' }}>Price Breakup</Text>
            </View>
            {[
              ...quote.lines.map((l) => [`${l.label} (${inr(l.unitPrice)} × ${l.count})`, l.amount] as [string, number]),
              ...addOns.map((a) => [`${a.title} (${inr(a.price)} × ${a.noOfPeople})`, a.price * a.noOfPeople] as [string, number]),
            ].map(([label, amount]) => (
              <View key={label as string} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#475569' }}>{label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{inr(amount as number)}</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: '#475569' }}>Subtotal</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{inr(quote.base + quote.addOnsAmount)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: '#475569' }}>GST (5%)</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{inr(quote.gst)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF5EF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#EA580C' }}>Total Package Cost</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#EA580C' }}>{inr(quote.total)}</Text>
            </View>
          </View>

          {/* Payment option */}
          <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CreditCard size={20} color="#2563EB" strokeWidth={2} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0B1E3D' }}>Choose Payment Option</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {option('FULL', 'Pay Full', quote.total, 'Pay the complete amount now')}
              {option('ADVANCE', 'Partial Payment', quote.advance, `25% now, pay the rest before ${fmt(quote.balanceDue)}`)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['UPI', 'Credit / Debit Card', 'Net Banking', 'Wallets'].map((m) => (
                <View key={m} style={{ backgroundColor: '#F1F5F9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '500', color: '#475569' }}>{m}</Text>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Info size={15} color="#2563EB" strokeWidth={2} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A8A' }}>Payment information</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#1E40AF', lineHeight: 17 }}>• You'll pay securely on PayU (UPI, cards, net banking, wallets).</Text>
              {paymentOption === 'ADVANCE' && (
                <Text style={{ fontSize: 12, color: '#1E40AF', lineHeight: 17 }}>• Balance of {inr(quote.total - quote.advance)} is due by {fmt(quote.balanceDue)}. Our team will contact you for it.</Text>
              )}
              <Text style={{ fontSize: 12, color: '#1E40AF', lineHeight: 17 }}>• The booking amount is non-refundable.</Text>
            </View>
            <TouchableOpacity onPress={() => setAgreed((v) => !v)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: agreed ? '#FF4500' : '#CBD5E1', backgroundColor: agreed ? '#FF4500' : '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {agreed && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text style={{ flex: 1, fontSize: 12.5, color: '#334155', lineHeight: 18 }}>I agree to the package terms & conditions, cancellation & refund policy and payment terms.</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Pay bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEF2F6', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11.5, color: '#64748B' }}>Amount payable now</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#FF4500', letterSpacing: -0.4 }}>{inr(payNow)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ShieldCheck size={16} color="#16A34A" strokeWidth={2} />
          <Text style={{ fontSize: 10.5, color: '#475569' }}>100% Secure</Text>
        </View>
        <TouchableOpacity onPress={handlePay} disabled={isPaying} style={{ height: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: isPaying ? '#FDA584' : '#FF4500', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isPaying ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Lock size={15} color="#FFFFFF" strokeWidth={2.2} />}
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{isPaying ? 'Please wait' : 'Pay Securely'}</Text>
          {!isPaying && <ArrowRight size={15} color="#FFFFFF" strokeWidth={2.2} />}
        </TouchableOpacity>
      </View>

      {toast ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 24, left: 16, right: 16, alignItems: 'center', zIndex: 50 }}>
          <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '600', textAlign: 'center' }}>{toast}</Text>
          </View>
        </View>
      ) : null}

      {/* PayU checkout */}
      <Modal visible={!!checkoutHtml} animationType="slide" onRequestClose={() => setCheckoutHtml(null)}>
        <View style={{ flex: 1, paddingTop: 40, backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Lock size={14} color="#059669" strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>Secure payment</Text>
            </View>
            <TouchableOpacity onPress={() => setCheckoutHtml(null)}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF5500' }}>Close</Text>
            </TouchableOpacity>
          </View>
          {checkoutHtml && (
            <WebView
              source={{ html: checkoutHtml, baseUrl: checkoutBaseUrl ?? undefined }}
              onNavigationStateChange={handleWebViewNavigation}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#FF4500" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
