// Shared presentation pieces for the ride booking screens (vehicle
// selection, review & pay). Display only -- no state or API calls.
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { ArrowLeft, Navigation, Calendar } from 'lucide-react-native';

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-10-14" -> "Wed, 14 Oct". Falls back to the raw string if it isn't YYYY-MM-DD.
export function formatDisplayDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return value;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Address split into a bold first part ("Triveni Nagar") and a muted rest.
export function AddressLine({ label, address, lines = 1 }: { label: string; address: string; lines?: number }) {
  const [primary, ...rest] = address.split(',');
  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: '500', color: '#94A3B8' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A', marginTop: 1, letterSpacing: -0.1 }} numberOfLines={1}>
        {primary.trim()}
      </Text>
      {rest.length > 0 && (
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#64748B', marginTop: 1, lineHeight: 16 }} numberOfLines={lines}>
          {rest.join(',').trim()}
        </Text>
      )}
    </View>
  );
}

export function MetaChip({ label, icon, highlight }: { label: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: highlight ? '#FFF5EF' : '#F1F5F9',
      }}
    >
      {icon}
      <Text style={{ fontSize: 11, fontWeight: '600', color: highlight ? '#FF5500' : '#475569' }}>{label}</Text>
    </View>
  );
}

// Tint per partner vehicle class for the icon badge.
export const RATE_CARD_TINT: Record<string, { bg: string; icon: string }> = {
  Hatchback: { bg: '#EFF6FF', icon: '#2563EB' },
  Sedan: { bg: '#FFF5EF', icon: '#EA580C' },
  SUV: { bg: '#ECFDF5', icon: '#059669' },
  'Tempo Traveller': { bg: '#F5F3FF', icon: '#7C3AED' },
};

// ---- Shared header + trip card for the booking flow screens ----

const MBGO_LOGO = require('../../../desgin/mbgoLogo.png');

export function RideFlowHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 2, gap: 4 }}>
      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={18} color="#0F172A" strokeWidth={2} />
        </TouchableOpacity>
        <Image source={MBGO_LOGO} style={{ width: 104, height: 34 }} resizeMode="contain" />
        <View style={{ width: 38 }} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#0B1E3D', letterSpacing: -0.4, marginTop: 2 }}>{title}</Text>
      {!!subtitle && <Text style={{ fontSize: 13, fontWeight: '400', color: '#64748B' }}>{subtitle}</Text>}
    </View>
  );
}

export function TripSummaryCard({
  pickup,
  drop,
  isRoundTrip,
  distanceKm,
  rideDate,
  rideTime,
  returnDate,
  returnTime,
  tripDays,
  onEdit,
}: {
  pickup: string;
  drop: string;
  isRoundTrip: boolean;
  distanceKm?: number;
  rideDate: string;
  rideTime: string;
  returnDate?: string;
  returnTime?: string;
  tripDays?: number;
  onEdit: () => void;
}) {
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 18, padding: 14, flexDirection: 'row', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10 }}>
      {/* Route -- addresses wrap so the full location is visible */}
      <View style={{ flex: 1.1, flexDirection: 'row', gap: 10, paddingRight: 12 }}>
        <View style={{ alignItems: 'center', paddingTop: 6, width: 12 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#D1FAE5' }} />
          <View style={{ flex: 1, width: 1.5, backgroundColor: '#E2E8F0', marginVertical: 4, borderRadius: 1 }} />
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#FF5500', borderWidth: 2, borderColor: '#FFE4D5' }} />
        </View>
        <View style={{ flex: 1, gap: 12 }}>
          <AddressLine label="Pickup" address={pickup || '-'} lines={3} />
          <AddressLine label="Drop" address={drop || '-'} lines={3} />
        </View>
      </View>

      {/* Trip details */}
      <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: '#F1F5F9', paddingLeft: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <MetaChip highlight label={isRoundTrip ? 'Round Trip' : 'One Way'} />
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#FED7C3', backgroundColor: '#FFF5EF' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF5500' }}>Edit</Text>
          </TouchableOpacity>
        </View>
        {!!distanceKm && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}>
            <Navigation size={13} color="#64748B" strokeWidth={2} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: '#0F172A', lineHeight: 17 }}>
              {Math.round(distanceKm).toLocaleString('en-IN')} km <Text style={{ fontWeight: '400', color: '#64748B' }}>(one way)</Text>
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}>
          <Calendar size={13} color="#64748B" strokeWidth={2} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: '#0F172A', lineHeight: 17 }}>
            {formatDisplayDate(rideDate)}, {rideTime}
          </Text>
        </View>
        {isRoundTrip && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}>
            <Calendar size={13} color="#64748B" strokeWidth={2} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '500', color: '#334155', lineHeight: 17 }}>
              Return {returnDate ? formatDisplayDate(returnDate) : '-'}, {returnTime || '-'}
              {tripDays ? <Text style={{ fontWeight: '600', color: '#0F172A' }}>{` (${plural(tripDays, 'Day')})`}</Text> : null}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
