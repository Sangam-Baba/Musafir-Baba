import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Linking, ActivityIndicator, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { UploadCloud, Check, ShieldCheck, Info, FileUp, Images, Camera, X, Luggage, Clock, AlertTriangle, Eye, RefreshCw, Lock } from 'lucide-react-native';
import {
  getRequiredDocuments,
  saveVisaDraft,
  uploadVisaFile,
  visaCardTitle,
  VISA_FILE_TYPES,
  VISA_MAX_FILE_BYTES,
  type PickedFile,
  type VisaCard,
  type VisaDocument,
} from '../../../api/visa.api';
import { useVisaStore } from '../../../store/useVisaStore';
import { CountryBanner, VisaFooter, VisaHeader, VisaStepper, PageTitle, ProgressRing, ProgressBar, documentLook, stepSubtitles, useToast, VC, SHADOW, ORANGE, MUTED } from './visaUi';

const EXT_TYPES: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
const normaliseType = (mime: string | undefined | null, name: string) => {
  const m = (mime || '').toLowerCase().replace('image/jpg', 'image/jpeg');
  if (VISA_FILE_TYPES.includes(m)) return m;
  return EXT_TYPES[(name.split('.').pop() || '').toLowerCase()] || m;
};

export default function ScreenVisaDocuments({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const visa = useVisaStore((s) => s.visa);
  const selection = useVisaStore((s) => s.selection);
  const eligibility = useVisaStore((s) => s.eligibility);
  const travellers = useVisaStore((s) => s.travellers);
  const documents = useVisaStore((s) => s.documents);
  const setDocuments = useVisaStore((s) => s.setDocuments);
  const application = useVisaStore((s) => s.application);
  const setSaved = useVisaStore((s) => s.setSaved);
  const mode = useVisaStore((s) => s.mode);
  const [active, setActive] = useState(0);
  const [picking, setPicking] = useState<string | null>(null); // doc name the source sheet is open for
  const [uploading, setUploading] = useState<string | null>(null); // `${traveller}_${doc}`
  const toast = useToast();

  if (!visa || !application) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' }}>
        <Text style={{ color: MUTED }}>Please fill in traveller details first.</Text>
        <TouchableOpacity onPress={() => onNavigate(visa ? 'visa-details' : 'visa')} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: ORANGE }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card: VisaCard | undefined = (visa.visas || []).find((c) => c._id === selection.selectedVisaId);
  const required = getRequiredDocuments(visa);
  const count = travellers.length;
  const find = (t: number, name: string) => documents.find((d) => d.travellerId === String(t) && d.name === name && d.media?.url);
  const total = required.length * count;
  const done = Array.from({ length: count }).reduce<number>((n, _, t) => n + required.filter((r) => find(t, r)).length, 0);
  const percent = total ? (done / total) * 100 : 0;
  const nameOf = (t: number) => `${travellers[t]?.firstName || 'Traveller'} ${travellers[t]?.lastName?.[0] ? `${travellers[t].lastName[0]}.` : ''}`.trim();

  const handleFile = async (docName: string, file: PickedFile) => {
    const type = normaliseType(file.mimeType, file.name);
    if (!VISA_FILE_TYPES.includes(type)) return toast.show('Please choose a PDF, JPG or PNG file');
    if (file.size && file.size > VISA_MAX_FILE_BYTES) return toast.show('File is larger than 5 MB. Please choose a smaller file.');
    const key = `${active}_${docName}`;
    setUploading(key);
    try {
      const media = await uploadVisaFile({ ...file, mimeType: type });
      const next: VisaDocument[] = [...documents.filter((d) => !(d.travellerId === String(active) && d.name === docName)), { name: docName, travellerId: String(active), media }];
      setDocuments(next);
      // Save right away so nothing is lost if the app is closed.
      const res = await saveVisaDraft(application._id, { documents: next });
      setSaved(res.data.data, res.data.fee);
      toast.show(`${docName} uploaded`);
    } catch (e: any) {
      toast.show(e?.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const pickFile = async () => {
    const docName = picking!;
    setPicking(null);
    const res = await DocumentPicker.getDocumentAsync({ type: VISA_FILE_TYPES, copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await handleFile(docName, { uri: a.uri, name: a.name || 'document', mimeType: a.mimeType || '', size: a.size });
  };

  const pickImage = async (camera: boolean) => {
    const docName = picking!;
    setPicking(null);
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return toast.show('Camera permission is needed to take a photo');
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await handleFile(docName, { uri: a.uri, name: a.fileName || `${docName}.jpg`, mimeType: a.mimeType || 'image/jpeg', size: a.fileSize });
  };

  const next = () => {
    for (let t = 0; t < count; t++) {
      const missing = required.find((r) => !find(t, r));
      if (missing) {
        setActive(t);
        return toast.show(`Upload ${missing}${count > 1 ? ` for ${nameOf(t)}` : ''}`);
      }
    }
    onNavigate('visa-review');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#FFFFFF' }}>
          <VisaHeader onBack={onBack} onBell={() => onNavigate('38')} />
          <VisaStepper current={4} subtitles={stepSubtitles(visa, card)} />
        </View>
        <CountryBanner visa={visa} subtitle={card ? visaCardTitle(card) : 'Visa'} chips={[{ icon: Luggage, label: eligibility.purpose || 'Tourism' }, { icon: Clock, label: eligibility.stayDuration || 'Short stay' }]} />
        <PageTitle title="Upload your documents" subtitle="Securely upload the documents needed for your application." />

        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {mode === 'fix' && !!application.returnReason && (
            <View style={{ flexDirection: 'row', gap: 12, backgroundColor: '#FFF4F2', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#FBD5CF' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={17} color="#D92D20" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#B42318' }}>Needs your attention</Text>
                <Text style={{ fontSize: 13, color: '#912018', lineHeight: 19, marginTop: 2 }}>{application.returnReason}</Text>
              </View>
            </View>
          )}

          {/* Progress */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: VC.surface, borderRadius: 20, padding: 16 }}>
            <ProgressRing percent={percent} size={70} />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ fontSize: 16.5, fontWeight: '700', color: VC.ink, letterSpacing: -0.2 }}>
                {done} of {total} <Text style={{ fontWeight: '500', color: VC.body }}>uploaded</Text>
              </Text>
              <ProgressBar percent={percent} />
              <Text style={{ fontSize: 12.5, color: done === total ? '#15803D' : VC.body }}>{done === total ? 'All set — continue to review.' : 'Upload all required documents to continue.'}</Text>
            </View>
          </View>

          {/* Travellers */}
          {count > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {travellers.map((_, t) => {
                const complete = required.every((r) => find(t, r));
                const on = t === active;
                return (
                  <TouchableOpacity key={t} onPress={() => setActive(t)} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingLeft: 6, paddingRight: 14, borderRadius: 999, borderWidth: 1.5, borderColor: on ? VC.orange : 'transparent', backgroundColor: on ? VC.orangeSoft : VC.surface }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: complete ? '#16A34A' : on ? VC.orange : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                      {complete ? <Check size={15} color="#FFFFFF" strokeWidth={3} /> : <Text style={{ fontSize: 12.5, fontWeight: '800', color: on ? '#FFFFFF' : VC.ink }}>{(travellers[t]?.firstName || 'T')[0].toUpperCase()}</Text>}
                    </View>
                    <Text style={{ fontSize: 13.5, fontWeight: on ? '700' : '500', color: on ? VC.ink : VC.body }}>{nameOf(t)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Documents */}
          <View style={{ gap: 10 }}>
            {required.map((name) => {
              const look = documentLook(name);
              const doc = find(active, name);
              const busy = uploading === `${active}_${name}`;
              return (
                <View key={name} style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: doc ? '#CDEFD9' : VC.hair, padding: 14, ...SHADOW }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <look.icon size={21} color={look.color} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: VC.ink }}>
                        {name} <Text style={{ color: '#E5484D' }}>*</Text>
                      </Text>
                      <Text numberOfLines={2} style={{ fontSize: 12.5, color: VC.body, lineHeight: 17, marginTop: 2 }}>{look.hint}</Text>
                    </View>
                    {busy ? (
                      <View style={{ width: 96, alignItems: 'center' }}>
                        <ActivityIndicator color={VC.orange} />
                      </View>
                    ) : doc ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: VC.greenSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Check size={13} color="#16A34A" strokeWidth={3} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>Uploaded</Text>
                      </View>
                    ) : (
                      <TouchableOpacity disabled={!!uploading} onPress={() => setPicking(name)} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: VC.orange, borderRadius: 12, paddingHorizontal: 12, height: 38, opacity: uploading ? 0.5 : 1 }}>
                        <UploadCloud size={15} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Upload</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {doc && !busy && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: VC.hair }}>
                      <TouchableOpacity onPress={() => Linking.openURL(doc.media.url).catch(() => {})} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 12, backgroundColor: VC.surface }}>
                        <Eye size={15} color={VC.ink} strokeWidth={2.2} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: VC.ink }}>View file</Text>
                      </TouchableOpacity>
                      <TouchableOpacity disabled={!!uploading} onPress={() => setPicking(name)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 12, backgroundColor: VC.orangeSoft, opacity: uploading ? 0.5 : 1 }}>
                        <RefreshCw size={14} color={VC.orange} strokeWidth={2.4} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: VC.orange }}>Replace</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Security + formats */}
          <View style={{ backgroundColor: '#F2F6FF', borderRadius: 20, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="#2563EB" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: VC.ink }}>Your documents are safe</Text>
                <Text style={{ fontSize: 12.5, color: VC.body, lineHeight: 18, marginTop: 2 }}>Files are shared only with our visa team for your application.</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { icon: Lock, label: 'Secure upload' },
                { icon: ShieldCheck, label: 'Restricted access' },
                { icon: Info, label: 'PDF, JPG, PNG · max 5 MB' },
              ].map((b) => (
                <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <b.icon size={12} color="#2563EB" strokeWidth={2.4} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: VC.ink }}>{b.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <VisaFooter whatsappMessage={`Hi MBGO, I need help with documents for my ${visa.country} visa application ${application.applicationId || ''}.`} label="Continue to Review" onPress={next} disabled={done < total || !!uploading} />

      {/* Source picker */}
      <Modal visible={!!picking} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setPicking(null)} style={{ flex: 1, backgroundColor: 'rgba(11,27,63,0.45)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 10 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 6 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: VC.ink }}>Upload {picking}</Text>
                {count > 1 && <Text style={{ fontSize: 13, color: VC.body, marginTop: 2 }}>For {nameOf(active)}</Text>}
              </View>
              <TouchableOpacity onPress={() => setPicking(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: VC.surface, alignItems: 'center', justifyContent: 'center' }}>
                <X size={17} color={VC.ink} />
              </TouchableOpacity>
            </View>
            {[
              { icon: FileUp, label: 'Choose file', sub: 'PDF, JPG or PNG', onPress: pickFile },
              { icon: Images, label: 'Choose from gallery', sub: 'Pick a photo or scan', onPress: () => pickImage(false) },
              ...(Platform.OS === 'web' ? [] : [{ icon: Camera, label: 'Take a photo', sub: 'Use your camera', onPress: () => pickImage(true) }]),
            ].map((o) => (
              <TouchableOpacity key={o.label} onPress={o.onPress} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, backgroundColor: VC.surface }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  <o.icon size={20} color={VC.orange} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: VC.ink }}>{o.label}</Text>
                  <Text style={{ fontSize: 12.5, color: VC.muted, marginTop: 1 }}>{o.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {toast.node}
    </View>
  );
}
