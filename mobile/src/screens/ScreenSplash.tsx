import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, ActivityIndicator, StyleSheet } from 'react-native';

const APP_LOGO = require('../../assets/icon.png');

export default function ScreenSplash() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      {/* Centered Brand Content */}
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={APP_LOGO}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.taglineWrapper}>
          <Text style={styles.taglineMain}>CONNECT. DRIVE. GROW.</Text>
        </View>

        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color="#FE5300" />
        </View>
      </Animated.View>

      {/* Bottom Branding */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>powered by <Text style={styles.footerBrand}>musafirbaba</Text></Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 4,
  },
  taglineWrapper: {
    alignItems: 'center',
    marginTop: 2,
  },
  taglineMain: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B1E3D',
    letterSpacing: 2,
  },
  loadingWrapper: {
    marginTop: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  footerBrand: {
    fontWeight: '700',
    color: '#FE5300',
  },
});
