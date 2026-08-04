import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';

export const PersonalDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const profile = useAuthStore((state) => state.profile);

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

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusShieldBox}>
            <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.statusTitle}>Verified Profile</Text>
            <Text style={styles.statusSub}>Your personal profile & KYC have been verified on 18 May 2025</Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
        </View>

        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color="#16a34a" />
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.profileName}>{profile?.name || 'Ashutosh Kumar'}</Text>
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.partnerIdText}>Partner ID: MB-DRV-12568</Text>
            <View style={styles.verifiedGreenPill}>
              <Text style={styles.verifiedGreenPillText}>Verified Partner</Text>
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
        <Text style={styles.sectionHeader}>Personal Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="person-outline" size={14} color="#16a34a" />
            </View>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoVal}>{profile?.name || 'Ashutosh Kumar'}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="call-outline" size={14} color="#0284c7" />
            </View>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoVal}>{profile?.mobile || '+91 98765 43210'}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="mail-outline" size={14} color="#7c3aed" />
            </View>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoVal}>ashutosh.kumar@musafirbaba.com</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
              <Ionicons name="location-outline" size={14} color="#d97706" />
            </View>
            <Text style={styles.infoLabel}>Operational Hub</Text>
            <Text style={styles.infoVal}>Delhi NCR (Gurugram)</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="heart-outline" size={14} color="#dc2626" />
            </View>
            <Text style={styles.infoLabel}>Emergency Contact</Text>
            <Text style={styles.infoVal}>+91 98765 00000</Text>
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
          onPress={() => Alert.alert("Edit Request", "Submit profile modification request to partner support.")}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={18} color="#16a34a" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>Request Profile Update</Text>
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
