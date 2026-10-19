import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';
import { Modal } from 'react-native';

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
  const isLocked = (!!partnerProfile?.isSubmittedForApproval && !['Hold', 'Rejected'].includes(partnerAuth?.status || '')) || partnerAuth?.status === 'Approved';
  const documents = dashboardData?.documents || [];

  const aadhaarDoc = documents.find((d: any) => d.documentType === 'Aadhaar');
  const aadhaarBackDoc = documents.find((d: any) => d.documentType === 'Aadhaar Back');
  const panDoc = documents.find((d: any) => d.documentType === 'PAN');

  const effectiveAadhaarFront = aadhaarFrontUri || aadhaarDoc?.fileUrl;
  const effectiveAadhaarBack = aadhaarBackUri || aadhaarBackDoc?.fileUrl || aadhaarDoc?.fileUrlBack;
  const effectivePan = panUri || panDoc?.fileUrl;
  const hasProfilePhoto = !!(profilePhotoUri || partnerProfile?.profilePicture);

  const derivedDefaultName = partnerAuth?.email
    ? partnerAuth.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'Partner Account';

  const fullName = partnerProfile?.fullName || storeProfile?.name || derivedDefaultName;

  // Real device image picker with web fallback
  const pickImage = (setter: (uri: string) => void): Promise<void> => {
    if (isLocked) {
      Alert.alert("Profile Locked", "Your account is under audit or approved. You cannot modify documents.");
      return Promise.resolve();
    }
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
    // Aadhaar needs both sides: the other side must be picked now or already on file.
    if ((aadhaarFrontUri || aadhaarBackUri) && !(effectiveAadhaarFront && effectiveAadhaarBack)) {
      Alert.alert("Both Sides Needed", "Please add both the front and back of your Aadhaar card.");
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
              fileUrl: effectiveAadhaarFront,
              fileUrlBack: effectiveAadhaarBack,
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

  // ---- Display-only helpers (no effect on data, uploads or navigation) ----
  const [previewUri, setPreviewUri] = useState<string>('');
  const fmtUploaded = (d?: string) =>
    d
      ? 'Uploaded on ' +
        new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
      : 'On file';
  const photoBadgeLabel = hasProfilePhoto ? (profilePhotoUri && !partnerProfile?.profilePicture ? "Ready" : "Added") : "Pending";
  const allKycDone = totalVerifiedCount === 3;
  // Ring segments (decorative): 0 → none, 1 → quarter, 2 → three quarters, 3 → full
  const ringQuarters = totalVerifiedCount >= 3 ? 4 : totalVerifiedCount === 2 ? 3 : totalVerifiedCount === 1 ? 1 : 0;
  const ringColor = allKycDone ? '#16a34a' : '#FE5300';

  const renderDocCard = (opts: {
    key: string;
    title: string;
    sub: string;
    icon: any;
    tint: { bg: string; fg: string };
    isVerified: boolean;
    effectiveUri?: string;
    pickedUri: string;
    setter: (uri: string) => void;
    uploadLabel: string;
    addedLabel: string;
    uploadedAt?: string;
  }) => {
    const badgeLabel = opts.isVerified ? "Verified" : (opts.pickedUri ? "Ready" : (opts.effectiveUri ? "On File" : "Pending"));
    const isPending = badgeLabel === 'Pending';
    return (
      <View key={opts.key} style={styles.kDocCard}>
        <View style={styles.docCardHeader}>
          <View style={[styles.kDocIcon, { backgroundColor: isPending ? '#fff1e8' : opts.tint.bg }]}>
            <Ionicons name={opts.icon} size={22} color={isPending ? '#FE5300' : opts.tint.fg} />
          </View>
          <View style={{ flex: 1, marginLeft: 12, marginRight: 6 }}>
            <Text style={styles.kDocTitle}>{opts.title}</Text>
            <Text style={styles.docSub}>{opts.sub}</Text>
          </View>
          <View style={[styles.kBadge, opts.isVerified ? styles.badgeGreen : (opts.effectiveUri ? styles.badgeBlue : styles.kBadgeOrange)]}>
            {!isPending && (
              <Ionicons
                name={opts.isVerified ? 'checkmark-circle' : 'cloud-done-outline'}
                size={12}
                color={opts.isVerified ? '#16a34a' : '#1d4ed8'}
                style={{ marginRight: 3 }}
              />
            )}
            <Text style={[styles.badgeText, opts.isVerified ? styles.badgeTextGreen : (opts.effectiveUri ? styles.badgeTextBlue : { color: '#c2410c' })]}>
              {badgeLabel}
            </Text>
          </View>
        </View>

        {opts.effectiveUri ? (
          <TouchableOpacity style={styles.kSlotFilled} onPress={() => pickImage(opts.setter)} activeOpacity={0.85}>
            <Image source={{ uri: opts.effectiveUri }} style={styles.kThumb} />
            <View style={{ flex: 1, marginLeft: 10, marginRight: 6 }}>
              <Text style={styles.uploadSlotTextFilled}>{opts.addedLabel}</Text>
              <Text style={styles.kSlotMeta}>
                {opts.pickedUri ? 'Selected · tap Save below to upload' : fmtUploaded(opts.uploadedAt)}
              </Text>
              {!isLocked && <Text style={styles.kSlotHint}>Tap to change</Text>}
            </View>
            <TouchableOpacity style={styles.kViewBtn} onPress={() => setPreviewUri(opts.effectiveUri || '')} activeOpacity={0.8}>
              <Text style={styles.kViewBtnText}>View</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.kSlotEmpty} onPress={() => pickImage(opts.setter)} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={22} color="#334155" style={{ marginRight: 10 }} />
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.kSlotTitle}>{opts.uploadLabel}</Text>
              <Text style={styles.kSlotMeta}>JPG or PNG image</Text>
            </View>
            <View style={styles.kBrowseBtn}>
              <Text style={styles.kBrowseBtnText}>Browse</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity & KYC Documents</Text>
        <TouchableOpacity 
          style={styles.helpBtn}
          onPress={() => navigation.navigate('TripSupport')}
        >
          <Ionicons name="help-circle-outline" size={18} color="#FE5300" style={{ marginRight: 3 }} />
          <Text style={[styles.helpText, { color: '#FE5300', fontSize: 13 }]}>Help</Text>
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

        {/* Profile Photo Card */}
        <View style={styles.kPhotoCard}>
          <TouchableOpacity onPress={() => pickImage(setProfilePhotoUri)} activeOpacity={0.85}>
            <View style={styles.kAvatar}>
              {profilePicSrc ? (
                <Image source={{ uri: profilePicSrc }} style={styles.kAvatarImg} />
              ) : (
                <Ionicons name="person" size={36} color="#94a3b8" />
              )}
            </View>
            <View style={styles.kAvatarBadge}>
              <Ionicons name="camera" size={12} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14, marginRight: 6 }}>
            <View style={styles.kPhotoTitleRow}>
              <Text style={styles.kPhotoTitle}>Profile Photo</Text>
              <View style={[styles.kBadge, hasProfilePhoto ? styles.badgeGreen : styles.kBadgeOrange, { marginLeft: 6 }]}>
                {hasProfilePhoto && <Ionicons name="checkmark-circle" size={12} color="#16a34a" style={{ marginRight: 3 }} />}
                <Text style={[styles.badgeText, hasProfilePhoto ? styles.badgeTextGreen : { color: '#c2410c' }]}>{photoBadgeLabel}</Text>
              </View>
            </View>
            <Text style={styles.kPhotoSub}>This photo will be visible to customers for identification.</Text>
          </View>
          <TouchableOpacity style={styles.kChangeBtn} onPress={() => pickImage(setProfilePhotoUri)} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={14} color="#FE5300" style={{ marginRight: 4 }} />
            <Text style={styles.kChangeBtnText}>{profilePicSrc ? 'Change' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {/* KYC Progress Card */}
        <View style={[styles.kProgressCard, allKycDone && { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
          <View style={styles.kRing}>
            <View
              style={[
                styles.kRingArc,
                {
                  borderTopColor: ringQuarters >= 1 ? ringColor : 'transparent',
                  borderRightColor: ringQuarters >= 2 ? ringColor : 'transparent',
                  borderBottomColor: ringQuarters >= 3 ? ringColor : 'transparent',
                  borderLeftColor: ringQuarters >= 4 ? ringColor : 'transparent',
                },
              ]}
            />
            <Text style={[styles.kRingText, allKycDone && { color: '#16a34a' }]}>{totalVerifiedCount}/3</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14, marginRight: 6 }}>
            <Text style={[styles.kProgressTitle, allKycDone && { color: '#16a34a' }]}>
              {allKycDone ? 'KYC Fully Verified' : 'KYC Verification In Progress'}
            </Text>
            <Text style={styles.kProgressSub}>
              {allKycDone
                ? 'Aadhaar Card, PAN Card & Profile Photo are fully verified.'
                : 'Upload mandatory documents: Aadhaar (both sides), PAN Card & Profile Photo.'}
            </Text>
          </View>
          <View style={[styles.kBadge, allKycDone ? styles.badgeGreen : styles.kBadgeOrange]}>
            <Ionicons
              name={allKycDone ? 'checkmark-circle' : 'hourglass-outline'}
              size={12}
              color={allKycDone ? '#16a34a' : '#c2410c'}
              style={{ marginRight: 3 }}
            />
            <Text style={[styles.badgeText, allKycDone ? styles.badgeTextGreen : { color: '#c2410c' }]}>
              {allKycDone ? 'Verified' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.kSectionRow}>
          <Text style={styles.kSectionTitle}>Mandatory Documents</Text>
          <View style={styles.kSafeRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" style={{ marginRight: 5 }} />
            <Text style={styles.kSafeText}>Your documents are safe{'\n'}and secure with us.</Text>
          </View>
        </View>

        {renderDocCard({
          key: 'aadhaar-front',
          title: '1. Aadhaar Card – Front Side',
          sub: 'Government Issued Unique Identity Card',
          icon: 'card-outline',
          tint: { bg: '#dcfce7', fg: '#16a34a' },
          isVerified: isAadhaarVerified,
          effectiveUri: effectiveAadhaarFront,
          pickedUri: aadhaarFrontUri,
          setter: setAadhaarFrontUri,
          uploadLabel: 'Upload Aadhaar Front Side',
          addedLabel: 'Aadhaar Front Side Added',
          uploadedAt: aadhaarDoc?.updatedAt || aadhaarDoc?.createdAt,
        })}

        {renderDocCard({
          key: 'aadhaar-back',
          title: '2. Aadhaar Card – Back Side',
          sub: 'Government Issued Unique Identity Card',
          icon: 'card-outline',
          tint: { bg: '#dcfce7', fg: '#16a34a' },
          isVerified: isAadhaarVerified,
          effectiveUri: effectiveAadhaarBack,
          pickedUri: aadhaarBackUri,
          setter: setAadhaarBackUri,
          uploadLabel: 'Upload Aadhaar Back Side',
          addedLabel: 'Aadhaar Back Side Added',
          uploadedAt: (aadhaarBackDoc || aadhaarDoc)?.updatedAt || (aadhaarBackDoc || aadhaarDoc)?.createdAt,
        })}

        {renderDocCard({
          key: 'pan',
          title: '3. PAN Card Copy',
          sub: 'Permanent Account Number for Payouts',
          icon: 'pricetag-outline',
          tint: { bg: '#e0f2fe', fg: '#2563eb' },
          isVerified: isPanVerified,
          effectiveUri: effectivePan,
          pickedUri: panUri,
          setter: setPanUri,
          uploadLabel: 'Upload PAN Card',
          addedLabel: 'PAN Card Added',
          uploadedAt: panDoc?.updatedAt || panDoc?.createdAt,
        })}

        {/* Save / Upload Button */}
        {(aadhaarFrontUri || aadhaarBackUri || panUri || profilePhotoUri) && (
          <TouchableOpacity
            style={[styles.saveBtn, styles.kSaveBtn, submitting && { opacity: 0.7 }]}
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
            <Text style={[styles.supportLink, { color: '#FE5300' }]}>Contact 24/7 Partner Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image preview (display only) */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri('')}>
        <TouchableOpacity style={styles.kPreviewBackdrop} activeOpacity={1} onPress={() => setPreviewUri('')}>
          {!!previewUri && <Image source={{ uri: previewUri }} style={styles.kPreviewImg} resizeMode="contain" />}
          <View style={styles.kPreviewClose}>
            <Ionicons name="close" size={22} color="#ffffff" />
          </View>
        </TouchableOpacity>
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
  // ---- Redesign styles ----
  kPhotoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff4ec', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#ffe4d1', marginBottom: 12 },
  kAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#ffffff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  kAvatarImg: { width: 76, height: 76, borderRadius: 38 },
  kAvatarBadge: { position: 'absolute', bottom: 0, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FE5300', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ffffff' },
  kPhotoTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  kPhotoTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  kPhotoSub: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 16 },
  kChangeBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FE5300', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#ffffff' },
  kChangeBtnText: { color: '#FE5300', fontSize: 12, fontWeight: '800' },
  kBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  kBadgeOrange: { backgroundColor: '#ffedd5' },
  kProgressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#ffedd5', marginBottom: 20 },
  kRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: 'rgba(254,83,0,0.12)', justifyContent: 'center', alignItems: 'center' },
  kRingArc: { position: 'absolute', top: -6, left: -6, width: 64, height: 64, borderRadius: 32, borderWidth: 6, transform: [{ rotate: '-45deg' }] },
  kRingText: { fontSize: 18, fontWeight: '900', color: '#c2410c' },
  kProgressTitle: { fontSize: 15, fontWeight: '800', color: '#ea580c' },
  kProgressSub: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 16 },
  kSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  kSectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  kSafeRow: { flexDirection: 'row', alignItems: 'center' },
  kSafeText: { fontSize: 10, color: '#64748b', lineHeight: 13 },
  kDocCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 12 },
  kDocIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  kDocTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  kSlotEmpty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#fdba74', borderRadius: 14, padding: 12, backgroundColor: '#fffaf6' },
  kSlotTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  kSlotMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  kSlotHint: { fontSize: 10, color: '#16a34a', marginTop: 1 },
  kBrowseBtn: { backgroundColor: '#FE5300', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  kBrowseBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  kSlotFilled: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 14, padding: 10, backgroundColor: '#f0fdf4' },
  kThumb: { width: 64, height: 44, borderRadius: 8, backgroundColor: '#e2e8f0' },
  kViewBtn: { borderWidth: 1, borderColor: '#2563eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#ffffff' },
  kViewBtnText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  kSaveBtn: { backgroundColor: '#FE5300', shadowColor: '#FE5300', marginTop: 6 },
  kPreviewBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.92)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  kPreviewImg: { width: '100%', height: '75%' },
  kPreviewClose: { position: 'absolute', top: 48, right: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
});
