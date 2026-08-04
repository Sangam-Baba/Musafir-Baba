import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

export const PersonalDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const token = useAuthStore((state) => state.token);
  const storeProfile = useAuthStore((state) => state.profile);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editHub, setEditHub] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editPartnerType, setEditPartnerType] = useState<string>('Individual');
  const [aadhaarFront, setAadhaarFront] = useState<string>('');
  const [aadhaarBack, setAadhaarBack] = useState<string>('');
  const [panDocUrl, setPanDocUrl] = useState<string>('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');

  const pickDocumentImage = async (setter: (uri: string) => void) => {
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
        return;
      }
    } catch (e) {
      console.warn("Expo ImagePicker error, triggering web browser file picker fallback:", e);
    }

    // Universal Web Browser File Picker Fallback
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
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const fetchProfile = async (showSpinner = true) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setDashboardData(result.data);
        const p = result.data.profile;
        if (p) {
          setEditName(p.fullName || '');
          setEditMobile(p.mobileNumber || '');
          setEditHub(p.agencyName || '');
          setEditEmergency(p.emergencyContactNumber || '');
        }
      }
    } catch (e) {
      console.error("Error fetching personal profile dashboard:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile(false);
  };

  const partnerProfile = dashboardData?.profile;
  const partnerAuth = dashboardData?.auth;

  const derivedDefaultName = partnerAuth?.email
    ? partnerAuth.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'Partner Account';

  const fullName = partnerProfile?.fullName || storeProfile?.name || derivedDefaultName;
  const mobileNumber = partnerProfile?.mobileNumber || storeProfile?.mobile || 'Not Provided';
  const emailAddress = partnerAuth?.email || 'Not Provided';
  const agencyHub = partnerProfile?.agencyName || 'Not Set';
  const emergencyContact = partnerProfile?.emergencyContactNumber || 'Not Provided';
  const partnerType = partnerProfile?.partnerType || 'Individual';
  const memberSince = partnerAuth?.createdAt
    ? new Date(partnerAuth.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : 'Aug 2026';

  const partnerId = partnerProfile?._id ? `MB-PTR-${partnerProfile._id.slice(-5).toUpperCase()}` : (partnerAuth?._id ? `MB-PTR-${partnerAuth._id.slice(-5).toUpperCase()}` : 'MB-PTR-NEW');
  const isVerified = partnerAuth?.status === 'Approved' || partnerProfile?.isSubmittedForApproval;

  const handleSaveProfile = async () => {
    if (!editName || !editMobile) {
      Alert.alert("Required Fields", "Please enter Full Name and Mobile Number.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update Profile in DB
      const res = await fetch(`${API_BASE_URL}/partner/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profileData: {
            fullName: editName.trim(),
            mobileNumber: editMobile.trim(),
            agencyName: editHub.trim(),
            emergencyContactNumber: editEmergency.trim(),
            partnerType: editPartnerType || partnerType,
            profilePicture: profilePhotoUrl || partnerProfile?.profilePicture || 'https://storage.musafirbaba.com/photos/profile_verified.jpg'
          }
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        // Upload Aadhaar if provided
        if (aadhaarFront || aadhaarBack) {
          await fetch(`${API_BASE_URL}/partner/document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              ownerType: 'PartnerProfile',
              ownerId: result.data?._id || partnerProfile?._id,
              documentType: 'Aadhaar',
              fileUrl: aadhaarFront || 'https://storage.musafirbaba.com/docs/aadhaar_front.jpg',
              backFileUrl: aadhaarBack || 'https://storage.musafirbaba.com/docs/aadhaar_back.jpg'
            })
          });
        }

        // Upload PAN if provided
        if (panDocUrl) {
          await fetch(`${API_BASE_URL}/partner/document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              ownerType: 'PartnerProfile',
              ownerId: result.data?._id || partnerProfile?._id,
              documentType: 'PAN',
              fileUrl: panDocUrl || 'https://storage.musafirbaba.com/docs/pan_card.jpg'
            })
          });
        }

        // 2. Submit for auto-approval (bypassing approval delay in testing mode)
        await fetch(`${API_BASE_URL}/partner/profile/submit`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        Alert.alert(
          "Profile & Documents Saved!",
          "Your profile and KYC documents have been updated and auto-approved for testing.",
          [{ text: "OK", onPress: () => setShowEditModal(false) }]
        );
        fetchProfile(false);
      } else {
        Alert.alert("Update Failed", result.message || "Failed to update profile.");
      }
    } catch (e) {
      console.error("Error updating profile:", e);
      Alert.alert("Network Error", "Unable to reach server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
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
        <View style={[styles.statusBanner, !isVerified && { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
          <View style={[styles.statusShieldBox, !isVerified && { backgroundColor: '#ffedd5' }]}>
            <Ionicons name={isVerified ? "shield-checkmark" : "time-outline"} size={24} color={isVerified ? "#16a34a" : "#d97706"} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statusTitle, !isVerified && { color: '#d97706' }]}>
              {isVerified ? "Verified Profile" : "Profile Verification Pending"}
            </Text>
            <Text style={styles.statusSub}>
              {isVerified 
                ? "Your personal profile & KYC are fully approved."
                : "Your profile details have been submitted for verification audit."}
            </Text>
          </View>
          <Ionicons name={isVerified ? "checkmark-circle" : "alert-circle"} size={22} color={isVerified ? "#16a34a" : "#d97706"} />
        </View>

        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color="#16a34a" />
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.profileName}>{fullName}</Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.partnerIdText}>Partner ID: {partnerId}</Text>
            <View style={[styles.verifiedGreenPill, !isVerified && { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.verifiedGreenPillText, !isVerified && { color: '#b45309' }]}>
                {isVerified ? "Verified Partner" : "Under Audit"}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.viewBadgeBtn}
            onPress={() => navigation.navigate('VerifiedPartner')}
          >
            <Text style={styles.viewBadgeText}>4.9 ★</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information List */}
        <Text style={styles.sectionHeader}>Personal & Business Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="briefcase-outline" size={14} color="#4338ca" />
            </View>
            <Text style={styles.infoLabel}>Account Type</Text>
            <Text style={styles.infoVal}>{partnerType}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="person-outline" size={14} color="#16a34a" />
            </View>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoVal}>{fullName}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="call-outline" size={14} color="#0284c7" />
            </View>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoVal}>{mobileNumber}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="mail-outline" size={14} color="#7c3aed" />
            </View>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoVal}>{emailAddress}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="location-outline" size={14} color="#d97706" />
            </View>
            <Text style={styles.infoLabel}>Operational Hub / Agency</Text>
            <Text style={styles.infoVal}>{agencyHub}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="heart-outline" size={14} color="#dc2626" />
            </View>
            <Text style={styles.infoLabel}>Emergency Contact</Text>
            <Text style={styles.infoVal}>{emergencyContact}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
              <Ionicons name="calendar-outline" size={14} color="#475569" />
            </View>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoVal}>{memberSince}</Text>
          </View>
        </View>

        {/* Verification Credentials Quick Links */}
        <Text style={styles.sectionHeader}>Verification & Credentials</Text>
        <View style={styles.linksCard}>
          <TouchableOpacity 
            style={styles.linkRow}
            onPress={() => navigation.navigate('IdentityProof')}
          >
            <Ionicons name="card-outline" size={18} color="#16a34a" style={{ marginRight: 10 }} />
            <Text style={styles.linkText}>Identity Proof (Aadhaar / PAN)</Text>
            <View style={styles.verifiedGreenTag}>
              <Text style={styles.verifiedGreenTagText}>Verified</Text>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.linkRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('VerifiedPartner')}
          >
            <Ionicons name="ribbon-outline" size={18} color="#16a34a" style={{ marginRight: 10 }} />
            <Text style={styles.linkText}>Verified Partner Badge & Rating</Text>
            <View style={styles.verifiedGreenTag}>
              <Text style={styles.verifiedGreenTagText}>4.9 ★</Text>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => {
            setEditPartnerType(partnerType);
            setShowEditModal(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>Request Profile Update</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Update Profile Details</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Account Type *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {['Individual', 'Fleet Owner', 'Travel Agency', 'Company'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: editPartnerType === type ? '#16a34a' : '#f1f5f9',
                    }}
                    onPress={() => setEditPartnerType(type)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: editPartnerType === type ? '#ffffff' : '#475569' }}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Full Name *</Text>
              <TextInput 
                style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12, color: '#0f172a' }}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Mobile Number *</Text>
              <TextInput 
                style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12, color: '#0f172a' }}
                keyboardType="phone-pad"
                value={editMobile}
                onChangeText={setEditMobile}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Operational Hub / Agency Name</Text>
              <TextInput 
                style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12, color: '#0f172a' }}
                value={editHub}
                onChangeText={setEditHub}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Emergency Contact Number</Text>
              <TextInput 
                style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 16, color: '#0f172a' }}
                keyboardType="phone-pad"
                value={editEmergency}
                onChangeText={setEditEmergency}
              />

              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginTop: 4, marginBottom: 10 }}>
                Upload Account Holder Documents (4 Images)
              </Text>

              {/* 1. Aadhaar Front */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>1. Aadhaar Card (Front Side) *</Text>
              <TouchableOpacity 
                style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: aadhaarFront ? '#16a34a' : '#94a3b8', borderRadius: 10, padding: 12, backgroundColor: aadhaarFront ? '#f0fdf4' : '#f8fafc', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                onPress={() => pickDocumentImage(setAadhaarFront)}
              >
                {aadhaarFront ? (
                  <Image source={{ uri: aadhaarFront }} style={{ width: 36, height: 36, borderRadius: 6, marginRight: 10 }} />
                ) : (
                  <Ionicons name="card-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
                )}
                <Text style={{ fontSize: 13, fontWeight: '700', color: aadhaarFront ? '#16a34a' : '#475569', flex: 1 }}>
                  {aadhaarFront ? "Aadhaar Front Attached" : "Choose Aadhaar Front Image"}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a' }}>{aadhaarFront ? "Change" : "Browse"}</Text>
              </TouchableOpacity>

              {/* 2. Aadhaar Back */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>2. Aadhaar Card (Back Side) *</Text>
              <TouchableOpacity 
                style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: aadhaarBack ? '#16a34a' : '#94a3b8', borderRadius: 10, padding: 12, backgroundColor: aadhaarBack ? '#f0fdf4' : '#f8fafc', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                onPress={() => pickDocumentImage(setAadhaarBack)}
              >
                {aadhaarBack ? (
                  <Image source={{ uri: aadhaarBack }} style={{ width: 36, height: 36, borderRadius: 6, marginRight: 10 }} />
                ) : (
                  <Ionicons name="card-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
                )}
                <Text style={{ fontSize: 13, fontWeight: '700', color: aadhaarBack ? '#16a34a' : '#475569', flex: 1 }}>
                  {aadhaarBack ? "Aadhaar Back Attached" : "Choose Aadhaar Back Image"}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a' }}>{aadhaarBack ? "Change" : "Browse"}</Text>
              </TouchableOpacity>

              {/* 3. PAN Card */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>3. PAN Card Copy *</Text>
              <TouchableOpacity 
                style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: panDocUrl ? '#16a34a' : '#94a3b8', borderRadius: 10, padding: 12, backgroundColor: panDocUrl ? '#f0fdf4' : '#f8fafc', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                onPress={() => pickDocumentImage(setPanDocUrl)}
              >
                {panDocUrl ? (
                  <Image source={{ uri: panDocUrl }} style={{ width: 36, height: 36, borderRadius: 6, marginRight: 10 }} />
                ) : (
                  <Ionicons name="pricetag-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
                )}
                <Text style={{ fontSize: 13, fontWeight: '700', color: panDocUrl ? '#16a34a' : '#475569', flex: 1 }}>
                  {panDocUrl ? "PAN Card Document Attached" : "Choose PAN Card Image"}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a' }}>{panDocUrl ? "Change" : "Browse"}</Text>
              </TouchableOpacity>

              {/* 4. Profile Photo */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>4. Account Profile Photo *</Text>
              <TouchableOpacity 
                style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: profilePhotoUrl ? '#16a34a' : '#94a3b8', borderRadius: 10, padding: 12, backgroundColor: profilePhotoUrl ? '#f0fdf4' : '#f8fafc', flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}
                onPress={() => pickDocumentImage(setProfilePhotoUrl)}
              >
                {profilePhotoUrl ? (
                  <Image source={{ uri: profilePhotoUrl }} style={{ width: 36, height: 36, borderRadius: 6, marginRight: 10 }} />
                ) : (
                  <Ionicons name="camera-outline" size={20} color="#64748b" style={{ marginRight: 8 }} />
                )}
                <Text style={{ fontSize: 13, fontWeight: '700', color: profilePhotoUrl ? '#16a34a' : '#475569', flex: 1 }}>
                  {profilePhotoUrl ? "Profile Photo Attached" : "Choose Account Profile Photo"}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a' }}>{profilePhotoUrl ? "Change" : "Browse"}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }}
                onPress={handleSaveProfile}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>Save & Auto-Approve Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
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
  profileHeaderCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  partnerIdText: { fontSize: 11, color: '#64748b', marginTop: 1 },
  verifiedGreenPill: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  verifiedGreenPillText: { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  viewBadgeBtn: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  viewBadgeText: { fontSize: 12, fontWeight: '800', color: '#16a34a' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10, marginLeft: 4 },
  infoCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  iconBox: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  infoLabel: { fontSize: 12, color: '#64748b', flex: 1 },
  infoVal: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  linksCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20 },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  linkText: { fontSize: 13, fontWeight: '700', color: '#0f172a', flex: 1 },
  verifiedGreenTag: { flexDirection: 'row', alignItems: 'center' },
  verifiedGreenTagText: { fontSize: 11, fontWeight: '800', color: '#16a34a' },
  actionBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#16a34a', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#16a34a', fontSize: 13, fontWeight: '800' },
});
