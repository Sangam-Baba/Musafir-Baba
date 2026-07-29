import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Button } from '../components/Button';

// Mock data
const mockFleet = [
  { id: '1', vehicleName: 'Toyota Innova', driverName: 'Rahul Kumar', regNo: 'DL1CA1234' }
];

export const FleetRegistryScreen = () => {
  const handleAddRow = () => {
    // Navigate to AddFleetRow
    console.log('Navigate to AddFleetRow');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fleet Registry</Text>
      <Text style={styles.subtitle}>Register your vehicles and assign drivers.</Text>

      <FlatList
        data={mockFleet}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No vehicles registered yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.vehicleName} ({item.regNo})</Text>
            <Text style={styles.cardSub}>Driver: {item.driverName}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Button title="+ Add Vehicle & Driver" type="outline" onPress={handleAddRow} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  footer: {
    marginTop: 20,
    marginBottom: 20,
  }
});
