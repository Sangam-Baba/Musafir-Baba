import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Share, Modal, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { ArrowLeft, CheckCircle2, Calendar, MapPin, Users, Copy, Receipt, CreditCard, Headphones, Share2, ArrowRight, Clock, Lock, BedDouble, Wallet } from 'lucide-react-native';
import { getTourAppBooking, initiateTourAppPayment, tourBookingCode, type TourAppBooking } from '../../../api/tour.api';
import { buildPayUAutoSubmitHtml } from '../../../api/payment.api';
import { useTourStore } from '../../../store/useTourStore';
import { inr, PhotoPlaceholder } from './tourUi';

const MBGO_LOGO = require('../../../desgin/mbgoLogo.png');
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const fmtDateTime = (d?: string) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-');

export const travellerSummary = (b: TourAppBooking) => {
  const adults = (b.travellers?.quad || 0) + (b.travellers?.triple || 0) + (b.travellers?.double || 0);
  const child = b.travellers?.child || 0;
  // e.g. "Quad Sharing" or "2 Quad, 1 Double" when room types are mixed.
  const rooms = (['quad', 'triple', 'double'] as const).filter((k) => (b.travellers?.[k] || 0) > 0);
  const sharingLabel =
    rooms.length === 1
      ? `${rooms[0][0].toUpperCase()}${rooms[0].slice(1)} Sharing`
      : rooms.map((k) => `${b.travellers[k]} ${k[0].toUpperCase()}${k.slice(1)}`).join(', ');
  return { adults, child, sharingLabel, text: `${adults} Adult${adults === 1 ? '' : 's'}${child ? `, ${child} Child${child === 1 ? '' : 'ren'}` : ''}` };
};

export const bookingStatusLook = (b: TourAppBooking) => {
  if (b.bookingStatus === 'Cancelled') return { label: 'Cancelled', bg: '#FEE2E2', color: '#B91C1C' };
  if (b.bookingStatus === 'PaymentPending') return { label: 'Payment pending', bg: '#FEF3C7', color: '#B45309' };
  const ended = new Date(b.endDate || b.startDate).getTime() < Date.now();
  return ended ? { label: 'Completed', bg: '#E0F2FE', color: '#0369A1' } : { label: 'Confirmed', bg: '#DCFCE7', color: '#15803D' };
};

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ fontSize: 13, color: '#64748B' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: valueColor || '#0F172A', textAlign: 'right', flexShrink: 1 }}>{value}</Text>
    </View>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon}
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0B1E3D' }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// variant "success": shown right after payment. variant "detail": My Trip view.
export default function ScreenTourBooking({ onNavigate, onBack, variant }: { onNavigate: (screen: string) => void; onBack?: () => void; variant: 'success' | 'detail' }) {
  const stored = useTourStore((s) => s.viewedBooking);
  const setViewedBooking = useTourStore((s) => s.setViewedBooking);
  const [booking, setBooking] = useState<TourAppBooking | null>(stored);
  const [toast, setToast] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [checkoutBaseUrl, setCheckoutBaseUrl] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  // Refresh from the server (status/payment may have changed).
  const refresh = async (id: string) => {
    try {
      const res = await getTourAppBooking(id);
      setBooking(res.data.data);
      setViewedBooking(res.data.data);
      return res.data.data;
    } catch {
      return null;
    }
  };
  useEffect(() => {
    if (stored?._id) refresh(stored._id);
  }, [stored?._id]);

  if (!booking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF4500" />
      </View>
    );
  }

  const code = tourBookingCode(booking._id);
  const status = bookingStatusLook(booking);
  const t = travellerSummary(booking);
  const isPaid = booking.paymentInfo?.status === 'Paid';
  const paidAmount = isPaid ? booking.payNowAmount : 0;
  const balance = booking.totalAmount - paidAmount;
  const paidPercent = booking.totalAmount ? Math.round((paidAmount / booking.totalAmount) * 100) : 0;
  const durationText = booking.durationDays ? `${booking.durationNights ?? booking.durationDays - 1} Nights / ${booking.durationDays} Days` : null;

  const shareBooking = () => {
    Share.share({ message: `My MBGO holiday: ${booking.packageTitle} (${fmt(booking.startDate)} – ${fmt(booking.endDate)}). Booking ID ${code}` }).catch(() => {});
  };

  const completePayment = async () => {
    setIsPaying(true);
    try {
      const pay = await initiateTourAppPayment(booking._id);
      setCheckoutBaseUrl(new URL(pay.data.payuUrl).origin);
      setCheckoutHtml(buildPayUAutoSubmitHtml(pay.data));
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not start payment, please try again');
    } finally {
      setIsPaying(false);
    }
  };
  const handleWebViewNavigation = async (navState: { url: string }) => {
    const { url } = navState;
    const isTerminal = url.includes('/tour-booking/payment/') || url.includes('/payment/success') || url.includes('/payment/failed') || url.includes('/payment/failure');
    if (!isTerminal) return;
    setCheckoutHtml(null);
    const fresh = await refresh(booking._id);
    showToast(fresh?.bookingStatus === 'Confirmed' ? 'Payment successful — your trip is confirmed!' : 'Payment was not completed. You can try again.');
  };

  const card = (
    <View style={{ backgroundColor: variant === 'success' ? '#F0FDF4' : '#FFFFFF', borderWidth: 1, borderColor: variant === 'success' ? '#DCFCE7' : '#EEF2F6', borderRadius: 16, padding: 12, flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
        {booking.packageImage ? <Image source={{ uri: booking.packageImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <PhotoPlaceholder />}
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        {variant === 'detail' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ backgroundColor: status.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: status.color }}>{status.label}</Text>
            </View>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FF4500' }}>{code}</Text>
          </View>
        )}
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#0B1E3D', lineHeight: 19 }} numberOfLines={2}>{booking.packageTitle}</Text>
        {(!!durationText || !!booking.destinationName) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MapPin size={12} color="#64748B" strokeWidth={2} />
            <Text style={{ fontSize: 12, color: '#475569' }} numberOfLines={1}>{[durationText, booking.destinationName].filter(Boolean).join(' · ')}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Calendar size={12} color="#64748B" strokeWidth={2} />
          <Text style={{ fontSize: 12, color: '#475569' }}>{fmt(booking.startDate)} – {fmt(booking.endDate)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Users size={12} color="#64748B" strokeWidth={2} />
          <Text style={{ fontSize: 12, color: '#475569' }}>{t.text}{t.sharingLabel ? ` · ${t.sharingLabel}` : ''}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        {variant === 'success' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ width: 36 }} />
              <Image source={MBGO_LOGO} style={{ width: 120, height: 40 }} resizeMode="contain" />
              <TouchableOpacity onPress={shareBooking} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Share2 size={19} color="#0F172A" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={42} color="#FFFFFF" strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#0B1E3D' }}>Payment Successful!</Text>
              <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 }}>Your booking is confirmed. You'll get trip updates in your notifications.</Text>
            </View>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => (onBack ? onBack() : onNavigate('35'))} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={18} color="#0F172A" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#0B1E3D' }}>My Trip</Text>
            <TouchableOpacity onPress={shareBooking} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={18} color="#0F172A" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {card}

        {variant === 'success' && (
          <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, padding: 14 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Booking ID</Text>
              <TouchableOpacity onPress={() => showToast('Booking ID copied!')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#FF4500' }}>{code}</Text>
                <Copy size={14} color="#64748B" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={{ width: 1, backgroundColor: '#EEF2F6', marginHorizontal: 12 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Booking Status</Text>
              <View style={{ alignSelf: 'flex-start', backgroundColor: status.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: status.color }}>{status.label}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment */}
        <Section title={variant === 'success' ? 'Payment Details' : 'Payment Status'} icon={<Wallet size={20} color="#16A34A" strokeWidth={2} />}>
          {variant === 'detail' && (
            <View style={{ gap: 6 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EEF2F6', overflow: 'hidden' }}>
                <View style={{ width: `${paidPercent}%`, height: '100%', backgroundColor: '#16A34A' }} />
              </View>
              <Text style={{ fontSize: 12, color: '#64748B' }}>{paidPercent}% paid</Text>
            </View>
          )}
          <Row label={booking.paymentOption === 'ADVANCE' ? 'Amount paid (advance)' : 'Amount paid'} value={inr(paidAmount)} valueColor="#16A34A" />
          {isPaid && <Row label="Payment date" value={fmtDateTime(booking.paymentInfo?.paidAt)} />}
          {!!booking.paymentInfo?.mihpayid && <Row label="Transaction ID" value={booking.paymentInfo.mihpayid} />}
          {balance > 0 && (
            <>
              <Row label="Balance amount" value={inr(balance)} valueColor="#EA580C" />
              {!!booking.balanceDueDate && isPaid && <Row label="Balance due by" value={fmt(booking.balanceDueDate)} />}
            </>
          )}
          {booking.bookingStatus === 'PaymentPending' ? (
            <TouchableOpacity onPress={completePayment} disabled={isPaying} style={{ marginTop: 4, height: 46, borderRadius: 12, backgroundColor: '#FF4500', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isPaying ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Lock size={15} color="#FFFFFF" strokeWidth={2.2} />}
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Complete payment · {inr(booking.payNowAmount)}</Text>
            </TouchableOpacity>
          ) : balance > 0 && isPaid ? (
            <View style={{ backgroundColor: '#FFF7ED', borderRadius: 10, padding: 10, flexDirection: 'row', gap: 8 }}>
              <Clock size={15} color="#EA580C" strokeWidth={2} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12, color: '#9A3412', lineHeight: 17 }}>Please pay the balance before {fmt(booking.balanceDueDate)}. Our travel expert will contact you, or reach us via Support.</Text>
            </View>
          ) : null}
        </Section>

        {/* Price summary */}
        <Section title="Price Summary" icon={<Receipt size={20} color="#2563EB" strokeWidth={2} />}>
          {booking.priceLines.map((l) => (
            <Row key={l.type} label={`${l.type[0].toUpperCase()}${l.type.slice(1)}${l.type === 'child' ? '' : ' sharing'} (${inr(l.unitPrice)} × ${l.count})`} value={inr(l.amount)} />
          ))}
          {(booking.addOns || []).map((a) => (
            <Row key={a.itemId} label={`${a.title} (${inr(a.price)} × ${a.noOfPeople})`} value={inr(a.amount)} />
          ))}
          <Row label="GST (5%)" value={inr(booking.gstAmount)} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF5EF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#EA580C' }}>Total Package Cost</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#EA580C' }}>{inr(booking.totalAmount)}</Text>
          </View>
        </Section>

        {variant === 'detail' && (
          <Section title="Trip Details" icon={<CreditCard size={20} color="#2563EB" strokeWidth={2} />}>
            {!!booking.destinationName && <Row label="Destination" value={booking.destinationName} />}
            <Row label="Travel dates" value={`${fmt(booking.startDate)} – ${fmt(booking.endDate)}`} />
            <Row label="Travellers" value={t.text} />
            {!!t.sharingLabel && <Row label="Room sharing" value={t.sharingLabel} />}
            <Row label="Booked on" value={fmt(booking.createdAt)} />
          </Section>
        )}

        {variant === 'success' && (
          <TouchableOpacity onPress={() => onNavigate('tour-booking-detail')} style={{ height: 50, borderRadius: 14, backgroundColor: '#FF4500', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>View My Trip</Text>
            <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        )}

        {/* Help */}
        <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
            <Headphones size={20} color="#2563EB" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0B1E3D' }}>Need help?</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>Our travel expert is here for you 24×7</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate('37')} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#FF4500' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF4500' }}>Support</Text>
          </TouchableOpacity>
        </View>

        {variant === 'success' && (
          <TouchableOpacity onPress={() => onNavigate('31')} style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>Back to Home</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {toast ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 24, left: 16, right: 16, alignItems: 'center', zIndex: 50 }}>
          <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '600', textAlign: 'center' }}>{toast}</Text>
          </View>
        </View>
      ) : null}

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
