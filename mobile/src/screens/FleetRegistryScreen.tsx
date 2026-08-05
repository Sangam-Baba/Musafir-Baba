import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Modal, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
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
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
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
      
      Alert.alert("Success", "Driver and vehicle added successfully!");
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

  const getDriver = (driverId: string) => {
    return drivers.find(d => d._id === driverId);
  };

  const getDriverName = (driverId: string) => {
    const d = getDriver(driverId);
    return d ? d.name : 'Unassigned';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FE5300" />
      </View>
    );
  }

  const selectedDriver = selectedVehicle ? getDriver(selectedVehicle.assignedDriverId) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fleet Registry</Text>
        <Text style={styles.subtitle}>Register vehicles & tap any card to view details.</Text>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Fleet Vehicles Registered</Text>
            <Text style={styles.emptyText}>Add your first vehicle and assigned driver to start managing bookings.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.status === 'Active';
          return (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => setSelectedVehicle(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.vehicleTitleRow}>
                  <Ionicons name="car-sport" size={20} color="#FE5300" style={{ marginRight: 8 }} />
                  <Text style={styles.cardTitle}>{item.vehicleName || 'Vehicle'}</Text>
                </View>
                <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusPending]}>
                  <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextPending]}>
                    {item.status || 'Pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.regNumber}>Reg: {item.registrationNumber}</Text>
                <View style={styles.driverRowBetween}>
                  <View style={styles.driverRow}>
                    <Ionicons name="person-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.cardSub}>Driver: {getDriverName(item.assignedDriverId)}</Text>
                  </View>
                  <View style={styles.viewDetailBadge}>
                    <Text style={styles.viewDetailText}>Details</Text>
                    <Ionicons name="chevron-forward" size={12} color="#FE5300" style={{ marginLeft: 2 }} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Button title="+ Add Vehicle & Driver" onPress={() => setModalVisible(true)} />
      </View>

      {/* VEHICLE & DRIVER DETAIL MODAL */}
      <Modal visible={!!selectedVehicle} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="car-sport" size={22} color="#FE5300" style={{ marginRight: 8 }} />
            <Text style={styles.modalTitle}>Vehicle Details</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedVehicle(null)} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {selectedVehicle ? (
          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Vehicle Card Header */}
            <View style={styles.detailHeroCard}>
              <View style={styles.detailHeroHeader}>
                <Text style={styles.detailHeroTitle}>{selectedVehicle.vehicleName || 'Vehicle'}</Text>
                <View style={[styles.statusBadge, selectedVehicle.status === 'Active' ? styles.statusActive : styles.statusPending]}>
                  <Text style={[styles.statusText, selectedVehicle.status === 'Active' ? styles.statusTextActive : styles.statusTextPending]}>
                    {selectedVehicle.status || 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.detailHeroReg}>Registration: {selectedVehicle.registrationNumber}</Text>
            </View>

            {/* Vehicle Specs Grid */}
            <Text style={styles.sectionTitle}>VEHICLE SPECIFICATIONS</Text>
            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Brand</Text>
                <Text style={styles.detailValue}>{selectedVehicle.brand || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Model / Year</Text>
                <Text style={styles.detailValue}>{selectedVehicle.model || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{selectedVehicle.category || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Seating Capacity</Text>
                <Text style={styles.detailValue}>{selectedVehicle.seatingCapacity ? `${selectedVehicle.seatingCapacity} Seats` : 'N/A'}</Text>
              </View>
            </View>

            {/* Assigned Driver Details */}
            <Text style={styles.sectionTitle}>ASSIGNED DRIVER DETAILS</Text>
            {selectedDriver ? (
              <View style={styles.driverDetailCard}>
                <View style={styles.driverDetailRow}>
                  <View style={styles.driverAvatarCircle}>
                    <Ionicons name="person" size={24} color="#FE5300" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverDetailName}>{selectedDriver.name || 'Driver'}</Text>
                    <Text style={styles.driverDetailSub}>Licence: {selectedDriver.licenceNumber || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.driverInfoList}>
                  <View style={styles.driverInfoRow}>
                    <Ionicons name="call-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <Text style={styles.driverInfoLabel}>Mobile:</Text>
                    <Text style={styles.driverInfoVal}>{selectedDriver.mobile || 'N/A'}</Text>
                  </View>

                  {selectedDriver.licenceImageUrl ? (
                    <TouchableOpacity 
                      style={styles.licenceBtn}
                      onPress={() => Linking.openURL(selectedDriver.licenceImageUrl)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-text-outline" size={16} color="#FE5300" style={{ marginRight: 6 }} />
                      <Text style={styles.licenceBtnText}>View Licence Document</Text>
                      <Ionicons name="open-outline" size={14} color="#FE5300" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.emptyDriverCard}>
                <Ionicons name="person-outline" size={24} color="#94a3b8" />
                <Text style={styles.emptyDriverText}>No driver currently assigned to this vehicle.</Text>
              </View>
            )}

            <Button title="Close Details" type="outline" onPress={() => setSelectedVehicle(null)} style={{ marginTop: 24 }} />
          </ScrollView>
        ) : null}
      </Modal>

      {/* ADD VEHICLE & DRIVER MODAL */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Driver & Vehicle</Text>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>DRIVER INFORMATION</Text>
          <InputField label="Full Name" value={driverName} onChangeText={setDriverName} placeholder="Driver's full name" />
          <InputField label="Mobile Number" value={driverMobile} onChangeText={setDriverMobile} keyboardType="phone-pad" placeholder="10-digit mobile number" />
          <InputField label="Licence Number" value={driverLicence} onChangeText={setDriverLicence} autoCapitalize="characters" placeholder="DL-XXXXXXXX" />
          
          <Text style={{ marginBottom: 6, fontWeight: '700', fontSize: 13, color: '#334155' }}>Licence Document</Text>
          <Button 
            title={driverLicenceImage ? driverLicenceImage.name : "Choose Licence File"} 
            type="outline" 
            onPress={() => handlePickFile(setDriverLicenceImage)} 
            style={{ marginBottom: 20 }}
          />

          <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
          <InputField label="Registration Number" value={vehicleReg} onChangeText={setVehicleReg} autoCapitalize="characters" placeholder="e.g. DL01AB1234" />
          <InputField label="Brand (e.g. Toyota)" value={vehicleBrand} onChangeText={setVehicleBrand} placeholder="Toyota" />
          <InputField label="Model / Year" value={vehicleModel} onChangeText={setVehicleModel} placeholder="Innova Crysta 2023" />
          <InputField label="Vehicle Name" value={vehicleName} onChangeText={setVehicleName} placeholder="Innova" />
          <InputField label="Category" value={vehicleCategory} onChangeText={setVehicleCategory} placeholder="SUV" />
          <InputField label="Seating Capacity" value={vehicleSeats} onChangeText={setVehicleSeats} keyboardType="number-pad" placeholder="7" />

          {uploadingDoc && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color="#FE5300" size="small" />
              <Text style={styles.uploadingText}>{uploadingDoc}</Text>
            </View>
          )}

          <Button title="Save Driver & Vehicle" onPress={submitAddFleet} disabled={!!uploadingDoc} style={{ marginTop: 12 }} />
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    marginBottom: 16,
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
    padding: 18,
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
    marginBottom: 10,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusActive: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextActive: { color: '#15803d' },
  statusTextPending: { color: '#b45309' },

  cardBody: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  regNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  driverRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748b',
  },
  viewDetailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewDetailText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FE5300',
  },

  /* Detail Modal Styles */
  detailHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailHeroReg: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FE5300',
  },
  detailGrid: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailItem: {
    width: '50%',
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },

  driverDetailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  driverDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  driverAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetailName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  driverDetailSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  driverInfoList: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  driverInfoLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 6,
    fontWeight: '600',
  },
  driverInfoVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  licenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  licenceBtnText: {
    color: '#FE5300',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyDriverCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  emptyDriverText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },

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
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 14,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff7ed',
    borderRadius: 14,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#FE5300',
    fontWeight: '700',
    fontSize: 13,
  }
});
