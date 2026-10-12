// Home: admin-managed carousel banners + one-line "Important Update" bar.
// Renders nothing when there's no live content (Home loads it via useAppHomeStore).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Bell, ChevronRight, Pause, Play } from 'lucide-react-native';
import { useAppHomeStore } from '../../../store/useAppHomeStore';
import type { AppBanner } from '../../../api/appHome.api';

const AUTO_ADVANCE_MS = 4500;
const SCREEN_ROUTES: Record<string, string> = { TOURS: 'tours', VISA: 'visa', SUPPORT: '37', NOTIFICATIONS: '38' };

export default function HomePromo({
  onNavigate,
  onOpenUrl,
  onCab,
  compact,
}: {
  onNavigate: (screen: string) => void;
  onOpenUrl: (url: string) => void;
  onCab: () => void;
  compact?: boolean;
}) {
  const banners = useAppHomeStore((s) => s.banners);
  const announcement = useAppHomeStore((s) => s.announcement);
  const setFocusAnnouncement = useAppHomeStore((s) => s.setFocusAnnouncement);

  if (!banners.length && !announcement) return null;

  const openBanner = (b: AppBanner) => {
    if (b.action.type === 'URL' && b.action.url) return onOpenUrl(b.action.url);
    if (b.action.type === 'SCREEN') {
      if (b.action.screen === 'CAB') return onCab();
      const route = b.action.screen ? SCREEN_ROUTES[b.action.screen] : undefined;
      if (route) onNavigate(route);
    }
  };

  return (
    <View style={{ gap: 8, zIndex: 10 }}>
      {banners.length > 0 && <Carousel banners={banners} onPress={openBanner} />}
      {announcement && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setFocusAnnouncement(announcement);
            onNavigate('38');
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF4EE', borderWidth: 1, borderColor: '#FFE1D2', borderRadius: 14, paddingLeft: 8, paddingRight: 10, paddingVertical: compact ? 6 : 7 }}
        >
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFE4D6', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={15} color="#FF4500" fill="#FF4500" />
          </View>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#E8430B' }}>Important Update</Text>
          <View style={{ width: 1, height: 16, backgroundColor: '#FFC9AE' }} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '500', color: '#1F2937' }}>{announcement.headline}</Text>
          <ChevronRight size={16} color="#0F172A" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function Carousel({ banners, onPress }: { banners: AppBanner[]; onPress: (b: AppBanner) => void }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const height = width ? Math.round(width / 3) : 0;
  const count = banners.length;

  // Keep index valid if the list shrinks.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (paused || dragging || count < 2 || !width) return;
    const t = setTimeout(() => {
      const next = (index + 1) % count;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, paused, dragging, count, width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index && i >= 0 && i < count) setIndex(i);
  };

  return (
    <View
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: '#F1F5F9', height: height || undefined, aspectRatio: height ? undefined : 3, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}
    >
      {width > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => setDragging(true)}
          onScrollEndDrag={() => setDragging(false)}
        >
          {banners.map((b) => (
            <TouchableOpacity key={b.id} activeOpacity={b.action.type === 'NONE' ? 1 : 0.9} onPress={() => onPress(b)} style={{ width, height }}>
              <Image source={{ uri: b.imageUrl }} accessibilityLabel={b.title} style={{ width, height }} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {count > 1 && (
        <>
          <View pointerEvents="none" style={{ position: 'absolute', top: 8, right: 10, backgroundColor: 'rgba(15,23,42,0.55)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{index + 1}/{count}</Text>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 9, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
            {banners.map((b, i) => (
              <View key={b.id} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.55)' }} />
            ))}
          </View>
          <TouchableOpacity
            onPress={() => setPaused((p) => !p)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={paused ? 'Play banners' : 'Pause banners'}
            style={{ position: 'absolute', bottom: 6, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}
          >
            {paused ? <Play size={12} color="#0F172A" fill="#0F172A" /> : <Pause size={12} color="#0F172A" fill="#0F172A" />}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
