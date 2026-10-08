// Shared presentation pieces for the Tours screens. Display only.
import React from 'react';
import { View, Text, TouchableOpacity, Image, Modal, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  ArrowLeft,
  Bell,
  Calendar,
  MapPin,
  ArrowRight,
  Palmtree,
  Mountain,
  Landmark,
  Footprints,
  BadgePercent,
  Heart,
  Users,
  Globe,
  Briefcase,
  User,
  Compass,
  Sparkles,
  Images,
} from 'lucide-react-native';
import { getTourDurationLabel, getTourImages, getTourStartingPrice, type TourPackage } from '../../../api/tour.api';

// New MBGO wordmark (same as the Home header).
const MBGO_LOGO = require('../../../../assets/mbgo-home-logo.png');

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// Icon + tint per category slug (falls back to a generic compass).
const CATEGORY_LOOK: Record<string, { icon: any; bg: string; color: string }> = {
  'weekend-getaways': { icon: Palmtree, bg: '#FFEDD5', color: '#EA580C' },
  'mountain-treks': { icon: Mountain, bg: '#E0F2FE', color: '#0284C7' },
  'religious-tours': { icon: Landmark, bg: '#FEE2E2', color: '#DC2626' },
  'backpacking-trips': { icon: Footprints, bg: '#DCFCE7', color: '#16A34A' },
  'early-bird': { icon: BadgePercent, bg: '#FEF3C7', color: '#D97706' },
  'honeymoon-packages': { icon: Heart, bg: '#FCE7F3', color: '#DB2777' },
  'family-tours': { icon: Users, bg: '#DBEAFE', color: '#2563EB' },
  'international-tour-packages': { icon: Globe, bg: '#EDE9FE', color: '#7C3AED' },
  'corporate-tour-packages': { icon: Briefcase, bg: '#F1F5F9', color: '#475569' },
  'solo-trip-packages': { icon: User, bg: '#CCFBF1', color: '#0D9488' },
  'group-tour-packages': { icon: Users, bg: '#FFE4E6', color: '#E11D48' },
  'customised-tour-packages': { icon: Sparkles, bg: '#FFF5EF', color: '#FF4500' },
};
export const getCategoryLook = (slug?: string) => CATEGORY_LOOK[slug || ''] || { icon: Compass, bg: '#F1F5F9', color: '#475569' };

export function TourHeader({ onBack, onBell }: { onBack?: () => void; onBell: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 4 }}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color="#0F172A" strokeWidth={2} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 36 }} />
      )}
      <Image source={MBGO_LOGO} style={{ width: 120, height: 40 }} resizeMode="contain" />
      <TouchableOpacity onPress={onBell} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Bell size={20} color="#0F172A" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#0B1E3D', letterSpacing: -0.3 }}>{title}</Text>
      {!!actionLabel && (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#FF4500' }}>{actionLabel} ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function CategoryIcon({ name, slug, active, onPress }: { name: string; slug?: string; active?: boolean; onPress: () => void }) {
  const look = getCategoryLook(slug);
  const Icon = look.icon;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ width: 76, alignItems: 'center', gap: 6 }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center', borderWidth: active ? 2 : 0, borderColor: '#FF4500' }}>
        <Icon size={24} color={look.color} strokeWidth={1.9} />
      </View>
      <Text numberOfLines={2} style={{ fontSize: 11.5, fontWeight: active ? '600' : '500', color: active ? '#FF4500' : '#334155', textAlign: 'center', lineHeight: 14 }}>{name}</Text>
    </TouchableOpacity>
  );
}

// 2-column package card used on the explore and list screens.
export function TourPackageCard({ pkg, width, onPress }: { pkg: TourPackage; width: number; onPress: () => void }) {
  const image = getTourImages(pkg)[0];
  const price = getTourStartingPrice(pkg);
  const duration = getTourDurationLabel(pkg);
  const place = pkg.destination?.name?.trim();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ width, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F6', overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
      <View style={{ width: '100%', height: width * 0.68, backgroundColor: '#E2E8F0' }}>
        {image ? (
          <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <PhotoPlaceholder />
        )}
        {!!place && (
          <View style={{ position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(15,23,42,0.72)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 }}>
            <MapPin size={10} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#FFFFFF' }} numberOfLines={1}>{place}</Text>
          </View>
        )}
        {pkg.isBestSeller && (
          <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: '#FF4500', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#FFFFFF' }}>BESTSELLER</Text>
          </View>
        )}
      </View>
      <View style={{ padding: 10, gap: 6 }}>
        <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '600', color: '#0B1E3D', lineHeight: 17, minHeight: 34 }}>{pkg.title}</Text>
        {!!duration && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} color="#64748B" strokeWidth={2} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>{duration}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
          <View style={{ flexShrink: 1 }}>
            {price ? (
              <>
                <Text style={{ fontSize: 9.5, fontWeight: '500', color: '#94A3B8' }}>Starting from</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FF4500', letterSpacing: -0.3 }}>{inr(price)}</Text>
                <Text style={{ fontSize: 9.5, fontWeight: '500', color: '#94A3B8' }}>per person</Text>
              </>
            ) : (
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#64748B' }}>Price on request</Text>
            )}
          </View>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FF4500', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRight size={15} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Shown where a package has no photos yet.
export function PhotoPlaceholder({ large }: { large?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF5EF' }}>
      <Images size={large ? 34 : 24} color="#FDBA8C" strokeWidth={1.6} />
      <Text style={{ fontSize: large ? 12.5 : 10.5, fontWeight: '500', color: '#F59E6B' }}>Photos coming soon</Text>
    </View>
  );
}

// Full-screen in-app browser (same pattern as the Home screen's services).
export function InAppBrowser({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!url} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, paddingTop: 40, backgroundColor: '#FFFFFF' }}>
        <TouchableOpacity onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 6 }}>
          <ArrowLeft size={18} color="#0F172A" />
          <Text style={{ fontWeight: '700' }}>Close</Text>
        </TouchableOpacity>
        {url && (
          <WebView
            source={{ uri: url }}
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#FF3B00" />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color="#FF4500" />
      <Text style={{ fontSize: 12, fontWeight: '500', color: '#94A3B8' }}>{label}</Text>
    </View>
  );
}
