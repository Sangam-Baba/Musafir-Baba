import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';

export const VehicleSettingsScreen = () => {
  const setOnboardingComplete = useAuthStore((state) => state.setOnboardingComplete);

  const handleComplete = () => {
    setOnboardingComplete(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Settings</Text>
        <Text style={styles.subtitle}>Configure pricing & operational hubs for your approved vehicles.</Text>
      </View>
      
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="car-sport-outline" size={22} color="#FE5300" style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Fleet Vehicle Setup</Text>
        </View>

        <Text style={styles.vehicleName}>Toyota Innova (DL1CA1234)</Text>
        
        <View style={styles.statusBadge}>
          <Ionicons name="time-outline" size={14} color="#d97706" style={{ marginRight: 4 }} />
          <Text style={styles.statusText}>Status: Pending Operational Setup</Text>
        </View>

        <Button 
          title="Configure Pricing & Hubs" 
          type="outline" 
          onPress={() => console.log('Navigate to config')} 
          style={{ marginTop: 16 }} 
        />
      </View>

      <View style={styles.footer}>
        <Button title="Complete Profile Setup" onPress={handleComplete} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: '#b45309',
    fontWeight: '700',
    fontSize: 12,
  },
  footer: {
    marginTop: 20,
  }
});
