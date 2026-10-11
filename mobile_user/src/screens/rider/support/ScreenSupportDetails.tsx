import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Plus, X, Pencil, Info, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { uploadSupportPhoto, MAX_SUPPORT_PHOTOS, MAX_PHOTO_BYTES } from '../../../api/support.api';
import { useSupportStore } from '../../../store/useSupportStore';
import { useToast } from '../visa/visaUi';
import { SupportHeader, SupportHero, SupportStepper, SCard, BookingRow, issueLook, ContactButtons, VC } from './supportUi';

export default function ScreenSupportDetails({ onNavigate, onBack }: { onNavigate: (s: string) => void; onBack?: () => void }) {
  const service = useSupportStore((s) => s.service);
  const booking = useSupportStore((s) => s.booking);
  const issue = useSupportStore((s) => s.issue);
  const quickOptions = useSupportStore((s) => s.quickOptions);
  const description = useSupportStore((s) => s.description);
  const attachments = useSupportStore((s) => s.attachments);
  const patch = useSupportStore((s) => s.patch);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  if (!service || !issue) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ color: VC.body }}>Choose an issue first.</Text>
        <TouchableOpacity onPress={() => onNavigate('37')} style={{ paddingHorizontal: 18, height: 42, justifyContent: 'center', borderRadius: 12, backgroundColor: VC.orange }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Help & Support</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const look = issueLook(issue.key);

  const toggleQuick = (q: string) => patch({ quickOptions: quickOptions.includes(q) ? quickOptions.filter((x) => x !== q) : [...quickOptions, q] });

  const addPhotos = async (camera: boolean) => {
    const remaining = MAX_SUPPORT_PHOTOS - attachments.length;
    if (remaining <= 0) return toast.show(`Up to ${MAX_SUPPORT_PHOTOS} photos`);
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return toast.show('Camera permission is needed');
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: !camera, selectionLimit: remaining };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.length) return;
    setUploading(true);
    let next = [...useSupportStore.getState().attachments];
    try {
      for (const a of res.assets.slice(0, remaining)) {
        if (a.fileSize && a.fileSize > MAX_PHOTO_BYTES) {
          toast.show('A photo is larger than 5 MB and was skipped');
          continue;
        }
        const mime = a.mimeType || 'image/jpeg';
        const uploaded = await uploadSupportPhoto({ uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, mimeType: mime, size: a.fileSize });
        next = [...next, uploaded];
        patch({ attachments: next });
      }
    } catch {
      toast.show('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const next = () => {
    if (description.trim().length < 10) return toast.show('Please describe the issue (at least 10 characters)');
    if (uploading) return toast.show('Please wait for photos to finish uploading');
    onNavigate('support-review');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={Platform.OS !== 'web'}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ backgroundColor: '#FFFFFF', paddingBottom: 4 }}>
            <SupportHeader title={`${service.label} Support`} subtitle={`Get help with your ${service.label.toLowerCase()} booking`} onBack={onBack} />
            <SupportStepper current={2} />
            <SupportHero icon={look.icon} overline="STEP 2 OF 4" line1="Tell us more" line2="so we can help faster" sub="A few details and photos help us resolve it quickly." />
          </View>

          <View style={{ paddingHorizontal: 16, gap: 16, marginTop: 16 }}>
            {booking && (
              <SCard style={{ gap: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: VC.ink }}>Your Booking</Text>
                <BookingRow kind={booking.kind} title={booking.title} subtitle={booking.subtitle} code={booking.code} status={booking.status} />
              </SCard>
            )}

            <SCard style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: VC.ink }}>Selected Issue</Text>
                <TouchableOpacity onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Pencil size={14} color={VC.orange} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: VC.orange }}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: VC.hair, borderRadius: 14, padding: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <look.icon size={20} color={look.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: VC.ink }}>{issue.label}</Text>
                  <Text style={{ fontSize: 12.5, color: VC.body }}>{issue.hint}</Text>
                </View>
              </View>
            </SCard>

            <SCard style={{ gap: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: VC.ink }}>Tell us more</Text>
              {issue.quick.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: VC.ink }}>Quick options <Text style={{ fontWeight: '400', color: VC.muted }}>(optional)</Text></Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {issue.quick.map((q) => {
                      const on = quickOptions.includes(q);
                      return (
                        <TouchableOpacity key={q} onPress={() => toggleQuick(q)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: on ? VC.orange : '#E2E8F0', backgroundColor: on ? VC.orangeSoft : '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }}>
                          {on && <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: VC.orange, alignItems: 'center', justifyContent: 'center' }}><Check size={11} color="#FFFFFF" strokeWidth={3.5} /></View>}
                          <Text style={{ fontSize: 13, fontWeight: on ? '700' : '500', color: on ? VC.orange : VC.body }}>{q}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: VC.ink }}>Describe your issue <Text style={{ color: '#E5484D' }}>*</Text></Text>
                <TextInput
                  value={description}
                  onChangeText={(t) => patch({ description: t })}
                  multiline
                  maxLength={500}
                  placeholder="Please share what happened, so we can help you better..."
                  placeholderTextColor={VC.muted}
                  style={{ minHeight: 110, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 12, fontSize: 14, color: VC.ink, textAlignVertical: 'top' }}
                />
                <Text style={{ alignSelf: 'flex-end', fontSize: 11.5, color: VC.muted }}>{description.length}/500</Text>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: VC.ink }}>Add photos or screenshots <Text style={{ fontWeight: '400', color: VC.muted }}>(optional)</Text></Text>
                <Text style={{ fontSize: 12, color: VC.body }}>Upload images of the location, chat, or any other relevant details.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                  {attachments.length < MAX_SUPPORT_PHOTOS && (
                    <TouchableOpacity disabled={uploading} onPress={() => addPhotos(false)} style={{ width: 92, height: 92, borderRadius: 14, backgroundColor: '#FFF4EE', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {uploading ? <ActivityIndicator color={VC.orange} /> : <Plus size={22} color={VC.orange} />}
                      <Text style={{ fontSize: 11.5, fontWeight: '600', color: VC.orange }}>{uploading ? 'Uploading' : 'Add photos'}</Text>
                    </TouchableOpacity>
                  )}
                  {Platform.OS !== 'web' && attachments.length < MAX_SUPPORT_PHOTOS && (
                    <TouchableOpacity disabled={uploading} onPress={() => addPhotos(true)} style={{ width: 92, height: 92, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Camera size={22} color={VC.body} />
                      <Text style={{ fontSize: 11.5, color: VC.body }}>Camera</Text>
                    </TouchableOpacity>
                  )}
                  {attachments.map((a, i) => (
                    <View key={a.url} style={{ width: 92, height: 92, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                      <Image source={{ uri: a.url }} style={{ width: '100%', height: '100%' }} />
                      <TouchableOpacity onPress={() => patch({ attachments: attachments.filter((_, j) => j !== i) })} style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(11,27,63,0.8)', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={13} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <Text style={{ fontSize: 11.5, color: VC.muted }}>{attachments.length}/{MAX_SUPPORT_PHOTOS} · JPG or PNG, up to 5 MB each</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#FFF4EE', borderRadius: 12, padding: 12 }}>
                <Info size={16} color={VC.orange} />
                <Text style={{ flex: 1, fontSize: 12.5, color: '#9A3412' }}><Text style={{ fontWeight: '800' }}>Tip:</Text> Share clear photos or screenshots. This helps us resolve your issue faster.</Text>
              </View>
            </SCard>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={onBack} style={{ flex: 1, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ChevronLeft size={18} color={VC.ink} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: VC.ink }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={next} style={{ flex: 1, height: 52, borderRadius: 16, backgroundColor: VC.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>Continue</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ContactButtons context={`I need help with ${service.label}${booking ? ` (${booking.code})` : ''}`} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {toast.node}
    </View>
  );
}
