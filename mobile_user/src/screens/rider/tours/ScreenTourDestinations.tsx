// All tour destinations ("View All" from Popular Destinations on Explore Tours).
// Tapping one opens its packages, exactly like the destination tiles on Explore.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, TextInput, useWindowDimensions } from 'react-native';
import { Search, MapPin } from 'lucide-react-native';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import { getTourPackages, getTourDestinations, type TourPackage, type TourDestination } from '../../../api/tour.api';
import { useTourStore } from '../../../store/useTourStore';
import { sizedImage } from '../../../utils/imageUrl';
import { TourHeader, LoadingBlock } from './tourUi';

export default function ScreenTourDestinations({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const { width } = useWindowDimensions();
  const openList = useTourStore((s) => s.openList);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [destinations, setDestinations] = useState<TourDestination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getTourPackages(), getTourDestinations()]).then(([pkgs, dests]) => {
      if (cancelled) return;
      if (pkgs.status === 'fulfilled') setPackages(pkgs.value.data.data || []);
      if (dests.status === 'fulfilled') setDestinations(dests.value.data.data || []);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Destinations that have packages, most packages first (same ranking as Explore).
  const ranked = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of packages) {
      const id = p.destination?._id;
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }
    return destinations
      .filter((d) => counts.has(d._id))
      .map((d) => ({ ...d, count: counts.get(d._id) || 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [packages, destinations]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter((d) => [d.name, d.state, d.country].some((v) => v && v.toLowerCase().includes(q)));
  }, [ranked, search]);

  const cardWidth = (Math.min(width, 520) - 14 * 2 - 12) / 2;
  const open = (d: TourDestination) => {
    openList({ search: d.name.trim() }, d.name.trim());
    onNavigate('tour-list');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TourHeader onBack={onBack} onBell={() => onNavigate('38')} />

        <View style={{ paddingHorizontal: 14, paddingTop: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF4500' }}>Tours</Text>
          <Text style={{ fontSize: 25, fontWeight: '800', color: '#0B1E3D', letterSpacing: -0.5, marginTop: 2 }}>Popular Destinations</Text>
          <Text style={{ fontSize: 13.5, fontWeight: '500', color: '#475569', marginTop: 2 }}>
            {isLoading ? 'Finding destinations...' : `${ranked.length} destination${ranked.length === 1 ? '' : 's'} to explore`}
          </Text>
        </View>

        <View style={{ marginHorizontal: 14, marginTop: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F6', paddingHorizontal: 14, height: 48 }}>
          <Search size={18} color="#94A3B8" strokeWidth={2.2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search destination or state"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#0F172A', paddingHorizontal: 10, paddingVertical: 0 }}
          />
        </View>

        {isLoading ? (
          <LoadingBlock label="Loading destinations..." />
        ) : shown.length === 0 ? (
          <View style={{ paddingVertical: 48, alignItems: 'center', gap: 6, paddingHorizontal: 24 }}>
            <MapPin size={28} color="#FF4500" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0B1E3D' }}>No destinations found</Text>
            <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center' }}>Try a different name or clear the search.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 14, rowGap: 12, marginTop: 16 }}>
            {shown.map((d) => (
              <TouchableOpacity key={d._id} onPress={() => open(d)} activeOpacity={0.85} style={{ width: cardWidth, height: Math.round(cardWidth * 1.15), borderRadius: 16, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
                {d.coverImage?.url ? (
                  <Image source={{ uri: sizedImage(d.coverImage.url, cardWidth) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1EA' }}>
                    <MapPin size={30} color="#FF4500" />
                  </View>
                )}
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(15,23,42,0.5)' }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{d.name.trim()}</Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '500', color: 'rgba(255,255,255,0.88)', marginTop: 1 }}>
                    {d.count} package{d.count === 1 ? '' : 's'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <RiderBottomNavbar activeScreen="31" onNavigate={onNavigate} />
    </View>
  );
}
