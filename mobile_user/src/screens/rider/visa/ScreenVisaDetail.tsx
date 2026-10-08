import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Modal, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
  ArrowLeft,
  Bell,
  Clock,
  Wallet,
  FileText,
  Headphones,
  ClipboardList,
  FileCheck2,
  Users,
  Check,
  Plus,
  Minus,
  X,
  BadgeCheck,
} from 'lucide-react-native';
import { getVisaBySlug, getVisaStartingPrice, getVisaServiceFeeFrom, getRequiredDocuments, getVisaImage, visaTypeLabel, type VisaCard } from '../../../api/visa.api';
import { htmlToText } from '../../../api/tour.api';
import { useVisaStore } from '../../../store/useVisaStore';
import { LoadingBlock, inr } from '../tours/tourUi';
import { VisaFooter, purposeIcon, VC, SHADOW } from './visaUi';

const TABS = ['Overview', 'Visa Types', 'Requirements', 'Process', 'FAQ'] as const;
const WHY = [
  { icon: Headphones, title: 'Expert guidance', text: 'Personal help from visa specialists', color: '#2563EB', bg: VC.blueSoft },
  { icon: ClipboardList, title: 'Transparent', text: 'Clear documents and fee structure', color: VC.orange, bg: VC.orangeSoft },
  { icon: FileCheck2, title: 'Document review', text: 'Complete checklist and expert check', color: '#7C3AED', bg: '#F3EEFF' },
  { icon: Users, title: 'End-to-end', text: 'From application to final approval', color: '#16A34A', bg: VC.greenSoft },
];

const bulletLines = (html?: string) =>
  htmlToText(html)
    .split('\n')
    .map((l) => l.replace(/^[•\-\s]+/, '').trim())
    .filter((l) => l.length > 2);

// One-line description per visa category (visa type tiles).
const purposeBlurb = (purpose: string | undefined, country: string) => {
  const p = (purpose || '').toLowerCase();
  if (p.includes('study') || p.includes('student')) return `Study at top universities in ${country}`;
  if (p.includes('work') || p.includes('employ')) return 'Work and build your career';
  if (p.includes('business')) return 'Meetings, conferences & trade';
  if (p.includes('pr') || p.includes('immigr')) return `Settle permanently in ${country}`;
  if (p.includes('transit')) return `Transit through ${country}`;
  return `Explore ${country} for leisure`;
};

function Tick() {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: VC.greenSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
      <Check size={12} color="#16A34A" strokeWidth={3} />
    </View>
  );
}

function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
      <Text style={{ flexShrink: 1, fontSize: 18, fontWeight: '700', color: VC.ink, letterSpacing: -0.3 }}>{title}</Text>
      {right}
    </View>
  );
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text style={{ fontSize: 13.5, fontWeight: '600', color: VC.orange }}>{label}</Text>
    </TouchableOpacity>
  );
}

// Shade over the hero photo: top for the buttons, bottom for the title.
function HeroShade() {
  return (
    <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="visaDetailHero" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0B1B3F" stopOpacity={0.35} />
          <Stop offset="0.3" stopColor="#0B1B3F" stopOpacity={0.05} />
          <Stop offset="0.55" stopColor="#0B1B3F" stopOpacity={0.2} />
          <Stop offset="1" stopColor="#0B1B3F" stopOpacity={0.88} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#visaDetailHero)" />
    </Svg>
  );
}

export default function ScreenVisaDetail({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const visa = useVisaStore((s) => s.visa);
  const setVisa = useVisaStore((s) => s.setVisa);
  const selection = useVisaStore((s) => s.selection);
  const setSelection = useVisaStore((s) => s.setSelection);
  const narrow = useWindowDimensions().width < 400;
  const [isLoading, setIsLoading] = useState(!visa?.faqs);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [reqTab, setReqTab] = useState<'eligibility' | 'documents'>('documents');
  const [sheet, setSheet] = useState<{ title: string; items: string[] } | null>(null);
  const [showAllFaq, setShowAllFaq] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});

  // Full page content (FAQs etc. aren't part of the list response).
  useEffect(() => {
    if (!visa?.slug) return;
    let cancelled = false;
    getVisaBySlug(visa.slug)
      .then((res) => {
        if (!cancelled && res.data.data) setVisa({ ...visa, ...res.data.data });
      })
      .catch(() => {})
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visa?.slug]);

  if (!visa) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 14, color: VC.body }}>Please choose a country first.</Text>
        <TouchableOpacity onPress={() => onNavigate('visa')} style={{ paddingHorizontal: 20, height: 42, justifyContent: 'center', borderRadius: 12, backgroundColor: VC.orange }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Browse visas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cards = visa.visas || [];
  const selectedCard: VisaCard | undefined = cards.find((c) => c._id === selection.selectedVisaId) || cards[0];
  const entry = selectedCard?.validityEntries?.[0] || selectedCard;
  const serviceFrom = getVisaServiceFeeFrom(visa, selectedCard);
  const totalFrom = getVisaStartingPrice(visa, selectedCard);
  const processing = entry?.processTime || visa.duration;
  const kind = selectedCard?.visaType || visa.visaType;
  const image = getVisaImage(visa);
  const about = htmlToText(visa.quickSummary || visa.excerpt || '');
  const eligibility = bulletLines(visa.eligibility);
  const docs = getRequiredDocuments(visa);
  const purposes = Array.from(new Set(cards.map((c) => c.visaPurpose).filter(Boolean) as string[]));
  const kinds = Array.from(new Set([visa.visaType, ...cards.map((c) => c.visaType)].filter(Boolean) as string[]));
  const faqs = visa.faqs || [];
  const reqItems = reqTab === 'documents' ? docs : eligibility;
  const steps = [
    { title: 'Eligibility check', text: 'Answer a few quick questions about your trip.' },
    { title: 'Upload documents', text: 'Passport, photo and the listed documents for each traveller.' },
    { title: 'Review & pay', text: 'Confirm your details and pay securely online.' },
    { title: 'Visa processing', text: visa.duration ? `Our experts file and track it — usually ${visa.duration}.` : 'Our experts file and track your application.' },
    { title: 'Receive visa & travel', text: 'Get your visa and enjoy your trip.' },
  ];

  const jump = (t: (typeof TABS)[number]) => {
    setTab(t);
    if (t === 'Overview') {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const y = offsets.current[t];
    // Section y is relative to the content container; the sticky tabs (~50px) sit above it.
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, (offsets.current.base || 0) + y - 60), animated: true });
  };
  const mark = (t: string) => (e: any) => {
    offsets.current[t] = e.nativeEvent.layout.y;
  };

  const apply = () => {
    if (!selection.selectedVisaId && cards[0]) setSelection({ selectedVisaId: cards[0]._id, selectedValidityIndex: 0, isExpress: false });
    onNavigate('visa-type');
  };

  const glassButton = { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center' as const, justifyContent: 'center' as const };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* Hero (edge to edge) */}
        <View style={{ height: narrow ? 300 : 330, backgroundColor: VC.ink }}>
          {!!image && <Image source={{ uri: image }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />}
          <HeroShade />
          <View style={{ position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            {onBack ? (
              <TouchableOpacity onPress={onBack} style={glassButton}>
                <ArrowLeft size={20} color={VC.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <TouchableOpacity onPress={() => onNavigate('38')} style={glassButton}>
              <Bell size={19} color={VC.ink} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 40 }}>
            <Text style={{ fontSize: narrow ? 30 : 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 }}>{visa.country} Visa</Text>
            <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.88)', marginTop: 4 }}>Explore new opportunities in {visa.country}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {[...(purposes.length ? purposes : ['Tourist']), ...kinds.slice(0, 1).map(visaTypeLabel)].map((label, i) => {
                const Icon = i < Math.max(purposes.length, 1) ? purposeIcon(label).icon : FileText;
                return (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
                    <Icon size={13} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>{label}</Text>
                  </View>
                );
              })}
              {!!visa.visaProcessed && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
                  <BadgeCheck size={13} color={VC.orange} strokeWidth={2.4} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: VC.ink }}>{visa.visaProcessed.toLocaleString('en-IN')}+ visas processed</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Tabs (sticky), on a rounded sheet over the photo */}
        <View style={{ marginTop: -24, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: VC.hair }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: narrow ? 8 : 12, flexGrow: 1, justifyContent: 'space-between' }}>
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <TouchableOpacity key={t} onPress={() => jump(t)} style={{ paddingHorizontal: narrow ? 5 : 10, paddingTop: 8, paddingBottom: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: narrow ? 12.5 : 14, fontWeight: active ? '700' : '500', color: active ? VC.ink : VC.muted }}>{t}</Text>
                  <View style={{ position: 'absolute', bottom: 0, height: 3, width: 22, borderRadius: 2, backgroundColor: active ? VC.orange : 'transparent' }} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View onLayout={(e) => (offsets.current.base = e.nativeEvent.layout.y)} style={{ paddingTop: 20, gap: 28 }}>
          {/* Key facts */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
            {[
              { icon: Clock, label: 'Processing', value: processing || 'As per embassy', note: visaTypeLabel(kind), color: '#2563EB', bg: VC.blueSoft },
              { icon: Wallet, label: serviceFrom ? 'Service fee' : 'Visa fee', value: inr((serviceFrom ?? totalFrom) || 0), note: serviceFrom ? '+ govt. fees' : 'all inclusive', color: VC.orange, bg: VC.orangeSoft, accent: true },
              { icon: FileText, label: 'Visa type', value: visaTypeLabel(kind) || 'Visa', note: kind === 'E-Visa' ? 'Apply online' : 'Embassy visa', color: '#16A34A', bg: VC.greenSoft },
            ].map((f) => (
              <View key={f.label} style={{ flex: 1, backgroundColor: VC.surface, borderRadius: 18, padding: 12, gap: 8 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: f.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <f.icon size={17} color={f.color} strokeWidth={2.2} />
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontSize: 11.5, color: VC.muted }}>{f.label}</Text>
                  <Text numberOfLines={2} style={{ fontSize: f.accent ? 17 : 14, fontWeight: '800', color: f.accent ? VC.orange : VC.ink, letterSpacing: -0.2 }}>{f.value}</Text>
                  {!!f.note && <Text numberOfLines={1} style={{ fontSize: 11, color: VC.muted }}>{f.note}</Text>}
                </View>
              </View>
            ))}
          </View>

          {/* Visa types */}
          <View onLayout={mark('Visa Types')}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionTitle title="Choose your visa" right={<Text style={{ fontSize: 12.5, color: VC.muted }}>{Math.max(cards.length, 1)} option{cards.length > 1 ? 's' : ''}</Text>} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
              {(cards.length ? cards : [undefined]).map((c, i) => {
                const look = purposeIcon(c?.visaPurpose);
                const active = !c || selectedCard?._id === c._id;
                return (
                  <TouchableOpacity
                    key={c?._id || i}
                    disabled={!c}
                    onPress={() => c && setSelection({ selectedVisaId: c._id, selectedValidityIndex: 0, isExpress: false })}
                    activeOpacity={0.9}
                    style={{ width: narrow ? 150 : 164, borderRadius: 18, borderWidth: 1.5, borderColor: active ? VC.orange : VC.hair, backgroundColor: active ? '#FFF8F4' : '#FFFFFF', padding: 14, gap: 10 }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <look.icon size={21} color={look.color} strokeWidth={2.2} />
                      </View>
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: active ? 0 : 1.5, borderColor: '#CBD5E1', backgroundColor: active ? VC.orange : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {active && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                    </View>
                    <View style={{ gap: 3 }}>
                      <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: VC.ink }}>{c?.visaPurpose || 'Standard'} Visa</Text>
                      <Text numberOfLines={2} style={{ fontSize: 12, color: VC.body, lineHeight: 16 }}>{purposeBlurb(c?.visaPurpose, visa.country)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* About */}
          {!!about && (
            <View style={{ paddingHorizontal: 20 }}>
              <SectionTitle title={`About ${visa.country} visa`} />
              <Text numberOfLines={aboutOpen ? undefined : 4} style={{ fontSize: 14, color: VC.body, lineHeight: 22 }}>{about}</Text>
              <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                <LinkButton label={aboutOpen ? 'Show less' : 'Read more'} onPress={() => setAboutOpen((v) => !v)} />
              </View>
            </View>
          )}

          {/* Requirements */}
          <View onLayout={mark('Requirements')} style={{ paddingHorizontal: 16 }}>
            <View style={{ paddingHorizontal: 4 }}>
              <SectionTitle title="Requirements" />
            </View>
            <View style={{ flexDirection: 'row', backgroundColor: VC.surface, borderRadius: 14, padding: 4, marginBottom: 16 }}>
              {([
                ['documents', `Documents (${docs.length})`],
                ['eligibility', 'Eligibility'],
              ] as const).map(([key, label]) => {
                const active = reqTab === key;
                return (
                  <TouchableOpacity key={key} onPress={() => setReqTab(key)} style={{ flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? '#FFFFFF' : 'transparent', ...(active ? SHADOW : {}) }}>
                    <Text style={{ fontSize: 13.5, fontWeight: active ? '700' : '500', color: active ? VC.ink : VC.muted }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ gap: 12, paddingHorizontal: 4 }}>
              {reqItems.length === 0 && <Text style={{ fontSize: 13.5, color: VC.muted }}>Our visa experts will share the details with you.</Text>}
              {reqItems.slice(0, 5).map((l, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  <Tick />
                  <Text numberOfLines={3} style={{ flex: 1, fontSize: 14, color: VC.body, lineHeight: 21 }}>{l}</Text>
                </View>
              ))}
              {reqItems.length > 5 && (
                <View style={{ alignSelf: 'flex-start' }}>
                  <LinkButton label={`View all ${reqItems.length}`} onPress={() => setSheet({ title: reqTab === 'documents' ? 'Required documents' : 'Eligibility', items: reqItems })} />
                </View>
              )}
            </View>
          </View>

          {/* Why MBGO */}
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ paddingHorizontal: 4 }}>
              <SectionTitle
                title="Why choose MBGO"
                right={
                  visa.visaProcessed ? (
                    <View style={{ backgroundColor: VC.orangeSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '600', color: VC.orange }}>{visa.visaProcessed.toLocaleString('en-IN')}+ happy customers</Text>
                    </View>
                  ) : undefined
                }
              />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
              {WHY.map((w) => (
                <View key={w.title} style={{ width: '48.6%', backgroundColor: VC.surface, borderRadius: 18, padding: 14, gap: 8 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: w.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <w.icon size={19} color={w.color} strokeWidth={2.2} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: VC.ink }}>{w.title}</Text>
                  <Text style={{ fontSize: 12, color: VC.body, lineHeight: 17 }}>{w.text}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Process */}
          <View onLayout={mark('Process')} style={{ paddingHorizontal: 20 }}>
            <SectionTitle title="How it works" />
            {steps.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: i === 0 ? VC.orange : '#FFFFFF', borderWidth: i === 0 ? 0 : 1.5, borderColor: '#D5DCE7', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: i === 0 ? '#FFFFFF' : VC.ink }}>{i + 1}</Text>
                  </View>
                  {i < steps.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 16, backgroundColor: VC.hair, marginVertical: 3 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: i < steps.length - 1 ? 16 : 0, paddingTop: 4 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: VC.ink }}>{s.title}</Text>
                  <Text style={{ fontSize: 13, color: VC.body, lineHeight: 19, marginTop: 2 }}>{s.text}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* FAQ */}
          <View onLayout={mark('FAQ')} style={{ paddingHorizontal: 20 }}>
            {isLoading ? (
              <LoadingBlock label="Loading details..." />
            ) : faqs.length > 0 ? (
              <>
                <SectionTitle title="Frequently asked" />
                <View style={{ borderTopWidth: 1, borderTopColor: VC.hair }}>
                  {(showAllFaq ? faqs : faqs.slice(0, 4)).map((f, i) => {
                    const open = openFaq === i;
                    return (
                      <TouchableOpacity key={i} onPress={() => setOpenFaq(open ? null : i)} activeOpacity={0.8} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: VC.hair, gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: VC.ink, lineHeight: 20 }}>{f.question}</Text>
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: open ? VC.orangeSoft : VC.surface, alignItems: 'center', justifyContent: 'center' }}>
                            {open ? <Minus size={14} color={VC.orange} strokeWidth={2.6} /> : <Plus size={14} color={VC.ink} strokeWidth={2.6} />}
                          </View>
                        </View>
                        {open && <Text style={{ fontSize: 13.5, color: VC.body, lineHeight: 21 }}>{htmlToText(f.answer)}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {faqs.length > 4 && (
                  <TouchableOpacity onPress={() => setShowAllFaq((v) => !v)} style={{ marginTop: 14, height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: VC.ink }}>{showAllFaq ? 'Show fewer questions' : `View all ${faqs.length} questions`}</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <VisaFooter whatsappMessage={`Hi MBGO, I need help with a ${visa.country} visa.`} label="Check Eligibility & Apply" onPress={apply} />

      {/* "View all" sheet */}
      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setSheet(null)} style={{ flex: 1, backgroundColor: 'rgba(11,27,63,0.45)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} style={{ maxHeight: '75%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 14 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: VC.ink }}>{sheet?.title}</Text>
              <TouchableOpacity onPress={() => setSheet(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: VC.surface, alignItems: 'center', justifyContent: 'center' }}>
                <X size={17} color={VC.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {sheet?.items.map((l, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  <Tick />
                  <Text style={{ flex: 1, fontSize: 14, color: VC.body, lineHeight: 21 }}>{l}</Text>
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
