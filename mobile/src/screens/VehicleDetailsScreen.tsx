import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

export const VehicleDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const vehicleId = route.params?.vehicleId || 'veh-1';
  const regNo = route.params?.regNo || 'DL01AB1234';
  const modelName = route.params?.model || 'Toyota Innova Crysta';
  const vehicleCategory = route.params?.type || 'SUV';

  const vehicleDocs = [
    {
      title: 'Insurance Certificate',
      subtitle: 'Bajaj Allianz General Insurance',
      policyNo: 'Policy No: OG-19-87654321',
      validity: 'Valid Till: 18 May 2026',
      icon: 'shield-checkmark-outline',
      iconBg: '#f3e8ff',
      iconColor: '#7c3aed',
    },
    {
      title: 'PUC Certificate',
      subtitle: 'Certificate No: UP14GT5678',
      validity: 'Valid Till: 10 Jun 2025',
      icon: 'leaf-outline',
      iconBg: '#fff7ed',
      iconColor: '#d97706',
    },
    {
      title: 'RC Certificate (Registration)',
      subtitle: `RC No: ${regNo}`,
      validity: 'Issued On: 20 Jun 2019',
      icon: 'car-outline',
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <TouchableOpacity 
          style={styles.helpBtn}
          onPress={() => navigation.navigate('TripSupport')}
        >
          <Ionicons name="help-circle-outline" size={16} color="#0f172a" style={{ marginRight: 2 }} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusShieldBox}>
            <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.statusTitle}>Verified</Text>
            <Text style={styles.statusSub}>Your vehicle details have been verified on 18 May 2025</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
        </View>

        {/* Vehicle Header Card */}
        <View style={styles.vehicleHeaderCard}>
          <View style={styles.carImgBox}>
            <Ionicons name="car-sport" size={54} color="#FE5300" />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.regNumberText}>{regNo}</Text>
              <View style={styles.verifiedTag}>
                <Text style={styles.verifiedTagText}>Verified </Text>
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
              </View>
            </View>

            <Text style={styles.vehicleModelText}>{modelName}</Text>
            <Text style={styles.vehicleSpecsText}>White • 2019 • Diesel</Text>
            <View style={styles.commercialPill}>
              <Text style={styles.commercialPillText}>{vehicleCategory} • Commercial</Text>
            </View>
          </View>
        </View>

        {/* Vehicle Information List */}
        <Text style={styles.sectionHeader}>Vehicle Information</Text>
        <View style={styles.infoCard}>
          {[
            { label: 'Registration Number', val: regNo, icon: 'card-outline', iconBg: '#dcfce7' },
            { label: 'Vehicle Model', val: modelName, icon: 'car-outline', iconBg: '#dcfce7' },
            { label: 'Year of Manufacture', val: '2019', icon: 'calendar-outline', iconBg: '#dcfce7' },
            { label: 'Fuel Type', val: 'Diesel', icon: 'flame-outline', iconBg: '#dcfce7' },
            { label: 'Seating Capacity', val: vehicleCategory === 'SUV' ? '7 Seater' : '5 Seater', icon: 'people-outline', iconBg: '#dcfce7' },
            { label: 'Vehicle Type', val: 'Commercial', icon: 'bus-outline', iconBg: '#dcfce7' },
            { label: 'Registration Date', val: '20 Jun 2019', icon: 'calendar-number-outline', iconBg: '#dcfce7' },
          ].map((item, idx, arr) => (
            <View key={idx} style={[styles.infoRow, idx < arr.length - 1 && styles.infoRowBorder]}>
              <View style={[styles.infoIconBox, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon as any} size={14} color="#16a34a" />
              </View>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoVal}>{item.val}</Text>
            </View>
          ))}
        </View>

        {/* Documents Section */}
        <Text style={styles.sectionHeader}>Documents</Text>
        <View style={styles.docsList}>
          {vehicleDocs.map((doc, idx) => (
            <View key={idx} style={styles.docCard}>
              <View style={[styles.docIconBox, { backgroundColor: doc.iconBg }]}>
                <Ionicons name={doc.icon as any} size={20} color={doc.iconColor} />
              </View>

              <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  <View style={styles.verifiedGreenTag}>
                    <Text style={styles.verifiedGreenTagText}>Verified </Text>
                    <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                  </View>
                </View>
                <Text style={styles.docSub}>{doc.subtitle}</Text>
                {doc.policyNo && <Text style={styles.docMeta}>{doc.policyNo}</Text>}
                <Text style={styles.docValidText}>{doc.validity}</Text>
              </View>

              <TouchableOpacity 
                style={styles.viewDocBtn}
                onPress={() => Alert.alert(doc.title, `Viewing ${doc.title} details`)}
              >
                <Ionicons name="eye-outline" size={14} color="#16a34a" style={{ marginRight: 4 }} />
                <Text style={styles.viewDocBtnText}>View</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Guidelines Card */}
        <View style={styles.guidelinesCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="information-circle-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
            <Text style={styles.guideCardTitle}>Guidelines</Text>
          </View>

          {[
            "Ensure all documents are original and valid",
            "All details must match with the vehicle",
            "Accepted formats: JPG, PNG, PDF",
            "Maximum file size: 5MB per document",
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
          onPress={() => Alert.alert("Update Vehicle", "Navigate to update vehicle details form.")}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
          <Text style={styles.updateVehicleBtnText}>Update Vehicle Details</Text>
        </TouchableOpacity>
      </ScrollView>
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
  statusBanner: {
    backgroundColor: '#f4fbf7',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcfce7',
    marginBottom: 16,
  },
  statusShieldBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '800', color: '#16a34a' },
  statusSub: { fontSize: 11, color: '#475569', marginTop: 1 },
  vehicleHeaderCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  carImgBox: { width: 90, height: 75, borderRadius: 14, backgroundColor: '#fff7ed', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ffedd5' },
  regNumberText: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedTagText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  vehicleModelText: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 2 },
  vehicleSpecsText: { fontSize: 11, color: '#64748b', marginTop: 1 },
  commercialPill: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  commercialPillText: { fontSize: 10, fontWeight: '800', color: '#2563eb' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10, marginLeft: 4 },
  infoCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoIconBox: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  infoLabel: { fontSize: 12, color: '#64748b', flex: 1 },
  infoVal: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  docsList: { marginBottom: 20 },
  docCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 10 },
  docIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  docTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  docSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  docMeta: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  docValidText: { fontSize: 10, fontWeight: '800', color: '#16a34a', marginTop: 2 },
  verifiedGreenTag: { flexDirection: 'row', alignItems: 'center' },
  verifiedGreenTagText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  viewDocBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  viewDocBtnText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  guidelinesCard: { backgroundColor: '#f4fbf7', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#dcfce7', marginBottom: 20 },
  guideCardTitle: { fontSize: 13, fontWeight: '800', color: '#16a34a' },
  guideItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  guideItemText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  updateVehicleBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#16a34a', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  updateVehicleBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '800' },
});
