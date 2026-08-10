import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Upload, CheckCircle2, XCircle, Clock3 } from 'lucide-react-native';
import { getMyDocument, uploadMyDocument, RiderDocumentData } from '../../../api/riderDocument.api';

const STATUS_STYLE: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode; label: string }> = {
  Pending: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: <Clock3 size={13} color="#92400E" />, label: 'Pending Review' },
  Approved: { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', icon: <CheckCircle2 size={13} color="#047857" />, label: 'Approved' },
  Rejected: { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: <XCircle size={13} color="#B91C1C" />, label: 'Rejected' },
};

export default function ScreenRiderDocuments({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const [document, setDocument] = useState<RiderDocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentIdNumber, setDocumentIdNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const loadDocument = async () => {
    try {
      const res = await getMyDocument();
      setDocument(res.data.data);
      if (res.data.data) {
        setDocumentName(res.data.data.documentName || '');
        setDocumentIdNumber(res.data.data.documentIdNumber || '');
      }
    } catch (error) {
      // Non-fatal -- the screen still works for a first-time upload.
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, []);

  const pickImage = async (side: 'front' | 'back') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    if (side === 'front') setFrontUri(result.assets[0].uri);
    else setBackUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!frontUri && !backUri) {
      showToast('Pick at least one side to upload');
      return;
    }
    if (!documentName.trim() || !documentIdNumber.trim()) {
      showToast('Document name and document ID are required');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await uploadMyDocument(documentName.trim(), documentIdNumber.trim(), frontUri, backUri);
      setDocument(res.data.data);
      setFrontUri(null);
      setBackUri(null);
      showToast('Document uploaded, pending review');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentFrontUrl = frontUri || document?.fileUrlFront;
  const currentBackUrl = backUri || document?.fileUrlBack;
  const statusMeta = document ? STATUS_STYLE[document.status] : null;
  const canSubmit = (!!frontUri || !!backUri) && !!documentName.trim() && !!documentIdNumber.trim();

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 12, gap: 12 }}>

          {/* Header Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <TouchableOpacity onPress={() => (onBack ? onBack() : onNavigate('36'))} style={{ padding: 4, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9' }}>
              <ArrowLeft size={18} color="#0F172A" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Documents</Text>
            <View style={{ width: 28 }} />
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color="#FF5500" />
            </View>
          ) : (
            <>
              {/* Info Card */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF5EF', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={16} color="#FF5500" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>ID Document</Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748B' }}>Upload the front & back of a valid ID</Text>
                  </View>
                </View>

                {statusMeta && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: statusMeta.bg, borderWidth: 1, borderColor: statusMeta.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
                    {statusMeta.icon}
                    <Text style={{ fontSize: 10, fontWeight: '800', color: statusMeta.text }}>{statusMeta.label}</Text>
                  </View>
                )}
                {document?.status === 'Rejected' && document.remarks && (
                  <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#B91C1C' }}>Reason: {document.remarks}</Text>
                )}
                <Text style={{ fontSize: 9.5, color: '#94A3B8', fontWeight: '600' }}>
                  Your profile is only marked Verified once your profile picture and both sides of this document are on file and reviewed.
                </Text>
              </View>

              {/* Document Name */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Document Name</Text>
                <TextInput
                  value={documentName}
                  onChangeText={setDocumentName}
                  placeholder="e.g. Aadhaar Card, Passport, Driving Licence"
                  placeholderTextColor="#94A3B8"
                  style={{ height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', paddingHorizontal: 14, fontSize: 12.5, fontWeight: '600', color: '#0F172A' }}
                />
              </View>

              {/* Document ID */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Document ID</Text>
                <TextInput
                  value={documentIdNumber}
                  onChangeText={setDocumentIdNumber}
                  placeholder="ID number printed on the document"
                  placeholderTextColor="#94A3B8"
                  style={{ height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', paddingHorizontal: 14, fontSize: 12.5, fontWeight: '600', color: '#0F172A' }}
                />
              </View>

              {/* Front Side */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Front Side</Text>
                <TouchableOpacity
                  onPress={() => pickImage('front')}
                  style={{ height: 140, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                >
                  {currentFrontUrl ? (
                    <Image source={{ uri: currentFrontUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Upload size={20} color="#94A3B8" />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#94A3B8' }}>Tap to upload front side</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Back Side */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>Back Side</Text>
                <TouchableOpacity
                  onPress={() => pickImage('back')}
                  style={{ height: 140, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                >
                  {currentBackUrl ? (
                    <Image source={{ uri: currentBackUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Upload size={20} color="#94A3B8" />
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#94A3B8' }}>Tap to upload back side</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || !canSubmit}
                style={{ width: '100%', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: canSubmit ? '#FF5500' : '#FED7AA' }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                    {document ? 'Update Document' : 'Submit Document'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {toastMsg ? (
        <View style={{ position: 'absolute', top: 24, left: 16, right: 16, alignItems: 'center', zIndex: 50 }} pointerEvents="none">
          <View style={{ maxWidth: '100%', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#1E293B', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}>
            <CheckCircle2 size={16} color="#34d399" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', flexShrink: 1 }}>{toastMsg}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
