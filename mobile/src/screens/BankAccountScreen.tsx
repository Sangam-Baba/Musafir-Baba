import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';
import { BankDetailsForm } from '../components/ProfileForms/BankDetailsForm';
import { SafeModal } from '../components/SafeModal';

export const BankAccountScreen = () => {
  const navigation = useNavigation<any>();
  const token = useAuthStore((state) => state.token);
  const [bankInfo, setBankInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const fetchBankData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.data?.bank) {
        setBankInfo(result.data.bank);
      } else {
        setBankInfo(null);
      }
    } catch (e) {
      console.error("Error fetching bank info", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBankData();
    }, [token])
  );

  const isVerified = bankInfo?.status === 'Verified';
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Account</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => navigation.navigate('TripSupport')}>
          <Ionicons name="help-circle-outline" size={16} color="#0f172a" style={{ marginRight: 4 }} />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Status Banner */}
        <View style={[styles.statusBanner, isVerified ? styles.statusBannerVerified : styles.statusBannerPending]}>
          <View style={[styles.statusIconBox, isVerified ? styles.iconBoxVerified : styles.iconBoxPending]}>
            <Ionicons name={isVerified ? "shield-checkmark" : "time"} size={24} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statusTitle, isVerified ? styles.textVerified : styles.textPending]}>
              {isVerified ? 'Verified' : 'Pending Verification'}
            </Text>
            <Text style={styles.statusDesc}>
              {isVerified 
                ? 'Your bank account has been verified' 
                : 'Your bank account details are being verified'}
            </Text>
          </View>
          {isVerified && <Ionicons name="checkmark-circle-outline" size={24} color="#16a34a" />}
        </View>

        {/* Bank Summary Card */}
        {bankInfo && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.bankLogoPlaceholder}>
                <Ionicons name="business" size={20} color="#0284c7" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.summaryBankName}>{bankInfo.bankName || 'Bank Name'}</Text>
                <Text style={styles.summaryAccountType}>Savings Account</Text>
              </View>
            </View>
            
            <View style={styles.summaryDetailsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Account Number</Text>
                <View style={styles.accNumRow}>
                <Text style={styles.summaryValue}>
                  {bankInfo.accountNumber || 'Not Set'}
                </Text>
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                </View>
              </View>
              <View style={styles.dividerVertical} />
              <View style={{ flex: 1, paddingLeft: 16 }}>
                <Text style={styles.summaryLabel}>IFSC Code</Text>
                <Text style={styles.summaryValue}>{bankInfo.ifsc || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Account Details */}
        <Text style={styles.sectionHeader}>Account Details</Text>
        <View style={styles.detailsCard}>
          <DetailRow icon="person-outline" iconColor="#16a34a" label="Account Holder Name" value={bankInfo?.accountHolderName || 'Not Set'} />
          <DetailRow icon="card-outline" iconColor="#7c3aed" label="Account Type" value="Savings Account" />
          <DetailRow icon="business-outline" iconColor="#0284c7" label="Bank Name" value={bankInfo?.bankName || 'Not Set'} />
          <DetailRow icon="grid-outline" iconColor="#f59e0b" label="Account Number" value={bankInfo?.accountNumber || 'Not Set'} />
          <DetailRow icon="qr-code-outline" iconColor="#8b5cf6" label="IFSC Code" value={bankInfo?.ifsc || 'Not Set'} />
          <DetailRow icon="calendar-outline" iconColor="#16a34a" label="Date Added" value={new Date(bankInfo?.createdAt || Date.now()).toLocaleDateString('en-GB')} borderBottom={false} />
        </View>

        {/* Uploaded Document */}
        <Text style={styles.sectionHeader}>Uploaded Document</Text>
        <View style={styles.documentCard}>
          <View style={styles.docPreviewBox}>
            <Ionicons name="document-text" size={32} color="#cbd5e1" />
            <Text style={styles.docPreviewText}>Cheque Preview</Text>
          </View>
          <TouchableOpacity style={styles.viewFullscreenBtn}>
            <Ionicons name="scan-outline" size={20} color="#16a34a" />
            <Text style={styles.viewFullscreenText}>View Fullscreen</Text>
          </TouchableOpacity>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelinesBox}>
          <View style={styles.guidelinesHeader}>
            <Ionicons name="information-circle-outline" size={18} color="#16a34a" />
            <Text style={styles.guidelinesTitle}>Guidelines</Text>
          </View>
          <Guideline text="Bank account must be in your name" />
          <Guideline text="Cancelled cheque / Passbook first page accepted" />
          <Guideline text="All details must be clearly visible" />
          <Guideline text="Accepted formats: JPG, PNG, PDF" />
          <Guideline text="Maximum file size: 5MB" />
        </View>

        {/* Support Link */}
        <View style={styles.supportBox}>
          <Text style={styles.supportLabel}>Facing an issue?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TripSupport')}>
            <Text style={styles.supportLink}>Contact Support</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.updateBtn}
          onPress={() => setShowUpdateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#16a34a" style={{ marginRight: 8 }} />
          <Text style={styles.updateBtnText}>Update Bank Details</Text>
        </TouchableOpacity>
      </View>

      {/* Update Bank Modal */}
      <SafeModal visible={showUpdateModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Update Bank Details</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <BankDetailsForm onSaveSuccess={() => {
              setShowUpdateModal(false);
              fetchBankData();
            }} />
          </View>
        </View>
      </SafeModal>
    </View>
  );
};

const DetailRow = ({ icon, iconColor, label, value, borderBottom = true }: any) => (
  <View style={[styles.detailRow, borderBottom && styles.borderBottom]}>
    <View style={[styles.detailIconBox, { backgroundColor: `${iconColor}15` }]}>
      <Ionicons name={icon} size={14} color={iconColor} />
    </View>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
  </View>
);

const Guideline = ({ text }: { text: string }) => (
  <View style={styles.guidelineRow}>
    <Ionicons name="checkmark" size={14} color="#16a34a" style={{ marginRight: 8 }} />
    <Text style={styles.guidelineText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 44,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  helpBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  helpText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
  statusBannerVerified: { backgroundColor: '#f0fdf4' },
  statusBannerPending: { backgroundColor: '#fff7ed' },
  statusIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  iconBoxVerified: { backgroundColor: '#16a34a' },
  iconBoxPending: { backgroundColor: '#ea580c' },
  statusTitle: { fontSize: 16, fontWeight: '800' },
  textVerified: { color: '#16a34a' },
  textPending: { color: '#ea580c' },
  statusDesc: { fontSize: 13, color: '#475569', marginTop: 2 },

  summaryCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bankLogoPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  summaryBankName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  summaryAccountType: { fontSize: 13, color: '#64748b', marginTop: 2 },
  summaryDetailsRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  summaryLabel: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  accNumRow: { flexDirection: 'row', alignItems: 'center' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  primaryBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  dividerVertical: { width: 1, backgroundColor: '#e2e8f0' },

  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  
  detailsCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailIconBox: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detailLabel: { fontSize: 13, color: '#64748b', flex: 1 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  documentCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  docPreviewBox: { flex: 1, height: 80, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  docPreviewText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  viewFullscreenBtn: { padding: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  viewFullscreenText: { fontSize: 12, fontWeight: '700', color: '#16a34a', marginTop: 4 },

  guidelinesBox: { backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#bbf7d0' },
  guidelinesHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  guidelinesTitle: { fontSize: 14, fontWeight: '700', color: '#16a34a', marginLeft: 6 },
  guidelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  guidelineText: { fontSize: 12, color: '#15803d', flex: 1, lineHeight: 18 },

  supportBox: { alignItems: 'center', marginBottom: 20 },
  supportLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  supportLink: { fontSize: 14, fontWeight: '700', color: '#16a34a' },

  footer: { backgroundColor: '#ffffff', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  updateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#16a34a' },
  updateBtnText: { fontSize: 15, fontWeight: '700', color: '#16a34a' },
});
