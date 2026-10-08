import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Headphones, ClipboardList, Pencil, Clock, Coins, Zap, ArrowRight } from 'lucide-react-native';
import {
  previewVisaFee,
  getVisaEntry,
  canExpress,
  getVisaImage,
  visaCardTitle,
  visaEntryLabel,
  visaTypeLabel,
  type VisaCard,
} from '../../../api/visa.api';
import { useVisaStore } from '../../../store/useVisaStore';
import { TourHeader, inr } from '../tours/tourUi';
import { Card, CardTitle, FlagBadge, VisaFooter, VisaStepper, PageTitle, RadioDot, purposeIcon, stepSubtitles, openWhatsApp, useToast, NAVY, ORANGE, MUTED, BORDER, BLUE } from './visaUi';

export default function ScreenVisaType({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const visa = useVisaStore((s) => s.visa);
  const selection = useVisaStore((s) => s.selection);
  const setSelection = useVisaStore((s) => s.setSelection);
  const application = useVisaStore((s) => s.application);
  const toast = useToast();

  if (!visa) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' }}>
        <Text style={{ color: MUTED }}>Please choose a country first.</Text>
        <TouchableOpacity onPress={() => onNavigate('visa')} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: ORANGE }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Browse visas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cards = visa.visas || [];
  const card: VisaCard | undefined = cards.find((c) => c._id === selection.selectedVisaId);
  const entry = getVisaEntry(card, selection.selectedValidityIndex);
  const expressAvailable = canExpress(card, entry);
  const express = selection.isExpress && expressAvailable;
  const fee = previewVisaFee(visa, card, selection.selectedValidityIndex, express);
  const processing = (express ? entry?.expressVisaDuration : undefined) || entry?.processTime || visa.duration;
  const locked = application?.paymentInfo?.status === 'Paid';
  const image = getVisaImage(visa);

  const pickCard = (c: VisaCard) => {
    if (locked) return;
    setSelection({ selectedVisaId: c._id, selectedValidityIndex: 0, isExpress: false });
  };

  const next = () => {
    if (cards.length > 0 && !card) {
      toast.show('Please choose a visa type');
      return;
    }
    if (!(fee.total > 0)) {
      toast.show('Fees for this option are not available yet. Please chat with us on WhatsApp.');
      return;
    }
    if (selection.isExpress && !expressAvailable) setSelection({ isExpress: false });
    onNavigate('visa-eligibility');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#FFFFFF' }}>
          <TourHeader onBack={onBack} onBell={() => onNavigate('38')} />
          <VisaStepper current={2} subtitles={stepSubtitles(visa, card)} />
        </View>
        <PageTitle title={`${visa.country} Visa Application`} subtitle="What type of visa do you need?" />

        <View style={{ paddingHorizontal: 14, gap: 12 }}>
          {/* Journey banner */}
          <View style={{ height: 132, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1E3A8A' }}>
            {!!image && <Image source={{ uri: image }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />}
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(11,30,61,0.5)' }} />
            <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 3 }}>
              <Text style={{ fontSize: 21, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 }}>Your {visa.country} Journey{'\n'}Starts Here</Text>
              <Text style={{ fontSize: 12, color: '#E2E8F0' }}>We make your visa process simple and hassle-free.</Text>
            </View>
          </View>

          {/* Visa types */}
          {cards.length === 0 ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: ORANGE, backgroundColor: '#FFF7F2' }}>
              <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={24} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '700', color: NAVY }}>{visaTypeLabel(visa.visaType) || 'Standard Visa'}</Text>
                <Text style={{ fontSize: 12.5, color: MUTED }}>{visa.duration ? `Processing ${visa.duration}` : 'Standard processing'}</Text>
              </View>
              <RadioDot active />
            </Card>
          ) : (
            cards.map((c) => {
              const active = c._id === card?._id;
              const look = purposeIcon(c.visaPurpose);
              const entries = c.validityEntries?.length ? c.validityEntries : [c];
              return (
                <View key={c._id} style={{ borderRadius: 16, borderWidth: active ? 1.5 : 1, borderColor: active ? ORANGE : BORDER, backgroundColor: active ? '#FFF7F2' : '#FFFFFF', overflow: 'hidden' }}>
                  <TouchableOpacity onPress={() => pickCard(c)} activeOpacity={0.85} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <look.icon size={24} color={look.color} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15.5, fontWeight: '700', color: NAVY }}>{visaCardTitle(c)}</Text>
                      <Text style={{ fontSize: 12.5, color: MUTED, lineHeight: 17 }}>
                        {[visaTypeLabel(c.visaType), entries.length > 1 ? `${entries.length} validity options` : visaEntryLabel(entries[0])].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <RadioDot active={active} />
                  </TouchableOpacity>

                  {/* Validity options + express for the chosen type */}
                  {active && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                      {entries.length > 1 && <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Choose validity</Text>}
                      {entries.length > 1 &&
                        entries.map((e, i) => {
                          const on = selection.selectedValidityIndex === i;
                          const p = previewVisaFee(visa, c, i, false).total;
                          return (
                            <TouchableOpacity
                              key={e._id || i}
                              disabled={locked}
                              onPress={() => setSelection({ selectedValidityIndex: i, isExpress: false })}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: on ? ORANGE : BORDER, backgroundColor: '#FFFFFF', padding: 10 }}
                            >
                              <RadioDot active={on} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: NAVY }}>{visaEntryLabel(e) || `Option ${i + 1}`}</Text>
                                {!!e.processTime && <Text style={{ fontSize: 11.5, color: MUTED }}>Processing {e.processTime}</Text>}
                              </View>
                              <Text style={{ fontSize: 13.5, fontWeight: '800', color: p > 0 ? ORANGE : MUTED }}>{p > 0 ? inr(p) : 'N/A'}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      {expressAvailable && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 10 }}>
                          <Zap size={16} color={ORANGE} fill={ORANGE} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: NAVY }}>Express processing</Text>
                            <Text style={{ fontSize: 11.5, color: MUTED }}>{entry?.expressVisaDuration ? `Get it in ${entry.expressVisaDuration}` : 'Faster processing'} · {inr(previewVisaFee(visa, c, selection.selectedValidityIndex, true).total)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 999, padding: 3 }}>
                            {[false, true].map((v) => (
                              <TouchableOpacity key={String(v)} disabled={locked} onPress={() => setSelection({ isExpress: v })} style={{ paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: express === v ? ORANGE : 'transparent' }}>
                                <Text style={{ fontSize: 11.5, fontWeight: '700', color: express === v ? '#FFFFFF' : '#475569' }}>{v ? 'Express' : 'Standard'}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* Help */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#DBEAFE' }}>
            <Headphones size={30} color={BLUE} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: NAVY }}>Not sure which visa is right for you?</Text>
              <Text style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>Get free guidance from our visa specialists.</Text>
            </View>
            <TouchableOpacity onPress={() => openWhatsApp(`Hi MBGO, which ${visa.country} visa is right for me?`)} style={{ borderWidth: 1.2, borderColor: BLUE, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: BLUE }}>Ask an Expert</Text>
              <ArrowRight size={13} color={BLUE} />
            </TouchableOpacity>
          </View>

          {/* Summary */}
          <Card style={{ gap: 12 }}>
            <CardTitle
              icon={ClipboardList}
              title="Application Summary"
              right={
                <TouchableOpacity onPress={() => onNavigate('visa')} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: ORANGE }}>Edit Country</Text>
                  <Pencil size={12} color={ORANGE} />
                </TouchableOpacity>
              }
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FlagBadge country={visa.country} size={22} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: MUTED }}>Country</Text>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: NAVY }}>{visa.country}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: MUTED }}>Selected Visa Type</Text>
                <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', color: NAVY }}>{card ? visaCardTitle(card) : visaTypeLabel(visa.visaType) || 'Standard Visa'}{express ? ' · Express' : ''}</Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: '#F1F5F9' }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                <Clock size={20} color={BLUE} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: MUTED }}>Estimated Processing</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: NAVY }}>{processing || 'As per embassy'}</Text>
                </View>
              </View>
              <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                <Coins size={20} color={ORANGE} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: MUTED }}>Visa Fee (per person)</Text>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: ORANGE }}>{fee.total > 0 ? inr(fee.total) : 'N/A'}</Text>
                  <Text style={{ fontSize: 10, color: MUTED }}>Incl. government fee & GST</Text>
                </View>
              </View>
            </View>
          </Card>
          {locked && <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center' }}>The visa option can't be changed after payment.</Text>}
        </View>
      </ScrollView>

      <VisaFooter whatsappMessage={`Hi MBGO, I need help with a ${visa.country} visa.`} label="Continue to Eligibility Check" onPress={next} />
      {toast.node}
    </View>
  );
}
