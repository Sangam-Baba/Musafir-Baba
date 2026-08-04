import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

export const ServiceAreaPricingScreen = () => {
  const navigation = useNavigation<any>();
  const token = useAuthStore((state) => state.token);

  // State
  const [pricingMethod, setPricingMethod] = useState<'Per KM' | 'Per Day' | 'Both'>('Per KM');
  
  // Rate Inputs
  const [sedanRate, setSedanRate] = useState('14.00');
  const [suvRate, setSuvRate] = useState('18.00');
  const [innovaRate, setInnovaRate] = useState('22.00');
  const [tempoRate, setTempoRate] = useState('35.00');

  // Extra Charges
  const [extraKmRate, setExtraKmRate] = useState('15');
  const [extraHourRate, setExtraHourRate] = useState('250');
  const [nightCharges, setNightCharges] = useState('500');
  const [hillCharges, setHillCharges] = useState('700');
  const [airportParking, setAirportParking] = useState('300');

  // Preferred States
  const [selectedStates, setSelectedStates] = useState<string[]>(['Delhi', 'Haryana', 'Rajasthan', 'Uttar Pradesh']);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const fetchPricing = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success && result.data?.profile) {
        const p = result.data.profile;
        setProfileData(p);
        const pc = p.pricingConfig || {};
        if (pc.sedanRate) setSedanRate(pc.sedanRate);
        if (pc.suvRate) setSuvRate(pc.suvRate);
        if (pc.innovaRate) setInnovaRate(pc.innovaRate);
        if (pc.tempoRate) setTempoRate(pc.tempoRate);
        if (pc.extraKmRate) setExtraKmRate(pc.extraKmRate);
        if (pc.extraHourRate) setExtraHourRate(pc.extraHourRate);
        if (pc.nightCharges) setNightCharges(pc.nightCharges);
        if (pc.hillCharges) setHillCharges(pc.hillCharges);
        if (pc.airportParking) setAirportParking(pc.airportParking);
        if (pc.selectedStates) setSelectedStates(pc.selectedStates);
        if (pc.pricingMethod) setPricingMethod(pc.pricingMethod);
      }
    } catch (e) {
      console.error("Error fetching pricing config:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPricing();
    }, [token])
  );

  const toggleState = (state: string) => {
    if (selectedStates.includes(state)) {
      setSelectedStates(selectedStates.filter(s => s !== state));
    } else {
      setSelectedStates([...selectedStates, state]);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const pricingConfig = {
        pricingMethod,
        sedanRate,
        suvRate,
        innovaRate,
        tempoRate,
        extraKmRate,
        extraHourRate,
        nightCharges,
        hillCharges,
        airportParking,
        selectedStates
      };

      const res = await fetch(`${API_BASE_URL}/partner/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        Alert.alert(
          "Pricing Rules Saved!",
          "Service area preferences and fare pricing configuration have been updated in MongoDB successfully.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Save Failed", result.message || "Unable to save pricing rules.");
      }
    } catch (e) {
      console.error("Error saving pricing config:", e);
      Alert.alert("Network Error", "Unable to update pricing rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Area & Pricing</Text>
        <TouchableOpacity 
          style={styles.helpBtn}
          onPress={() => Alert.alert("Help", "Configure service locations, outstation routes, per-KM rates and fee inclusions.")}
        >
          <Ionicons name="information-circle-outline" size={18} color="#0f172a" style={{ marginRight: 2 }} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Top Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.pinCircle}>
            <Ionicons name="location" size={20} color="#ffffff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
            <Text style={styles.heroTitle}>Where do you want bookings?</Text>
            <Text style={styles.heroSub}>Choose your preferred locations, routes and set your pricing.</Text>
          </View>
          <Ionicons name="map-outline" size={32} color="#FE5300" />
        </View>

        {/* Section 1: Preferred States */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeaderTitle}>1. Preferred States</Text>
          <Text style={styles.sectionHeaderSub}>Select the states where you want to operate</Text>

          <View style={styles.chipsRow}>
            {['Delhi', 'Haryana', 'Rajasthan', 'Uttar Pradesh'].map((st) => {
              const isSelected = selectedStates.includes(st);
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.chipPill, isSelected && styles.chipPillSelected]}
                  onPress={() => toggleState(st)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkbox" size={16} color="#FE5300" style={{ marginRight: 4 }} />
                  <Text style={styles.chipText}>{st}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.chipPillUnselected}>
              <Ionicons name="square-outline" size={16} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.chipTextUnselected}>Punjab</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.moreBtnPill}>
              <Text style={styles.moreBtnText}>More</Text>
              <Ionicons name="chevron-down" size={14} color="#64748b" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2 & 3 Dual Column Grid */}
        <View style={styles.dualGridRow}>
          {/* Section 2: Preferred Areas in Delhi */}
          <View style={[styles.gridCard, { flex: 1, marginRight: 6 }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderTitle}>2. Preferred Areas in Delhi</Text>
              <TouchableOpacity onPress={() => Alert.alert("Selected", "All Delhi areas selected")}>
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardHeaderSub}>Select the areas you want to cover</Text>

            <View style={styles.checkListGrid}>
              {[
                'South Delhi', 'West Delhi',
                'Dwarka', 'Rohini',
                'Najafgarh', 'Pitampura',
                'Airport', 'Noida Border',
                'Gurugram Border', 'Faridabad'
              ].map((area) => (
                <View key={area} style={styles.checkItemRow}>
                  <Ionicons name="checkbox" size={14} color="#FE5300" style={{ marginRight: 4 }} />
                  <Text style={styles.checkItemText}>{area}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.outlineActionBtn}>
              <Text style={styles.outlineActionBtnText}>+ More Areas</Text>
            </TouchableOpacity>
          </View>

          {/* Section 3: Preferred Routes (Outstation) */}
          <View style={[styles.gridCard, { flex: 1, marginLeft: 6 }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderTitle}>3. Preferred Routes (Outstation)</Text>
              <TouchableOpacity onPress={() => Alert.alert("Selected", "All routes selected")}>
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardHeaderSub}>Select the routes you want to accept</Text>

            <View style={styles.checkListGrid}>
              {[
                'Delhi ↔ Jaipur',
                'Delhi ↔ Agra',
                'Delhi ↔ Chandigarh',
                'Delhi ↔ Dehradun',
                'Delhi ↔ Rishikesh',
                'Delhi ↔ Manali'
              ].map((route) => (
                <View key={route} style={styles.checkItemRow}>
                  <Ionicons name="checkbox" size={14} color="#FE5300" style={{ marginRight: 4 }} />
                  <Text style={styles.checkItemText}>{route}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.outlineActionBtn}>
              <Text style={styles.outlineActionBtnText}>+ Add Route</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Pricing Method */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>4. Pricing Method</Text>
          <Text style={styles.sectionHeaderSub}>Choose how you want to set your pricing</Text>

          <View style={styles.radioGroupRow}>
            {[
              { id: 'Per KM', label: 'Per KM' },
              { id: 'Per Day', label: 'Per Day' },
              { id: 'Both', label: 'Both (Per KM & Per Day)' },
            ].map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.radioOption}
                onPress={() => setPricingMethod(option.id as any)}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={pricingMethod === option.id ? "radio-button-on" : "radio-button-off"} 
                  size={16} 
                  color={pricingMethod === option.id ? "#FE5300" : "#94a3b8"} 
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.radioText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rates Table */}
          <View style={styles.rateTableCard}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderLabel}>Vehicle Category</Text>
              <Text style={styles.tableHeaderVal}>Rate (₹/KM)</Text>
            </View>

            <View style={styles.tableRow}>
              <View style={styles.tableCatLeft}>
                <Ionicons name="car-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                <Text style={styles.tableCatText}>Sedan (4 Seater)</Text>
              </View>
              <View style={styles.inputPillBox}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.rateTextInput}
                  keyboardType="decimal-pad"
                  value={sedanRate}
                  onChangeText={setSedanRate}
                />
              </View>
            </View>

            <View style={styles.tableRow}>
              <View style={styles.tableCatLeft}>
                <Ionicons name="car-sport-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                <Text style={styles.tableCatText}>SUV (6 Seater)</Text>
              </View>
              <View style={styles.inputPillBox}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.rateTextInput}
                  keyboardType="decimal-pad"
                  value={suvRate}
                  onChangeText={setSuvRate}
                />
              </View>
            </View>

            <View style={styles.tableRow}>
              <View style={styles.tableCatLeft}>
                <Ionicons name="car" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                <Text style={styles.tableCatText}>Innova / MUV (7 Seater)</Text>
              </View>
              <View style={styles.inputPillBox}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.rateTextInput}
                  keyboardType="decimal-pad"
                  value={innovaRate}
                  onChangeText={setInnovaRate}
                />
              </View>
            </View>

            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <View style={styles.tableCatLeft}>
                <Ionicons name="bus-outline" size={16} color="#0f172a" style={{ marginRight: 6 }} />
                <Text style={styles.tableCatText}>Tempo Traveller</Text>
              </View>
              <View style={styles.inputPillBox}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.rateTextInput}
                  keyboardType="decimal-pad"
                  value={tempoRate}
                  onChangeText={setTempoRate}
                />
              </View>
            </View>

            <View style={styles.infoNoticeRow}>
              <Ionicons name="information-circle-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.infoNoticeText}>Rates should include selected inclusions below.</Text>
            </View>
          </View>
        </View>

        {/* Section 5 & Section 6 Dual Column Grid */}
        <View style={styles.dualGridRow}>
          {/* Section 5: Rate Includes */}
          <View style={[styles.gridCard, { flex: 1, marginRight: 6 }]}>
            <Text style={styles.cardHeaderTitle}>5. Rate Includes</Text>
            <Text style={styles.cardHeaderSub}>Select what is included in your rate</Text>

            <View style={[styles.checkListGrid, { marginTop: 8 }]}>
              {['Fuel', 'Driver Allowance', 'Toll / Taxes', 'Parking', 'Night Charges', 'GST'].map((inc) => (
                <View key={inc} style={styles.checkItemRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                  <Text style={styles.checkItemText}>{inc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Section 6: Extra Charges */}
          <View style={[styles.gridCard, { flex: 1, marginLeft: 6 }]}>
            <Text style={styles.cardHeaderTitle}>6. Extra Charges (If applicable)</Text>
            <Text style={styles.cardHeaderSub}>Set additional fees for overage</Text>

            <View style={[styles.extraChargesList, { marginTop: 8 }]}>
              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>Extra KM after 300 KM</Text>
                <View style={styles.smallInputBox}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput style={styles.smallTextInput} value={extraKmRate} onChangeText={setExtraKmRate} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>Extra Hour (Per Hour)</Text>
                <View style={styles.smallInputBox}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput style={styles.smallTextInput} value={extraHourRate} onChangeText={setExtraHourRate} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>Night Charges (After 10 PM)</Text>
                <View style={styles.smallInputBox}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput style={styles.smallTextInput} value={nightCharges} onChangeText={setNightCharges} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>Hill Charges</Text>
                <View style={styles.smallInputBox}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput style={styles.smallTextInput} value={hillCharges} onChangeText={setHillCharges} keyboardType="numeric" />
                </View>
              </View>

              <View style={[styles.extraRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.extraLabel}>Airport Parking</Text>
                <View style={styles.smallInputBox}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput style={styles.smallTextInput} value={airportParking} onChangeText={setAirportParking} keyboardType="numeric" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Section 7, 8, 9 Grid */}
        <View style={styles.tripleGridRow}>
          <View style={[styles.tripleCard, { flex: 1, marginRight: 4 }]}>
            <Text style={styles.tripleHeader}>7. Accept Bookings For</Text>
            <Text style={styles.tripleSub}>Select booking types</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Ionicons name="checkbox" size={14} color="#FE5300" style={{ marginRight: 4 }} />
              <Text style={styles.tripleValText}>Local</Text>
            </View>
          </View>

          <View style={[styles.tripleCard, { flex: 1, marginHorizontal: 2 }]}>
            <Text style={styles.tripleHeader}>8. Operating Days</Text>
            <Text style={styles.tripleSub}>Select days available</Text>
            <View style={{ flexDirection: 'row', gap: 2, marginTop: 6 }}>
              {['Mon', 'Tue', 'Wed'].map((day) => (
                <View key={day} style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{day}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.tripleCard, { flex: 1, marginLeft: 4 }]}>
            <Text style={styles.tripleHeader}>9. Pickup Radius</Text>
            <Text style={styles.tripleSub}>Select pickup radius</Text>
            <Text style={styles.radiusValText}>30 KM</Text>
          </View>
        </View>

        {/* Save Action Button */}
        <TouchableOpacity 
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Ionicons name="save-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>Save Service Area & Pricing</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 14, paddingBottom: 40 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  helpBtn: { flexDirection: 'row', alignItems: 'center' },
  helpText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  heroCard: {
    backgroundColor: '#fff8f0',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe3d1',
    marginBottom: 16,
  },
  pinCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FE5300', justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  heroSub: { fontSize: 10, color: '#64748b', marginTop: 1, lineHeight: 14 },
  sectionBox: { marginBottom: 16 },
  sectionHeaderTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  sectionHeaderSub: { fontSize: 10, color: '#64748b', marginTop: 1 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chipPill: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  chipPillSelected: { backgroundColor: '#fff7ed', borderColor: '#FE5300' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  chipPillUnselected: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  chipTextUnselected: { fontSize: 11, color: '#64748b' },
  moreBtnPill: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  moreBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  dualGridRow: { flexDirection: 'row', marginBottom: 14 },
  gridCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderTitle: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  cardHeaderSub: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
  selectAllText: { fontSize: 10, fontWeight: '800', color: '#FE5300' },
  checkListGrid: { marginTop: 6 },
  checkItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  checkItemText: { fontSize: 10, fontWeight: '700', color: '#334155' },
  outlineActionBtn: { justifyContent: 'center', borderWidth: 1, borderColor: '#FE5300', borderRadius: 10, paddingVertical: 4, alignItems: 'center', marginTop: 6 },
  outlineActionBtnText: { fontSize: 10, fontWeight: '800', color: '#FE5300' },
  sectionCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 14 },
  radioGroupRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 12 },
  radioOption: { flexDirection: 'row', alignItems: 'center' },
  radioText: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  rateTableCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 12 },
  tableHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tableHeaderLabel: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  tableHeaderVal: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableCatLeft: { flexDirection: 'row', alignItems: 'center' },
  tableCatText: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  inputPillBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  currencySymbol: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  rateTextInput: { fontSize: 12, fontWeight: '900', color: '#0f172a', width: 44, textAlign: 'right', padding: 0 },
  infoNoticeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  infoNoticeText: { fontSize: 9, color: '#64748b' },
  extraChargesList: { marginTop: 6 },
  extraRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  extraLabel: { fontSize: 9, color: '#475569', fontWeight: '600', flex: 1 },
  smallInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 4, paddingVertical: 2 },
  smallTextInput: { fontSize: 10, fontWeight: '800', color: '#0f172a', width: 28, textAlign: 'right', padding: 0 },
  tripleGridRow: { flexDirection: 'row', marginBottom: 16 },
  tripleCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  tripleHeader: { fontSize: 10, fontWeight: '800', color: '#0f172a' },
  tripleSub: { fontSize: 8, color: '#94a3b8', marginTop: 1 },
  tripleValText: { fontSize: 10, fontWeight: '800', color: '#0f172a' },
  dayBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  dayBadgeText: { fontSize: 9, fontWeight: '800', color: '#2563eb' },
  radiusValText: { fontSize: 12, fontWeight: '900', color: '#FE5300', marginTop: 4 },
  saveBtn: { backgroundColor: '#FE5300', borderRadius: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#FE5300', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
});
