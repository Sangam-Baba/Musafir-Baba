// Shared presentation pieces for the ride booking screens (vehicle
// selection, review & pay). Display only -- no state or API calls.
import React from 'react';
import { View, Text } from 'react-native';

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
