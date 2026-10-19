import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';
import { SafeModal } from '../components/SafeModal';
import { FINANCIAL_FEATURES_ENABLED } from '../config/features';

// Keeps digits only, up to `max` characters (phone numbers, pincode).
const onlyDigits = (value: string, max: number) => String(value || '').replace(/\D/g, '').slice(0, max);

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
  const [editAddressLine, setEditAddressLine] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [aadhaarFront, setAadhaarFront] = useState<string>('');
  const [aadhaarBack, setAadhaarBack] = useState<string>('');
  const [panDocUrl, setPanDocUrl] = useState<string>('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');

  const [dbStates, setDbStates] = useState<any[]>([]);
  const [dbCities, setDbCities] = useState<any[]>([]);
  const [isLoadingLoc, setIsLoadingLoc] = useState(false);

  const fetchDbStates = async () => {
    try {
      setIsLoadingLoc(true);
      const res = await fetch(`${API_BASE_URL}/partner/states?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbStates(data.data);
      }
    } catch (e) {
      console.error("Error fetching states:", e);
    } finally {
      setIsLoadingLoc(false);
    }
  };

  const fetchDbCities = async (stateId: string) => {
    try {
      setIsLoadingLoc(true);
      const res = await fetch(`${API_BASE_URL}/partner/cities?stateId=${stateId}&limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setDbCities(data.data);
      }
    } catch (e) {
      console.error("Error fetching cities:", e);
    } finally {
      setIsLoadingLoc(false);
    }
  };

  useEffect(() => {
    if (token) fetchDbStates();
  }, [token]);

  useEffect(() => {
    if (editState && dbStates.length > 0) {
      const st = dbStates.find(s => s.name === editState);
      if (st) {
        fetchDbCities(st._id);
      } else {
        setDbCities([]);
      }
    } else {
      setDbCities([]);
    }
  }, [editState, dbStates]);

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
        const a = result.data.address;
        if (p) {
          setEditName(p.fullName || '');
          // Only digits are kept ("Not Provided" -> empty, "+91 98765 43210" -> 9876543210).
          setEditMobile(onlyDigits(p.mobileNumber || '', 12).slice(-10));
          setEditHub(p.agencyName || '');
          setEditEmergency(onlyDigits(p.emergencyContactNumber || '', 12).slice(-10));
        }
        if (a) {
          setEditAddressLine(a.addressLine || '');
          setEditCity(a.city || '');
          setEditState(a.state || '');
          setEditPincode(a.pincode || '');
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
  const isVerified = partnerAuth?.status === 'Approved' || !!dashboardData?.isApproved;
  // Under review = submitted and not handed back by admin (Hold / Rejected unlock it).
  const isUnderReview = !!partnerProfile?.isSubmittedForApproval && !['Hold', 'Rejected'].includes(partnerAuth?.status || '');
  const isLocked = isUnderReview || partnerAuth?.status === 'Approved';

  const aadhaarDoc = dashboardData?.documents?.find((d: any) => d.documentType === 'Aadhaar');
  const panDoc = dashboardData?.documents?.find((d: any) => d.documentType === 'PAN');
  const bank = dashboardData?.bank;
  const vehicles = dashboardData?.vehicles || [];
  const drivers = dashboardData?.drivers || [];

  // The server's checklist (same one it enforces on submit); older servers
  // without it fall back to the app's own list.
  const submissionChecklist: { key: string; label: string; done: boolean }[] | undefined = dashboardData?.submissionChecklist;
  const missingItems = (submissionChecklist || []).filter((item) => !item.done).map((item) => item.label);
  const isEverythingUploaded = submissionChecklist
    ? missingItems.length === 0
    : !!(
        aadhaarDoc &&
        panDoc &&
        partnerProfile?.profilePicture &&
        (!FINANCIAL_FEATURES_ENABLED || bank?.accountNumber) &&
        vehicles.length > 0 &&
        drivers.length > 0
      );

  const submitForApproval = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Alert.alert("Success", "Your profile has been submitted for approval.");
        fetchProfile(false);
      } else {
        Alert.alert("Error", data.message || "Failed to submit for approval.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error submitting profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName || !editMobile || !editAddressLine || !editCity || !editState || !editPincode) {
      Alert.alert("Required Fields", "Please enter Full Name, Mobile Number, and complete Address.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(editMobile)) {
      Alert.alert("Invalid Mobile Number", "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (editEmergency && !/^[6-9]\d{9}$/.test(editEmergency)) {
      Alert.alert("Invalid Emergency Contact", "Please enter a valid 10-digit emergency contact number.");
      return;
    }
    if (!/^\d{6}$/.test(editPincode.trim())) {
      Alert.alert("Invalid Pincode", "Please enter a valid 6-digit pincode.");
      return;
    }

    setSubmitting(true);
    try {
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
          },
          addressData: {
            addressLine: editAddressLine.trim(),
            city: editCity.trim(),
            state: editState.trim(),
            pincode: editPincode.trim(),
            type: "Current"
          }
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        if (aadhaarFront) {
          await fetch(`${API_BASE_URL}/partner/document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              ownerType: 'PartnerProfile',
              ownerId: result.data?._id || partnerProfile?._id,
              documentType: 'Aadhaar',
              fileUrl: aadhaarFront || 'https://storage.musafirbaba.com/docs/aadhaar_front.jpg'
            })
          });
        }
        if (aadhaarBack) {
          await fetch(`${API_BASE_URL}/partner/document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              ownerType: 'PartnerProfile',
              ownerId: result.data?._id || partnerProfile?._id,
              documentType: 'Aadhaar Back',
              fileUrl: aadhaarBack || 'https://storage.musafirbaba.com/docs/aadhaar_back.jpg'
            })
          });
        }
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

        Alert.alert(
          "Profile & Documents Saved!",
          "Your profile and KYC documents have been updated.",
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

  // ---- Display-only helpers for the redesigned layout (no data changes) ----
  const openEdit = () => {
    setEditPartnerType(partnerType);
    setShowEditModal(true);
  };
  const canEdit = !isLocked;
  type Badge = { label: string; bg: string; fg: string; icon: 'checkmark-circle' | 'time' | 'alert-circle' | 'ellipse-outline' };
  const B_VERIFIED: Badge = { label: 'Verified', bg: '#dcfce7', fg: '#16a34a', icon: 'checkmark-circle' };
  const B_PENDING: Badge = { label: 'Pending', bg: '#fef3c7', fg: '#b45309', icon: 'time' };
  const B_ACTION: Badge = { label: 'Action needed', bg: '#fee2e2', fg: '#dc2626', icon: 'alert-circle' };
  const B_MISSING: Badge = { label: 'Missing', bg: '#f1f5f9', fg: '#64748b', icon: 'ellipse-outline' };
  const docBadge = (docs: any[]): Badge => {
    if (docs.some((d) => !d)) return B_MISSING;
    if (docs.some((d) => ['Rejected', 'Re-upload Required', 'Expired'].includes(d.status))) return B_ACTION;
    if (docs.every((d) => d.status === 'Approved')) return B_VERIFIED;
    return B_PENDING;
  };
  const identityBadge = docBadge([aadhaarDoc, panDoc]);
  const photoBadge: Badge = partnerProfile?.profilePicture ? (isVerified ? B_VERIFIED : B_PENDING) : B_MISSING;
  const bankBadge: Badge = !bank ? B_MISSING : bank.status === 'Verified' ? B_VERIFIED : bank.status === 'Rejected' ? B_ACTION : B_PENDING;
  const statusLabel = isVerified ? 'Verified' : isUnderReview ? 'Under Audit' : partnerAuth?.status === 'Hold' ? 'On Hold' : 'Pending';
  const statusColor = isVerified ? '#16a34a' : partnerAuth?.status === 'Hold' ? '#ea580c' : '#d97706';
  const photo = typeof partnerProfile?.profilePicture === 'string' && /^(https?:|data:image)/.test(partnerProfile.profilePicture) ? partnerProfile.profilePicture : '';
  const [photoFailed, setPhotoFailed] = useState(false);

  const DetailRow = ({ icon, tint, bg, label, value, addable, last }: { icon: keyof typeof Ionicons.glyphMap; tint: string; bg: string; label: string; value: string; addable?: boolean; last?: boolean }) => {
    const missing = addable && /^(Not Set|Not Provided)$/.test(value);
    const Row: any = canEdit ? TouchableOpacity : View;
    return (
      <Row style={[styles.dRow, last && { borderBottomWidth: 0 }]} {...(canEdit ? { onPress: openEdit, activeOpacity: 0.7 } : {})}>
        <View style={[styles.dIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <Text style={styles.dLabel}>{label}</Text>
        <Text style={styles.dValue} numberOfLines={1}>{value}</Text>
        {missing && canEdit && <Text style={styles.dAdd}>Add</Text>}
        {canEdit && <Ionicons name="chevron-forward" size={16} color="#94a3b8" />}
      </Row>
    );
  };

  const CredRow = ({ icon, tint, bg, title, sub, badge, onPress, last }: { icon: keyof typeof Ionicons.glyphMap; tint: string; bg: string; title: string; sub: string; badge: React.ReactNode; onPress?: () => void; last?: boolean }) => (
    <TouchableOpacity style={[styles.cRow, last && { borderBottomWidth: 0 }]} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={[styles.cIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cTitle}>{title}</Text>
        <Text style={styles.cSub}>{sub}</Text>
      </View>
      {badge}
      {onPress ? <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginLeft: 6 }} /> : null}
    </TouchableOpacity>
  );
  const BadgePill = ({ b }: { b: Badge }) => (
    <View style={[styles.badge, { backgroundColor: b.bg }]}>
      <Ionicons name={b.icon} size={14} color={b.fg} />
      <Text style={[styles.badgeText, { color: b.fg }]}>{b.label}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => navigation.navigate('TripSupport')}>
          <Ionicons name="help-circle-outline" size={20} color="#FE5300" style={{ marginRight: 3 }} />
          <Text style={[styles.helpText, { color: '#FE5300', fontSize: 14 }]}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { gap: 14 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE5300']} />}
      >
        {/* Profile hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <View style={styles.heroAvatar}>
                {photo && !photoFailed ? (
                  <Image source={{ uri: photo }} style={styles.heroAvatarImg} onError={() => setPhotoFailed(true)} />
                ) : (
                  <Ionicons name="person" size={44} color="#16a34a" />
                )}
              </View>
              {canEdit && (
                <TouchableOpacity style={styles.cameraBadge} onPress={openEdit} activeOpacity={0.85}>
                  <Ionicons name="camera" size={14} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroName} numberOfLines={2}>
                {String(fullName).toUpperCase()}
                {isVerified ? '  ' : ''}
                {isVerified && <Ionicons name="checkmark-circle" size={17} color="#16a34a" />}
              </Text>
              <Text style={styles.heroId}>Partner ID: {partnerId}</Text>
              <View style={[styles.heroPill, !isVerified && { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.heroPillText, !isVerified && { color: '#b45309' }]}>
                  {isVerified ? 'Verified Partner' : isUnderReview ? 'Under Audit' : partnerAuth?.status === 'Hold' ? 'On Hold — action needed' : 'Onboarding Pending'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.ratingBox} onPress={() => navigation.navigate('VerifiedPartner')} activeOpacity={0.8}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.ratingVal}>4.9</Text>
              </View>
              <Text style={styles.ratingLabel}>Rating</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroStats}>
            {[
              { icon: 'calendar-outline' as const, tint: '#ea580c', bg: '#ffedd5', label: 'Member Since', value: memberSince, color: '#0f172a' },
              { icon: 'car-outline' as const, tint: '#2563eb', bg: '#dbeafe', label: 'Account Type', value: partnerType, color: '#0f172a' },
              { icon: 'shield-checkmark-outline' as const, tint: '#2563eb', bg: '#e0e7ff', label: 'Profile Status', value: statusLabel, color: statusColor },
            ].map((st, i) => (
              <View key={st.label} style={[styles.heroStat, i > 0 && styles.heroStatDivider]}>
                <View style={[styles.heroStatIcon, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={13} color={st.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroStatLabel} numberOfLines={1}>{st.label}</Text>
                  <Text style={[styles.heroStatValue, { color: st.color }]} numberOfLines={1}>{st.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Status note (until verified) */}
        {!isVerified && (
          <View style={[styles.statusBanner, { backgroundColor: '#fff7ed', borderColor: '#ffedd5', marginBottom: 0 }]}>
            <View style={[styles.statusShieldBox, { backgroundColor: '#ffedd5' }]}>
              <Ionicons name="time-outline" size={24} color="#d97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.statusTitle, { color: '#d97706' }]}>
                {isUnderReview ? 'Profile Under Audit' : partnerAuth?.status === 'Hold' ? 'Profile On Hold' : 'Profile Verification Pending'}
              </Text>
              <Text style={styles.statusSub}>
                {isUnderReview ? 'Your profile details have been submitted for verification audit.' : partnerAuth?.status === 'Hold' ? 'Our team needs a few changes. Please update your details and send for approval again.' : 'Please submit your details for verification.'}
              </Text>
            </View>
          </View>
        )}

        {/* Personal & Business Details */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle2}>Personal & Business Details</Text>
          {canEdit && (
            <TouchableOpacity style={styles.editBtn} onPress={openEdit} activeOpacity={0.8}>
              <Ionicons name="create-outline" size={16} color="#FE5300" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cardBox}>
          <DetailRow icon="person-outline" tint="#ea580c" bg="#fff1e6" label="Full Name" value={String(fullName).toUpperCase()} />
          <DetailRow icon="call-outline" tint="#2563eb" bg="#e8f0ff" label="Mobile Number" value={mobileNumber} />
          <DetailRow icon="mail-outline" tint="#9333ea" bg="#f5ebff" label="Email Address" value={emailAddress} />
          <DetailRow icon="briefcase-outline" tint="#16a34a" bg="#e8f8ee" label="Operational Hub / Agency" value={agencyHub} addable />
          <DetailRow icon="heart-outline" tint="#e11d48" bg="#ffe8ee" label="Emergency Contact" value={emergencyContact} addable last />
        </View>

        {/* Verification & Credentials */}
        <View style={styles.sectionRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
            <Text style={styles.sectionTitle2}>Verification & Credentials</Text>
          </View>
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('VerifiedPartner')} activeOpacity={0.8}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color="#FE5300" />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBox}>
          <CredRow icon="card-outline" tint="#ea580c" bg="#fff1e6" title="Identity Proof (Aadhaar / PAN)" sub="Aadhaar (both sides) & PAN card" badge={<BadgePill b={identityBadge} />} onPress={() => navigation.navigate('IdentityProof')} />
          <CredRow icon="person-outline" tint="#2563eb" bg="#e8f0ff" title="Profile Photo" sub="Account holder photo" badge={<BadgePill b={photoBadge} />} onPress={canEdit ? openEdit : undefined} />
          {FINANCIAL_FEATURES_ENABLED && (
            <CredRow icon="business-outline" tint="#9333ea" bg="#f5ebff" title="Account and Bank Information" sub="Bank account for payouts" badge={<BadgePill b={bankBadge} />} onPress={() => navigation.navigate('BankAccount')} />
          )}
          <CredRow
            icon="ribbon-outline"
            tint="#16a34a"
            bg="#e8f8ee"
            title="Partner Badge & Rating"
            sub={isVerified ? 'Verified Partner' : 'Unlocks after approval'}
            badge={
              <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="star" size={13} color="#16a34a" />
                <Text style={[styles.badgeText, { color: '#16a34a' }]}>4.9</Text>
              </View>
            }
            onPress={() => navigation.navigate('VerifiedPartner')}
            last
          />
        </View>

        {isVerified && (
          <View style={styles.verifiedCard}>
            <View style={styles.verifiedArt}>
              <Ionicons name="shield-checkmark" size={36} color="#ea580c" />
              <View style={styles.verifiedArtTick}><Ionicons name="checkmark" size={12} color="#ffffff" /></View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifiedTitle}>Your profile is verified</Text>
              <Text style={styles.verifiedSub}>You can now receive bookings and access all partner features.</Text>
            </View>
          </View>
        )}

        {!isLocked && (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity 
                style={[styles.actionBtn, { flex: 1 }]}
                onPress={() => {
                  setEditPartnerType(partnerType);
                  setShowEditModal(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Update Profile</Text>
              </TouchableOpacity>

            {!isUnderReview && partnerAuth?.status !== 'Approved' && (
                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    { flex: 1 }, 
                    !isEverythingUploaded ? { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1' } : { backgroundColor: '#16a34a', borderColor: '#16a34a' }
                  ]}
                  onPress={() => {
                    if (!isEverythingUploaded) {
                      Alert.alert(
                        "Complete These First",
                        missingItems.length ? missingItems.map((item) => `• ${item}`).join('\n') : "Please complete your profile, documents, vehicle and driver details."
                      );
                      return;
                    }
                    submitForApproval();
                  }}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="send-outline" size={18} color={!isEverythingUploaded ? "#94a3b8" : "#ffffff"} style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, !isEverythingUploaded ? { color: '#94a3b8' } : { color: '#ffffff' }]}>
                    {submitting ? 'Sending...' : 'Send For Approval'}
                  </Text>
                </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <SafeModal visible={showEditModal} transparent animationType="slide">
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
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                value={editMobile}
                onChangeText={(text) => setEditMobile(onlyDigits(text, 10))}
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
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                value={editEmergency}
                onChangeText={(text) => setEditEmergency(onlyDigits(text, 10))}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Address Line *</Text>
              <TextInput 
                style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12, color: '#0f172a' }}
                value={editAddressLine}
                onChangeText={setEditAddressLine}
              />
              
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 }}>State *</Text>
              <View style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
                <Picker 
                  selectedValue={editState} 
                  onValueChange={(v) => {
                    setEditState(v);
                    if (v !== editState) setEditCity('');
                  }} 
                  style={{ height: 50, color: '#0f172a' }}
                >
                  <Picker.Item label="-- Select State --" value="" />
                  {dbStates.map(s => <Picker.Item key={s._id} label={s.name} value={s.name} />)}
                </Picker>
              </View>

              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 }}>City *</Text>
              <View style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
                <Picker 
                  selectedValue={editCity} 
                  onValueChange={(v) => setEditCity(v)} 
                  style={{ height: 50, color: '#0f172a' }}
                  enabled={dbCities.length > 0}
                >
                  <Picker.Item label="-- Select City --" value="" />
                  {dbCities.map(c => <Picker.Item key={c._id} label={c.name} value={c.name} />)}
                </Picker>
              </View>
              
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Pincode *</Text>
              <TextInput 
                style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 16, color: '#0f172a' }}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={6}
                value={editPincode}
                onChangeText={(text) => setEditPincode(onlyDigits(text, 6))}
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
      </SafeModal>
    </View>
  );
};

const styles = StyleSheet.create({
  // ---- redesigned layout ----
  hero: { backgroundColor: '#fff4ec', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#ffe4d1' },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroAvatar: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: '#ffffff' },
  heroAvatarImg: { width: '100%', height: '100%' },
  cameraBadge: { position: 'absolute', right: -2, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: '#FE5300', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' },
  heroName: { fontSize: 15.5, fontWeight: '900', color: '#0f172a', lineHeight: 21 },
  heroId: { fontSize: 12.5, color: '#64748b', marginTop: 3 },
  heroPill: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  heroPillText: { fontSize: 12, fontWeight: '800', color: '#16a34a' },
  ratingBox: { backgroundColor: '#ecfdf3', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', alignSelf: 'flex-start' },
  ratingVal: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  ratingLabel: { fontSize: 11, color: '#64748b', marginTop: 1 },
  heroStats: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#fde3cf' },
  heroStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  heroStatDivider: { borderLeftWidth: 1, borderLeftColor: '#fde3cf', paddingLeft: 6 },
  heroStatIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  heroStatLabel: { fontSize: 9.5, color: '#64748b' },
  heroStatValue: { fontSize: 12, fontWeight: '800', marginTop: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle2: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: '#FE5300', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { fontSize: 13.5, fontWeight: '800', color: '#FE5300' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff4ec', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  viewAllText: { fontSize: 13, fontWeight: '800', color: '#FE5300' },
  cardBox: { backgroundColor: '#ffffff', borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  dRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 10 },
  dIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dLabel: { width: 112, fontSize: 13, color: '#64748b' },
  dValue: { flex: 1, fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  dAdd: { fontSize: 13, fontWeight: '800', color: '#FE5300' },
  cRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  cIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cTitle: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  cSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  verifiedCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff4ec', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#ffe4d1' },
  verifiedArt: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#ffd9bf', alignItems: 'center', justifyContent: 'center' },
  verifiedArtTick: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' },
  verifiedTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  verifiedSub: { fontSize: 12.5, color: '#64748b', marginTop: 3, lineHeight: 18 },
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
