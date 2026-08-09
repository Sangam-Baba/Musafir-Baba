import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeWindStyleSheet } from 'nativewind';
import { View, Platform } from 'react-native';
import { cssText } from './cssText';
import { useAuthStore } from './src/store/useAuthStore';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { updateRiderPushToken, getRiderProfile } from './src/api/riderProfile.api';

// NativeWindStyleSheet.setOutput({
//   default: 'native',
// });

if (Platform.OS === 'web') {
  try {
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
    const styleId = 'tailwind-css-inject';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = cssText;
      document.head.appendChild(style);
    }
  } catch (e) {}
}

// Import Screens (to be created)
import ScreenRiderAuth from './src/screens/rider/auth/ScreenRiderAuth';

// Journey Screens
import ScreenRiderHome from './src/screens/rider/main/ScreenRiderHome';
import ScreenVehicleSelection from './src/screens/rider/main/ScreenVehicleSelection';
import ScreenFareSummary from './src/screens/rider/main/ScreenFareSummary';
import ScreenPaymentGateway from './src/screens/rider/main/ScreenPaymentGateway';
import ScreenLiveTracking from './src/screens/rider/main/ScreenLiveTracking';
import ScreenMyTrips from './src/screens/rider/main/ScreenMyTrips';

// Profile Screens
import ScreenRiderProfileAmit from './src/screens/rider/profile/ScreenRiderProfileAmit';
import ScreenHelpSupport from './src/screens/rider/profile/ScreenHelpSupport';
import ScreenNotifications from './src/screens/rider/profile/ScreenNotifications';
import ScreenSavedItems from './src/screens/rider/profile/ScreenSavedItems';
import ScreenRiderProfileAshutosh from './src/screens/rider/profile/ScreenRiderProfileAshutosh';

export default function App() {
  const [activeScreen, setActiveScreen] = useState('login');
  const initialize = useAuthStore((s) => s.initialize);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setProfile = useAuthStore((s) => s.setProfile);
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    // `profile` isn't persisted across app restarts (only the token is), so
    // re-fetch it once a stored session is confirmed valid.
    if (isAuthenticated) {
      getRiderProfile()
        .then((res) => setProfile(res.data.data))
        .catch((e) => console.log('Error loading rider profile', e));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && expoPushToken) {
      updateRiderPushToken(expoPushToken).catch((e) => console.log('Error syncing push token', e));
    }
  }, [isAuthenticated, expoPushToken]);

  useEffect(() => {
    // Once a stored session is restored, skip straight past the auth screens.
    if (!isInitializing && isAuthenticated && ['login', 'register', 'forgot'].includes(activeScreen)) {
      setActiveScreen('31');
    }
  }, [isInitializing, isAuthenticated]);

  if (isInitializing) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }} />
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'login':
      case 'register':
      case 'forgot':
        return <ScreenRiderAuth activeScreen={activeScreen} onNavigate={setActiveScreen} />;
      case '31': return <ScreenRiderHome onNavigate={setActiveScreen} />;
      case 'vehicle-select': return <ScreenVehicleSelection onNavigate={setActiveScreen} />;
      case '32': return <ScreenFareSummary onNavigate={setActiveScreen} />;
      case '33': return <ScreenPaymentGateway onNavigate={setActiveScreen} />;
      case '34': return <ScreenLiveTracking onNavigate={setActiveScreen} />;
      case '35': return <ScreenMyTrips onNavigate={setActiveScreen} />;
      case '36': return <ScreenRiderProfileAmit onNavigate={setActiveScreen} />;
      case '37': return <ScreenHelpSupport onNavigate={setActiveScreen} />;
      case '38': return <ScreenNotifications onNavigate={setActiveScreen} />;
      case '39': return <ScreenSavedItems onNavigate={setActiveScreen} />;
      case '40': return <ScreenRiderProfileAshutosh onNavigate={setActiveScreen} />;
      default: return <ScreenRiderAuth activeScreen="login" onNavigate={setActiveScreen} />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>
    </SafeAreaProvider>
  );
}

// Force cache invalidation 1786122936668
// Force cache invalidation viewport fix 1786123000993
// Force cache invalidation restore viewport 1786123352147
// FORCE_REBUILD_CACHE_BUST_1786123613910
// FORCE_REBUILD_CACHE_BUST_1786123710529
console.log('CACHE_BUST_1786124057443');

console.log('CACHE_BUST_BARS_1786124237195');

console.log('CACHE_BUST_PROFILE_FIX_1786124506911');

console.log('CACHE_BUST_PROFILE_36_1786124896541');

console.log('CACHE_BUST_PROFILE_NAVBAR_1786125091864');

console.log('CACHE_BUST_STANDARDIZE_NAVBAR_1786125270486');

console.log('CACHE_BUST_FINAL_BARS_1786125430925');

console.log('CACHE_BUST_LOGOUT_1786125695819');

console.log('CACHE_BUST_IMG_TO_IMAGE_1786127909126');

console.log('CACHE_BUST_HTML_TO_RN_1786128166263');

console.log('CACHE_BUST_AST_FIX_1786128723995');

console.log('CACHE_BUST_FUNCTIONAL_FIX_1786129074119');

console.log('CACHE_BUST_TEXT_IMPORT_1786129860996');

console.log('CACHE_BUST_HTML_CLEANUP_1786130047587');

console.log('CACHE_BUST_NAVBAR_TEXT_FIX_1786130283991');

console.log('CACHE_BUST_TEXT_CLAMP_FIX_1786130508362');
