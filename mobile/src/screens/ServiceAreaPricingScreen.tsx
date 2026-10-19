import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';
import { Picker } from '@react-native-picker/picker';

const HERO_IMG = require('../../assets/authBanner-v2.png');

export const ServiceAreaPricingScreen = () => {
  const navigation = useNavigation<any>();
  const token = useAuthStore((state) => state.token);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  // 1. SERVICE LOCATIONS STATE
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [pendingLocations, setPendingLocations] = useState<string[]>([]);

  // API Driven Location States
  const [dbStates, setDbStates] = useState<any[]>([]);
  const [dbCities, setDbCities] = useState<any[]>([]);
  const [dbLocations, setDbLocations] = useState<any[]>([]);

  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedLocId, setSelectedLocId] = useState<string>('');

  const [isLoadingLoc, setIsLoadingLoc] = useState(false);

  // 2. SAVED VEHICLES LIST
  const [savedVehicles, setSavedVehicles] = useState<any[]>([]);
  const hasVehicles = savedVehicles.length > 0;
  const [pricingMethod, setPricingMethod] = useState<'Per KM' | 'Per Day' | 'Both (Per KM & Per Day)'>('Per KM');

  // 3. RATE INCLUDES STATE
  const [rateIncludes, setRateIncludes] = useState([
    { id: 'fuel', label: 'Fuel', selected: true },
    { id: 'driver', label: 'Driver Allowance', selected: true },
    { id: 'toll', label: 'Toll / Taxes', selected: true },
    { id: 'parking', label: 'Parking', selected: true },
    { id: 'night', label: 'Night Charges', selected: false },
    { id: 'gst', label: 'GST', selected: true }
  ]);

  // 4. EXTRA CHARGES STATE
  const [extraCharges, setExtraCharges] = useState([
    { id: 'ex_km', label: 'Extra KM (after 300 KM)', price: '15', unit: 'per KM', selected: true },
    { id: 'ex_hr', label: 'Extra Hour', price: '250', unit: 'per Hour', selected: true },
    { id: 'ex_night', label: 'Night Charges (after 10 PM)', price: '500', unit: 'per Night', selected: true },
    { id: 'ex_hill', label: 'Hill Charges', price: '700', unit: 'per Trip', selected: false },
    { id: 'ex_airport', label: 'Airport Parking', price: '300', unit: 'per Entry', selected: false }
  ]);

  const fetchPricingAndVehicles = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const resProfile = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resultProfile = await resProfile.json();
      
      const resVehicles = await fetch(`${API_BASE_URL}/partner/vehicles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resultVehicles = await resVehicles.json();

      let fetchedVehicles: any[] = [];
      if (resVehicles.ok && resultVehicles.success && resultVehicles.data) {
        fetchedVehicles = resultVehicles.data.map((v: any) => ({
          id: v._id,
          name: `${v.brand || ''} ${v.model || ''}`.trim() || 'Vehicle',
          regNumber: v.registrationNumber || 'N/A',
          type: v.category || 'MUV (7 Seater)',
          color: v.color || 'blue',
          kmRate: '14.00',
          dayRate: '2500.00'
        }));
      }

      if (resProfile.ok && resultProfile.success && resultProfile.data?.profile) {
        const p = resultProfile.data.profile;
        setProfileData(p);
        const pc = p.pricingConfig || {};
        
        if (pc.locationsList) setLocationsList(pc.locationsList);
        if (pc.pricingMethod) setPricingMethod(pc.pricingMethod);
        if (pc.rateIncludes) setRateIncludes(pc.rateIncludes);
        if (pc.extraCharges) setExtraCharges(pc.extraCharges);
        
        if (pc.savedVehiclesRates) {
          fetchedVehicles = fetchedVehicles.map(v => {
            const savedRate = pc.savedVehiclesRates.find((sr: any) => sr.id === v.id);
            if (savedRate) {
              return { ...v, kmRate: savedRate.kmRate, dayRate: savedRate.dayRate };
            }
            return v;
          });
        }
      }
      setSavedVehicles(fetchedVehicles);
    } catch (e) {
      console.error("Error fetching pricing config:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPricingAndVehicles();
    }, [token])
  );

  // --- API Location Fetching ---
  const fetchDbStates = async () => {
    try {
      setIsLoadingLoc(true);
      const res = await fetch(`${API_BASE_URL}/partner/states?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbStates(data.data);
      }
    } catch (e) {
      console.error("Error fetching states:", e);
    } finally {
      setIsLoadingLoc(false);
    }
  };

  const fetchDbCities = async (stateId: string) => {
    try {
      setIsLoadingLoc(true);
      const res = await fetch(`${API_BASE_URL}/partner/cities?stateId=${stateId}&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbCities(data.data);
      }
    } catch (e) {
      console.error("Error fetching cities:", e);
    } finally {
      setIsLoadingLoc(false);
    }
  };

  const fetchDbLocations = async (cityId: string) => {
    try {
      setIsLoadingLoc(true);
      const res = await fetch(`${API_BASE_URL}/partner/pincodes?cityId=${cityId}&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        // Flatten locations from all pincodes
        let allLocs: any[] = [];
        data.data.forEach((pin: any) => {
          if (pin.locations) {
            allLocs = [...allLocs, ...pin.locations];
          }
        });
        setDbLocations(allLocs);
      }
    } catch (e) {
      console.error("Error fetching locations:", e);
    } finally {
      setIsLoadingLoc(false);
    }
  };

  useEffect(() => {
    if (isAddingLocation) {
      fetchDbStates();
    }
  }, [isAddingLocation]);

  useEffect(() => {
    if (selectedStateId) {
      fetchDbCities(selectedStateId);
      setDbCities([]);
      setDbLocations([]);
      setSelectedCityId('');
      setSelectedLocId('');
    }
  }, [selectedStateId]);

  useEffect(() => {
    if (selectedCityId) {
      fetchDbLocations(selectedCityId);
      setDbLocations([]);
      setSelectedLocId('');
    }
  }, [selectedCityId]);

  // --- Handlers ---
  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      // Pricing is no longer edited here; previously saved values are sent back unchanged.
      const savedVehiclesRates = savedVehicles.map(v => ({ id: v.id, kmRate: v.kmRate, dayRate: v.dayRate }));
      const pricingConfig = { locationsList, pricingMethod, rateIncludes, extraCharges, savedVehiclesRates };

      const res = await fetch(`${API_BASE_URL}/partner/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          profileData: {
            fullName: profileData?.fullName || 'Partner',
            mobileNumber: profileData?.mobileNumber || '9876543210',
            partnerType: profileData?.partnerType || 'Individual',
            pricingConfig
          }
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        Alert.alert("Saved!", "Your service areas have been updated.", [{ text: "OK", onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert("Save Failed", result.message || "Unable to save.");
      }
    } catch (e) {
      Alert.alert("Network Error", "Unable to update rules.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPendingLocation = () => {
    if (selectedLocId) {
      const locObj = dbLocations.find(l => l._id === selectedLocId);
      if (locObj && !pendingLocations.includes(locObj.name)) {
        setPendingLocations([...pendingLocations, locObj.name]);
        setSelectedLocId('');
      }
    }
  };

  const handleSaveLocationGroup = () => {
    if (!selectedStateId || !selectedCityId) {
      Alert.alert("Missing Detail", "Please select a State and a City.");
      return;
    }

    const stObj = dbStates.find(s => s._id === selectedStateId);
    const ctObj = dbCities.find(c => c._id === selectedCityId);
    
    if (!stObj || !ctObj) return;

    const existingIndex = locationsList.findIndex(
      loc => loc.state === stObj.name && loc.city === ctObj.name
    );

    if (existingIndex !== -1) {
      const updatedList = [...locationsList];
      const mergedLocations = Array.from(new Set([...updatedList[existingIndex].locations, ...pendingLocations]));
      updatedList[existingIndex].locations = mergedLocations;
      setLocationsList(updatedList);
    } else {
      const colors = ['orange', 'emerald', 'blue', 'purple', 'amber'];
      const nextColor = colors[locationsList.length % colors.length];

      setLocationsList([
        ...locationsList,
        {
          id: Date.now(),
          state: stObj.name,
          city: ctObj.name,
          color: nextColor,
          locations: pendingLocations.length > 0 ? pendingLocations : ['All Locations']
        }
      ]);
    }

    setPendingLocations([]);
    setIsAddingLocation(false);
    setSelectedStateId('');
    setSelectedCityId('');
    setSelectedLocId('');
  };

  const handleRemoveLocationTag = (cardId: number, locName: string) => {
    setLocationsList(locationsList.map(item => {
      if (item.id === cardId) {
        return { ...item, locations: item.locations.filter((l: string) => l !== locName) };
      }
      return item;
    }));
  };

  const handleDeleteCityCard = (cardId: number) => {
    setLocationsList(locationsList.filter(item => item.id !== cardId));
  };

  const handleVehicleRateChange = (vehId: string, field: 'kmRate' | 'dayRate', value: string) => {
    setSavedVehicles(savedVehicles.map(veh => {
      if (veh.id === vehId) {
        return { ...veh, [field]: value };
      }
      return veh;
    }));
  };

  const toggleInclusion = (incId: string) => {
    setRateIncludes(rateIncludes.map(item => item.id === incId ? { ...item, selected: !item.selected } : item));
  };

  const toggleExtraCharge = (chargeId: string) => {
    setExtraCharges(extraCharges.map(item => item.id === chargeId ? { ...item, selected: !item.selected } : item));
  };

  const handleExtraChargePriceChange = (chargeId: string, newPrice: string) => {
    setExtraCharges(extraCharges.map(item => item.id === chargeId ? { ...item, price: newPrice } : item));
  };

  // ---- Display-only state for the redesigned layout (no effect on data or saving) ----
  const [viewMode, setViewMode] = useState<'state' | 'city'>('state');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FE5300" />
      </View>
    );
  }

  const PALETTE: Record<string, { fg: string; bg: string; border: string }> = {
    orange: { fg: '#ea580c', bg: '#fff1e8', border: '#fed7aa' },
    emerald: { fg: '#16a34a', bg: '#ecfdf3', border: '#bbf7d0' },
    blue: { fg: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    purple: { fg: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    amber: { fg: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    rose: { fg: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  };
  const PALETTE_ORDER = ['orange', 'blue', 'emerald', 'rose', 'purple', 'amber'];
  const allStates: string[] = [];
  locationsList.forEach((it: any) => { if (!allStates.includes(it.state)) allStates.push(it.state); });
  const stateTone = (state: string) => PALETTE[PALETTE_ORDER[Math.max(0, allStates.indexOf(state)) % PALETTE_ORDER.length]];
  const areaCount = locationsList.reduce((n: number, it: any) => n + (it.locations?.length || 0), 0);
  const q = query.trim().toLowerCase();
  const visible = locationsList.filter((it: any) =>
    !q || String(it.state).toLowerCase().includes(q) || String(it.city).toLowerCase().includes(q) || (it.locations || []).some((l: string) => String(l).toLowerCase().includes(q))
  );
  const groups: { state: string; items: any[] }[] = [];
  visible.forEach((it: any) => {
    const g = groups.find((x) => x.state === it.state);
    if (g) g.items.push(it); else groups.push({ state: it.state, items: [it] });
  });
  const cardKeys = viewMode === 'state' ? groups.map((g) => `s:${g.state}`) : visible.map((it: any) => `c:${it.id}`);
  const allCollapsed = cardKeys.length > 0 && cardKeys.every((k) => collapsed[k]);
  const toggleAll = () => setCollapsed(Object.fromEntries(cardKeys.map((k) => [k, !allCollapsed])));
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const heroW = Dimensions.get('window').width - 32;
  const heroImgW = (0.5 * heroW) / 0.59;
  const heroImgH = heroImgW * (1632 / 2624);

  const AreaChips = ({ item, tone }: { item: any; tone: { fg: string; bg: string; border: string } }) => (
    <View style={styles.saChips}>
      {(item.locations || []).map((loc: string) => (
        <View key={loc} style={[styles.saChip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text style={[styles.saChipText, { color: tone.fg }]}>{loc}</Text>
          <TouchableOpacity onPress={() => handleRemoveLocationTag(item.id, loc)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginLeft: 6 }} accessibilityLabel={`Remove ${loc}`}>
            <Ionicons name="close" size={13} color={tone.fg} />
          </TouchableOpacity>
        </View>
      ))}
      {!(item.locations || []).length && <Text style={styles.saMuted}>No areas — whole city</Text>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Area</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => Alert.alert("Help", "Configure service locations.")}>
          <Ionicons name="help-circle-outline" size={18} color="#FE5300" style={{ marginRight: 3 }} />
          <Text style={[styles.helpText, { color: '#FE5300', fontSize: 13 }]}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.saHero}>
          <View style={styles.saHeroPhoto}>
            <Image source={HERO_IMG} style={{ position: 'absolute', width: heroImgW, height: heroImgH, left: -0.41 * heroImgW, top: -0.2 * heroImgH }} resizeMode="stretch" />
          </View>
          <View style={[styles.saHeroCurve, { left: Math.round(0.52 * heroW) - 240 }]} />
          <View style={styles.saHeroText}>
            <Text style={styles.saHeroTitle}>Where do you want</Text>
            <Text style={styles.saHeroAccent}>bookings?</Text>
            <Text style={styles.saHeroSub}>Select the states and cities where you are available to receive booking requests.</Text>
          </View>
        </View>

        {/* View toggle */}
        <View style={styles.saToggleRow}>
          {([['state', 'By State', 'map-outline'], ['city', 'By City', 'business-outline']] as const).map(([k, label, icon]) => (
            <TouchableOpacity key={k} onPress={() => setViewMode(k)} style={[styles.saToggle, viewMode === k && styles.saToggleOn]} activeOpacity={0.85}>
              <Ionicons name={icon} size={16} color={viewMode === k ? '#ffffff' : '#334155'} style={{ marginRight: 6 }} />
              <Text style={[styles.saToggleText, viewMode === k && { color: '#ffffff' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search (filters the list below) */}
        <View style={styles.saSearch}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            style={styles.saSearchInput}
            placeholder="Search your states, cities or areas"
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Summary + Add Location */}
        <View style={styles.saSummary}>
          <View style={styles.saSummaryIcon}><Ionicons name="location" size={22} color="#ffffff" /></View>
          <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
            <Text style={styles.saSummaryTitle}>{plural(allStates.length, 'State', 'States')} · {plural(locationsList.length, 'City', 'Cities')}</Text>
            <Text style={styles.saSummarySub}>
              {locationsList.length ? `${plural(areaCount, 'area', 'areas')} · you will receive booking requests in these locations.` : 'Add the cities where you want booking requests.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.saAddBtn} onPress={() => setIsAddingLocation(!isAddingLocation)} activeOpacity={0.85}>
            <Ionicons name={isAddingLocation ? 'close' : 'add'} size={16} color="#FE5300" style={{ marginRight: 3 }} />
            <Text style={styles.saAddBtnText}>{isAddingLocation ? 'Close' : 'Add Location'}</Text>
          </TouchableOpacity>
        </View>

        {isAddingLocation && (
          <View style={styles.addLocForm}>
            <View style={styles.addLocFormHeader}>
              <Text style={styles.addLocFormTitle}><Ionicons name="add" size={14} color="#ea580c" /> Add New Location</Text>
              <TouchableOpacity onPress={() => setIsAddingLocation(false)}><Ionicons name="close" size={18} color="#94a3b8" /></TouchableOpacity>
            </View>

            {isLoadingLoc && <ActivityIndicator size="small" color="#ea580c" style={{ marginBottom: 8 }} />}

            <View style={styles.pickerBox}>
              <Text style={styles.formLabel}>Select State</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={selectedStateId} onValueChange={(v) => setSelectedStateId(v)} style={styles.picker}>
                  <Picker.Item label="-- Choose State --" value="" />
                  {dbStates.map(s => <Picker.Item key={s._id} label={s.name} value={s._id} />)}
                </Picker>
              </View>
            </View>

            {selectedStateId ? (
              <View style={styles.pickerBox}>
                <Text style={styles.formLabel}>Select City</Text>
                <View style={styles.pickerWrapper}>
                  <Picker selectedValue={selectedCityId} onValueChange={(v) => setSelectedCityId(v)} style={styles.picker}>
                    <Picker.Item label="-- Choose City --" value="" />
                    {dbCities.map(c => <Picker.Item key={c._id} label={c.name} value={c._id} />)}
                  </Picker>
                </View>
              </View>
            ) : null}

            {selectedCityId ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.formLabel}>Add Specific Area / Location</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.pickerWrapper, { flex: 1, marginRight: 8 }]}>
                    <Picker selectedValue={selectedLocId} onValueChange={(v) => setSelectedLocId(v)} style={styles.picker}>
                      <Picker.Item label="-- Choose Area --" value="" />
                      {dbLocations.map(l => <Picker.Item key={l._id} label={l.name} value={l._id} />)}
                    </Picker>
                  </View>
                  <TouchableOpacity style={styles.addTagBtn} onPress={handleAddPendingLocation} disabled={!selectedLocId}>
                    <Text style={styles.addTagBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>

                {pendingLocations.length > 0 && (
                  <View style={styles.pendingTagsContainer}>
                    {pendingLocations.map((locTag) => (
                      <View key={locTag} style={styles.pendingTag}>
                        <Text style={styles.pendingTagText}>{locTag}</Text>
                        <TouchableOpacity onPress={() => setPendingLocations(pendingLocations.filter(t => t !== locTag))} style={{ marginLeft: 4 }}>
                          <Ionicons name="close" size={12} color="#ea580c" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            <TouchableOpacity style={styles.saveLocGroupBtn} onPress={handleSaveLocationGroup}>
              <Text style={styles.saveLocGroupBtnText}>Save Location Group</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Your service locations */}
        <View style={styles.saListHead}>
          <Text style={styles.saListTitle}>Your Service Locations</Text>
          {cardKeys.length > 0 && (
            <TouchableOpacity onPress={toggleAll} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.saExpandText}>{allCollapsed ? 'Expand All' : 'Collapse All'}</Text>
              <Ionicons name={allCollapsed ? 'chevron-down' : 'chevron-up'} size={14} color="#FE5300" />
            </TouchableOpacity>
          )}
        </View>

        {locationsList.length === 0 ? (
          <View style={styles.saEmpty}>
            <View style={styles.saEmptyIcon}><Ionicons name="map" size={26} color="#FE5300" /></View>
            <Text style={styles.saEmptyTitle}>No service locations yet</Text>
            <Text style={styles.saEmptySub}>Tap "Add Location" to choose a state, city and areas.</Text>
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.saEmpty}>
            <Text style={styles.saEmptyTitle}>No match for "{query.trim()}"</Text>
            <Text style={styles.saEmptySub}>Try another state, city or area name.</Text>
          </View>
        ) : viewMode === 'state' ? (
          groups.map((g) => {
            const tone = stateTone(g.state);
            const key = `s:${g.state}`;
            const open = !collapsed[key];
            const areas = g.items.reduce((n, it) => n + (it.locations?.length || 0), 0);
            return (
              <View key={key} style={[styles.saCard, { borderLeftColor: tone.fg }]}>
                <TouchableOpacity style={styles.saCardHead} onPress={() => setCollapsed({ ...collapsed, [key]: open })} activeOpacity={0.8}>
                  <View style={[styles.saBadge, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.saBadgeText, { color: tone.fg }]}>{String(g.state).slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.saCardTitle}>{g.state}</Text>
                    <Text style={styles.saCardSub}>{plural(g.items.length, 'City', 'Cities')} · {plural(areas, 'area', 'areas')}</Text>
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
                </TouchableOpacity>
                {open && g.items.map((item) => (
                  <View key={item.id} style={styles.saCityBlock}>
                    <View style={styles.saCityRow}>
                      <Ionicons name="business-outline" size={14} color={tone.fg} style={{ marginRight: 6 }} />
                      <Text style={styles.saCityName}>{item.city}</Text>
                      <TouchableOpacity onPress={() => handleDeleteCityCard(item.id)} style={styles.saTrash} accessibilityLabel={`Remove ${item.city}`}>
                        <Ionicons name="trash-outline" size={17} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <AreaChips item={item} tone={tone} />
                  </View>
                ))}
              </View>
            );
          })
        ) : (
          visible.map((item: any) => {
            const tone = stateTone(item.state);
            const key = `c:${item.id}`;
            const open = !collapsed[key];
            return (
              <View key={key} style={[styles.saCard, { borderLeftColor: tone.fg }]}>
                <View style={styles.saCardHead}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => setCollapsed({ ...collapsed, [key]: open })} activeOpacity={0.8}>
                    <View style={[styles.saBadge, { backgroundColor: tone.bg }]}>
                      <Ionicons name="business" size={20} color={tone.fg} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.saCardTitle}>{item.city}</Text>
                      <Text style={styles.saCardSub}>{item.state} · {plural(item.locations?.length || 0, 'area', 'areas')}</Text>
                    </View>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCityCard(item.id)} style={styles.saTrash} accessibilityLabel={`Remove ${item.city}`}>
                    <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                {open && <View style={{ marginTop: 10 }}><AreaChips item={item} tone={tone} /></View>}
              </View>
            );
          })
        )}

      </ScrollView>

      {/* Save (fixed at the bottom) */}
      <View style={styles.saFooter}>
        <TouchableOpacity style={[styles.saveBtn, styles.saSaveBtn]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#ffffff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={[styles.saveBtnText, { fontSize: 15 }]}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 12 : 44, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  helpBtn: { flexDirection: 'row', alignItems: 'center' },
  helpText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  heroCard: { backgroundColor: '#f97316', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  pinCircle: { width: 40, height: 40, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 14, fontWeight: '900', color: '#ffffff' },
  heroSub: { fontSize: 11, color: '#ffedd5', marginTop: 4, fontWeight: '500' },
  sectionContainer: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  sectionHeaderSub: { fontSize: 10, fontWeight: '600', color: '#64748b', marginLeft: 14, marginTop: 2 },
  addLocBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f97316', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addLocBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  locCardsContainer: { gap: 12 },
  locCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14 },
  locCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8, marginBottom: 8 },
  locCardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  stateTag: { backgroundColor: '#ffedd5', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#fed7aa' },
  stateTagText: { fontSize: 10, fontWeight: '800', color: '#c2410c', textTransform: 'uppercase' },
  cityText: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
  locTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  locTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  locTagText: { fontSize: 10, fontWeight: '700', color: '#1e293b' },
  addLocForm: { marginTop: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#fb923c', borderRadius: 16, padding: 16, backgroundColor: '#fff7ed' },
  addLocFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#fed7aa', paddingBottom: 8, marginBottom: 12 },
  addLocFormTitle: { fontSize: 12, fontWeight: '900', color: '#7c2d12' },
  pickerBox: { marginBottom: 12 },
  formLabel: { fontSize: 10, fontWeight: '800', color: '#475569', marginBottom: 4 },
  pickerWrapper: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden' },
  picker: { height: 50, width: '100%' },
  addTagBtn: { backgroundColor: '#0f172a', height: 50, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  addTagBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  pendingTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pendingTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffedd5', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
  pendingTagText: { fontSize: 10, fontWeight: '700', color: '#9a3412' },
  saveLocGroupBtn: { backgroundColor: '#f97316', paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveLocGroupBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  pricingSection: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 24, padding: 16, marginBottom: 20 },
  pricingMethodToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 16, marginBottom: 12 },
  methodPill: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 12 },
  methodPillActive: { backgroundColor: '#f97316' },
  methodPillText: { fontSize: 10, fontWeight: '900', color: '#475569' },
  methodPillTextActive: { color: '#ffffff' },
  noVehiclesBox: { padding: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: '#fcd34d', backgroundColor: '#fffbeb', borderRadius: 16, alignItems: 'center' },
  noVehiclesIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  noVehiclesTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
  vehicleRatesContainer: { gap: 12, marginTop: 4 },
  vehRateCard: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 12 },
  vehRateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vehIconBox: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  vehName: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  vehReg: { fontSize: 9, fontWeight: '800', color: '#64748b' },
  rateInputsRow: { flexDirection: 'row' },
  rateInputBox: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateInputLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  currencySymbol: { fontSize: 12, fontWeight: '900', color: '#94a3b8' },
  rateInput: { width: 48, fontSize: 13, fontWeight: '900', color: '#0f172a', textAlign: 'right', marginLeft: 4, padding: 0 },
  includesSection: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 24, padding: 14, marginBottom: 16 },
  includesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  includesHeaderTitle: { fontSize: 11, fontWeight: '900', color: '#064e3b' },
  includesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  includePill: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(241,245,249,0.8)', borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 12 },
  includePillSelected: { backgroundColor: '#ffffff', borderColor: '#6ee7b7' },
  checkSquare: { width: 16, height: 16, borderRadius: 4, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  checkSquareSelected: { backgroundColor: '#10b981' },
  includeLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', flex: 1 },
  includeLabelSelected: { color: '#0f172a' },
  extraChargesSection: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 24, padding: 14, marginBottom: 16 },
  extraHeaderTitle: { fontSize: 11, fontWeight: '900', color: '#78350f' },
  extraChargesList: { gap: 8 },
  chargeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(241,245,249,0.6)', borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 12, opacity: 0.7 },
  chargeCardSelected: { backgroundColor: '#ffffff', borderColor: '#fde68a', opacity: 1 },
  checkSquareExtraSelected: { backgroundColor: '#f59e0b' },
  chargeLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  chargeLabelSelected: { color: '#0f172a', fontWeight: '800' },
  chargePriceBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chargeInput: { width: 48, fontSize: 12, fontWeight: '900', color: '#0f172a', textAlign: 'right', marginLeft: 4, padding: 0 },
  saveBtn: { backgroundColor: '#f97316', paddingVertical: 14, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  // ---- Redesign styles ----
  saHero: { minHeight: 150, borderRadius: 20, overflow: 'hidden', backgroundColor: '#fdf6f0', borderWidth: 1, borderColor: '#fde7d6', marginBottom: 14 },
  saHeroPhoto: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', overflow: 'hidden' },
  saHeroCurve: { position: 'absolute', top: -45, width: 240, height: 240, borderRadius: 120, backgroundColor: '#fdf6f0', borderWidth: 3, borderColor: '#FE5300' },
  saHeroText: { padding: 16, paddingRight: 4, width: '50%' },
  saHeroTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  saHeroAccent: { fontSize: 24, fontWeight: '900', color: '#FE5300', marginTop: -2 },
  saHeroSub: { fontSize: 12, color: '#475569', marginTop: 6, lineHeight: 17 },
  saToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  saToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  saToggleOn: { backgroundColor: '#FE5300', borderColor: '#FE5300' },
  saToggleText: { fontSize: 13, fontWeight: '800', color: '#334155' },
  saSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 4, marginBottom: 14, gap: 10 },
  saSearchInput: { flex: 1, fontSize: 14, color: '#0f172a', paddingVertical: 8 },
  saSummary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff4ec', borderWidth: 1, borderColor: '#ffe4d1', borderRadius: 18, padding: 14, marginBottom: 14 },
  saSummaryIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FE5300', justifyContent: 'center', alignItems: 'center' },
  saSummaryTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  saSummarySub: { fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 16 },
  saAddBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FE5300', backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  saAddBtnText: { fontSize: 12.5, fontWeight: '800', color: '#FE5300' },
  saListHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 },
  saListTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  saExpandText: { fontSize: 13, fontWeight: '800', color: '#FE5300', marginRight: 2 },
  saCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f7', borderLeftWidth: 4, padding: 14, marginBottom: 12 },
  saCardHead: { flexDirection: 'row', alignItems: 'center' },
  saBadge: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saBadgeText: { fontSize: 15, fontWeight: '900' },
  saCardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  saCardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  saCityBlock: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  saCityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  saCityName: { flex: 1, fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  saTrash: { padding: 6, marginLeft: 4 },
  saChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  saChipText: { fontSize: 12.5, fontWeight: '700' },
  saMuted: { fontSize: 12, color: '#94a3b8' },
  saEmpty: { alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f7', padding: 20, marginBottom: 12 },
  saEmptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff1e8', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  saEmptyTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  saEmptySub: { fontSize: 12, color: '#64748b', marginTop: 3, textAlign: 'center' },
  saFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: 'rgba(248,250,252,0.96)', borderTopWidth: 1, borderTopColor: '#eef2f7' },
  saSaveBtn: { backgroundColor: '#FE5300', paddingVertical: 15, shadowColor: '#FE5300', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
});
