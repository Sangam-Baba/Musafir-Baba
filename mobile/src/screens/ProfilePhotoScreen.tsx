import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';

export const ProfilePhotoScreen = () => {
  const navigation = useNavigation<any>();
  const profile = useAuthStore((state) => state.profile);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Photo</Text>
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
            <Text style={styles.statusSub}>Your profile photo has been verified on 18 May 2025</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
        </View>

        {/* Photo Preview Section */}
        <Text style={styles.sectionHeader}>Photo Preview</Text>
        <View style={styles.previewCard}>
          <View style={styles.portraitBox}>
            <Ionicons name="person" size={64} color="#16a34a" />
          </View>

          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="person-outline" size={14} color="#16a34a" />
              </View>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailVal}>{profile?.name || 'Ashutosh Kumar'}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="calendar-outline" size={14} color="#7c3aed" />
              </View>
              <Text style={styles.detailLabel}>Date of Verification</Text>
              <Text style={styles.detailVal}>18 May 2025</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#0284c7" />
              </View>
              <Text style={styles.detailLabel}>Photo Status</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.detailVal, { color: '#16a34a' }]}>Verified </Text>
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="time-outline" size={14} color="#d97706" />
              </View>
              <Text style={styles.detailLabel}>Last Updated On</Text>
              <Text style={styles.detailVal}>18 May 2025</Text>
            </View>
          </View>
        </View>

        {/* Photo Guidelines Card */}
        <View style={styles.guidelinesCard}>
          <Text style={styles.guideCardTitle}>Photo Guidelines</Text>

          {[
            "Use a recent photo",
            "Your face should be clearly visible",
            "Look straight into the camera",
            "No sunglasses, hat or mask",
            "Use a plain light background",
            "Accepted formats: JPG, PNG",
            "Maximum file size: 5MB",
          ].map((item, idx) => (
            <View key={idx} style={styles.guideItemRow}>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" style={{ marginRight: 8 }} />
              <Text style={styles.guideItemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Uploaded Photo Preview Box */}
        <Text style={styles.sectionHeader}>Uploaded Photo</Text>
        <View style={styles.uploadedCard}>
          <View style={styles.uploadedLeft}>
            <View style={styles.smallThumbBox}>
              <Ionicons name="person" size={24} color="#16a34a" />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.fileNameText}>profile_photo.jpg</Text>
              <Text style={styles.fileSubText}>Uploaded on 18 May 2025</Text>
              <View style={styles.verifiedGreenPill}>
                <Text style={styles.verifiedGreenPillText}>Verified</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => Alert.alert("Fullscreen", "Viewing profile_photo.jpg in fullscreen mode.")}
            style={styles.fullscreenBtn}
          >
            <Ionicons name="scan-outline" size={18} color="#16a34a" />
            <Text style={styles.fullscreenText}>View Fullscreen</Text>
          </TouchableOpacity>
        </View>

        {/* Facing issue support link */}
        <View style={styles.supportFooter}>
          <Text style={styles.supportText}>Facing an issue?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TripSupport')}>
            <Text style={styles.supportLink}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Update Action Button */}
        <TouchableOpacity 
          style={styles.updateBtn}
          onPress={() => Alert.alert("Update Photo", "Select a new profile selfie to submit for verification.")}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
          <Text style={styles.updateBtnText}>Update Profile Photo</Text>
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
  previewCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  portraitBox: { width: 100, height: 110, borderRadius: 16, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  detailsList: { flex: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  detailIconBox: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  detailLabel: { fontSize: 11, color: '#64748b', flex: 1 },
  detailVal: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  guidelinesCard: { backgroundColor: '#f4fbf7', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#dcfce7', marginBottom: 20 },
  guideCardTitle: { fontSize: 13, fontWeight: '800', color: '#16a34a', marginBottom: 12 },
  guideItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  guideItemText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  uploadedCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  uploadedLeft: { flexDirection: 'row', alignItems: 'center' },
  smallThumbBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  fileNameText: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  fileSubText: { fontSize: 10, color: '#64748b', marginTop: 1 },
  verifiedGreenPill: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, alignSelf: 'flex-start', marginTop: 3 },
  verifiedGreenPillText: { fontSize: 9, fontWeight: '800', color: '#16a34a' },
  fullscreenBtn: { alignItems: 'center', padding: 6 },
  fullscreenText: { fontSize: 10, fontWeight: '700', color: '#16a34a', marginTop: 2 },
  supportFooter: { alignItems: 'center', marginVertical: 12 },
  supportText: { fontSize: 12, color: '#64748b' },
  supportLink: { fontSize: 12, fontWeight: '800', color: '#16a34a', marginTop: 2 },
  updateBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#16a34a', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  updateBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '800' },
});
