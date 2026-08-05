import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';
import { Picker } from '@react-native-picker/picker';

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
        Alert.alert("Saved!", "Pricing and Locations have been updated successfully.", [{ text: "OK", onPress: () => navigation.goBack() }]);
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FE5300" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Area & Pricing</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => Alert.alert("Help", "Configure service locations.")}>
          <Ionicons name="information-circle-outline" size={18} color="#0f172a" style={{ marginRight: 2 }} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroCard}>
          <View style={styles.pinCircle}><Ionicons name="location" size={20} color="#ffffff" /></View>
          <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
            <Text style={styles.heroTitle}>Where do you want bookings?</Text>
            <Text style={styles.heroSub}>Configure service operating areas by State and City.</Text>
          </View>
        </View>

        {/* SECTION 1: SERVICE LOCATIONS */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}><Ionicons name="ellipse" size={8} color="#FE5300" /> 1. Service Locations</Text>
              <Text style={styles.sectionHeaderSub}>State → City → Multiple locations</Text>
            </View>
            <TouchableOpacity style={styles.addLocBtn} onPress={() => setIsAddingLocation(!isAddingLocation)}>
              <Ionicons name="add" size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.addLocBtnText}>Add Location</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locCardsContainer}>
            {locationsList.map((item) => (
              <View key={item.id} style={styles.locCard}>
                <View style={styles.locCardHeader}>
                  <View style={styles.locCardTitleRow}>
                    <View style={styles.stateTag}><Text style={styles.stateTagText}>{item.state}</Text></View>
                    <Ionicons name="business" size={14} color="#94a3b8" style={{ marginHorizontal: 4 }} />
                    <Text style={styles.cityText}>{item.city}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteCityCard(item.id)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.locTagsContainer}>
                  {item.locations.map((loc: string) => (
                    <View key={loc} style={styles.locTag}>
                      <Ionicons name="checkmark" size={12} color="#FE5300" style={{ marginRight: 4 }} />
                      <Text style={styles.locTagText}>{loc}</Text>
                      <TouchableOpacity onPress={() => handleRemoveLocationTag(item.id, loc)} style={{ padding: 2, marginLeft: 4 }}>
                        <Ionicons name="close" size={12} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))}
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
        </View>

        {/* SECTION 2: PRICING METHOD & VEHICLE RATE CARDS */}
        <View style={styles.pricingSection}>
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.sectionHeaderTitle}><Ionicons name="ellipse" size={8} color="#3b82f6" /> 2. Vehicle Pricing Cards</Text>
          </View>

          <View style={styles.pricingMethodToggle}>
            {['Per KM', 'Per Day', 'Both (Per KM & Per Day)'].map((method) => {
              const isSelected = pricingMethod === method;
              return (
                <TouchableOpacity key={method} style={[styles.methodPill, isSelected && styles.methodPillActive]} onPress={() => setPricingMethod(method as any)}>
                  <Text style={[styles.methodPillText, isSelected && styles.methodPillTextActive]}>{method}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {!hasVehicles ? (
            <View style={styles.noVehiclesBox}>
              <View style={styles.noVehiclesIconBox}><Ionicons name="warning" size={24} color="#d97706" /></View>
              <Text style={styles.noVehiclesTitle}>No Vehicles Saved</Text>
            </View>
          ) : (
            <View style={styles.vehicleRatesContainer}>
              {savedVehicles.map((veh) => (
                <View key={veh.id} style={styles.vehRateCard}>
                  <View style={styles.vehRateHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={styles.vehIconBox}><Ionicons name="car" size={16} color="#fb923c" /></View>
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.vehName}>{veh.name}</Text>
                        <Text style={styles.vehReg}>{veh.regNumber} • {veh.type}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.rateInputsRow}>
                    {(pricingMethod === 'Per KM' || pricingMethod === 'Both (Per KM & Per Day)') && (
                      <View style={styles.rateInputBox}>
                        <Text style={styles.rateInputLabel}>Rate / KM</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.currencySymbol}>₹</Text>
                          <TextInput style={styles.rateInput} value={veh.kmRate} onChangeText={(val) => handleVehicleRateChange(veh.id, 'kmRate', val)} keyboardType="numeric" />
                        </View>
                      </View>
                    )}
                    {(pricingMethod === 'Per Day' || pricingMethod === 'Both (Per KM & Per Day)') && (
                      <View style={[styles.rateInputBox, { marginLeft: (pricingMethod === 'Both (Per KM & Per Day)') ? 8 : 0 }]}>
                        <Text style={styles.rateInputLabel}>Rate / Day</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.currencySymbol}>₹</Text>
                          <TextInput style={styles.rateInput} value={veh.dayRate} onChangeText={(val) => handleVehicleRateChange(veh.id, 'dayRate', val)} keyboardType="numeric" />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* SECTION 3: RATE INCLUDES */}
        <View style={styles.includesSection}>
          <View style={styles.includesHeader}>
            <Text style={styles.includesHeaderTitle}><Ionicons name="checkmark-circle" size={14} color="#059669" /> 3. Rate Includes</Text>
          </View>
          <View style={styles.includesGrid}>
            {rateIncludes.map((inc) => (
              <TouchableOpacity key={inc.id} style={[styles.includePill, inc.selected && styles.includePillSelected]} onPress={() => toggleInclusion(inc.id)}>
                <View style={[styles.checkSquare, inc.selected && styles.checkSquareSelected]}>
                  {inc.selected && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                </View>
                <Text style={[styles.includeLabel, inc.selected && styles.includeLabelSelected]} numberOfLines={1}>{inc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 4: EXTRA CHARGES */}
        <View style={styles.extraChargesSection}>
          <View style={styles.includesHeader}>
            <Text style={styles.extraHeaderTitle}><Ionicons name="sparkles" size={14} color="#d97706" /> 4. Extra Charges</Text>
          </View>
          
          <View style={styles.extraChargesList}>
            {extraCharges.map((charge) => (
              <View key={charge.id} style={[styles.chargeCard, charge.selected && styles.chargeCardSelected]}>
                <TouchableOpacity onPress={() => toggleExtraCharge(charge.id)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.checkSquare, charge.selected && styles.checkSquareExtraSelected]}>
                    {charge.selected && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                  </View>
                  <Text style={[styles.chargeLabel, charge.selected && styles.chargeLabelSelected]}>{charge.label}</Text>
                </TouchableOpacity>

                <View style={styles.chargePriceBox}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput style={[styles.chargeInput, !charge.selected && { color: '#94a3b8' }]} value={charge.price} onChangeText={(val) => handleExtraChargePriceChange(charge.id, val)} editable={charge.selected} keyboardType="numeric" />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingVertical: 20 }}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
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
});
