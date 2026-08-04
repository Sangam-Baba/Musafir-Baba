import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, Linking, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

export const VehicleDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const token = useAuthStore((state) => state.token);

  const vehicleId = route.params?.vehicleId;

  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerUri, setViewerUri] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewerVisible, setViewerVisible] = useState(false);

  const fetchVehicle = async (showSpinner = true) => {
    if (!token || !vehicleId) return;
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/vehicle/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setVehicle(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to load vehicle details.');
      }
    } catch (e) {
      console.error('Fetch vehicle error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicle();
    }, [vehicleId, token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicle(false);
  };

  const openImageViewer = (uri: string, title: string) => {
    if (!uri) {
      Alert.alert('Not Available', 'No image was uploaded for this document.');
      return;
    }
    setViewerUri(uri);
    setViewerTitle(title);
    setViewerVisible(true);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FE5300" />
        <Text style={{ marginTop: 10, color: '#64748b', fontSize: 12 }}>Loading vehicle details…</Text>
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Ionicons name="car-outline" size={48} color="#cbd5e1" />
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 10 }}>Vehicle Not Found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16, backgroundColor: '#FE5300', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
          <Text style={{ color: '#ffffff', fontWeight: '800' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = vehicle.status === 'Active';
  const isPendingApproval = vehicle.status === 'Pending Approval';
  const isRejected = vehicle.status === 'Rejected';

  const statusColor = isActive ? '#16a34a' : isRejected ? '#dc2626' : '#d97706';
  const statusBg = isActive ? '#f4fbf7' : isRejected ? '#fef2f2' : '#fff7ed';
  const statusBorder = isActive ? '#dcfce7' : isRejected ? '#fecaca' : '#ffedd5';
  const statusIcon = isActive ? 'shield-checkmark' : isRejected ? 'close-circle' : 'time-outline';
  const statusLabel = isActive ? 'Active & Verified' : isRejected ? 'Rejected' : 'Pending Review';
  const statusSub = isActive
    ? 'Vehicle documents and inspection images have been verified.'
    : isRejected
    ? 'Vehicle was rejected. Contact support to resolve the issue.'
    : 'Under review. Our RTO verification team will audit within 24 hours.';

  const driver = vehicle.assignedDriverId;

  const inspectionPhotos = [
    { label: '1. Front View', uri: vehicle.frontImageUrl },
    { label: '2. Rear View', uri: vehicle.rearImageUrl },
    { label: '3. Left Side', uri: vehicle.leftSideImageUrl },
    { label: '4. Right Side', uri: vehicle.rightSideImageUrl },
    { label: '5. Dashboard', uri: vehicle.interiorImageUrl },
    { label: '6. Passenger Seating', uri: vehicle.otherImageUrl },
  ];

  const documents = [
    { title: 'RC Certificate', uri: vehicle.rcImageUrl, icon: 'car-outline', iconBg: '#e0f2fe', iconColor: '#0284c7' },
    { title: 'Insurance Policy', uri: vehicle.insuranceFileUrl, icon: 'shield-checkmark-outline', iconBg: '#f3e8ff', iconColor: '#7c3aed' },
    { title: 'PUC Certificate', uri: vehicle.pucImageUrl, icon: 'leaf-outline', iconBg: '#fff7ed', iconColor: '#d97706' },
    { title: 'RTO Permit', uri: vehicle.permitFileUrl, icon: 'document-text-outline', iconBg: '#f0fdf4', iconColor: '#16a34a' },
  ].filter(d => d.uri);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => navigation.navigate('TripSupport')}>
          <Ionicons name="help-circle-outline" size={16} color="#0f172a" style={{ marginRight: 2 }} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE5300']} />}
      >
        {/* Status Banner — reflects real status */}
        <View style={[styles.statusBanner, { backgroundColor: statusBg, borderColor: statusBorder }]}>
          <View style={[styles.statusShieldBox, { backgroundColor: statusBorder }]}>
            <Ionicons name={statusIcon as any} size={24} color={statusColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statusTitle, { color: statusColor }]}>{statusLabel}</Text>
            <Text style={styles.statusSub}>{statusSub}</Text>
          </View>
          <Ionicons name={isActive ? 'checkmark-circle' : isRejected ? 'close-circle' : 'alert-circle'} size={22} color={statusColor} />
        </View>

        {/* Vehicle Header Card */}
        <View style={styles.vehicleHeaderCard}>
          <View style={styles.carImgBox}>
            <Ionicons name="car-sport" size={54} color="#FE5300" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.regNumberText}>{vehicle.registrationNumber}</Text>
              <View style={[styles.statusTagPill, { backgroundColor: statusBg, borderColor: statusBorder }]}>
                <Text style={[styles.statusTagText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <Text style={styles.vehicleModelText}>{vehicle.brand} {vehicle.model}</Text>
            <Text style={styles.vehicleSpecsText}>{vehicle.color || 'N/A'} • {vehicle.manufacturingYear || 'N/A'} • {vehicle.fuel || 'Diesel'}</Text>
            <View style={styles.commercialPill}>
              <Text style={styles.commercialPillText}>{vehicle.category} • Commercial</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Information */}
        <Text style={styles.sectionHeader}>Vehicle Information</Text>
        <View style={styles.infoCard}>
          {[
            { label: 'Registration Number', val: vehicle.registrationNumber, icon: 'card-outline' },
            { label: 'Brand / Make', val: vehicle.brand, icon: 'car-outline' },
            { label: 'Model', val: vehicle.model, icon: 'car-sport-outline' },
            { label: 'Year of Manufacture', val: String(vehicle.manufacturingYear || 'N/A'), icon: 'calendar-outline' },
            { label: 'Fuel Type', val: vehicle.fuel || 'Diesel', icon: 'flame-outline' },
            { label: 'Seating Capacity', val: `${vehicle.seatingCapacity || 'N/A'} Seater`, icon: 'people-outline' },
            { label: 'Category', val: vehicle.category, icon: 'bus-outline' },
            { label: 'Body Color', val: vehicle.color || 'N/A', icon: 'color-palette-outline' },
          ].map((item, idx, arr) => (
            <View key={idx} style={[styles.infoRow, idx < arr.length - 1 && styles.infoRowBorder]}>
              <View style={styles.infoIconBox}>
                <Ionicons name={item.icon as any} size={14} color="#16a34a" />
              </View>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoVal}>{item.val}</Text>
            </View>
          ))}
        </View>

        {/* Driver Data Section */}
        <Text style={styles.sectionHeader}>Assigned Driver</Text>
        {driver ? (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatarBox}>
              {driver.photoUrl ? (
                <Image source={{ uri: driver.photoUrl }} style={styles.driverAvatarImg} />
              ) : (
                <Ionicons name="person" size={30} color="#64748b" />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <Text style={styles.driverInfo}>📞 {driver.mobile}</Text>
              <Text style={styles.driverInfo}>🪪 License: {driver.licenceNumber}</Text>
              <View style={[styles.driverStatusPill, { backgroundColor: driver.status === 'Active' ? '#dcfce7' : '#fef3c7' }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: driver.status === 'Active' ? '#16a34a' : '#d97706' }}>
                  {driver.status}
                </Text>
              </View>
            </View>
            {driver.licenceImageUrl ? (
              <TouchableOpacity
                style={styles.viewDocBtn}
                onPress={() => openImageViewer(driver.licenceImageUrl, 'Driver Licence')}
              >
                <Ionicons name="eye-outline" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                <Text style={styles.viewDocBtnText}>DL</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={[styles.infoCard, { alignItems: 'center', paddingVertical: 20 }]}>
            <Ionicons name="person-outline" size={32} color="#cbd5e1" />
            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>No driver assigned yet</Text>
          </View>
        )}

        {/* Inspection Photos */}
        <Text style={styles.sectionHeader}>Inspection Photos ({inspectionPhotos.filter(p => p.uri).length}/6)</Text>
        <View style={styles.photoGrid}>
          {inspectionPhotos.map((photo, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.photoThumbSlot}
              onPress={() => openImageViewer(photo.uri, photo.label)}
              activeOpacity={0.85}
            >
              {photo.uri ? (
                <>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  <View style={styles.photoOverlayLabel}>
                    <Text style={styles.photoLabelText}>{photo.label}</Text>
                  </View>
                  <Ionicons name="eye-outline" size={16} color="#ffffff" style={styles.photoEyeIcon} />
                </>
              ) : (
                <View style={styles.photoThumbEmpty}>
                  <Ionicons name="camera-outline" size={22} color="#94a3b8" />
                  <Text style={styles.photoEmptyLabel}>{photo.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Documents Section */}
        <Text style={styles.sectionHeader}>Vehicle Documents</Text>
        {documents.length === 0 ? (
          <View style={[styles.infoCard, { alignItems: 'center', paddingVertical: 20 }]}>
            <Ionicons name="document-outline" size={32} color="#cbd5e1" />
            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>No documents uploaded yet</Text>
          </View>
        ) : (
          <View style={styles.docsList}>
            {documents.map((doc, idx) => (
              <View key={idx} style={styles.docCard}>
                <View style={[styles.docIconBox, { backgroundColor: doc.iconBg }]}>
                  <Ionicons name={doc.icon as any} size={20} color={doc.iconColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  <Text style={styles.docSub}>Tap View to open image</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewDocBtn}
                  onPress={() => openImageViewer(doc.uri, doc.title)}
                >
                  <Ionicons name="eye-outline" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                  <Text style={styles.viewDocBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Guidelines Card */}
        <View style={styles.guidelinesCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="information-circle-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
            <Text style={styles.guideCardTitle}>Verification Guidelines</Text>
          </View>
          {[
            'All documents must be valid and original',
            'Inspection photos must clearly show the vehicle',
            'Driver licence must be commercial grade',
            'Verification usually completes within 24 hours',
          ].map((item, idx) => (
            <View key={idx} style={styles.guideItemRow}>
              <Ionicons name="checkmark" size={14} color="#16a34a" style={{ marginRight: 8 }} />
              <Text style={styles.guideItemText}>{item}</Text>
            </View>
          ))}
        </View>
        {/* Update Vehicle Details Button */}
        <TouchableOpacity
          style={styles.updateVehicleBtn}
          onPress={() => navigation.navigate('UpdateVehicle', { vehicleId, vehicle })}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
          <Text style={styles.updateVehicleBtnText}>Update Vehicle Details</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{viewerTitle}</Text>
            <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <Image
            source={{ uri: viewerUri }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 48,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  helpBtn: { flexDirection: 'row', alignItems: 'center' },
  helpText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  statusBanner: {
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  statusShieldBox: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '800' },
  statusSub: { fontSize: 11, color: '#475569', marginTop: 1, lineHeight: 14 },
  vehicleHeaderCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  carImgBox: { width: 90, height: 75, borderRadius: 14, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ffedd5' },
  regNumberText: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  statusTagPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  statusTagText: { fontSize: 9, fontWeight: '800' },
  vehicleModelText: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 2 },
  vehicleSpecsText: { fontSize: 11, color: '#64748b', marginTop: 1 },
  commercialPill: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  commercialPillText: { fontSize: 10, fontWeight: '800', color: '#2563eb' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10, marginLeft: 4 },
  infoCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoIconBox: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  infoLabel: { fontSize: 12, color: '#64748b', flex: 1 },
  infoVal: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  driverCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  driverAvatarBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  driverAvatarImg: { width: 60, height: 60, borderRadius: 30 },
  driverName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  driverInfo: { fontSize: 12, color: '#475569', marginTop: 2 },
  driverStatusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  photoThumbSlot: { width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: '100%', height: '100%' },
  photoOverlayLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', padding: 4 },
  photoLabelText: { fontSize: 8, color: '#ffffff', fontWeight: '700' },
  photoEyeIcon: { position: 'absolute', top: 6, right: 6 },
  photoThumbEmpty: { width: '100%', height: '100%', backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  photoEmptyLabel: { fontSize: 8, color: '#94a3b8', fontWeight: '600', marginTop: 4, textAlign: 'center', paddingHorizontal: 4 },
  docsList: { marginBottom: 20 },
  docCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 10 },
  docIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  docTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  docSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  viewDocBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  viewDocBtnText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  guidelinesCard: { backgroundColor: '#f4fbf7', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#dcfce7', marginBottom: 20 },
  guideCardTitle: { fontSize: 13, fontWeight: '800', color: '#16a34a' },
  guideItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  guideItemText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  updateVehicleBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#16a34a', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  updateVehicleBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 16 : 48, paddingBottom: 12 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#ffffff', flex: 1 },
  modalCloseBtn: { padding: 6 },
  modalImage: { width: '95%', height: '70%', borderRadius: 12 },
});
