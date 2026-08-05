import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

export interface VehicleItem {
  id: string;
  regNo: string;
  make: string;
  model: string;
  year: string;
  fuel: string;
  category: 'Sedan' | 'SUV' | 'Hatchback';
  seats: string;
  driver: string;
  status: 'Verified' | 'Pending Review' | 'Rejected';
  color: string;
  rcNo: string;
  insuranceValidTill: string;
}

export const VehiclesListScreen = () => {
  const navigation = useNavigation<any>();
  const token = useAuthStore((state) => state.token);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Sedan' | 'SUV' | 'Verified' | 'Pending'>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVehicles = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/vehicles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const mapped = (result.data || []).map((v: any) => ({
          id: v._id,
          regNo: v.registrationNumber,
          make: v.brand || v.vehicleName || 'Vehicle',
          model: v.model || '',
          year: String(v.manufacturingYear || '2023'),
          fuel: v.fuel || 'Diesel',
          category: v.category || 'SUV',
          seats: `${v.seatingCapacity || 4} Seater`,
          driver: v.assignedDriverId?.name || v.assignedDriverId || 'Unassigned',
          status: v.status === 'Active' ? 'Verified' : v.status === 'Rejected' ? 'Rejected' : 'Pending Review',
          color: v.color || 'White',
          rcNo: v.rcNo || v.registrationNumber,
          insuranceValidTill: v.insuranceValidTill || '18 May 2026',
        }));
        setVehicles(mapped);
      } else {
        setVehicles([]);
      }
    } catch (e) {
      console.error("Error fetching vehicles roster:", e);
      setVehicles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles(false);
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch = 
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeFilter === 'All') return true;
    if (activeFilter === 'Sedan') return v.category === 'Sedan';
    if (activeFilter === 'SUV') return v.category === 'SUV';
    if (activeFilter === 'Verified') return v.status === 'Verified';
    if (activeFilter === 'Pending') return v.status === 'Pending Review';
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity 
          style={styles.addHeaderBtn}
          onPress={() => navigation.navigate('AddVehicle')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={16} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addHeaderBtnText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE5300']} />
        }
      >
        {loading && (
          <View style={{ paddingVertical: 10 }}>
            <ActivityIndicator size="small" color="#FE5300" />
          </View>
        )}
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicle model, reg no..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {[
            { id: 'All', label: `All (${vehicles.length})` },
            { id: 'SUV', label: 'SUV' },
            { id: 'Sedan', label: 'Sedan' },
            { id: 'Verified', label: 'Verified' },
            { id: 'Pending', label: 'Pending Review' },
          ].map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <TouchableOpacity
                key={pill.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(pill.id as any)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Stats Row Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{vehicles.length}</Text>
            <Text style={styles.statLabel}>Total Vehicles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: '#16a34a' }]}>
              {vehicles.filter((v) => v.status === 'Verified').length}
            </Text>
            <Text style={styles.statLabel}>Verified & Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: '#d97706' }]}>
              {vehicles.filter((v) => v.status === 'Pending Review').length}
            </Text>
            <Text style={styles.statLabel}>Pending Review</Text>
          </View>
        </View>

        {/* Service Area & Pricing Quick Shortcut */}
        <TouchableOpacity 
          style={styles.pricingShortcutCard}
          onPress={() => navigation.navigate('ServiceAreaPricing')}
          activeOpacity={0.8}
        >
          <View style={styles.pricingShortcutIcon}>
            <Ionicons name="pricetag-outline" size={18} color="#FE5300" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.pricingShortcutTitle}>Service Area & Pricing Settings</Text>
            <Text style={styles.pricingShortcutSub}>Manage operational hubs & per-KM rates</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FE5300" />
        </TouchableOpacity>

        {/* Vehicle List Items */}
        <Text style={styles.sectionHeader}>Vehicle Registry</Text>
        {filteredVehicles.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Ionicons name="car-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Vehicles Found</Text>
            <Text style={styles.emptySub}>No vehicles match your current search or filter query.</Text>
          </View>
        ) : (
          filteredVehicles.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.vehicleCard}
              onPress={() => navigation.navigate('VehicleDetails', { vehicleId: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.vehicleTopRow}>
                <View style={styles.carGraphicBox}>
                  <Ionicons name="car-sport" size={32} color="#FE5300" />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.regNoText}>{item.regNo}</Text>
                    {item.status === 'Verified' ? (
                      <View style={styles.verifiedTag}>
                        <Text style={styles.verifiedTagText}>Verified </Text>
                        <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                      </View>
                    ) : (
                      <View style={styles.pendingTag}>
                        <Text style={styles.pendingTagText}>Pending </Text>
                        <Ionicons name="time-outline" size={12} color="#d97706" />
                      </View>
                    )}
                  </View>

                  <Text style={styles.modelText}>{item.make} {item.model}</Text>
                  <Text style={styles.specsText}>{item.color} • {item.year} • {item.fuel}</Text>
                </View>
              </View>

              <View style={styles.cardFooterRow}>
                <View style={styles.footerCol}>
                  <Ionicons name="people-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.footerVal}>{item.seats}</Text>
                </View>
                <View style={styles.footerCol}>
                  <Ionicons name="person-circle-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.footerVal}>Driver: {item.driver}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Add Vehicle Action Button */}
      <TouchableOpacity 
        style={styles.fabBtn}
        onPress={() => navigation.navigate('AddVehicle')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
        <Text style={styles.fabText}>Add Vehicle</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 100 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 44,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  addHeaderBtn: { backgroundColor: '#FE5300', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  addHeaderBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0f172a', padding: 0 },
  filterPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 8,
  },
  filterPillActive: { backgroundColor: '#FE5300', borderColor: '#FE5300' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  filterPillTextActive: { color: '#ffffff' },
  statsBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
  },
  statCol: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 26, backgroundColor: '#f1f5f9' },
  pricingShortcutCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
    marginBottom: 20,
  },
  pricingShortcutIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#ffedd5', justifyContent: 'center', alignItems: 'center' },
  pricingShortcutTitle: { fontSize: 13, fontWeight: '800', color: '#9a3412' },
  pricingShortcutSub: { fontSize: 10, color: '#c2410c', marginTop: 1 },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 12, marginLeft: 4 },
  vehicleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  vehicleTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  carGraphicBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ffedd5' },
  regNoText: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedTagText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  pendingTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pendingTagText: { fontSize: 10, fontWeight: '800', color: '#d97706' },
  modelText: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 2 },
  specsText: { fontSize: 11, color: '#64748b', marginTop: 1 },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  footerCol: { flexDirection: 'row', alignItems: 'center' },
  footerVal: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  emptyStateCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 10 },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#FE5300',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FE5300',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: { color: '#ffffff', fontSize: 14, fontWeight: '800', marginLeft: 4 },
});
