// Home: admin-managed carousel banners (Connect App Home) + one-line
// "Important Update" bar. Only used when admin content is live; otherwise
// Home shows its built-in banners exactly as before.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PartnerAppBanner, PartnerAppAnnouncement } from '../api/partnerAppHome.api';

const AUTO_ADVANCE_MS = 3500;

export function HomeBannerCarousel({ banners, onOpen }: { banners: PartnerAppBanner[]; onOpen: (b: PartnerAppBanner) => void }) {
  // Same size as Home's name banner: full content width, 2:1.
  const width = Dimensions.get('window').width - 32;
  const height = Math.round(width / 2);
  const count = banners.length;
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Keep index valid if the list shrinks.
  useEffect(() => {
    if (index >= count) {
      setIndex(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [count, index]);

  useEffect(() => {
    if (dragging || count < 2) return;
    const t = setTimeout(() => {
      const next = (index + 1) % count;
      scrollRef.current?.scrollTo({ x: next * width, animated: next !== 0 });
      setIndex(next);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, dragging, count, width]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i >= 0 && i < count && i !== index) setIndex(i);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.frame, { width, height }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          onScrollBeginDrag={() => setDragging(true)}
          onScrollEndDrag={() => setDragging(false)}
          scrollEventThrottle={16}
        >
          {banners.map((b) => (
            <TouchableOpacity
              key={b.id}
              activeOpacity={b.action.type === 'NONE' ? 1 : 0.9}
              onPress={() => onOpen(b)}
              style={{ width, height }}
              accessibilityLabel={b.title}
            >
              <Image source={{ uri: b.imageUrl }} style={{ width, height }} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {count > 1 && (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>
      )}
    </View>
  );
}

export function ImportantUpdateBar({ update, onPress }: { update: PartnerAppAnnouncement; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.update} accessibilityLabel={`Important update: ${update.headline}`}>
      <View style={styles.updateIcon}>
        <Ionicons name="notifications" size={15} color="#FE5300" />
      </View>
      <Text style={styles.updateLabel}>Important Update</Text>
      <View style={styles.updateDivider} />
      <Text numberOfLines={1} style={styles.updateText}>{update.headline}</Text>
      <Ionicons name="chevron-forward" size={16} color="#0f172a" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 4 },
  frame: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 20, backgroundColor: '#FE5300' },
  dotInactive: { width: 6, backgroundColor: '#cbd5e1' },
  update: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff4ee', borderWidth: 1, borderColor: '#ffe1d2', borderRadius: 14, paddingLeft: 8, paddingRight: 10, paddingVertical: 7, marginTop: 12 },
  updateIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ffe4d6', alignItems: 'center', justifyContent: 'center' },
  updateLabel: { fontSize: 12.5, fontWeight: '700', color: '#e8430b' },
  updateDivider: { width: 1, height: 16, backgroundColor: '#ffc9ae' },
  updateText: { flex: 1, fontSize: 12.5, fontWeight: '500', color: '#1f2937' },
});
