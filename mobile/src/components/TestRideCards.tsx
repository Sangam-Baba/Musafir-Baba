import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tapTestRide, type TestRide } from '../api/testRides.api';

// TEST RIDE cards on the Available tab: same look as a real ride card (the
// Bookings screen passes its own card styles) plus a TEST RIDE badge. Accept
// never accepts -- it shows the admin's test-ride message.

const TRIP_LABEL: Record<TestRide['tripType'], string> = { ONE_WAY: 'One way', ROUND_TRIP: 'Round trip', OUTSTATION: 'Outstation' };

const show = (title: string, message: string) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

export function TestRideCards({ rides, styles }: { rides: TestRide[]; styles: any }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  if (!rides.length) return null;

  const onAccept = async (ride: TestRide) => {
    setBusyId(ride.id);
    try {
      const res = await tapTestRide(ride.id);
      show('Ride', res.data.message);
    } catch {
      show('Ride', "Already accepted or expired. This ride can't be accepted again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View>
      {rides.map((item) => (
        <View key={item.id} style={[styles.card, { borderColor: '#c4b5fd', borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#6d28d9', letterSpacing: 0.4 }}>{item.badge}</Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>{TRIP_LABEL[item.tripType]}</Text>
          </View>

          <View style={styles.cardHeader}>
            <View style={styles.tripIdRow}>
              <Ionicons name="flash-outline" size={16} color="#FE5300" style={{ marginRight: 6 }} />
              <Text style={styles.tripId}>{item.vehicleCategory}</Text>
            </View>
            <Text style={styles.fareText}>₹{item.fare}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="person-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12.5, color: '#475569', fontWeight: '600' }}>Rider: {item.riderName}</Text>
          </View>

          <View style={styles.routeSection}>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#16a34a' }]} />
              <Text style={styles.routeText} numberOfLines={1}>{item.pickupLocation}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.routeText} numberOfLines={1}>{item.dropoffLocation}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="speedometer-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.footerValue}>{item.distance}</Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.footerValue}>{item.date}, {item.pickupTime}</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.acceptButton, busyId === item.id && { opacity: 0.6 }]} onPress={() => onAccept(item)} disabled={busyId === item.id} activeOpacity={0.85}>
            {busyId === item.id ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.acceptButtonText}>Accept Ride</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
