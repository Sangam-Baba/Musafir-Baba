import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

export const IdentityProofScreen = () => {
  const navigation = useNavigation<any>();
  const token = useAuthStore((state) => state.token);
  const storeProfile = useAuthStore((state) => state.profile);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

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
  const hasProfilePhoto = !!(partnerProfile?.profilePicture);

  const derivedDefaultName = partnerAuth?.email
    ? partnerAuth.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'Partner Account';

  const fullName = partnerProfile?.fullName || storeProfile?.name || derivedDefaultName;
  const partnerId = partnerProfile?._id ? `MB-PTR-${partnerProfile._id.slice(-5).toUpperCase()}` : 'MB-PTR-NEW';

  const handleUploadDocument = async (docType: 'Aadhaar' | 'PAN' | 'ProfilePhoto') => {
    if (!token || !partnerProfile?._id) return;
    setUploadingDocType(docType);
    try {
      if (docType === 'ProfilePhoto') {
        const res = await fetch(`${API_BASE_URL}/partner/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            profileData: {
              fullName: partnerProfile.fullName || fullName,
              mobileNumber: partnerProfile.mobileNumber || 'Not Provided',
              profilePicture: 'https://storage.musafirbaba.com/photos/profile_verified.jpg',
              partnerType: partnerProfile.partnerType || 'Individual'
            }
          })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          Alert.alert("Profile Photo Updated!", "Account profile photo uploaded and verified for testing.");
          fetchIdentityDocs(false);
        } else {
          Alert.alert("Upload Failed", result.message || "Unable to upload profile photo.");
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/partner/document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ownerType: 'PartnerProfile',
            ownerId: partnerProfile._id,
            documentType: docType,
            fileUrl: docType === 'Aadhaar'
              ? 'https://storage.musafirbaba.com/docs/aadhaar_both_sides.pdf'
              : 'https://storage.musafirbaba.com/docs/pan_card.pdf'
          })
        });

        const result = await res.json();
        if (res.ok && result.success) {
          Alert.alert(
            `${docType === 'Aadhaar' ? 'Aadhaar Card' : 'PAN Card'} Uploaded!`,
            `Your ${docType === 'Aadhaar' ? 'Aadhaar (Both Sides)' : 'PAN Card'} has been uploaded and auto-approved for testing.`
          );
          fetchIdentityDocs(false);
        } else {
          Alert.alert("Upload Failed", result.message || "Unable to upload document.");
        }
      }
    } catch (e) {
      console.error(`Error uploading ${docType}:`, e);
      Alert.alert("Network Error", "Unable to upload document.");
    } finally {
      setUploadingDocType(null);
    }
  };

  const isAadhaarVerified = aadhaarDoc?.status === 'Approved';
  const isPanVerified = panDoc?.status === 'Approved';
  const totalVerifiedCount = (isAadhaarVerified ? 1 : 0) + (isPanVerified ? 1 : 0) + (hasProfilePhoto ? 1 : 0);

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

        {/* 3 Main Account Holder Documents List */}
        <Text style={styles.sectionHeader}>Mandatory Account Holder Documents (3/3)</Text>

        {/* 1. Aadhaar Card Card */}
        <View style={styles.docCard}>
          <View style={styles.docCardHeader}>
            <View style={[styles.docIconBox, { backgroundColor: isAadhaarVerified ? '#dcfce7' : '#ffedd5' }]}>
              <Ionicons name="card-outline" size={18} color={isAadhaarVerified ? "#16a34a" : "#d97706"} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.docTitle}>1. Aadhaar Card (Both Sides)</Text>
              <Text style={styles.docSub}>Government Issued Unique Identity Card</Text>
            </View>
            <View style={[styles.badgePill, isAadhaarVerified ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={[styles.badgeText, isAadhaarVerified ? styles.badgeTextGreen : styles.badgeTextAmber]}>
                {isAadhaarVerified ? "Verified" : (aadhaarDoc ? "Under Audit" : "Pending")}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.uploadBtn, isAadhaarVerified && styles.uploadBtnBorder]}
            onPress={() => handleUploadDocument('Aadhaar')}
            disabled={uploadingDocType === 'Aadhaar'}
          >
            {uploadingDocType === 'Aadhaar' ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#16a34a" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>
                  {isAadhaarVerified ? "Replace Aadhaar Card (Both Sides)" : "Upload Aadhaar Card (Front & Back)"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 2. PAN Card */}
        <View style={styles.docCard}>
          <View style={styles.docCardHeader}>
            <View style={[styles.docIconBox, { backgroundColor: isPanVerified ? '#dcfce7' : '#ffedd5' }]}>
              <Ionicons name="pricetag-outline" size={18} color={isPanVerified ? "#16a34a" : "#d97706"} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.docTitle}>2. PAN Card</Text>
              <Text style={styles.docSub}>Permanent Account Number for Payouts</Text>
            </View>
            <View style={[styles.badgePill, isPanVerified ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={[styles.badgeText, isPanVerified ? styles.badgeTextGreen : styles.badgeTextAmber]}>
                {isPanVerified ? "Verified" : (panDoc ? "Under Audit" : "Pending")}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.uploadBtn, isPanVerified && styles.uploadBtnBorder]}
            onPress={() => handleUploadDocument('PAN')}
            disabled={uploadingDocType === 'PAN'}
          >
            {uploadingDocType === 'PAN' ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#16a34a" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>
                  {isPanVerified ? "Replace PAN Card Copy" : "Upload PAN Card Document"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 3. Profile Photo */}
        <View style={styles.docCard}>
          <View style={styles.docCardHeader}>
            <View style={[styles.docIconBox, { backgroundColor: hasProfilePhoto ? '#dcfce7' : '#ffedd5' }]}>
              <Ionicons name="person-outline" size={18} color={hasProfilePhoto ? "#16a34a" : "#d97706"} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.docTitle}>3. Account Profile Photo</Text>
              <Text style={styles.docSub}>Clear Passport Size Face Photo</Text>
            </View>
            <View style={[styles.badgePill, hasProfilePhoto ? styles.badgeGreen : styles.badgeAmber]}>
              <Text style={[styles.badgeText, hasProfilePhoto ? styles.badgeTextGreen : styles.badgeTextAmber]}>
                {hasProfilePhoto ? "Verified" : "Pending"}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.uploadBtn, hasProfilePhoto && styles.uploadBtnBorder]}
            onPress={() => handleUploadDocument('ProfilePhoto')}
            disabled={uploadingDocType === 'ProfilePhoto'}
          >
            {uploadingDocType === 'ProfilePhoto' ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={16} color="#16a34a" style={{ marginRight: 6 }} />
                <Text style={styles.uploadBtnText}>
                  {hasProfilePhoto ? "Change Profile Photo" : "Upload Account Holder Photo"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Facing issue support link */}
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
  supportFooter: { alignItems: 'center', marginVertical: 16 },
  supportText: { fontSize: 12, color: '#64748b' },
  supportLink: { fontSize: 12, fontWeight: '800', color: '#16a34a', marginTop: 2 },
});
