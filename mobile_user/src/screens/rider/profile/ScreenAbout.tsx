// About MBGO: brand story, services, why MBGO, mission, help contacts.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Linking, Modal, ActivityIndicator, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Constants from 'expo-constants';
import { ChevronLeft, ArrowLeft, Car, Palmtree, Plane, TrainFront, Hotel, FileCheck, ShieldCheck, IndianRupee, Headphones, Lock, Target, Phone, Mail } from 'lucide-react-native';
import { SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY } from '../../../api/support.api';

const MBGO_LOGO = require('../../../../assets/mbgo-home-logo.png');
const TAGLINE = require('../../../../assets/home-tagline.png');
const HERO = require('../../../../assets/about/about-hero.webp');
const SIMPLER = require('../../../../assets/about/about-simpler.webp');
const MISSION = require('../../../../assets/about/about-mission.webp');
const MISSION_SCRIPT = require('../../../../assets/about/mission-script.png');
const SUPPORT_GIRL = require('../../../../assets/about/about-support.png');
const FOOTER = require('../../../../assets/about/about-footer.webp');
const MB_LOGO = require('../../../../assets/about/musafirbaba-logo.png');

const SUPPORT_EMAIL = 'care@musafirbaba.com';
const INK = '#0B1B3F';
const BODY = '#475467';
const MUTED = '#8A94A6';
const ORANGE = '#FF4500';
const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#EEF2F6',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
} as const;

export default function ScreenAbout({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack: () => void }) {
  const { width } = useWindowDimensions();
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const contentWidth = Math.min(width, 520) - 32;
  const narrow = width < 380;
  const version = Constants.expoConfig?.version || '';

  // Same destinations as Home's Popular Services.
  const services = [
    { icon: Car, label: 'Cabs', color: '#EA580C', bg: '#FFEDD5', onPress: () => onNavigate('31') },
    { icon: Palmtree, label: 'Tours', color: '#D97706', bg: '#FEF3C7', onPress: () => onNavigate('tours') },
    { icon: Plane, label: 'Flights', color: '#16A34A', bg: '#DCFCE7', onPress: () => setBrowserUrl('https://www.makemytrip.com/flights/') },
    { icon: TrainFront, label: 'Trains', color: '#2563EB', bg: '#DBEAFE', onPress: () => setBrowserUrl('https://www.confirmtkt.com/') },
    { icon: Hotel, label: 'Hotels', color: '#7C3AED', bg: '#EDE9FE', onPress: () => setBrowserUrl('https://www.makemytrip.com/hotels/') },
    { icon: FileCheck, label: 'Visa', color: '#DC2626', bg: '#FEE2E2', onPress: () => onNavigate('visa') },
  ];
  const reasons = [
    { icon: ShieldCheck, title: 'Verified\nPartners', text: 'Travel with confidence', color: '#16A34A', bg: '#DCFCE7' },
    { icon: IndianRupee, title: 'Best Price\nOptions', text: 'Value for your money', color: '#2563EB', bg: '#DBEAFE' },
    { icon: Headphones, title: '24x7\nSupport', text: 'We are here for you', color: '#EA580C', bg: '#FFEDD5' },
    { icon: Lock, title: 'Safe &\nSecure', text: 'Your data stays safe', color: '#7C3AED', bg: '#EDE9FE' },
  ];

  const heroImgW = Math.round(Math.min(width, 520) * 0.56);
  const heroImgH = Math.round(heroImgW / (552 / 636));
  const pageW = Math.min(width, 520);
  // Tall enough for the text plus the Need Help sheet that overlaps its bottom (38).
  const missionH = Math.max(Math.round(pageW / 3.3) + 38, narrow ? 200 : 178);
  const girlW = Math.round(pageW * (narrow ? 0.26 : 0.27));
  const footerH = Math.round(pageW * (500 / 1152));
  const simplerW = Math.round((contentWidth - 32) * 0.4);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#FFFFFF', zIndex: 2 }}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Back">
          <ChevronLeft size={26} color={INK} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: INK, marginRight: 40 }}>About MBGO</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
          {/* Hero */}
          <View style={{ height: heroImgH, justifyContent: 'center' }}>
            <Image source={HERO} style={{ position: 'absolute', right: 0, top: 0, width: heroImgW, height: heroImgH }} resizeMode="cover" />
            <View style={{ paddingLeft: 20, width: '62%' }}>
              <Image source={MBGO_LOGO} style={{ width: narrow ? 150 : 176, height: Math.round((narrow ? 150 : 176) * 185 / 669) }} resizeMode="contain" />
              <Text style={{ fontSize: narrow ? 15 : 17, fontWeight: '800', color: INK, marginTop: 8, letterSpacing: -0.3 }}>Your Journey, Our Priority.</Text>
              <Text style={{ fontSize: narrow ? 11.5 : 12.5, color: BODY, marginTop: 3 }}>A travel platform by MusafirBaba</Text>
              <View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: ORANGE, marginTop: 10 }} />
              <Image source={TAGLINE} accessibilityLabel="Sark se Shikhar Tak" style={{ width: narrow ? 104 : 124, height: Math.round((narrow ? 104 : 124) * 215 / 545), marginTop: 12 }} resizeMode="contain" />
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, gap: 14, marginTop: -6 }}>
            {/* Travel made simpler */}
            <View style={[CARD, { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8, overflow: 'hidden' }]}>
              <View style={{ flex: 1.25 }}>
                <Text style={{ fontSize: narrow ? 20 : 22, fontWeight: '800', color: INK, letterSpacing: -0.4 }}>
                  Travel made <Text style={{ color: ORANGE }}>simpler</Text>
                </Text>
                <View style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: ORANGE, marginTop: 8, marginBottom: 10 }} />
                <Text style={{ fontSize: 13, color: BODY, lineHeight: 19 }}>
                  MBGO brings your journeys and travel services together in one place — from cab bookings and holiday packages to flights, trains, hotels and visa assistance.
                </Text>
              </View>
              <Image source={SIMPLER} style={{ width: simplerW, height: Math.round(simplerW / (488 / 344)) }} resizeMode="contain" />
            </View>

            {/* Our Services */}
            <View style={[CARD, { padding: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: INK }}>Our Services</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: ORANGE }}>All in one app</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {services.map((s, i) => (
                  <TouchableOpacity key={s.label} onPress={s.onPress} activeOpacity={0.75} style={{ flex: 1, alignItems: 'center', gap: 7, borderLeftWidth: i ? 1 : 0, borderLeftColor: '#F1F5F9' }}>
                    <View style={{ width: narrow ? 42 : 48, height: narrow ? 42 : 48, borderRadius: 24, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <s.icon size={narrow ? 19 : 22} color={s.color} strokeWidth={2.1} />
                    </View>
                    <Text style={{ fontSize: narrow ? 11.5 : 12.5, fontWeight: '600', color: INK }}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Why MBGO */}
            <View style={[CARD, { padding: 16 }]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: INK }}>Why MBGO?</Text>
              <View style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: ORANGE, marginTop: 8, marginBottom: 14 }} />
              <View style={{ flexDirection: 'row' }}>
                {reasons.map((r, i) => (
                  <View key={r.text} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 3, borderLeftWidth: i ? 1 : 0, borderLeftColor: '#F1F5F9' }}>
                    <View style={{ width: narrow ? 40 : 46, height: narrow ? 40 : 46, borderRadius: 23, backgroundColor: r.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <r.icon size={narrow ? 19 : 22} color={r.color} strokeWidth={2.1} />
                    </View>
                    <Text style={{ fontSize: narrow ? 11.5 : 12.5, fontWeight: '700', color: INK, textAlign: 'center', lineHeight: narrow ? 15 : 16 }}>{r.title}</Text>
                    <Text style={{ fontSize: narrow ? 10.5 : 11, color: MUTED, textAlign: 'center', marginTop: 4, lineHeight: 14 }}>{r.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Our Mission: full-width scene (anchored right so the hiker stays visible) */}
            <View style={{ marginHorizontal: -16, height: missionH, overflow: 'hidden' }}>
              <Image source={MISSION} style={{ position: 'absolute', right: 0, top: 0, height: missionH, width: Math.round(missionH * (1068 / 240)) }} resizeMode="cover" />
              {/* Soft white wash behind the text so it stays readable over the scene */}
              <Svg pointerEvents="none" width={pageW} height={missionH} style={{ position: 'absolute', left: 0, top: 0 }}>
                <Defs>
                  <LinearGradient id="aboutMissionWash" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.8" />
                    <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.5" />
                    <Stop offset="0.66" stopColor="#FFFFFF" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width={pageW} height={missionH} fill="url(#aboutMissionWash)" />
              </Svg>
              {!narrow && (
                <Image source={MISSION_SCRIPT} accessibilityLabel="More journeys, brighter stories" style={{ position: 'absolute', left: Math.round(pageW * 0.57), top: 12, width: Math.round(pageW * 0.2), height: Math.round(pageW * 0.2 * 0.46) }} resizeMode="contain" />
              )}
              <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingTop: 16, width: narrow ? '62%' : '58%' }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                  <Target size={23} color={ORANGE} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: INK }}>Our Mission</Text>
                  <Text style={{ fontSize: narrow ? 11.5 : 12.5, color: '#1F2937', lineHeight: narrow ? 16 : 18, marginTop: 4 }}>
                    To make travel simple, reliable and accessible for everyone with technology, trusted partners and personalised support.
                  </Text>
                </View>
              </View>
            </View>

            {/* Need Help: white sheet overlapping the bottom of the mission scene */}
            <View style={[CARD, { marginTop: -38, borderRadius: 24, padding: 14, zIndex: 2 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Image source={SUPPORT_GIRL} style={{ width: girlW, height: Math.round(girlW * 252 / 336) }} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: INK }}>Need Help?</Text>
                  <Text style={{ fontSize: 12.5, color: BODY, marginTop: 3, lineHeight: 17 }}>Our support team is always here for you.</Text>
                </View>
              </View>
              <View style={{ flexDirection: narrow ? 'column' : 'row', gap: 8, marginTop: 10 }}>
                <ContactButton grow={!narrow} icon={Phone} title={SUPPORT_PHONE_DISPLAY} subtitle="Call us" onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {})} />
                <ContactButton grow={!narrow} icon={Mail} title={SUPPORT_EMAIL} subtitle="Email us" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})} />
              </View>
            </View>
          </View>

          {/* Footer: pastel landscape with the Musafir Baba logo on its sky */}
          <View style={{ marginTop: 6, height: footerH }}>
            <Image source={FOOTER} style={{ position: 'absolute', left: 0, top: 0, width: pageW, height: footerH }} resizeMode="cover" />
            <View style={{ alignItems: 'center', paddingTop: Math.round(footerH * 0.12) }}>
              <Image source={MB_LOGO} accessibilityLabel="Musafir Baba - explore the unexplored" style={{ width: narrow ? 150 : 176, height: Math.round((narrow ? 150 : 176) * 102 / 600) }} resizeMode="contain" />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: INK, marginTop: 10 }}>Powered by MusafirBaba Travels</Text>
              {!!version && <Text style={{ fontSize: 11.5, color: BODY, marginTop: 3 }}>Version {version}</Text>}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* In-app browser for Flights / Trains / Hotels (same pages as Home) */}
      <Modal visible={!!browserUrl} animationType="slide" onRequestClose={() => setBrowserUrl(null)}>
        <View style={{ flex: 1, paddingTop: 40 }}>
          <TouchableOpacity onPress={() => setBrowserUrl(null)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 6 }}>
            <ArrowLeft size={18} color="#0F172A" />
            <Text style={{ fontWeight: '700' }}>Close</Text>
          </TouchableOpacity>
          {browserUrl && (
            <WebView
              source={{ uri: browserUrl }}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#FF3B00" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function ContactButton({ icon: Icon, title, subtitle, onPress, grow }: { icon: any; title: string; subtitle: string; onPress: () => void; grow?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ ...(grow ? { flex: 1 } : null), flexDirection: 'row', alignItems: 'center', gap: grow ? 8 : 10, borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 14, paddingHorizontal: grow ? 10 : 12, paddingVertical: 10, backgroundColor: '#FFFFFF', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
      <Icon size={grow ? 16 : 17} color={ORANGE} strokeWidth={2.2} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: grow ? 11.5 : 12.5, fontWeight: '700', color: INK }}>{title}</Text>
        <Text style={{ fontSize: 11, color: MUTED }}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}
