import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';

export const IdentityProofScreen = () => {
  const navigation = useNavigation<any>();
  const profile = useAuthStore((state) => state.profile);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Proof</Text>
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
            <Text style={styles.statusSub}>Your identity proof has been verified on 18 May 2025</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
        </View>

        {/* Document Details Card */}
        <Text style={styles.sectionHeader}>Document Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="card-outline" size={14} color="#16a34a" />
            </View>
            <Text style={styles.detailLabel}>Document Type</Text>
            <Text style={styles.detailVal}>Aadhaar Card</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="person-outline" size={14} color="#7c3aed" />
            </View>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailVal}>{profile?.name || 'Ashutosh Kumar'}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="calendar-outline" size={14} color="#0284c7" />
            </View>
            <Text style={styles.detailLabel}>Date of Birth</Text>
            <Text style={styles.detailVal}>30 Apr 1997</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIconBox, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="pricetag-outline" size={14} color="#d97706" />
            </View>
            <Text style={styles.detailLabel}>Aadhaar Number</Text>
            <Text style={styles.detailVal}>xxxx xxxx 1234</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.detailIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#0284c7" />
            </View>
            <Text style={styles.detailLabel}>Date of Verification</Text>
            <Text style={styles.detailVal}>18 May 2025</Text>
          </View>
        </View>

        {/* Uploaded Document Card */}
        <Text style={styles.sectionHeader}>Uploaded Document</Text>
        <View style={styles.uploadedDocCard}>
          <View style={styles.aadhaarCardGraphic}>
            <View style={styles.aadhaarHeaderRow}>
              <Ionicons name="flag-outline" size={16} color="#d97706" />
              <Text style={styles.govtTitle}>GOVERNMENT OF INDIA</Text>
            </View>

            <View style={styles.aadhaarContentRow}>
              <View style={styles.aadhaarPhotoCircle}>
                <Ionicons name="person" size={32} color="#16a34a" />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.aadhaarName}>Ashutosh Kumar</Text>
                <Text style={styles.aadhaarDob}>DOB: 30/04/1997 / Male</Text>
                <Text style={styles.aadhaarNum}>XXXX XXXX 1234</Text>
              </View>

              <Ionicons name="qr-code" size={32} color="#0f172a" />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.fullscreenBtn}
            onPress={() => Alert.alert("Document View", "Viewing Aadhaar Card in full screen mode.")}
          >
            <Ionicons name="scan-outline" size={18} color="#16a34a" />
            <Text style={styles.fullscreenText}>View Fullscreen</Text>
          </TouchableOpacity>
        </View>

        {/* Guidelines Card */}
        <View style={styles.guidelinesCard}>
          <Text style={styles.guideCardTitle}>Guidelines</Text>

          {[
            "Document should be original and valid",
            "All details must be clearly visible",
            "Accepted formats: JPG, PNG, PDF",
            "Maximum file size: 5MB",
          ].map((item, idx) => (
            <View key={idx} style={styles.guideItemRow}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" style={{ marginRight: 8 }} />
              <Text style={styles.guideItemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Facing issue support link */}
        <View style={styles.supportFooter}>
          <Text style={styles.supportText}>Facing an issue?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TripSupport')}>
            <Text style={styles.supportLink}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Re-upload Action Button */}
        <TouchableOpacity 
          style={styles.reuploadBtn}
          onPress={() => Alert.alert("Re-upload", "Please select a new original copy of your identity proof.")}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
          <Text style={styles.reuploadBtnText}>Re-upload Document</Text>
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
    marginBottom: 20,
  },
  statusShieldBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '800', color: '#16a34a' },
  statusSub: { fontSize: 11, color: '#475569', marginTop: 1 },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10, marginLeft: 4 },
  detailsCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  detailIconBox: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  detailLabel: { fontSize: 12, color: '#64748b', flex: 1 },
  detailVal: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  uploadedDocCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  aadhaarCardGraphic: { width: '100%', backgroundColor: '#fffbebfb', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fef3c7', marginBottom: 12 },
  aadhaarHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  govtTitle: { fontSize: 10, fontWeight: '900', color: '#d97706', marginLeft: 4, letterSpacing: 0.5 },
  aadhaarContentRow: { flexDirection: 'row', alignItems: 'center' },
  aadhaarPhotoCircle: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  aadhaarName: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
  aadhaarDob: { fontSize: 10, color: '#64748b', marginTop: 1 },
  aadhaarNum: { fontSize: 11, fontWeight: '800', color: '#0f172a', marginTop: 3 },
  fullscreenBtn: { flexDirection: 'row', alignItems: 'center' },
  fullscreenText: { fontSize: 11, fontWeight: '700', color: '#16a34a', marginLeft: 4 },
  guidelinesCard: { backgroundColor: '#f4fbf7', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#dcfce7', marginBottom: 20 },
  guideCardTitle: { fontSize: 13, fontWeight: '800', color: '#16a34a', marginBottom: 12 },
  guideItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  guideItemText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  supportFooter: { alignItems: 'center', marginVertical: 12 },
  supportText: { fontSize: 12, color: '#64748b' },
  supportLink: { fontSize: 12, fontWeight: '800', color: '#16a34a', marginTop: 2 },
  reuploadBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#16a34a', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  reuploadBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '800' },
});
