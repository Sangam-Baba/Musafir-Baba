// Welcome screen shown once per app launch to logged-out riders, between the
// splash screen and the login/sign-up screen. Display only -- the button just
// reveals the existing auth screen (see App.tsx).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StatusBar } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

const WELCOME_IMAGE = require('../../../../assets/secondscreen.jpeg');
const IMAGE_RATIO = 1280 / 720; // height / width of the artwork
const BUTTON_AREA = 84; // space the button needs below the artwork

export default function ScreenWelcome({ onContinue }: { onContinue: () => void }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // The artwork always spans the full width (so the logo and services row are
  // never cropped) and is anchored to the top. Taller phones get a white
  // panel under it (matching the artwork's white footer) for the button;
  // shorter ones get the button floating just above the "Powered by" footer.
  const imgH = size ? size.w * IMAGE_RATIO : 0;
  const spare = size ? size.h - imgH : 0;
  const buttonInPanel = spare >= BUTTON_AREA;
  const buttonBottom = size ? (buttonInPanel ? Math.max(14, (spare - 56) / 2) : Math.max(16, size.h - imgH * 0.885)) : 24;

  return (
    <View
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <StatusBar barStyle="dark-content" />
      {size && (
        <Image
          source={WELCOME_IMAGE}
          style={imgH <= size.h ? { position: 'absolute', top: 0, left: 0, width: size.w, height: imgH } : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
          resizeMode={imgH <= size.h ? 'stretch' : 'cover'}
        />
      )}

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: buttonBottom }}>
        <TouchableOpacity
          onPress={onContinue}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Login or sign up"
          style={{
            height: 56,
            borderRadius: 16,
            backgroundColor: '#FF4500',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            shadowColor: '#FF4500',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 16.5, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 }}>Login / Sign up</Text>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.6} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
