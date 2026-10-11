// Shared pieces for the Help & Support screens.
import React from 'react';
import { View, Text, TouchableOpacity, Linking, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import {
  ArrowLeft,
  Headphones,
  Car,
  Mountain,
  Plane,
  TrainFront,
  BedDouble,
  Globe,
  Wallet,
  ShieldCheck,
  MoreHorizontal,
  MapPin,
  XCircle,
  IndianRupee,
  Route,
  Briefcase,
  UserX,
  Package,
  CalendarClock,
  FileText,
  CreditCard,
  RefreshCw,
  ClipboardList,
  AlertTriangle,
  HelpCircle,
  Check,
  Phone,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
import { VC, SHADOW, WhatsAppGlyph, openWhatsApp } from '../visa/visaUi';
import { SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, type TicketStatus } from '../../../api/support.api';

export { VC, SHADOW };

export const callSupport = () => Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {});
export const chatSupport = (context?: string) => openWhatsApp(`Hi MBGO Support${context ? `, ${context}` : ''}.`);

export const SERVICE_LOOK: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  CAB: { icon: Car, color: '#EA580C', bg: '#FFEDD5' },
  TOUR: { icon: Mountain, color: '#16A34A', bg: '#DCFCE7' },
  FLIGHT: { icon: Plane, color: '#2563EB', bg: '#DBEAFE' },
  TRAIN: { icon: TrainFront, color: '#DB2777', bg: '#FCE7F3' },
  HOTEL: { icon: BedDouble, color: '#7C3AED', bg: '#EDE9FE' },
  VISA: { icon: Globe, color: '#1D4ED8', bg: '#DBEAFE' },
  PAYMENT: { icon: Wallet, color: '#D97706', bg: '#FEF3C7' },
  SAFETY: { icon: ShieldCheck, color: '#059669', bg: '#D1FAE5' },
  OTHER: { icon: MoreHorizontal, color: '#475569', bg: '#F1F5F9' },
};

const ISSUE_ICONS: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  DRIVER_NOT_ARRIVED: { icon: MapPin, color: '#EA580C', bg: '#FFEDD5' },
  DRIVER_CANCELLED: { icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
  FARE_PAYMENT: { icon: IndianRupee, color: '#2563EB', bg: '#DBEAFE' },
  TRIP_CHANGES: { icon: Route, color: '#16A34A', bg: '#DCFCE7' },
  EXTRA_CHARGES: { icon: Briefcase, color: '#7C3AED', bg: '#EDE9FE' },
  VEHICLE_ISSUE: { icon: Car, color: '#D97706', bg: '#FEF3C7' },
  DRIVER_BEHAVIOUR: { icon: UserX, color: '#DC2626', bg: '#FEE2E2' },
  LOST_ITEM: { icon: Package, color: '#2563EB', bg: '#DBEAFE' },
  BOOKING_CHANGE: { icon: CalendarClock, color: '#EA580C', bg: '#FFEDD5' },
  CANCELLATION: { icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
  PAYMENT: { icon: CreditCard, color: '#2563EB', bg: '#DBEAFE' },
  ITINERARY: { icon: ClipboardList, color: '#16A34A', bg: '#DCFCE7' },
  ON_TRIP: { icon: AlertTriangle, color: '#D97706', bg: '#FEF3C7' },
  STATUS: { icon: RefreshCw, color: '#2563EB', bg: '#DBEAFE' },
  DOCUMENTS: { icon: FileText, color: '#7C3AED', bg: '#EDE9FE' },
  CHANGE_DETAILS: { icon: CalendarClock, color: '#EA580C', bg: '#FFEDD5' },
  REFUND: { icon: RefreshCw, color: '#16A34A', bg: '#DCFCE7' },
  DOUBLE_CHARGE: { icon: CreditCard, color: '#DC2626', bg: '#FEE2E2' },
  FAILED: { icon: XCircle, color: '#D97706', bg: '#FEF3C7' },
  INVOICE: { icon: FileText, color: '#2563EB', bg: '#DBEAFE' },
  UNSAFE: { icon: ShieldCheck, color: '#DC2626', bg: '#FEE2E2' },
  HARASSMENT: { icon: UserX, color: '#DC2626', bg: '#FEE2E2' },
  ACCIDENT: { icon: AlertTriangle, color: '#DC2626', bg: '#FEE2E2' },
};
export const issueLook = (key: string) => ISSUE_ICONS[key] || { icon: HelpCircle, color: '#475569', bg: '#F1F5F9' };

export const STATUS_LOOK: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: '#C2410C', bg: '#FFEDD5' },
  IN_PROGRESS: { label: 'In progress', color: '#1D4ED8', bg: '#DBEAFE' },
  RESOLVED: { label: 'Resolved', color: '#15803D', bg: '#DCFCE7' },
  CLOSED: { label: 'Closed', color: '#475569', bg: '#F1F5F9' },
};

export const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export function SupportHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: '#FFFFFF' }}>
      <TouchableOpacity onPress={onBack} disabled={!onBack} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: onBack ? VC.surface : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {onBack && <ArrowLeft size={20} color={VC.ink} strokeWidth={2.4} />}
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
        <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '800', color: VC.ink, letterSpacing: -0.3 }}>{title}</Text>
        {!!subtitle && <Text numberOfLines={1} style={{ fontSize: 12, color: VC.muted, marginTop: 1 }}>{subtitle}</Text>}
      </View>
      <TouchableOpacity onPress={() => chatSupport()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: VC.orangeSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Headphones size={19} color={VC.orange} strokeWidth={2.4} />
      </TouchableOpacity>
    </View>
  );
}

const STEPS = ['Issue', 'Details', 'Review', 'Done'];
export function SupportStepper({ current }: { current: number }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12, backgroundColor: '#FFFFFF' }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current || current > STEPS.length;
        const active = n === current;
        return (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', height: 26 }}>
              <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? 'transparent' : done || active ? VC.orange : '#E8EDF4' }} />
              <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? VC.orange : '#FFFFFF', borderWidth: done ? 0 : 2, borderColor: active ? VC.orange : '#E2E8F0' }}>
                {done ? <Check size={13} color="#FFFFFF" strokeWidth={3.2} /> : <Text style={{ fontSize: 11.5, fontWeight: '800', color: active ? VC.orange : VC.muted }}>{n}</Text>}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: i === STEPS.length - 1 ? 'transparent' : done ? VC.orange : '#E8EDF4' }} />
            </View>
            <Text numberOfLines={1} style={{ marginTop: 5, fontSize: 11, fontWeight: active ? '700' : '500', color: active ? VC.ink : done ? VC.body : VC.muted }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// Hero card: deep navy -> orange gradient with soft rings and an icon.
let heroSeq = 0;
export function SupportHero({ line1, line2, sub, overline, icon: Icon = Headphones }: { line1: string; line2: string; sub?: string; overline?: string; icon?: LucideIcon }) {
  const narrow = useWindowDimensions().width < 400;
  const id = React.useMemo(() => `supportHero${++heroSeq}`, []);
  return (
    <View style={{ marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: VC.ink, ...SHADOW }}>
      <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0B1B3F" />
            <Stop offset="0.62" stopColor="#1E2B5E" />
            <Stop offset="1" stopColor="#FF6A2B" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
        <Circle cx="88%" cy="40%" r="70" fill="#FFFFFF" fillOpacity={0.06} />
        <Circle cx="88%" cy="40%" r="46" fill="#FFFFFF" fillOpacity={0.08} />
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 }}>
        <View style={{ flex: 1 }}>
          {!!overline && <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFB08A', letterSpacing: 1, marginBottom: 6 }}>{overline}</Text>}
          <Text style={{ fontSize: narrow ? 22 : 25, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6, lineHeight: narrow ? 27 : 30 }}>{line1}</Text>
          <Text style={{ fontSize: narrow ? 22 : 25, fontWeight: '800', color: '#FF8A57', letterSpacing: -0.6, lineHeight: narrow ? 27 : 30 }}>{line2}</Text>
          {!!sub && <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 8, lineHeight: 18 }}>{sub}</Text>}
        </View>
        <View style={{ width: narrow ? 64 : 76, height: narrow ? 64 : 76, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={narrow ? 28 : 34} color="#FFFFFF" strokeWidth={1.9} />
        </View>
      </View>
    </View>
  );
}

export function SCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: VC.hair, padding: 16 }, style]}>{children}</View>;
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: VC.ink, letterSpacing: -0.4 }}>{title}</Text>
        {!!subtitle && <Text style={{ fontSize: 13, color: VC.body, marginTop: 3 }}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function PillButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 13.5, fontWeight: '700', color: VC.orange }}>{label}</Text>
      <ChevronRight size={15} color={VC.orange} />
    </TouchableOpacity>
  );
}

export function BookingRow({ title, subtitle, code, status, right, kind }: { title?: string; subtitle?: string; code?: string; status?: string; right?: React.ReactNode; kind?: string }) {
  const look = kind === 'TOUR' ? SERVICE_LOOK.TOUR : kind === 'VISA' ? SERVICE_LOOK.VISA : SERVICE_LOOK.CAB;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
        <look.icon size={22} color={look.color} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: VC.ink }}>{title}</Text>
        {!!subtitle && <Text numberOfLines={1} style={{ fontSize: 12.5, color: VC.body, marginTop: 2 }}>{subtitle}</Text>}
        {!!code && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: VC.muted }}>{code}</Text>
            {!!status && (
              <View style={{ backgroundColor: VC.surface, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '600', color: VC.body, textTransform: 'capitalize' }}>{status.replace(/_/g, ' ').toLowerCase()}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      {right}
    </View>
  );
}

// One issue as a clean list row (icon, title, one-line hint, chevron).
export function IssueRow({ issueKey, label, hint, onPress, first }: { issueKey: string; label: string; hint: string; onPress: () => void; first?: boolean }) {
  const look = issueLook(issueKey);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: first ? 0 : 1, borderTopColor: VC.hair }}>
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
        <look.icon size={20} color={look.color} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: VC.ink }}>{label}</Text>
        <Text numberOfLines={1} style={{ fontSize: 12.5, color: VC.body, marginTop: 2 }}>{hint}</Text>
      </View>
      <ChevronRight size={18} color={VC.muted} />
    </TouchableOpacity>
  );
}

// Chat (WhatsApp) + Call buttons side by side.
export function ContactButtons({ context }: { context?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <TouchableOpacity onPress={() => chatSupport(context)} activeOpacity={0.85} style={{ flex: 1, alignItems: 'center', gap: 6, backgroundColor: VC.greenSoft, borderRadius: 18, paddingVertical: 14 }}>
        <WhatsAppGlyph size={24} color="#1FA855" />
        <Text style={{ fontSize: 14, fontWeight: '700', color: VC.ink }}>Chat with us</Text>
        <Text style={{ fontSize: 11.5, color: VC.body }}>WhatsApp · instant</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={callSupport} activeOpacity={0.85} style={{ flex: 1, alignItems: 'center', gap: 6, backgroundColor: VC.blueSoft, borderRadius: 18, paddingVertical: 14 }}>
        <Phone size={22} color="#2563EB" />
        <Text style={{ fontSize: 14, fontWeight: '700', color: VC.ink }}>Call us</Text>
        <Text style={{ fontSize: 11.5, color: VC.body }}>{SUPPORT_PHONE_DISPLAY}</Text>
      </TouchableOpacity>
    </View>
  );
}

// FAQs per service (shown on the home and service screens).
export const SUPPORT_FAQS: Record<string, { q: string; a: string }[]> = {
  GENERAL: [
    { q: 'How do I book a ride?', a: 'Enter your pick-up and drop locations, choose the date and time, tap Search Cabs, pick a vehicle and pay to confirm.' },
    { q: 'What payment methods are available?', a: 'You can pay securely through PayU using UPI, debit/credit cards, net banking or wallets.' },
    { q: 'How can I change or cancel my booking?', a: 'Raise a request from Help & Support with your booking selected, or call us. We will help you change or cancel it.' },
    { q: 'When will I get driver details?', a: 'Driver and vehicle details are shared once a partner is assigned, and no earlier than 24 hours before your trip.' },
    { q: 'Are tolls and parking included?', a: 'Fuel and driver charges are included in your fare. Tolls, parking, state taxes and permits are paid on the trip.' },
  ],
  CAB: [
    { q: 'How do I track my driver?', a: 'Open My Trips and tap your upcoming ride. Driver details and status appear there once assigned.' },
    { q: 'Are tolls and parking included?', a: 'Tolls, parking, state taxes and permits are paid on the trip as actuals.' },
    { q: 'What if my driver is late?', a: 'Call the driver from My Trips. If you cannot reach them, raise a "Driver not arrived" request and we will help right away.' },
    { q: 'How are waiting charges calculated?', a: 'For city round trips, the driver waits until your booked return time plus the free minutes; after that, a per-minute charge applies.' },
    { q: 'How can I cancel my booking?', a: 'Open My Trips, choose the ride and cancel, or raise a request here.' },
  ],
  TOUR: [
    { q: 'How do I pay the balance amount?', a: 'Our team will contact you before the balance due date. You can also raise a Payment request here.' },
    { q: 'Can I change my travel dates?', a: 'Raise a "Change booking" request. Changes depend on availability for the new departure.' },
    { q: 'What is included in my package?', a: 'Inclusions and exclusions are listed on the package details screen and in your booking.' },
  ],
  VISA: [
    { q: 'How long does a visa take?', a: 'Processing time depends on the country and visa type, shown on the visa details screen.' },
    { q: 'My application was returned, what now?', a: 'Open it from My Trips → Visa and tap Fix & Resubmit. No extra payment is needed.' },
    { q: 'Can I get a refund?', a: 'Government fees are usually non-refundable once submitted. Raise a Payment request and we will check your case.' },
  ],
};
