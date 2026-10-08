import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, TextInput, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Search, ShieldCheck, FileText, Headphones, Clock, ChevronRight, Globe, Sparkles, X } from 'lucide-react-native';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import { getVisaList, getVisaStartingPrice, getVisaServiceFeeFrom, visaTypeLabel, type Visa } from '../../../api/visa.api';
import { useVisaStore } from '../../../store/useVisaStore';
import { LoadingBlock, inr } from '../tours/tourUi';
import { FlagIcon, VisaHeader, VC, SHADOW } from './visaUi';

const TRUST = [
  { icon: ShieldCheck, title: 'Expert help', text: 'Application to approval', color: '#16A34A', bg: VC.greenSoft },
  { icon: FileText, title: 'Transparent', text: 'Clear documents & fees', color: '#2563EB', bg: VC.blueSoft },
  { icon: Headphones, title: 'Full support', text: 'End-to-end assistance', color: VC.orange, bg: VC.orangeSoft },
];

const purposesOf = (v: Visa) => Array.from(new Set((v.visas || []).map((c) => c.visaPurpose).filter(Boolean) as string[]));
const kindsOf = (v: Visa) => Array.from(new Set([v.visaType, ...(v.visas || []).map((c) => c.visaType)].filter(Boolean) as string[]));

// Dark-to-clear shade over the banner photo so white text reads well.
function BannerShade() {
  return (
    <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="visaListBanner" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#0B1B3F" stopOpacity={0.92} />
          <Stop offset="0.5" stopColor="#0B1B3F" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#0B1B3F" stopOpacity={0.05} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#visaListBanner)" />
    </Svg>
  );
}

export default function ScreenVisaList({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const openVisa = useVisaStore((s) => s.openVisa);
  const narrow = useWindowDimensions().width < 400;
  const [visas, setVisas] = useState<Visa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  // Filter key: 'All', 'p:<purpose>' or 'k:<visa kind>'
  const [filter, setFilter] = useState('All');

  const load = () => {
    setIsLoading(true);
    setFailed(false);
    getVisaList()
      .then((res) => setVisas((res.data.data || []).filter((v) => v.isActive !== false)))
      .catch(() => setFailed(true))
      .finally(() => setIsLoading(false));
  };
  useEffect(load, []);

  const chips = useMemo(() => {
    const purposes = Array.from(new Set(visas.flatMap(purposesOf)));
    const kinds = Array.from(new Set(visas.flatMap(kindsOf)));
    return [
      { key: 'All', label: 'All' },
      ...purposes.map((p) => ({ key: `p:${p}`, label: `${p} Visa` })),
      ...kinds.map((k) => ({ key: `k:${k}`, label: visaTypeLabel(k) })),
    ];
  }, [visas]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visas.filter((v) => {
      if (filter.startsWith('p:') && !purposesOf(v).includes(filter.slice(2))) return false;
      if (filter.startsWith('k:') && !kindsOf(v).includes(filter.slice(2))) return false;
      if (!q) return true;
      return `${v.country} ${v.title} ${purposesOf(v).join(' ')} ${kindsOf(v).map(visaTypeLabel).join(' ')}`.toLowerCase().includes(q);
    });
  }, [visas, search, filter]);

  const heroImage = visas.find((v) => v.bannerImage?.url)?.bannerImage?.url || visas[0]?.coverImage?.url;
  const bannerTags = [...Array.from(new Set(visas.flatMap(purposesOf))), ...Array.from(new Set(visas.flatMap(kindsOf))).map(visaTypeLabel)].slice(0, 3);

  const open = (v: Visa) => {
    openVisa(v);
    onNavigate('visa-detail');
  };

  const imageSize = narrow ? 76 : 88;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <VisaHeader onBack={onBack} onBell={() => onNavigate('38')} />

        {/* Title */}
        <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 }}>
          <Text style={{ fontSize: narrow ? 26 : 28, fontWeight: '800', color: VC.ink, letterSpacing: -0.8 }}>Visa Services</Text>
          <Text style={{ fontSize: 14.5, color: VC.body, marginTop: 4, lineHeight: 20 }}>Your trusted partner for global travel</Text>
        </View>

        {/* Hero banner */}
        <View style={{ marginHorizontal: 16, height: narrow ? 150 : 164, borderRadius: 22, overflow: 'hidden', backgroundColor: VC.ink, ...SHADOW }}>
          {!!heroImage && <Image source={{ uri: heroImage }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />}
          <BannerShade />
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 4 }}>
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4 }}>
              <Sparkles size={12} color="#FFD7C2" strokeWidth={2.2} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.2 }}>Trusted visa experts</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.88)' }}>Apply visa for</Text>
            <Text style={{ fontSize: narrow ? 28 : 31, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.8 }}>
              <Text style={{ color: '#FF8A57' }}>{visas.length ? `${visas.length}+` : 'Top'}</Text> Countries
            </Text>
            {bannerTags.length > 0 && <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{bannerTags.join('  ·  ')}</Text>}
          </View>
        </View>

        {/* Trust strip */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: VC.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 4 }}>
          {TRUST.map((t, i) => (
            <View key={t.title} style={{ flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 4, borderLeftWidth: i ? 1 : 0, borderLeftColor: '#E4E9F1' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
                <t.icon size={18} color={t.color} strokeWidth={2.2} />
              </View>
              <Text numberOfLines={1} style={{ fontSize: narrow ? 11.5 : 12.5, fontWeight: '700', color: VC.ink }}>{t.title}</Text>
              <Text numberOfLines={2} style={{ fontSize: 11, color: VC.muted, textAlign: 'center', lineHeight: 14 }}>{t.text}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={{ marginHorizontal: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: VC.surface, borderRadius: 16, paddingHorizontal: 16, height: 52 }}>
          <Search size={19} color={VC.muted} strokeWidth={2.2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search country or visa type"
            placeholderTextColor={VC.muted}
            style={{ flex: 1, fontSize: 15, color: VC.ink, paddingHorizontal: 12, paddingVertical: 0 }}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={17} color={VC.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        {chips.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 14 }}>
            {chips.map((c) => {
              const active = filter === c.key;
              return (
                <TouchableOpacity key={c.key} onPress={() => setFilter(c.key)} activeOpacity={0.85} style={{ height: 38, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: active ? VC.orange : '#E2E8F0', backgroundColor: active ? VC.orange : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: active ? '700' : '500', color: active ? '#FFFFFF' : VC.body }}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Section header */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: VC.ink, letterSpacing: -0.3 }}>Popular destinations</Text>
          {!isLoading && !failed && <Text style={{ fontSize: 12.5, color: VC.muted }}>{shown.length} {shown.length === 1 ? 'country' : 'countries'}</Text>}
        </View>

        {isLoading ? (
          <LoadingBlock label="Loading visas..." />
        ) : failed ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
            <Text style={{ fontSize: 14, color: VC.body }}>Couldn't load visas.</Text>
            <TouchableOpacity onPress={load} style={{ paddingHorizontal: 20, height: 42, justifyContent: 'center', borderRadius: 12, backgroundColor: VC.orange }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {shown.length === 0 && <Text style={{ textAlign: 'center', fontSize: 14, color: VC.muted, paddingVertical: 30 }}>No visas match your search.</Text>}
            {shown.map((v) => {
              const serviceFrom = getVisaServiceFeeFrom(v);
              const totalFrom = getVisaStartingPrice(v);
              const purposes = purposesOf(v);
              const kinds = kindsOf(v);
              const image = v.coverImage?.url || v.bannerImage?.url;
              const subtitle = [...(purposes.length ? purposes : ['Tourist']).map((p) => `${p} Visa`), ...kinds.slice(0, 1).map(visaTypeLabel)].join(' · ');
              return (
                <TouchableOpacity key={v._id} onPress={() => open(v)} activeOpacity={0.9} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: VC.hair, padding: 10, gap: 12, ...SHADOW }}>
                  <View style={{ width: imageSize, height: imageSize, borderRadius: 14, overflow: 'hidden', backgroundColor: VC.surface, alignItems: 'center', justifyContent: 'center' }}>
                    {image ? <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Globe size={26} color={VC.muted} />}
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FlagIcon country={v.country} size={16} />
                      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: narrow ? 15.5 : 16.5, fontWeight: '700', color: VC.ink, letterSpacing: -0.2 }}>{v.country}</Text>
                    </View>
                    <Text numberOfLines={narrow ? 2 : 1} style={{ fontSize: 12.5, color: VC.body, lineHeight: 17 }}>{subtitle}</Text>
                    {!!v.duration && (
                      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: VC.surface, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 2, maxWidth: '100%' }}>
                        <Clock size={11.5} color={VC.body} strokeWidth={2.2} />
                        <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 11, fontWeight: '500', color: VC.body }}>{v.duration}</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 1, paddingRight: 2 }}>
                    <Text style={{ fontSize: 11, color: VC.muted }}>From</Text>
                    <Text style={{ fontSize: narrow ? 16.5 : 18, fontWeight: '800', color: VC.orange, letterSpacing: -0.4 }}>{inr((serviceFrom ?? totalFrom) || 0)}</Text>
                    <Text style={{ fontSize: 10.5, color: VC.muted }}>{serviceFrom ? '+ govt. fees' : 'all inclusive'}</Text>
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: VC.orangeSoft, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
                      <ChevronRight size={15} color={VC.orange} strokeWidth={2.6} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
      <RiderBottomNavbar activeScreen="31" onNavigate={onNavigate} />
    </View>
  );
}
