import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Share, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import {
  ArrowLeft,
  Share2,
  MapPin,
  Calendar,
  Hotel,
  Car,
  Utensils,
  Binoculars,
  UserCheck,
  ShieldCheck,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ArrowRight,
  Images,
  Sparkles,
  Info,
  Users,
  BedDouble,
  Receipt,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
  FileText,
  User,
} from 'lucide-react-native';
import {
  getTourPackageById,
  getTourImages,
  getTourStartingPrice,
  getTourPageUrl,
  htmlToText,
  previewTourPrice,
  TOUR_ROOM_TYPES,
  TOUR_ROOM_LABEL,
  type TourPackage,
  type TourBatch,
  type TourTravellers,
  type TourAddOnPick,
} from '../../../api/tour.api';
import { useTourStore } from '../../../store/useTourStore';
import { inr, InAppBrowser, LoadingBlock, PhotoPlaceholder } from './tourUi';

const TABS = ['Overview', 'Itinerary', 'Inclusions', 'Exclusions', 'Dates & Pricing'] as const;
type Tab = (typeof TABS)[number];

// Feature icons are only shown when the package's inclusions mention them.
const FEATURES = [
  { label: 'Hotels', icon: Hotel, match: /hotel|stay|accommodation|camp|resort/i, bg: '#EFF6FF', color: '#2563EB' },
  { label: 'Transfers', icon: Car, match: /transport|transfer|vehicle|cab|tempo|coach|bus/i, bg: '#EEF2FF', color: '#4F46E5' },
  { label: 'Meals', icon: Utensils, match: /meal|breakfast|dinner|lunch/i, bg: '#F5F3FF', color: '#7C3AED' },
  { label: 'Sightseeing', icon: Binoculars, match: /sightseeing|excursion|visit/i, bg: '#EFF6FF', color: '#2563EB' },
  { label: 'Tour Guide', icon: UserCheck, match: /guide|coordinator|captain|escort/i, bg: '#FFF7ED', color: '#EA580C' },
];


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

function ListRow({ text, kind }: { text: string; kind: 'check' | 'cross' }) {
  const isCheck = kind === 'check';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      {isCheck ? (
        <CheckCircle2 size={18} color="#16A34A" strokeWidth={2} style={{ marginTop: 1 }} />
      ) : (
        <XCircle size={18} color="#EF4444" strokeWidth={2} style={{ marginTop: 1 }} />
      )}
      <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '400', color: '#334155', lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

function Card({ title, icon, subtitle, children, tint }: { title?: string; icon?: React.ReactNode; subtitle?: string; children: React.ReactNode; tint?: { bg: string; border: string } }) {
  return (
    <View style={{ backgroundColor: tint?.bg || '#FFFFFF', borderWidth: 1, borderColor: tint?.border || '#EEF2F6', borderRadius: 16, padding: 16, gap: 12 }}>
      {!!title && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {icon}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0B1E3D' }}>{title}</Text>
            {!!subtitle && <Text style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{subtitle}</Text>}
          </View>
        </View>
      )}
      {children}
    </View>
  );
}

function Stepper({ label, hint, value, min, max, onChange }: { label?: string; hint?: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const btn = (enabled: boolean, onPress: () => void, Icon: any) => (
    <TouchableOpacity onPress={onPress} disabled={!enabled} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: enabled ? '#FED7C3' : '#E2E8F0', backgroundColor: enabled ? '#FFF5EF' : '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={16} color={enabled ? '#FF4500' : '#CBD5E1'} strokeWidth={2.4} />
    </TouchableOpacity>
  );
  const controls = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {btn(value > min, () => onChange(value - 1), Minus)}
      <Text style={{ minWidth: 18, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#0F172A' }}>{value}</Text>
      {btn(value < max, () => onChange(value + 1), Plus)}
    </View>
  );
  if (!label) return controls;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
        {label} <Text style={{ fontSize: 12, fontWeight: '400', color: '#64748B' }}>{hint}</Text>
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {btn(value > min, () => onChange(value - 1), Minus)}
        <Text style={{ minWidth: 18, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#0F172A' }}>{value}</Text>
        {btn(value < max, () => onChange(value + 1), Plus)}
      </View>
    </View>
  );
}

export default function ScreenTourDetail({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  const { width } = useWindowDimensions();
  const initial = useTourStore((s) => s.selectedPackage);
  const savedSelection = useTourStore((s) => s.selection);
  const setSelection = useTourStore((s) => s.setSelection);
  const [pkg, setPkg] = useState<TourPackage | null>(initial);
  const [isLoading, setIsLoading] = useState(!initial);
  const [tab, setTab] = useState<Tab>('Overview');
  const [imageIndex, setImageIndex] = useState(0);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const galleryRef = useRef<ScrollView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [tabsY, setTabsY] = useState(0);

  // Booking selection (Dates & Pricing)
  const [batchId, setBatchId] = useState<string | null>(savedSelection?.batch._id || null);
  const [month, setMonth] = useState<string | null>(savedSelection ? monthKey(savedSelection.batch.startDate) : null);
  // Travellers per room type, like the website's booking page (types can be mixed).
  const [travellers, setTravellers] = useState<TourTravellers>(savedSelection?.travellers || { quad: 0, triple: 0, double: 0, child: 0 });
  // Special add-ons, like the website: pick an item + no. of people.
  const [addOns, setAddOns] = useState<TourAddOnPick[]>(savedSelection?.addOns || []);
  const [addOnPeople, setAddOnPeople] = useState<Record<string, number>>({});

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    if (!initial?._id) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    getTourPackageById(initial._id)
      .then((res) => {
        if (!cancelled && res.data?.data) setPkg(res.data.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initial?._id]);

  const images = useMemo(() => (pkg ? getTourImages(pkg) : []), [pkg]);
  const price = pkg ? getTourStartingPrice(pkg) : null;
  const about = useMemo(() => htmlToText(pkg?.description), [pkg?.description]);
  const features = useMemo(() => {
    const text = (pkg?.inclusions || []).join(' ');
    return FEATURES.filter((f) => f.match.test(text));
  }, [pkg?.inclusions]);

  // Bookable departures: start in the future and have an adult price.
  const upcomingBatches = useMemo(() => {
    const now = Date.now();
    return (pkg?.batch || [])
      .filter((b) => new Date(b.startDate).getTime() > now && (b.quad || b.triple || b.double))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [pkg?.batch]);
  const months = useMemo(() => Array.from(new Set(upcomingBatches.map((b) => monthKey(b.startDate)))), [upcomingBatches]);
  const activeMonth = month && months.includes(month) ? month : months[0] || null;
  const monthBatches = upcomingBatches.filter((b) => monthKey(b.startDate) === activeMonth);
  const selectedBatch: TourBatch | undefined = upcomingBatches.find((b) => b._id === batchId);
  // Only room types this departure has a price for; counts for others are ignored.
  const roomTypes = selectedBatch ? TOUR_ROOM_TYPES.filter((t) => Number(selectedBatch[t]) > 0) : [];
  const effectiveTravellers: TourTravellers = {
    quad: roomTypes.includes('quad') ? travellers.quad : 0,
    triple: roomTypes.includes('triple') ? travellers.triple : 0,
    double: roomTypes.includes('double') ? travellers.double : 0,
    child: roomTypes.includes('child') ? travellers.child : 0,
  };
  const quote = selectedBatch ? previewTourPrice(selectedBatch, effectiveTravellers, addOns) : null;

  // Like the website, the first upcoming departure is selected by default.
  useEffect(() => {
    if (!batchId && upcomingBatches[0]) setBatchId(upcomingBatches[0]._id);
  }, [batchId, upcomingBatches]);

  const goBack = () => (onBack ? onBack() : onNavigate('tour-list'));

  if (!pkg) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ padding: 14 }}>
          <TouchableOpacity onPress={goBack} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
        {isLoading ? <LoadingBlock label="Loading package..." /> : <Text style={{ textAlign: 'center', color: '#64748B', marginTop: 40 }}>Package not found.</Text>}
      </View>
    );
  }

  const durationText = pkg.duration?.days ? `${pkg.duration.nights ?? pkg.duration.days - 1} Nights / ${pkg.duration.days} Days` : null;
  const place = pkg.destination?.name?.trim();
  const heroHeight = Math.round(width * 0.6);

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== imageIndex) setImageIndex(i);
  };
  const jumpToImage = (i: number) => {
    galleryRef.current?.scrollTo({ x: i * width, animated: true });
    setImageIndex(i);
  };

  const sharePackage = () => {
    Share.share({ message: `${pkg.title} – ${getTourPageUrl(pkg)}` }).catch(() => {});
  };

  const openTab = (t: Tab) => {
    setTab(t);
    if (tabsY) scrollRef.current?.scrollTo({ y: tabsY, animated: true });
  };

  const handleBookNow = () => {
    if (upcomingBatches.length === 0) {
      showToast('No upcoming departures — tap Enquire and we will help you plan dates.');
      return;
    }
    if (!selectedBatch || !quote) {
      openTab('Dates & Pricing');
      showToast('Pick a travel date to continue');
      return;
    }
    if (quote.adults + quote.children < 1 || quote.total <= 0) {
      openTab('Dates & Pricing');
      showToast('Please select travellers');
      return;
    }
    setSelection({ batch: selectedBatch, travellers: effectiveTravellers, addOns });
    onNavigate('tour-checkout');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <View style={{ width, height: heroHeight, backgroundColor: '#E2E8F0' }}>
          {images.length === 0 && <PhotoPlaceholder large />}
          {images.length > 0 && (
            <ScrollView ref={galleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onGalleryScroll} onScroll={onGalleryScroll} scrollEventThrottle={64}>
              {images.map((uri) => (
                <Image key={uri} source={{ uri }} style={{ width, height: heroHeight }} resizeMode="cover" />
              ))}
            </ScrollView>
          )}
          <View style={{ position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={goBack} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={18} color="#0F172A" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={sharePackage} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' }}>
              <Share2 size={17} color="#0F172A" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {!!place && (
            <View style={{ position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,42,0.72)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
              <MapPin size={12} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>{place}</Text>
            </View>
          )}
          {images.length > 1 && (
            <View style={{ position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,23,42,0.72)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }}>
              <Images size={12} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>{imageIndex + 1}/{images.length}</Text>
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#FFFFFF' }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
            {images.map((uri, i) => (
              <TouchableOpacity key={uri} onPress={() => jumpToImage(i)} activeOpacity={0.85} style={{ width: 78, height: 56, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: i === imageIndex ? '#FF4500' : 'transparent' }}>
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Title + price */}
        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0B1E3D', letterSpacing: -0.4, lineHeight: 26 }}>{pkg.title}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                {!!durationText && <Text style={{ fontSize: 13, fontWeight: '500', color: '#475569' }}>{durationText}</Text>}
                {pkg.isBestSeller && (
                  <View style={{ backgroundColor: '#FFF5EF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#EA580C' }}>Bestseller</Text>
                  </View>
                )}
              </View>
            </View>
            {price !== null && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>Starting from</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#FF4500', letterSpacing: -0.5 }}>{inr(price)}</Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>per person</Text>
                <Text style={{ fontSize: 10, fontWeight: '500', color: '#94A3B8', marginTop: 1 }}>+ 5% GST</Text>
              </View>
            )}
          </View>

          {features.length > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14, marginTop: 2 }}>
              {[...features, { label: '24x7 Support', icon: ShieldCheck, bg: '#ECFDF5', color: '#059669' }].map((f) => {
                const Icon = f.icon;
                return (
                  <View key={f.label} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: f.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={f.color} strokeWidth={2} />
                    </View>
                    <Text style={{ fontSize: 10.5, fontWeight: '500', color: '#334155', textAlign: 'center' }} numberOfLines={1}>{f.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Tabs */}
        <View onLayout={(e) => setTabsY(e.nativeEvent.layout.y)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEF2F6' }} contentContainerStyle={{ paddingHorizontal: 8 }}>
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 12, paddingVertical: 13, borderBottomWidth: 2.5, borderBottomColor: active ? '#FF4500' : 'transparent' }}>
                  <Text style={{ fontSize: 13.5, fontWeight: active ? '700' : '500', color: active ? '#FF4500' : '#475569' }}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ padding: 14, gap: 12 }}>
          {tab === 'Overview' && (
            <>
              {(pkg.highlights || []).length > 0 && (
                <Card title="Trip Highlights" icon={<Sparkles size={20} color="#FF4500" strokeWidth={2} />}>
                  {pkg.highlights!.map((h, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#FF4500', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 13.5, color: '#334155', lineHeight: 20 }}>{h}</Text>
                    </View>
                  ))}
                </Card>
              )}
              {!!about && (
                <Card title="About This Package" icon={<Info size={20} color="#2563EB" strokeWidth={2} />}>
                  <Text style={{ fontSize: 13.5, color: '#334155', lineHeight: 21 }} numberOfLines={showFullAbout ? undefined : 5}>{about}</Text>
                  {about.length > 260 && (
                    <TouchableOpacity onPress={() => setShowFullAbout((v) => !v)}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#FF4500' }}>{showFullAbout ? 'View less' : 'View more'}</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              )}
              {(pkg.faqs || []).length > 0 && (
                <Card title="FAQs">
                  {pkg.faqs!.map((f, i) => {
                    const open = openFaq === i;
                    return (
                      <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: '#F1F5F9', paddingTop: i ? 12 : 0 }}>
                        <TouchableOpacity onPress={() => setOpenFaq(open ? null : i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>{f.question.replace(/^\d+\.\s*/, '')}</Text>
                          <ChevronDown size={16} color="#94A3B8" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>
                        {open && <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginTop: 8 }}>{htmlToText(f.answer)}</Text>}
                      </View>
                    );
                  })}
                </Card>
              )}
            </>
          )}

          {tab === 'Itinerary' && (
            (pkg.itinerary || []).length === 0 ? (
              <Card><Text style={{ fontSize: 13.5, color: '#64748B' }}>Itinerary details will be shared on enquiry.</Text></Card>
            ) : (
              <View>
                {pkg.itinerary!.map((day, i) => {
                  const open = openDay === i;
                  const isLast = i === pkg.itinerary!.length - 1;
                  const title = (day.title || `Day ${i + 1}`).replace(/^Day\s*\d+\s*[:\-–]\s*/i, '');
                  const lines = htmlToText(day.description).split('\n').map((l) => l.trim().replace(/^[-•*–]\s*/, '')).filter(Boolean);
                  return (
                    <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                      {/* timeline */}
                      <View style={{ width: 16, alignItems: 'center' }}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: '#FF4500', backgroundColor: '#FFFFFF', marginTop: 16 }} />
                        {!isLast && <View style={{ flex: 1, width: 1.5, backgroundColor: '#FED7C3', marginTop: 2 }} />}
                      </View>
                      <TouchableOpacity activeOpacity={0.9} onPress={() => setOpenDay(open ? null : i)} style={{ flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 14, padding: 12, gap: 10, marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                          <View style={{ backgroundColor: '#FFF5EF', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF4500' }}>Day {i + 1}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#0B1E3D', lineHeight: 19, marginTop: 3 }}>{title}</Text>
                          <ChevronDown size={16} color="#64748B" style={{ marginTop: 4, transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
                        </View>
                        {open && (
                          <>
                            {lines.map((line, j) => (
                              <View key={j} style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#94A3B8', marginTop: 8 }} />
                                <Text style={{ flex: 1, fontSize: 13, color: '#475569', lineHeight: 20 }}>{line}</Text>
                              </View>
                            ))}
                            {!!day.locationImage?.url && (
                              <Image source={{ uri: day.locationImage.url }} style={{ width: '100%', height: 150, borderRadius: 12, marginTop: 2 }} resizeMode="cover" />
                            )}
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )
          )}

          {tab === 'Inclusions' && (
            <Card title="Inclusions" subtitle="What's included in this package" icon={<CheckCircle2 size={26} color="#16A34A" strokeWidth={2} />} tint={{ bg: '#F0FDF4', border: '#DCFCE7' }}>
              {(pkg.inclusions || []).length ? pkg.inclusions!.map((t, i) => <ListRow key={i} text={t} kind="check" />) : <Text style={{ color: '#64748B' }}>Details will be shared on enquiry.</Text>}
            </Card>
          )}

          {tab === 'Exclusions' && (
            <>
              <Card title="Exclusions" subtitle="What's not included in this package" icon={<Info size={24} color="#2563EB" strokeWidth={2} />} tint={{ bg: '#EFF6FF', border: '#DBEAFE' }}>
                {(pkg.exclusions || []).length ? pkg.exclusions!.map((t, i) => <ListRow key={i} text={t} kind="cross" />) : <Text style={{ color: '#64748B' }}>Details will be shared on enquiry.</Text>}
              </Card>
              <View style={{ backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 14, padding: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} color="#EA580C" strokeWidth={2} />
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#C2410C' }}>Important notes</Text>
                </View>
                {['Rates are subject to availability at the time of booking.', 'Prices are per person and exclude 5% GST.', 'Carry a valid ID proof for all travellers.'].map((n) => (
                  <Text key={n} style={{ fontSize: 12.5, color: '#9A3412', lineHeight: 18 }}>• {n}</Text>
                ))}
              </View>
            </>
          )}

          {tab === 'Dates & Pricing' && (
            upcomingBatches.length === 0 ? (
              <Card><Text style={{ fontSize: 13.5, color: '#64748B' }}>No upcoming departures listed. Tap Enquire and we'll plan dates for you.</Text></Card>
            ) : (
              <>
                <Card title="Select Your Travel Date" subtitle="Choose your preferred departure" icon={<Calendar size={22} color="#2563EB" strokeWidth={2} />}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {months.map((m) => {
                      const [y, mo] = m.split('-').map(Number);
                      const active = m === activeMonth;
                      return (
                        <TouchableOpacity key={m} onPress={() => setMonth(m)} style={{ width: 62, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: active ? '#FF4500' : '#F8FAFC', borderWidth: 1, borderColor: active ? '#FF4500' : '#EEF2F6' }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : '#0F172A' }}>{MONTHS[mo]}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '500', color: active ? '#FFEDD5' : '#64748B' }}>{y}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {monthBatches.map((b) => {
                      const d = new Date(b.startDate);
                      const active = b._id === batchId;
                      const from = Math.min(...[b.quad, b.triple, b.double].map((v) => Number(v) || Infinity));
                      return (
                        <TouchableOpacity key={b._id} onPress={() => setBatchId(b._id)} style={{ width: 92, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', gap: 2, borderWidth: active ? 2 : 1, borderColor: active ? '#FF4500' : '#EEF2F6', backgroundColor: active ? '#FFF5EF' : '#FFFFFF' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{d.getDate()} {MONTHS[d.getMonth()]}</Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>{WEEKDAYS[d.getDay()]}</Text>
                          {Number.isFinite(from) && <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF4500', marginTop: 2 }}>{inr(from)}</Text>}
                          <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#16A34A' }}>● Available</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {!selectedBatch && <Text style={{ fontSize: 12, color: '#64748B' }}>Tap a date to see prices for it.</Text>}
                </Card>

                {selectedBatch && (
                  <>
                    <Card title="Room Type" subtitle="Add travellers to one or more room types" icon={<BedDouble size={22} color="#2563EB" strokeWidth={2} />}>
                      {roomTypes.map((type) => {
                        const unit = Number(selectedBatch[type]);
                        const isChild = type === 'child';
                        const people = type === 'quad' ? 4 : type === 'triple' ? 3 : type === 'double' ? 2 : 1;
                        return (
                          <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: travellers[type] > 0 ? '#FED7C3' : '#EEF2F6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 }}>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#0F172A' }}>{TOUR_ROOM_LABEL[type]}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                {Array.from({ length: people }).map((_, i) => (
                                  <User key={i} size={13} color="#334155" strokeWidth={2} />
                                ))}
                                {isChild && <Text style={{ fontSize: 11.5, color: '#64748B', marginLeft: 3 }}>Child up to 12 years</Text>}
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FF4500' }}>{inr(unit)}<Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}> /person</Text></Text>
                            </View>
                            <Stepper value={travellers[type]} min={0} max={20} onChange={(n) => setTravellers((cur) => ({ ...cur, [type]: n }))} />
                          </View>
                        );
                      })}
                      <Text style={{ fontSize: 11.5, fontStyle: 'italic', color: '#64748B' }}>*These prices are valid for a minimum group of 4 persons.</Text>
                    </Card>

                    {(pkg.addOns || []).some((g) => (g.items || []).length > 0) && (
                      <Card title="Special Add On" subtitle="Optional extras for your trip" icon={<Sparkles size={22} color="#FF4500" strokeWidth={2} />}>
                        {pkg.addOns!.filter((g) => (g.items || []).length > 0).map((group) => (
                          <View key={group._id || group.title} style={{ gap: 8 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#334155' }}>{group.title}</Text>
                            {group.items!.map((item) => {
                              const picked = addOns.find((a) => a.itemId === item._id);
                              const people = addOnPeople[item._id] || 1;
                              return (
                                <View key={item._id} style={{ borderWidth: 1, borderColor: picked ? '#FED7C3' : '#EEF2F6', backgroundColor: picked ? '#FFF8F3' : '#F8FAFC', borderRadius: 12, padding: 12, gap: 10 }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                                    <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>{item.title.trim()}</Text>
                                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#FF4500' }}>{inr(Number(item.price) || 0)}</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                      <Text style={{ fontSize: 12, color: '#64748B' }}>No. of people</Text>
                                      <Stepper value={picked ? picked.noOfPeople : people} min={1} max={50} onChange={(n) => {
                                        setAddOnPeople((p) => ({ ...p, [item._id]: n }));
                                        if (picked) setAddOns((cur) => cur.map((a) => (a.itemId === item._id ? { ...a, noOfPeople: n } : a)));
                                      }} />
                                    </View>
                                    <TouchableOpacity
                                      onPress={() =>
                                        picked
                                          ? setAddOns((cur) => cur.filter((a) => a.itemId !== item._id))
                                          : setAddOns((cur) => [...cur, { itemId: item._id, title: item.title.trim(), price: Number(item.price) || 0, noOfPeople: people }])
                                      }
                                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: picked ? '#FEE2E2' : '#FF4500' }}
                                    >
                                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: picked ? '#B91C1C' : '#FFFFFF' }}>{picked ? 'Remove' : 'Add'}</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        ))}
                      </Card>
                    )}

                    {quote && quote.adults + quote.children > 0 && (
                      <Card title="Price Summary" icon={<Receipt size={22} color="#2563EB" strokeWidth={2} />}>
                        <View style={{ gap: 8 }}>
                          {quote.lines.map((l) => (
                            <View key={l.type} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 13, color: '#475569' }}>{l.label} ({inr(l.unitPrice)} × {l.count})</Text>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{inr(l.amount)}</Text>
                            </View>
                          ))}
                          {quote.addOns.map((a) => (
                            <View key={a.itemId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                              <Text style={{ flex: 1, fontSize: 13, color: '#475569' }}>{a.title} ({inr(a.price)} × {a.noOfPeople})</Text>
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{inr(a.price * a.noOfPeople)}</Text>
                            </View>
                          ))}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: '#475569' }}>Subtotal</Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{inr(quote.base + quote.addOnsAmount)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: '#475569' }}>GST (5%)</Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{inr(quote.gst)}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF5EF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#EA580C' }}>Total Package Cost</Text>
                          <Text style={{ fontSize: 17, fontWeight: '800', color: '#EA580C' }}>{inr(quote.total)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10 }}>
                          <CheckCircle2 size={15} color="#16A34A" strokeWidth={2} style={{ marginTop: 1 }} />
                          <Text style={{ flex: 1, fontSize: 12, color: '#166534', lineHeight: 17 }}>{quote.adults + quote.children} traveller{quote.adults + quote.children === 1 ? '' : 's'} · partial payment available at checkout.</Text>
                        </View>
                      </Card>
                    )}
                  </>
                )}
              </>
            )
          )}
        </View>
      </ScrollView>

      {/* Sticky booking bar */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EEF2F6', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          {quote ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FF4500', letterSpacing: -0.4 }}>{inr(quote.total)}</Text>
              <Text style={{ fontSize: 10.5, fontWeight: '500', color: '#64748B' }}>total incl. GST</Text>
            </>
          ) : price !== null ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FF4500', letterSpacing: -0.4 }}>{inr(price)}</Text>
              <Text style={{ fontSize: 10.5, fontWeight: '500', color: '#64748B' }}>per person + GST</Text>
            </>
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>Price on request</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setBrowserUrl(getTourPageUrl(pkg))} style={{ height: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#FF4500', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <MessageCircle size={16} color="#FF4500" strokeWidth={2} />
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#FF4500' }}>Enquire</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBookNow} style={{ height: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#FF4500', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#FFFFFF' }}>Book Now</Text>
          <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {toast ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 24, left: 16, right: 16, alignItems: 'center', zIndex: 50 }}>
          <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '600', textAlign: 'center' }}>{toast}</Text>
          </View>
        </View>
      ) : null}

      <InAppBrowser url={browserUrl} onClose={() => setBrowserUrl(null)} />
    </View>
  );
}
