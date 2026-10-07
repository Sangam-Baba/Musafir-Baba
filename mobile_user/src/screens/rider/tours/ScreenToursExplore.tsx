import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, TextInput, useWindowDimensions } from 'react-native';
import { Search, Sparkles, ArrowRight } from 'lucide-react-native';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import {
  getTourPackages,
  getTourCategories,
  getTourDestinations,
  getBestSellerTours,
  getTourImages,
  WEBSITE_URL,
  type TourPackage,
  type TourCategory,
  type TourDestination,
} from '../../../api/tour.api';
import { useTourStore } from '../../../store/useTourStore';
import { TourHeader, SectionHeader, CategoryIcon, TourPackageCard, InAppBrowser, LoadingBlock } from './tourUi';

// Categories shown first (matches the website's most-used ones); any others follow.
const CATEGORY_ORDER = ['weekend-getaways', 'mountain-treks', 'religious-tours', 'backpacking-trips', 'early-bird', 'honeymoon-packages', 'family-tours', 'international-tour-packages'];

export default function ScreenToursExplore({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const { width } = useWindowDimensions();
  const openList = useTourStore((s) => s.openList);
  const openPackage = useTourStore((s) => s.openPackage);

  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [bestSellers, setBestSellers] = useState<TourPackage[]>([]);
  const [categories, setCategories] = useState<TourCategory[]>([]);
  const [destinations, setDestinations] = useState<TourDestination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getTourPackages(), getBestSellerTours(), getTourCategories(), getTourDestinations()]).then(([pkgs, best, cats, dests]) => {
      if (cancelled) return;
      if (pkgs.status === 'fulfilled') setPackages(pkgs.value.data.data || []);
      if (best.status === 'fulfilled') setBestSellers(best.value.data.data || []);
      if (cats.status === 'fulfilled') setCategories((cats.value.data.data || []).filter((c) => c.isActive !== false));
      if (dests.status === 'fulfilled') setDestinations(dests.value.data.data || []);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedCategories = useMemo(() => {
    const rank = (slug: string) => {
      const i = CATEGORY_ORDER.indexOf(slug);
      return i === -1 ? CATEGORY_ORDER.length : i;
    };
    return [...categories].filter((c) => c.slug !== 'customised-tour-packages').sort((a, b) => rank(a.slug) - rank(b.slug));
  }, [categories]);

  // Destinations with the most packages, that also have a photo.
  const popularDestinations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of packages) {
      const id = p.destination?._id;
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }
    return destinations
      .filter((d) => counts.has(d._id) && d.coverImage?.url)
      .sort((a, b) => (counts.get(b._id) || 0) - (counts.get(a._id) || 0))
      .slice(0, 10);
  }, [packages, destinations]);

  // Best sellers first, then other packages that have a photo and a price.
  const topPackages = useMemo(() => {
    const seen = new Set<string>();
    const list: TourPackage[] = [];
    for (const p of [...bestSellers, ...packages]) {
      if (seen.has(p._id) || !getTourImages(p).length || !p.batch?.length) continue;
      seen.add(p._id);
      list.push(p);
      if (list.length === 6) break;
    }
    return list;
  }, [bestSellers, packages]);

  const heroImage = topPackages[0] ? getTourImages(topPackages[0])[0] : popularDestinations[0]?.coverImage?.url;
  const cardWidth = (width - 14 * 2 - 12) / 2;

  const goToList = (params: Parameters<typeof openList>[0], title?: string) => {
    openList(params, title);
    onNavigate('tour-list');
  };
  const goToPackage = (pkg: TourPackage) => {
    openPackage(pkg);
    onNavigate('tour-detail');
  };
  const submitSearch = () => goToList(search.trim() ? { search: search.trim() } : {}, search.trim() ? `Results for "${search.trim()}"` : 'Holiday Packages');

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TourHeader onBack={onBack} onBell={() => onNavigate('38')} />

        {/* Hero */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14, minHeight: 140 }}>
          <View style={{ flex: 1.15, paddingRight: 8, gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF4500' }}>Tours</Text>
            <Text style={{ fontSize: 27, fontWeight: '800', color: '#0B1E3D', letterSpacing: -0.6 }}>Explore Tours</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#475569' }}>Find your perfect getaway</Text>
          </View>
          <View style={{ flex: 1, height: 140, borderTopLeftRadius: 70, borderBottomLeftRadius: 24, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
            {heroImage ? <Image source={{ uri: heroImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
          </View>
        </View>

        {/* Search */}
        <View style={{ marginHorizontal: 14, marginTop: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F6', paddingLeft: 14, paddingRight: 6, height: 54, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 }}>
          <Search size={19} color="#FF4500" strokeWidth={2.2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            placeholder="Where do you want to go?"
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, fontSize: 14.5, fontWeight: '500', color: '#0F172A', paddingHorizontal: 10, paddingVertical: 0 }}
          />
          <TouchableOpacity onPress={submitSearch} style={{ height: 42, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#FF4500', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#FFFFFF' }}>Search</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <LoadingBlock label="Loading tours..." />
        ) : (
          <View style={{ gap: 20, marginTop: 18 }}>
            {/* Categories */}
            {sortedCategories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 2 }}>
                {sortedCategories.map((c) => (
                  <CategoryIcon key={c._id} name={c.name.replace(/ Packages?$/i, '').replace(/ 20\d\d$/, '')} slug={c.slug} onPress={() => goToList({ category: c.slug }, c.name)} />
                ))}
              </ScrollView>
            )}

            {/* Popular destinations */}
            {popularDestinations.length > 0 && (
              <View style={{ gap: 12 }}>
                <SectionHeader title="Popular Destinations" actionLabel="View All" onAction={() => goToList({}, 'Holiday Packages')} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}>
                  {popularDestinations.map((d) => (
                    <TouchableOpacity key={d._id} onPress={() => goToList({ search: d.name.trim() }, d.name.trim())} activeOpacity={0.85} style={{ width: 96, height: 124, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
                      <Image source={{ uri: d.coverImage!.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 6, paddingVertical: 6, backgroundColor: 'rgba(15,23,42,0.45)' }}>
                        <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' }}>{d.name.trim()}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Top packages */}
            {topPackages.length > 0 && (
              <View style={{ gap: 12 }}>
                <SectionHeader title="Top Holiday Packages" actionLabel="View All" onAction={() => goToList({}, 'Holiday Packages')} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 14, rowGap: 12 }}>
                  {topPackages.map((p) => (
                    <TourPackageCard key={p._id} pkg={p} width={cardWidth} onPress={() => goToPackage(p)} />
                  ))}
                </View>
              </View>
            )}

            {/* Customise your trip */}
            <TouchableOpacity
              onPress={() => setBrowserUrl(`${WEBSITE_URL}/holidays/customised-tour-packages`)}
              activeOpacity={0.9}
              style={{ marginHorizontal: 14, backgroundColor: '#FFF5EF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={22} color="#FF4500" strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0B1E3D' }}>Customise Your Trip</Text>
                  <View style={{ backgroundColor: '#FF4500', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#FFFFFF' }}>Coming soon</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '400', color: '#64748B', marginTop: 2, lineHeight: 16 }}>Plan a trip around your dates, budget & preferences</Text>
              </View>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FF4500', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <RiderBottomNavbar activeScreen="31" onNavigate={onNavigate} />
      <InAppBrowser url={browserUrl} onClose={() => setBrowserUrl(null)} />
    </View>
  );
}
