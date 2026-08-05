import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { Button } from '../Button';
import * as DocumentPicker from 'expo-document-picker';
import { API_BASE_URL } from '../../utils/config';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/colors';

interface ExistingDoc {
  documentType: string;
  fileUrl: string;
  status: string;
}

interface KYCDocumentsFormProps {
  onSaveSuccess?: () => void;
}

export const KYCDocumentsForm = ({ onSaveSuccess }: KYCDocumentsFormProps) => {
  const token = useAuthStore((state) => state.token);
  
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [existingDocs, setExistingDocs] = useState<ExistingDoc[]>([]);
  const [partnerStatus, setPartnerStatus] = useState<string>("");

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success && result.data) {
        if (result.data.profile) {
          setProfileId(result.data.profile._id);
        }
        if (result.data.documents) {
          setExistingDocs(result.data.documents);
        }
        const status = result.data.auth?.status || result.data.profile?.status || "";
        setPartnerStatus(status);
      }
    } catch (e) {
      console.error("Error loading dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const isEditable = partnerStatus !== "Approved" && partnerStatus !== "PendingVerification";

  const handleFileUpload = async (docType: string) => {
    if (!profileId) {
      Alert.alert("Error", "Profile ID not found. Please complete personal details first.");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setUploadingDoc(docType);

      // 1. Get Presigned URL
      const presignRes = await fetch(`${API_BASE_URL}/upload/cloudflare-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.mimeType || 'application/octet-stream',
          folder: "partner-documents",
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, fileUrl } = await presignRes.json();

      // 2. Upload to R2 (Convert URI to Blob for React Native)
      const fileResponse = await fetch(file.uri);
      const blob = await fileResponse.blob();
      
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": file.mimeType || 'application/octet-stream' },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload to Cloudflare");

      // 3. Save to Partner DB
      const res = await fetch(`${API_BASE_URL}/partner/document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          ownerType: "PartnerProfile", 
          ownerId: profileId, 
          documentType: docType, 
          fileUrl 
        }),
      });

      if (res.ok) {
        Alert.alert("Success", `${docType} uploaded successfully!`);
        fetchDashboardData();
      } else {
        Alert.alert("Error", `Failed to save ${docType} to profile.`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", `Error uploading ${docType}.`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const getDoc = (docType: string) => {
    return existingDocs.find(d => {
      if (docType === 'Aadhaar Front') {
        return d.documentType === 'Aadhaar Front' || d.documentType === 'Aadhaar';
      }
      return d.documentType === docType;
    });
  };

  const DocumentUploadCard = ({ title, docType }: { title: string, docType: string }) => {
    const doc = getDoc(docType);
    const status = doc?.status || null;
    const isUploading = uploadingDoc === docType;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          {status && (
            <Text style={[styles.statusBadge, status === 'Verified' || status === 'Approved' ? styles.statusVerified : styles.statusPending]}>
              {status.toUpperCase()}
            </Text>
          )}
        </View>
        
        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            {Boolean(doc?.fileUrl) && (
              <Button 
                title="View Document" 
                type="outline" 
                onPress={() => doc?.fileUrl && Linking.openURL(doc.fileUrl)} 
                style={{ flex: 1, marginRight: isEditable ? 8 : 0 }}
              />
            )}
            {Boolean(isEditable) && (
              <Button 
                title={status ? "Replace" : "Choose File"} 
                type="outline" 
                onPress={() => handleFileUpload(docType)} 
                style={{ flex: 1, marginLeft: doc?.fileUrl ? 8 : 0 }}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <DocumentUploadCard title="Aadhaar Card (Front)" docType="Aadhaar Front" />
      <DocumentUploadCard title="Aadhaar Card (Back)" docType="Aadhaar Back" />
      <DocumentUploadCard title="PAN Card" docType="PAN" />

      <View style={styles.footer}>
        <Button 
          title="Complete Verification" 
          onPress={() => {
            if (onSaveSuccess) onSaveSuccess();
          }}  
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
  },
  statusVerified: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  uploadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  uploadingText: {
    marginLeft: 8,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  }
});
