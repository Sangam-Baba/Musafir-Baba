import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';

export const VehicleSettingsScreen = () => {
  const setOnboardingComplete = useAuthStore((state) => state.setOnboardingComplete);

  const handleComplete = () => {
    setOnboardingComplete(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicle Settings</Text>
      <Text style={styles.subtitle}>Configure pricing and operational hubs for your approved vehicles.</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Toyota Innova (DL1CA1234)</Text>
        <Text style={styles.status}>Status: Pending Setup</Text>
        <Button title="Configure Pricing & Hubs" onPress={() => console.log('Navigate to config')} style={{ marginTop: 12 }} />
      </View>

      <View style={styles.footer}>
        <Button title="Complete Profile Setup" onPress={handleComplete} />
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
    backgroundColor: '#FAFAFA',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  status: {
    color: '#E65100',
    fontWeight: '500',
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  }
});
