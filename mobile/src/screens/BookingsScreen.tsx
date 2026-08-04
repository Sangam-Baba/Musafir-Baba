import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

type Booking = {
  id: string;
  tripId: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: string;
  date: string;
  fare: number;
  status: 'Ongoing' | 'Scheduled' | 'Completed' | 'Cancelled';
  customerName: string;
  customerPhone: string;
  vehicleName: string;
  vehicleReg: string;
  driverName: string;
  tripType: string;
  distance: string;
};

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'b1',
    tripId: 'MB-89241',
    pickupLocation: 'Terminal 3, IGI Airport, New Delhi',
    dropoffLocation: 'Sector 62, Noida, Uttar Pradesh',
    pickupTime: '10:30 AM',
    date: 'Today',
    fare: 1850,
    status: 'Ongoing',
    customerName: 'Rajesh Sharma',
    customerPhone: '+91 98765 43210',
    vehicleName: 'Innova Crysta',
    vehicleReg: 'DL01AB1234',
    driverName: 'Ramesh Kumar',
    tripType: 'Airport Transfer',
    distance: '42 km',
  },
  {
    id: 'b2',
    tripId: 'MB-89240',
    pickupLocation: 'Connaught Place, New Delhi',
    dropoffLocation: 'Cyber Hub, Gurugram, Haryana',
    pickupTime: '02:00 PM',
    date: 'Today',
    fare: 1420,
    status: 'Scheduled',
    customerName: 'Ananya Verma',
    customerPhone: '+91 98123 67890',
    vehicleName: 'Maruti Ertiga',
    vehicleReg: 'HR26CK5678',
    driverName: 'Suresh Singh',
    tripType: 'City Ride',
    distance: '28 km',
  },
  {
    id: 'b3',
    tripId: 'MB-89239',
    pickupLocation: 'Nizamuddin Railway Station',
    dropoffLocation: 'Mall Road, Shimla, Himachal Pradesh',
    pickupTime: '06:00 AM',
    date: 'Yesterday',
    fare: 7800,
    status: 'Completed',
    customerName: 'Vikram Malhotra',
    customerPhone: '+91 97111 22334',
    vehicleName: 'Innova Crysta',
    vehicleReg: 'DL01AB1234',
    driverName: 'Ramesh Kumar',
    tripType: 'Outstation One-Way',
    distance: '345 km',
  },
  {
    id: 'b4',
    tripId: 'MB-89238',
    pickupLocation: 'Greater Kailash 1, New Delhi',
    dropoffLocation: 'Taj Mahal East Gate, Agra',
    pickupTime: '07:30 AM',
    date: '28 Jul',
    fare: 5400,
    status: 'Completed',
    customerName: 'Priya Mehta',
    customerPhone: '+91 98999 11223',
    vehicleName: 'Toyota Fortuner',
    vehicleReg: 'UP16BW9999',
    driverName: 'Amit Verma',
    tripType: 'Outstation Round-Trip',
    distance: '240 km',
  },
  {
    id: 'b5',
    tripId: 'MB-89237',
    pickupLocation: 'Vasant Kunj, New Delhi',
    dropoffLocation: 'Aerocity, New Delhi',
    pickupTime: '09:15 AM',
    date: '26 Jul',
    fare: 650,
    status: 'Cancelled',
    customerName: 'Sunil Kapoor',
    customerPhone: '+91 98444 55667',
    vehicleName: 'Maruti Dzire',
    vehicleReg: 'DL03CX4321',
    driverName: 'Deepak Kumar',
    tripType: 'Airport Pickup',
    distance: '12 km',
  },
];

export const BookingsScreen = () => {
  const token = useAuthStore((state) => state.token);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Ongoing' | 'Scheduled' | 'Completed'>('All');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const tabParam = activeFilter === 'All' ? 'Ongoing' : activeFilter;
      const res = await fetch(`${API_BASE_URL}/partner/bookings?tab=${tabParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setBookings(result.data);
      } else {
        setBookings(MOCK_BOOKINGS.filter(b => activeFilter === 'All' ? true : b.status === activeFilter));
      }
    } catch (e) {
      console.error("Error fetching bookings:", e);
      setBookings(MOCK_BOOKINGS.filter(b => activeFilter === 'All' ? true : b.status === activeFilter));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(false);
  };

  const filteredBookings = bookings;

  const getStatusStyle = (status: Booking['status']) => {
    switch (status) {
      case 'Ongoing':
        return { bg: '#e0f2fe', text: '#0284c7', icon: 'navigate-circle-outline' as const };
      case 'Scheduled':
        return { bg: '#fef3c7', text: '#b45309', icon: 'time-outline' as const };
      case 'Completed':
        return { bg: '#dcfce7', text: '#15803d', icon: 'checkmark-circle-outline' as const };
      case 'Cancelled':
        return { bg: '#fef2f2', text: '#dc2626', icon: 'close-circle-outline' as const };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FE5300" />

      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.title}>Bookings & Trips</Text>
        <Text style={styles.subtitle}>Track active rides, scheduled dispatch & trip history.</Text>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
          {(['All', 'Ongoing', 'Scheduled', 'Completed'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
              onPress={() => setActiveFilter(filter)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          loading ? (
            <ActivityIndicator size="small" color="#FE5300" style={{ marginVertical: 10 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptyText}>There are no trips matching the selected status filter.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedBooking(item)}
              activeOpacity={0.85}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.tripIdRow}>
                  <Ionicons name="pricetag-outline" size={16} color="#FE5300" style={{ marginRight: 6 }} />
                  <Text style={styles.tripId}>{item.tripId}</Text>
                  <Text style={styles.tripType}>• {item.tripType}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} style={{ marginRight: 3 }} />
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
                </View>
              </View>

              {/* Route Timeline */}
              <View style={styles.routeSection}>
                <View style={styles.routeRow}>
                  <View style={[styles.dot, { backgroundColor: '#16a34a' }]} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.pickupLocation}
                  </Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeRow}>
                  <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.dropoffLocation}
                  </Text>
                </View>
              </View>

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <Ionicons name="car-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.footerValue}>{item.vehicleName}</Text>
                </View>

                <View style={styles.footerItem}>
                  <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.footerValue}>{item.date}, {item.pickupTime}</Text>
                </View>

                <Text style={styles.fareText}>₹{item.fare}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Booking Details Modal */}
      <Modal visible={!!selectedBooking} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="receipt-outline" size={22} color="#FE5300" style={{ marginRight: 8 }} />
            <Text style={styles.modalTitle}>Trip Details</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedBooking(null)} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {selectedBooking ? (
          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Header Hero */}
            <View style={styles.modalHero}>
              <View style={styles.modalHeroRow}>
                <Text style={styles.modalTripId}>{selectedBooking.tripId}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(selectedBooking.status).bg }]}>
                  <Text style={[styles.statusText, { color: getStatusStyle(selectedBooking.status).text }]}>
                    {selectedBooking.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.modalFare}>Total Fare: ₹{selectedBooking.fare}</Text>
              <Text style={styles.modalSub}>{selectedBooking.tripType} • {selectedBooking.distance}</Text>
            </View>

            {/* Route Map Timeline */}
            <Text style={styles.sectionTitle}>PICKUP & DROP ROUTE</Text>
            <View style={styles.modalRouteCard}>
              <View style={styles.modalRouteRow}>
                <View style={[styles.dotBig, { backgroundColor: '#16a34a' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>PICKUP LOCATION</Text>
                  <Text style={styles.modalLocationText}>{selectedBooking.pickupLocation}</Text>
                  <Text style={styles.modalTimeText}>{selectedBooking.date} at {selectedBooking.pickupTime}</Text>
                </View>
              </View>
              <View style={styles.modalRouteLine} />
              <View style={styles.modalRouteRow}>
                <View style={[styles.dotBig, { backgroundColor: '#ef4444' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeLabel}>DROP LOCATION</Text>
                  <Text style={styles.modalLocationText}>{selectedBooking.dropoffLocation}</Text>
                </View>
              </View>
            </View>

            {/* Passenger & Vehicle Info */}
            <Text style={styles.sectionTitle}>PASSENGER & VEHICLE DETAILS</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="person-circle-outline" size={20} color="#FE5300" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Passenger</Text>
                  <Text style={styles.infoVal}>{selectedBooking.customerName}</Text>
                </View>
                <Text style={styles.phoneVal}>{selectedBooking.customerPhone}</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Ionicons name="car-sport-outline" size={20} color="#0284c7" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Assigned Vehicle</Text>
                  <Text style={styles.infoVal}>{selectedBooking.vehicleName} ({selectedBooking.vehicleReg})</Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color="#16a34a" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Assigned Driver</Text>
                  <Text style={styles.infoVal}>{selectedBooking.driverName}</Text>
                </View>
              </View>
            </View>

            <Button title="Close Details" type="outline" onPress={() => setSelectedBooking(null)} style={{ marginTop: 16 }} />
          </ScrollView>
        ) : null}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  filterContainer: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#FE5300',
    borderColor: '#FE5300',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  tripType: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  routeSection: {
    paddingVertical: 6,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  routeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 14,
    backgroundColor: '#cbd5e1',
    marginLeft: 3,
    marginVertical: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerValue: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  fareText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FE5300',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
  },

  /* Modal Sheet */
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#f8fafc',
  },
  modalHero: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTripId: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalFare: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FE5300',
    marginBottom: 2,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 12,
  },
  modalRouteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalRouteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dotBig: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 3,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalLocationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  modalTimeText: {
    fontSize: 12,
    color: '#64748b',
  },
  modalRouteLine: {
    width: 2,
    height: 24,
    backgroundColor: '#cbd5e1',
    marginLeft: 5,
    marginVertical: 4,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  phoneVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FE5300',
  },
});
