import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, useWindowDimensions } from 'react-native';
import { Search, SlidersHorizontal, IndianRupee, Calendar, ChevronDown, Check, X, Compass } from 'lucide-react-native';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import { getTourPackages, getTourCategories, getTourStartingPrice, getTourImages, type TourPackage, type TourCategory, type TourListParams } from '../../../api/tour.api';
import { useTourStore } from '../../../store/useTourStore';
import { TourHeader, CategoryIcon, TourPackageCard, LoadingBlock } from './tourUi';

const BUDGETS = [
  { key: 'any', label: 'Any budget', min: 0, max: Infinity },
  { key: 'u10', label: 'Under ₹10,000', min: 0, max: 10000 },
  { key: '10-20', label: '₹10,000 – ₹20,000', min: 10000, max: 20000 },
  { key: '20-40', label: '₹20,000 – ₹40,000', min: 20000, max: 40000 },
  { key: '40p', label: 'Above ₹40,000', min: 40000, max: Infinity },
] as const;

const DURATIONS = [
  { key: 'any', label: 'Any duration' },
  { key: '1-3', label: '1 – 3 days', minDays: 1, maxDays: 3 },
  { key: '4-6', label: '4 – 6 days', minDays: 4, maxDays: 6 },
  { key: '7-9', label: '7 – 9 days', minDays: 7, maxDays: 9 },
  { key: '10p', label: '10+ days', minDays: 10 },
] as const;

type Picker = 'type' | 'budget' | 'duration' | null;

export default function ScreenToursList({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const { width } = useWindowDimensions();
  const initialParams = useTourStore((s) => s.listParams);
  const initialTitle = useTourStore((s) => s.listTitle);
  const openPackage = useTourStore((s) => s.openPackage);

  const [searchText, setSearchText] = useState(initialParams.search || '');
  const [search, setSearch] = useState(initialParams.search || '');
  const [category, setCategory] = useState(initialParams.category || '');
  const [durationKey, setDurationKey] = useState<string>('any');
  const [budgetKey, setBudgetKey] = useState<string>('any');
  const [picker, setPicker] = useState<Picker>(null);

  const [categories, setCategories] = useState<TourCategory[]>([]);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTourCategories()
      .then((res) => setCategories((res.data.data || []).filter((c) => c.isActive !== false)))
      .catch(() => {});
  }, []);

  // Server-side filters: search, category, duration. Budget is applied on the
  // starting price below (the API has no price filter).
  useEffect(() => {
    let cancelled = false;
    const duration = DURATIONS.find((d) => d.key === durationKey);
    const params: TourListParams = {
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
      ...(duration && 'minDays' in duration ? { minDays: duration.minDays } : {}),
      ...(duration && 'maxDays' in duration ? { maxDays: duration.maxDays } : {}),
    };
    setIsLoading(true);
    getTourPackages(params)
      .then((res) => {
        if (!cancelled) setPackages(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) setPackages([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, category, durationKey]);

  const visiblePackages = useMemo(() => {
    const budget = BUDGETS.find((b) => b.key === budgetKey) || BUDGETS[0];
    const filtered = budget.key === 'any'
      ? packages
      : packages.filter((p) => {
          const price = getTourStartingPrice(p);
          return price !== null && price >= budget.min && price < budget.max;
        });
    // Show complete packages (photo + price) first; original order otherwise.
    const score = (p: TourPackage) => (getTourImages(p).length ? 0 : 2) + (getTourStartingPrice(p) !== null ? 0 : 1);
    return filtered.map((p, i) => ({ p, i })).sort((a, b) => score(a.p) - score(b.p) || a.i - b.i).map((x) => x.p);
  }, [packages, budgetKey]);

  const activeCategory = categories.find((c) => c.slug === category);
  const title = search || category || durationKey !== 'any' || budgetKey !== 'any'
    ? (activeCategory?.name || (search ? `Results for "${search}"` : initialTitle))
    : 'Holiday Packages';
  const cardWidth = (width - 14 * 2 - 12) / 2;

  const chip = (key: Picker, label: string, Icon: any, isSet: boolean) => (
    <TouchableOpacity
      key={key}
      onPress={() => setPicker(key)}
      style={{ flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: isSet ? '#FF4500' : '#E2E8F0', backgroundColor: isSet ? '#FFF5EF' : '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 6 }}
    >
      <Icon size={14} color={isSet ? '#FF4500' : '#334155'} strokeWidth={2} />
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, fontWeight: '600', color: isSet ? '#FF4500' : '#334155' }}>{label}</Text>
      <ChevronDown size={13} color={isSet ? '#FF4500' : '#64748B'} strokeWidth={2} />
    </TouchableOpacity>
  );

  const pickerOptions: { key: string; label: string; selected: boolean; onPick: () => void }[] =
    picker === 'type'
      ? [{ _id: '', name: 'All packages', slug: '' }, ...categories].map((c) => ({ key: c.slug || 'all', label: c.name, selected: category === c.slug, onPick: () => setCategory(c.slug) }))
      : picker === 'budget'
        ? BUDGETS.map((b) => ({ key: b.key, label: b.label, selected: budgetKey === b.key, onPick: () => setBudgetKey(b.key) }))
        : picker === 'duration'
          ? DURATIONS.map((d) => ({ key: d.key, label: d.label, selected: durationKey === d.key, onPick: () => setDurationKey(d.key) }))
          : [];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[]}>
        <TourHeader onBack={onBack} onBell={() => onNavigate('38')} />

        <View style={{ paddingHorizontal: 14, paddingTop: 6, gap: 2 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#0B1E3D', letterSpacing: -0.5 }} numberOfLines={2}>{title}</Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#64748B' }}>Domestic & international trips with the best deals</Text>
        </View>

        {/* Search */}
        <View style={{ marginHorizontal: 14, marginTop: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F6', paddingLeft: 14, paddingRight: 6, height: 52, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 }}>
          <Search size={18} color="#FF4500" strokeWidth={2.2} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => setSearch(searchText.trim())}
            returnKeyType="search"
            placeholder="Search destination or package"
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#0F172A', paddingHorizontal: 10, paddingVertical: 0 }}
          />
          {!!searchText && (
            <TouchableOpacity onPress={() => { setSearchText(''); setSearch(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ paddingHorizontal: 6 }}>
              <X size={16} color="#94A3B8" strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setSearch(searchText.trim())} style={{ height: 40, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#FF4500', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#FFFFFF' }}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginTop: 12 }}>
          {chip('type', activeCategory ? activeCategory.name.replace(/ (Tour )?Packages?$/i, '') : 'Type', SlidersHorizontal, !!category)}
          {chip('budget', budgetKey === 'any' ? 'Budget' : (BUDGETS.find((b) => b.key === budgetKey)?.label || 'Budget'), IndianRupee, budgetKey !== 'any')}
          {chip('duration', durationKey === 'any' ? 'Duration' : (DURATIONS.find((d) => d.key === durationKey)?.label || 'Duration'), Calendar, durationKey !== 'any')}
        </View>

        {/* Category icons */}
        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 2, paddingTop: 16 }}>
            {categories.map((c) => (
              <CategoryIcon
                key={c._id}
                name={c.name.replace(/ Packages?$/i, '').replace(/ 20\d\d$/, '')}
                slug={c.slug}
                active={category === c.slug}
                onPress={() => setCategory(category === c.slug ? '' : c.slug)}
              />
            ))}
          </ScrollView>
        )}

        {/* Results */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 14, marginTop: 18, marginBottom: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#0B1E3D' }}>Popular Packages</Text>
          {!isLoading && <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748B' }}>{visiblePackages.length} found</Text>}
        </View>

        {isLoading ? (
          <LoadingBlock label="Finding packages..." />
        ) : visiblePackages.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 32, gap: 10 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF5EF', alignItems: 'center', justifyContent: 'center' }}>
              <Compass size={24} color="#FF4500" strokeWidth={1.8} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#0F172A' }}>No packages found</Text>
            <Text style={{ fontSize: 12.5, color: '#64748B', textAlign: 'center' }}>Try a different destination or clear the filters.</Text>
            <TouchableOpacity
              onPress={() => { setSearchText(''); setSearch(''); setCategory(''); setBudgetKey('any'); setDurationKey('any'); }}
              style={{ marginTop: 4, height: 40, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#FF4500', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 14, rowGap: 12 }}>
            {visiblePackages.map((p) => (
              <TourPackageCard key={p._id} pkg={p} width={cardWidth} onPress={() => { openPackage(p); onNavigate('tour-detail'); }} />
            ))}
          </View>
        )}
      </ScrollView>

      <RiderBottomNavbar activeScreen="31" onNavigate={onNavigate} />

      {/* Filter picker sheet */}
      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setPicker(null)} style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, maxHeight: '75%' }}>
            <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 8 }}>
              {picker === 'type' ? 'Package type' : picker === 'budget' ? 'Budget (per person)' : 'Duration'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pickerOptions.map((o) => (
                <TouchableOpacity
                  key={o.key}
                  onPress={() => { o.onPick(); setPicker(null); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: o.selected ? '600' : '500', color: o.selected ? '#FF4500' : '#0F172A' }}>{o.label}</Text>
                  {o.selected && <Check size={16} color="#FF4500" strokeWidth={2.4} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
