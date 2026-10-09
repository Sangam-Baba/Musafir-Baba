// Shared presentation pieces for the Visa screens.
import React, { createElement, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Platform, Linking, ActivityIndicator, useWindowDimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle, Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Bell,
  Calendar,
  Globe,
  FileText,
  Image as ImageIcon,
  Landmark,
  Plane,
  BedDouble,
  Briefcase,
  Camera,
  GraduationCap,
  Users,
  Building2,
  ScrollText,
  IdCard,
  type LucideIcon,
} from 'lucide-react-native';
import { getVisaImage, VISA_WHATSAPP_NUMBER, type Visa, type VisaCard } from '../../../api/visa.api';

export const NAVY = '#0B1E3D';
export const ORANGE = '#FF4500';
export const BLUE = '#1D4ED8';
export const MUTED = '#64748B';
export const BORDER = '#E8EDF3';

// ---------- Premium design tokens (visa screens) ----------
export const VC = {
  ink: '#0B1B3F',
  body: '#475467',
  muted: '#8A94A6',
  hair: '#EDF1F6',
  surface: '#F5F7FB',
  orange: '#FF4500',
  orangeSoft: '#FFF1EA',
  blueSoft: '#EAF1FF',
  greenSoft: '#E8F8EE',
};
export const SHADOW = { shadowColor: '#0B1B3F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 3 };
export const SHADOW_UP = { shadowColor: '#0B1B3F', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 12 };

// ---------- Country flags ----------
const FLAG_CODES: Record<string, string> = {
  thailand: 'TH', china: 'CN', singapore: 'SG', vietnam: 'VN', malaysia: 'MY', japan: 'JP', indonesia: 'ID', uae: 'AE',
  'united arab emirates': 'AE', dubai: 'AE', 'hong-kong': 'HK', 'hong kong': 'HK', australia: 'AU', 'new zealand': 'NZ',
  turkey: 'TR', philippines: 'PH', laos: 'LA', usa: 'US', 'united states': 'US', us: 'US', schengen: 'EU', canada: 'CA',
  uk: 'GB', 'united kingdom': 'GB', france: 'FR', germany: 'DE', italy: 'IT', spain: 'ES', switzerland: 'CH', egypt: 'EG',
  'sri lanka': 'LK', nepal: 'NP', bhutan: 'BT', maldives: 'MV', mauritius: 'MU', 'south korea': 'KR', korea: 'KR',
  russia: 'RU', azerbaijan: 'AZ', georgia: 'GE', kenya: 'KE', oman: 'OM', qatar: 'QA', 'saudi arabia': 'SA', bahrain: 'BH',
  cambodia: 'KH', myanmar: 'MM', taiwan: 'TW', ireland: 'IE', netherlands: 'NL', greece: 'GR', 'south africa': 'ZA',
};
export function countryFlag(country?: string): string | null {
  const code = FLAG_CODES[(country || '').trim().toLowerCase()];
  if (!code) return null;
  return String.fromCodePoint(...code.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function FlagBadge({ country, size = 30 }: { country?: string; size?: number }) {
  const flag = countryFlag(country);
  return (
    <View style={{ width: size * 1.3, height: size, borderRadius: 6, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {flag ? <Text style={{ fontSize: size * 0.82, lineHeight: size * 1.05 }}>{flag}</Text> : <Globe size={size * 0.6} color={BLUE} strokeWidth={1.8} />}
    </View>
  );
}

// Flag without a background tile (list rows / headers).
export function FlagIcon({ country, size = 20 }: { country?: string; size?: number }) {
  const flag = countryFlag(country);
  return flag ? <Text style={{ fontSize: size, lineHeight: size * 1.2 }}>{flag}</Text> : <Globe size={size * 0.9} color={BLUE} strokeWidth={1.8} />;
}

// New MBGO wordmark (same as the Home header).
const MBGO_LOGO = require('../../../../assets/mbgo-home-logo.png');
// Header used on the visa screens: plain back arrow, logo, bell.
export function VisaHeader({ onBack, onBell }: { onBack?: () => void; onBell: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 2 }}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <ArrowLeft size={24} color={NAVY} strokeWidth={2.2} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Image source={MBGO_LOGO} style={{ width: 138, height: 46 }} resizeMode="contain" />
      <TouchableOpacity onPress={onBell} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' }}>
        <Bell size={23} color={NAVY} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

// Small filled circle icon used before section titles.
export function SectionIcon({ icon: Icon, color = BLUE, size = 26 }: { icon: LucideIcon; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size * 0.56} color="#FFFFFF" strokeWidth={2.4} />
    </View>
  );
}

// ---------- Icons ----------
export function purposeIcon(purpose?: string): { icon: LucideIcon; bg: string; color: string } {
  const p = (purpose || '').toLowerCase();
  if (p.includes('study') || p.includes('student')) return { icon: GraduationCap, bg: '#F3E8FF', color: '#7C3AED' };
  if (p.includes('work') || p.includes('business') || p.includes('employ')) return { icon: Briefcase, bg: '#DBEAFE', color: '#2563EB' };
  if (p.includes('pr') || p.includes('immigr') || p.includes('family') || p.includes('visit')) return { icon: Users, bg: '#DCFCE7', color: '#16A34A' };
  if (p.includes('transit')) return { icon: Plane, bg: '#E0F2FE', color: '#0284C7' };
  return { icon: Camera, bg: '#FFEDD5', color: '#EA580C' };
}

export function documentLook(name: string): { icon: LucideIcon; bg: string; color: string; hint: string } {
  const n = name.toLowerCase();
  if (n.includes('photo')) return { icon: ImageIcon, bg: '#DBEAFE', color: '#2563EB', hint: 'Recent, white background, as per specification' };
  if (n.includes('passport')) return { icon: FileText, bg: '#DCFCE7', color: '#16A34A', hint: 'Front & back pages, valid 6+ months from travel date' };
  if (n.includes('bank') || n.includes('fund') || n.includes('itr') || n.includes('salary')) return { icon: Landmark, bg: '#F3E8FF', color: '#7C3AED', hint: 'Proof of sufficient funds' };
  if (n.includes('flight') || n.includes('ticket') || n.includes('itinerary')) return { icon: Plane, bg: '#E0F2FE', color: '#0284C7', hint: 'Confirmed or tentative travel booking' };
  if (n.includes('hotel') || n.includes('accommodation') || n.includes('stay')) return { icon: BedDouble, bg: '#FFE4E6', color: '#E11D48', hint: 'Hotel booking or invitation letter' };
  if (n.includes('employ') || n.includes('noc') || n.includes('leave') || n.includes('business')) return { icon: Briefcase, bg: '#FEF3C7', color: '#D97706', hint: 'Salaried: NOC & payslips · Self-employed: business papers' };
  if (n.includes('aadhaar') || n.includes('aadhar') || n.includes('pan') || n.includes('id')) return { icon: IdCard, bg: '#CCFBF1', color: '#0D9488', hint: 'Clear copy of the ID' };
  if (n.includes('letter') || n.includes('cover')) return { icon: ScrollText, bg: '#FFEDD5', color: '#EA580C', hint: 'Signed copy' };
  return { icon: Building2, bg: '#F1F5F9', color: '#475569', hint: 'Clear scanned copy' };
}

// ---------- 5-step progress ----------
const STEPS = ['Country', 'Visa Type', 'Eligibility', 'Documents', 'Payment'];
export function VisaStepper({ current, subtitles, allDone }: { current: number; subtitles: string[]; allDone?: boolean }) {
  const narrow = useWindowDimensions().width < 400;
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 14 }}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = allDone || n < current;
        const active = !allDone && n === current;
        const lineLeft = i === 0 ? 'transparent' : done || active ? VC.orange : '#E3E8F0';
        const lineRight = i === STEPS.length - 1 ? 'transparent' : done ? VC.orange : '#E3E8F0';
        return (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            {/* Same row height for every step so all connector lines sit on one line */}
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', height: 30 }}>
              <View style={{ flex: 1, height: 2, backgroundColor: lineLeft }} />
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? VC.orange : active ? '#FFFFFF' : VC.surface,
                  borderWidth: active ? 2 : done ? 0 : 1.5,
                  borderColor: active ? VC.orange : '#E3E8F0',
                }}
              >
                {done ? <Check size={15} color="#FFFFFF" strokeWidth={3.2} /> : <Text style={{ fontSize: 13, fontWeight: '800', color: active ? VC.orange : VC.muted }}>{n}</Text>}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: lineRight }} />
            </View>
            <Text numberOfLines={1} style={{ marginTop: 6, fontSize: narrow ? 10 : 11, fontWeight: active ? '700' : '600', color: active ? VC.ink : done ? VC.body : VC.muted }}>{label}</Text>
            <Text numberOfLines={1} style={{ fontSize: narrow ? 9.5 : 10, color: active ? VC.orange : VC.muted, paddingHorizontal: 2, marginTop: 1 }}>{subtitles[i] || ''}</Text>
          </View>
        );
      })}
    </View>
  );
}

export const stepSubtitles = (visa: Visa | null, card?: VisaCard, lastLabel = 'Pay & Submit') => [
  visa?.country || '',
  card?.visaPurpose || 'Select',
  'Your Details',
  'Upload',
  lastLabel,
];

// Solid colour on the left fading into the photo on the right.
export function FadeOverlay({ color, solidUntil = 0.42, fadeUntil = 0.66 }: { color: string; solidUntil?: number; fadeUntil?: number }) {
  // Gradient ids are document-wide on web, so make each variant's id unique.
  const id = `fade-${color.replace('#', '')}-${solidUntil}-${fadeUntil}`.replace(/\./g, '_');
  return (
    <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset={String(solidUntil)} stopColor={color} stopOpacity={1} />
          <Stop offset={String(fadeUntil)} stopColor={color} stopOpacity={0} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// ---------- Country banner (flag + name + visa type over the country photo) ----------
export function CountryBanner({ visa, subtitle, chips }: { visa: Visa; subtitle?: string; chips?: { icon: LucideIcon; label: string }[] }) {
  const image = getVisaImage(visa);
  return (
    <View style={{ marginHorizontal: 16, height: 132, borderRadius: 20, overflow: 'hidden', backgroundColor: '#F4F8FF', ...SHADOW }}>
      {!!image && <Image source={{ uri: image }} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60%' }} resizeMode="cover" />}
      {/* fade from the text side into the photo */}
      <FadeOverlay color="#F4F8FF" solidUntil={0.44} fadeUntil={0.7} />
      <View style={{ flex: 1, paddingHorizontal: 18, justifyContent: 'center', gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FlagIcon country={visa.country} size={22} />
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 21, fontWeight: '800', color: VC.ink, letterSpacing: -0.5 }}>{visa.country}</Text>
        </View>
        {!!subtitle && <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: VC.body, maxWidth: '62%' }}>{subtitle}</Text>}
        {!!chips?.length && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, maxWidth: '70%' }}>
            {chips.map((c) => (
              <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                <c.icon size={12} color={VC.ink} strokeWidth={2.2} />
                <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '600', color: VC.ink }}>{c.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ---------- Cards / text ----------
export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: VC.hair, borderRadius: 20, padding: 16, ...SHADOW }, style]}>{children}</View>;
}

export function CardTitle({ icon: Icon, title, subtitle, right, color = '#2563EB' }: { icon: LucideIcon; title: string; subtitle?: string; right?: React.ReactNode; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color === ORANGE || color === VC.orange ? VC.orangeSoft : VC.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={color} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, paddingTop: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: VC.ink, letterSpacing: -0.2, lineHeight: 21 }}>{title}</Text>
        {!!subtitle && <Text style={{ fontSize: 12.5, color: VC.body, marginTop: 2, lineHeight: 18 }}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: VC.ink, letterSpacing: -0.8 }}>{title}</Text>
      {!!subtitle && <Text style={{ fontSize: 14.5, color: VC.body, marginTop: 4, lineHeight: 21 }}>{subtitle}</Text>}
    </View>
  );
}

// ---------- Progress ring ----------
export function ProgressRing({ percent, size = 64 }: { percent: number; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF2F7" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={p >= 100 ? '#16A34A' : VC.orange} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={c * (1 - p / 100)} />
      </Svg>
      <Text style={{ fontSize: size * 0.25, fontWeight: '800', color: VC.ink, letterSpacing: -0.4 }}>{Math.round(p)}%</Text>
    </View>
  );
}

export function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EEF2F7', overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, percent))}%`, height: '100%', borderRadius: 4, backgroundColor: color || (percent >= 100 ? '#16A34A' : VC.orange) }} />
    </View>
  );
}

// ---------- WhatsApp ----------
// WhatsApp logo (Simple Icons path).
const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';
export function WhatsAppGlyph({ size = 20, color = '#25D366' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={WHATSAPP_PATH} fill={color} />
    </Svg>
  );
}

export const openWhatsApp = (message: string) =>
  Linking.openURL(`https://wa.me/${VISA_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`).catch(() => {});

// ---------- Sticky footer: Chat on WhatsApp + primary action ----------
export function VisaFooter({
  whatsappMessage,
  label,
  onPress,
  loading,
  disabled,
}: {
  whatsappMessage: string;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, flexDirection: 'row', gap: 10, ...SHADOW_UP }}>
      <TouchableOpacity
        onPress={() => openWhatsApp(whatsappMessage)}
        activeOpacity={0.8}
        accessibilityLabel="Chat on WhatsApp"
        style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: '#E8F8EE', borderWidth: 1, borderColor: '#C9EFD7', alignItems: 'center', justifyContent: 'center' }}
      >
        <WhatsAppGlyph size={26} color="#1FA855" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.88}
        style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: disabled || loading ? '#FFB394' : ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, shadowColor: ORANGE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: disabled || loading ? 0 : 0.28, shadowRadius: 12, elevation: disabled || loading ? 0 : 4 }}
      >
        {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1, fontSize: 15.5, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.1 }}>{loading ? 'Please wait' : label}</Text>
        {!loading && <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} />}
      </TouchableOpacity>
    </View>
  );
}

// ---------- Toast ----------
export function useToast() {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const show = (msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 3000);
  };
  const node = message ? (
    <View pointerEvents="none" style={{ position: 'absolute', top: 24, left: 16, right: 16, alignItems: 'center', zIndex: 50 }}>
      <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '600', textAlign: 'center' }}>{message}</Text>
      </View>
    </View>
  ) : null;
  return { show, node };
}

// ---------- Date field (native picker on device, <input type=date> on web) ----------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromYmd = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
// "2026-12-15" -> "15 Dec 2026"
export const formatYmd = (s?: string) => {
  const d = fromYmd(s || '');
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : s || '';
};

export function DateField({
  value,
  onChange,
  placeholder,
  minimumDate,
  maximumDate,
}: {
  value: string;
  onChange: (ymd: string) => void;
  placeholder: string;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const isWeb = Platform.OS === 'web';
  return (
    <View style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: value ? '#E3E8F0' : VC.hair, backgroundColor: value ? '#FFFFFF' : VC.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}>
      <Calendar size={18} color={value ? VC.orange : VC.muted} strokeWidth={2.2} />
      {isWeb ? (
        createElement('input', {
          type: 'date',
          value,
          min: minimumDate ? toYmd(minimumDate) : undefined,
          max: maximumDate ? toYmd(maximumDate) : undefined,
          onChange: (e: any) => onChange(e.target.value || ''),
          style: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, color: value ? '#0B1B3F' : '#8A94A6', fontFamily: 'inherit', colorScheme: 'light' },
        })
      ) : (
        <TouchableOpacity onPress={() => setOpen(true)} style={{ flex: 1, height: '100%', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: value ? '600' : '400', color: value ? VC.ink : VC.muted }}>{value ? formatYmd(value) : placeholder}</Text>
        </TouchableOpacity>
      )}
      {!isWeb && open && (
        <DateTimePicker
          value={fromYmd(value) || maximumDate || minimumDate || new Date()}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, selected) => {
            setOpen(Platform.OS === 'ios');
            if (event.type !== 'dismissed' && selected) onChange(toYmd(selected));
          }}
        />
      )}
    </View>
  );
}

// ---------- Small inputs ----------
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ height: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: active ? VC.orange : 'transparent', backgroundColor: active ? VC.orangeSoft : VC.surface, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 13.5, fontWeight: active ? '700' : '500', color: active ? VC.orange : VC.body }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function RadioDot({ active }: { active: boolean }) {
  return active ? (
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: VC.orange, alignItems: 'center', justifyContent: 'center' }}>
      <Check size={13} color="#FFFFFF" strokeWidth={3.2} />
    </View>
  ) : (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D3DAE5', backgroundColor: '#FFFFFF' }} />
  );
}

export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: checked ? VC.orange : '#D3DAE5', backgroundColor: checked ? VC.orange : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      {checked && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
    </View>
  );
}
