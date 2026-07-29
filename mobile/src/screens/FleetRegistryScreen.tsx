import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../navigation/types';
import { Button } from '../components/Button';
import { API_BASE_URL } from '../utils/config';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';
import { InputField } from '../components/InputField';
import * as DocumentPicker from 'expo-document-picker';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'FleetRegistry'>;

export const FleetRegistryScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const token = useAuthStore((state) => state.token);
  
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Form State for Add Driver & Vehicle
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [driverLicence, setDriverLicence] = useState('');
  const [driverLicenceImage, setDriverLicenceImage] = useState<any>(null);
  
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState('');
  const [vehicleSeats, setVehicleSeats] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.data) {
        setVehicles(result.data.vehicles || []);
        setDrivers(result.data.drivers || []);
      }
    } catch (e) {
      console.error("Error loading dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const handlePickFile = async (setter: any) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setter(result.assets[0]);
    }
  };

  const uploadFileHelper = async (file: any, folder: string) => {
    if (!file) return "";
    const presignRes = await fetch(`${API_BASE_URL}/upload/cloudflare-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.mimeType || 'application/octet-stream',
        folder,
      }),
    });
    if (!presignRes.ok) return "";
    const { uploadUrl, fileUrl } = await presignRes.json();
    
    const fileResponse = await fetch(file.uri);
    const blob = await fileResponse.blob();
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": file.mimeType || 'application/octet-stream' },
    });
    return uploadRes.ok ? fileUrl : "";
  };

  const submitAddFleet = async () => {
    if (!driverName || !driverMobile || !vehicleReg) {
      Alert.alert("Error", "Please fill required fields.");
      return;
    }
    
    setUploadingDoc("Uploading Licence...");
    try {
      const licenceImageUrl = await uploadFileHelper(driverLicenceImage, "partner-documents");
      
      setUploadingDoc("Creating Driver...");
      const driverRes = await fetch(`${API_BASE_URL}/partner/driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: driverName,
          mobile: driverMobile,
          licenceNumber: driverLicence,
          licenceImageUrl,
        }),
      });
      const driverResult = await driverRes.json();
      if (!driverRes.ok) throw new Error(driverResult.message || "Failed to add driver");
      
      setUploadingDoc("Creating Vehicle...");
      const vehicleRes = await fetch(`${API_BASE_URL}/partner/vehicle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          vehicleData: {
            brand: vehicleBrand,
            model: vehicleModel,
            vehicleName: vehicleName,
            category: vehicleCategory,
            seatingCapacity: Number(vehicleSeats) || 4,
            registrationNumber: vehicleReg,
            assignedDriverId: driverResult.data._id,
          },
        }),
      });
      const vehicleResult = await vehicleRes.json();
      if (!vehicleRes.ok) throw new Error(vehicleResult.message || "Failed to add vehicle");
      
      Alert.alert("Success", "Driver and vehicle added!");
      setModalVisible(false);
      
      // Reset form
      setDriverName(''); setDriverMobile(''); setDriverLicence(''); setDriverLicenceImage(null);
      setVehicleBrand(''); setVehicleModel(''); setVehicleName(''); setVehicleCategory(''); setVehicleSeats(''); setVehicleReg('');
      
      fetchDashboardData();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add fleet entry.");
    } finally {
      setUploadingDoc(null);
    }
  };

  const getDriverName = (driverId: string) => {
    const d = drivers.find(d => d._id === driverId);
    return d ? d.name : 'Unassigned';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fleet Registry</Text>
      <Text style={styles.subtitle}>Register your vehicles and assign drivers.</Text>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={<Text style={styles.emptyText}>No vehicles registered yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.vehicleName} ({item.registrationNumber})</Text>
              <Text style={styles.statusBadge}>{item.status}</Text>
            </View>
            <Text style={styles.cardSub}>Driver: {getDriverName(item.assignedDriverId)}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <Button title="+ Add Vehicle & Driver" type="outline" onPress={() => setModalVisible(true)} style={{ marginBottom: 12 }} />
      </View>

      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Driver & Vehicle</Text>
          <Button title="Close" type="outline" onPress={() => setModalVisible(false)} />
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={styles.sectionTitle}>Driver Details</Text>
          <InputField label="Name" value={driverName} onChangeText={setDriverName} />
          <InputField label="Mobile" value={driverMobile} onChangeText={setDriverMobile} keyboardType="phone-pad" />
          <InputField label="Licence Number" value={driverLicence} onChangeText={setDriverLicence} autoCapitalize="characters" />
          
          <Text style={{ marginBottom: 4, fontWeight: '600' }}>Licence Image</Text>
          <Button 
            title={driverLicenceImage ? driverLicenceImage.name : "Choose File"} 
            type="outline" 
            onPress={() => handlePickFile(setDriverLicenceImage)} 
            style={{ marginBottom: 20 }}
          />

          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          <InputField label="Registration Number" value={vehicleReg} onChangeText={setVehicleReg} autoCapitalize="characters" />
          <InputField label="Brand (e.g. Toyota)" value={vehicleBrand} onChangeText={setVehicleBrand} />
          <InputField label="Model / Year" value={vehicleModel} onChangeText={setVehicleModel} />
          <InputField label="Vehicle Name (e.g. Innova)" value={vehicleName} onChangeText={setVehicleName} />
          <InputField label="Category (e.g. SUV)" value={vehicleCategory} onChangeText={setVehicleCategory} />
          <InputField label="Seating Capacity" value={vehicleSeats} onChangeText={setVehicleSeats} keyboardType="number-pad" />

          {uploadingDoc && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.uploadingText}>{uploadingDoc}</Text>
            </View>
          )}

          <Button title="Save Driver & Vehicle" onPress={submitAddFleet} disabled={!!uploadingDoc} />
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 16,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
  },
  uploadingText: {
    marginLeft: 8,
    color: colors.primary,
    fontWeight: '600',
  }
});
