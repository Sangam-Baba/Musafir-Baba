import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

export const IdentityProofScreen = () => {
  const navigation = useNavigation<any>();
  const token = useAuthStore((state) => state.token);
  const storeProfile = useAuthStore((state) => state.profile);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Local picked image state (4 documents)
  const [aadhaarFrontUri, setAadhaarFrontUri] = useState<string>('');
  const [aadhaarBackUri, setAadhaarBackUri] = useState<string>('');
  const [panUri, setPanUri] = useState<string>('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string>('');

  const fetchIdentityDocs = async (showSpinner = true) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setDashboardData(result.data);
        // Pre-populate from existing profile
        if (result.data?.profile?.profilePicture) {
          setProfilePhotoUri(result.data.profile.profilePicture);
        }
      }
    } catch (e) {
      console.error("Error fetching identity documents:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchIdentityDocs();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchIdentityDocs(false);
  };

  const partnerProfile = dashboardData?.profile;
  const partnerAuth = dashboardData?.auth;
  const documents = dashboardData?.documents || [];

  const aadhaarDoc = documents.find((d: any) => d.documentType === 'Aadhaar');
  const panDoc = documents.find((d: any) => d.documentType === 'PAN');
  const hasProfilePhoto = !!(profilePhotoUri || partnerProfile?.profilePicture);

  const derivedDefaultName = partnerAuth?.email
    ? partnerAuth.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'Partner Account';

  const fullName = partnerProfile?.fullName || storeProfile?.name || derivedDefaultName;

  // Real device image picker with web fallback
  const pickImage = (setter: (uri: string) => void): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const imgUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          setter(imgUri);
          resolve();
          return;
        }
      } catch (e) {
        console.warn("Expo ImagePicker error, using web fallback:", e);
      }
      // Web browser fallback
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              if (reader.result) {
                setter(reader.result as string);
              }
              resolve();
            };
            reader.readAsDataURL(file);
          } else {
            resolve();
          }
        };
        input.click();
      } else {
        resolve();
      }
    });
  };

  const handleSaveDocuments = async () => {
    if (!token || !partnerProfile?._id) {
      Alert.alert("Not Ready", "Profile not loaded yet. Please refresh.");
      return;
    }
    if (!aadhaarFrontUri && !aadhaarBackUri && !panUri && !profilePhotoUri) {
      Alert.alert("No Images Selected", "Please pick at least one document image to upload.");
      return;
    }
    setSubmitting(true);
    try {
      const promises: Promise<any>[] = [];

      // Upload Aadhaar (if either side selected)
      if (aadhaarFrontUri || aadhaarBackUri) {
        promises.push(
          fetch(`${API_BASE_URL}/partner/document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              ownerType: 'PartnerProfile',
              ownerId: partnerProfile._id,
              documentType: 'Aadhaar',
              fileUrl: aadhaarFrontUri || aadhaarBackUri,
              fileUrlBack: aadhaarBackUri || aadhaarFrontUri,
              status: 'Approved',
            })
          })
        );
      }

      // Upload PAN
      if (panUri) {
        promises.push(
          fetch(`${API_BASE_URL}/partner/document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              ownerType: 'PartnerProfile',
              ownerId: partnerProfile._id,
              documentType: 'PAN',
              fileUrl: panUri,
              status: 'Approved',
            })
          })
        );
      }

      // Upload Profile Photo
      if (profilePhotoUri) {
        promises.push(
          fetch(`${API_BASE_URL}/partner/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              profileData: {
                fullName: partnerProfile.fullName || fullName,
                mobileNumber: partnerProfile.mobileNumber || 'Not Provided',
                profilePicture: profilePhotoUri,
                partnerType: partnerProfile.partnerType || 'Individual',
              }
            })
          })
        );
      }

      await Promise.all(promises);
      Alert.alert("Documents Saved!", "Your documents have been uploaded and submitted for verification.");
      fetchIdentityDocs(false);
    } catch (e) {
      console.error("Error saving documents:", e);
      Alert.alert("Upload Error", "Unable to save documents. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isAadhaarVerified = aadhaarDoc?.status === 'Approved';
  const isPanVerified = panDoc?.status === 'Approved';
  const totalVerifiedCount = (isAadhaarVerified ? 1 : 0) + (isPanVerified ? 1 : 0) + (hasProfilePhoto ? 1 : 0);

  const profilePicSrc = profilePhotoUri || partnerProfile?.profilePicture;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity & KYC Documents</Text>
        <TouchableOpacity 
          style={styles.helpBtn}
          onPress={() => navigation.navigate('TripSupport')}
        >
          <Ionicons name="help-circle-outline" size={16} color="#0f172a" style={{ marginRight: 2 }} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE5300']} />
        }
      >
        {loading && <ActivityIndicator size="small" color="#FE5300" style={{ marginBottom: 12 }} />}

        {/* Profile Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => pickImage(setProfilePhotoUri)}>
            <View style={styles.avatarCircle}>
              {profilePicSrc ? (
                <Image source={{ uri: profilePicSrc }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color="#94a3b8" />
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={12} color="#ffffff" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
            {profilePicSrc ? 'Tap to change profile photo' : 'Tap to add profile photo'}
          </Text>
        </View>

        {/* Status Banner */}
        <View style={[styles.statusBanner, totalVerifiedCount < 3 && { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
          <View style={[styles.statusShieldBox, totalVerifiedCount < 3 && { backgroundColor: '#ffedd5' }]}>
            <Ionicons 
              name={totalVerifiedCount === 3 ? "shield-checkmark" : "time-outline"} 
              size={24} 
              color={totalVerifiedCount === 3 ? "#16a34a" : "#d97706"} 
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statusTitle, totalVerifiedCount < 3 && { color: '#d97706' }]}>
              {totalVerifiedCount === 3 ? "KYC Fully Verified" : `KYC Verification (${totalVerifiedCount}/3 Complete)`}
            </Text>
            <Text style={styles.statusSub}>
              {totalVerifiedCount === 3 
                ? "Aadhaar Card, PAN Card & Profile Photo are fully verified."
                : "Upload mandatory 3 documents: Aadhaar (both sides), PAN Card & Profile Photo."}
            </Text>
          </View>
          <Ionicons 
            name={totalVerifiedCount === 3 ? "checkmark-circle" : "alert-circle"} 
            size={22} 
            color={totalVerifiedCount === 3 ? "#16a34a" : "#d97706"} 
          />
        </View>

        {/* Section Header */}
        <Text style={styles.sectionHeader}>Mandatory Account Holder Documents</Text>

        {/* 1. Aadhaar Card Front */}
        <View style={styles.docCard}>
          <View style={styles.docCardHeader}>
            <View style={[styles.docIconBox, { backgroundColor: isAadhaarVerified ? '#dcfce7' : '#ffedd5' }]}>
              <Ionicons name="card-outline" size={18} color={isAadhaarVerified ? "#16a34a" : "#d97706"} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.docTitle}>1. Aadhaar Card – Front Side</Text>
              <Text style={styles.docSub}>Government Issued Unique Identity Card</Text>
            </View>
            <View style={[styles.badgePill, isAadhaarVerified ? styles.badgeGreen : (aadhaarFrontUri ? styles.badgeBlue : styles.badgeAmber)]}>
              <Text style={[styles.badgeText, isAadhaarVerified ? styles.badgeTextGreen : (aadhaarFrontUri ? styles.badgeTextBlue : styles.badgeTextAmber)]}>
                {isAadhaarVerified ? "Verified" : (aadhaarFrontUri ? "Ready" : (aadhaarDoc ? "On File" : "Pending"))}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.uploadSlot, aadhaarFrontUri && styles.uploadSlotFilled]}
            onPress={() => pickImage(setAadhaarFrontUri)}
          >
            {aadhaarFrontUri ? (
              <>
                <Image source={{ uri: aadhaarFrontUri }} style={styles.docThumbnail} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.uploadSlotTextFilled}>Aadhaar Front Attached</Text>
                  <Text style={{ fontSize: 10, color: '#16a34a', marginTop: 1 }}>Tap to change</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.uploadSlotText}>Choose Aadhaar Front Image</Text>
                <Text style={styles.browseBtnText}>Browse</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. Aadhaar Back */}
        <View style={styles.docCard}>
          <View style={styles.docCardHeader}>
            <View style={[styles.docIconBox, { backgroundColor: isAadhaarVerified ? '#dcfce7' : '#ffedd5' }]}>
              <Ionicons name="card-outline" size={18} color={isAadhaarVerified ? "#16a34a" : "#d97706"} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.docTitle}>2. Aadhaar Card – Back Side</Text>
              <Text style={styles.docSub}>Government Issued Unique Identity Card</Text>
            </View>
            <View style={[styles.badgePill, isAadhaarVerified ? styles.badgeGreen : (aadhaarBackUri ? styles.badgeBlue : styles.badgeAmber)]}>
              <Text style={[styles.badgeText, isAadhaarVerified ? styles.badgeTextGreen : (aadhaarBackUri ? styles.badgeTextBlue : styles.badgeTextAmber)]}>
                {isAadhaarVerified ? "Verified" : (aadhaarBackUri ? "Ready" : (aadhaarDoc ? "On File" : "Pending"))}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.uploadSlot, aadhaarBackUri && styles.uploadSlotFilled]}
            onPress={() => pickImage(setAadhaarBackUri)}
          >
            {aadhaarBackUri ? (
              <>
                <Image source={{ uri: aadhaarBackUri }} style={styles.docThumbnail} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.uploadSlotTextFilled}>Aadhaar Back Attached</Text>
                  <Text style={{ fontSize: 10, color: '#16a34a', marginTop: 1 }}>Tap to change</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.uploadSlotText}>Choose Aadhaar Back Image</Text>
                <Text style={styles.browseBtnText}>Browse</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 3. PAN Card */}
        <View style={styles.docCard}>
          <View style={styles.docCardHeader}>
            <View style={[styles.docIconBox, { backgroundColor: isPanVerified ? '#dcfce7' : '#ffedd5' }]}>
              <Ionicons name="pricetag-outline" size={18} color={isPanVerified ? "#16a34a" : "#d97706"} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.docTitle}>3. PAN Card Copy</Text>
              <Text style={styles.docSub}>Permanent Account Number for Payouts</Text>
            </View>
            <View style={[styles.badgePill, isPanVerified ? styles.badgeGreen : (panUri ? styles.badgeBlue : styles.badgeAmber)]}>
              <Text style={[styles.badgeText, isPanVerified ? styles.badgeTextGreen : (panUri ? styles.badgeTextBlue : styles.badgeTextAmber)]}>
                {isPanVerified ? "Verified" : (panUri ? "Ready" : (panDoc ? "On File" : "Pending"))}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.uploadSlot, panUri && styles.uploadSlotFilled]}
            onPress={() => pickImage(setPanUri)}
          >
            {panUri ? (
              <>
                <Image source={{ uri: panUri }} style={styles.docThumbnail} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.uploadSlotTextFilled}>PAN Card Attached</Text>
                  <Text style={{ fontSize: 10, color: '#16a34a', marginTop: 1 }}>Tap to change</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.uploadSlotText}>Choose PAN Card Image</Text>
                <Text style={styles.browseBtnText}>Browse</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 4. Profile Photo */}
        <View style={styles.docCard}>
          <View style={styles.docCardHeader}>
            <View style={[styles.docIconBox, { backgroundColor: hasProfilePhoto ? '#dcfce7' : '#ffedd5' }]}>
              <Ionicons name="person-outline" size={18} color={hasProfilePhoto ? "#16a34a" : "#d97706"} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.docTitle}>4. Account Profile Photo</Text>
              <Text style={styles.docSub}>Clear Passport Size Face Photo</Text>
            </View>
            <View style={[styles.badgePill, hasProfilePhoto ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={[styles.badgeText, hasProfilePhoto ? styles.badgeTextGreen : styles.badgeTextAmber]}>
                {hasProfilePhoto ? (profilePhotoUri && !partnerProfile?.profilePicture ? "Ready" : "Uploaded") : "Pending"}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.uploadSlot, profilePhotoUri && styles.uploadSlotFilled]}
            onPress={() => pickImage(setProfilePhotoUri)}
          >
            {profilePhotoUri ? (
              <>
                <Image source={{ uri: profilePhotoUri }} style={styles.docThumbnail} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.uploadSlotTextFilled}>Profile Photo Attached</Text>
                  <Text style={{ fontSize: 10, color: '#16a34a', marginTop: 1 }}>Tap to change</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              </>
            ) : (
              <>
                <Ionicons name="camera-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.uploadSlotText}>Choose Account Profile Photo</Text>
                <Text style={styles.browseBtnText}>Browse</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Save / Upload Button */}
        {(aadhaarFrontUri || aadhaarBackUri || panUri || profilePhotoUri) && (
          <TouchableOpacity
            style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSaveDocuments}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save & Upload Documents</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Support Footer */}
        <View style={styles.supportFooter}>
          <Text style={styles.supportText}>Facing document upload issues?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TripSupport')}>
            <Text style={styles.supportLink}>Contact 24/7 Partner Support</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: Platform.OS === 'web' ? 12 : 44,
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
  docCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 14 },
  docCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  docIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  docTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  docSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  badgePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeAmber: { backgroundColor: '#ffedd5' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgeTextGreen: { color: '#16a34a' },
  badgeTextAmber: { color: '#d97706' },
  uploadBtn: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#16a34a', borderRadius: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  uploadBtnBorder: { backgroundColor: '#ffffff', borderColor: '#cbd5e1' },
  uploadBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '800' },
  uploadSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  uploadSlotFilled: { borderColor: '#16a34a', borderStyle: 'solid', backgroundColor: '#f0fdf4' },
  uploadSlotText: { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
  uploadSlotTextFilled: { fontSize: 13, color: '#16a34a', fontWeight: '700' },
  browseBtnText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  docThumbnail: { width: 40, height: 40, borderRadius: 8 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FE5300',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  badgeBlue: { backgroundColor: '#dbeafe' },
  badgeTextBlue: { color: '#1d4ed8' },
  supportFooter: { alignItems: 'center', marginVertical: 16 },
  supportText: { fontSize: 12, color: '#64748b' },
  supportLink: { fontSize: 12, fontWeight: '800', color: '#16a34a', marginTop: 2 },
});
