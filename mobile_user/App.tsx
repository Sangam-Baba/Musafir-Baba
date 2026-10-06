import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeWindStyleSheet } from 'nativewind';
import { View, Platform, BackHandler } from 'react-native';
import { cssText } from './cssText';
import { useAuthStore } from './src/store/useAuthStore';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { useRealtimeNotifications } from './src/hooks/useRealtimeNotifications';
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
import ScreenSplash from './src/screens/rider/common/ScreenSplash';

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
import ScreenRiderDocuments from './src/screens/rider/profile/ScreenRiderDocuments';

// Bottom-tab screens (Home, My Trips, Profile): opening one doesn't stack on
// top of the others -- see navigate() below.
const HOME_SCREEN = '31';
const ROOT_TAB_SCREENS = ['31', '35', '36'];

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [activeScreen, setActiveScreen] = useState('login');
  const initialize = useAuthStore((s) => s.initialize);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setProfile = useAuthStore((s) => s.setProfile);
  const { expoPushToken } = usePushNotifications();
  useRealtimeNotifications();
  const insets = useSafeAreaInsets();

  // Screen-to-screen navigation history, so back (Android hardware/gesture
  // back, on-screen back arrows, and the browser's Back/Forward on web)
  // steps through the app's own screens instead of exiting (the app uses
  // this activeScreen switch instead of React Navigation, so there's no
  // built-in back stack to fall back on). Kept in refs (not state) since it
  // doesn't need to trigger re-renders.
  const historyRef = useRef<string[]>([]);
  // Screens stepped back from (web Forward button only); cleared on any new navigation.
  const forwardRef = useRef<string[]>([]);
  const activeScreenRef = useRef(activeScreen);
  // Position of the current entry in the browser's history (web only).
  const webIndexRef = useRef(0);
  const isWeb = Platform.OS === 'web';

  const showScreen = useCallback((screen: string) => {
    activeScreenRef.current = screen;
    setActiveScreen(screen);
  }, []);

  // Clears all history (used when the auth state flips between login and home).
  const resetTo = useCallback((screen: string) => {
    historyRef.current = [];
    forwardRef.current = [];
    showScreen(screen);
  }, [showScreen]);

  const navigate = useCallback((screen: string) => {
    const current = activeScreenRef.current;
    if (current === screen) return;
    if (ROOT_TAB_SCREENS.includes(screen)) {
      // Bottom-tab destinations behave like a mobile app's tabs: they don't
      // pile up on each other. Back from any tab goes to Home, and back from
      // Home leaves the app. This also stops e.g. "View my trips" after a
      // payment from leaving the already-paid review screen behind it.
      historyRef.current = screen === HOME_SCREEN ? [] : [HOME_SCREEN];
    } else {
      historyRef.current.push(current);
    }
    forwardRef.current = [];
    if (isWeb) {
      try {
        webIndexRef.current += 1;
        window.history.pushState({ mbgoIndex: webIndexRef.current }, '', '/');
      } catch (e) {}
    }
    showScreen(screen);
  }, [isWeb, showScreen]);

  // Steps back one screen in our own history. Returns false if there's nothing to go back to.
  const popHistory = useCallback(() => {
    const previous = historyRef.current.pop();
    if (!previous) return false;
    forwardRef.current.push(activeScreenRef.current);
    showScreen(previous);
    return true;
  }, [showScreen]);

  // Real "go back one step" -- pops the actual path the user took, instead
  // of a screen's own header back-arrow jumping to a hardcoded fixed
  // destination regardless of how the user actually got there. Passed to
  // screens as `onBack`, alongside the existing `onNavigate` (still used
  // for forward/specific jumps, e.g. "Continue to Payment").
  const goBack = useCallback(() => {
    if (historyRef.current.length > 0) {
      if (isWeb) {
        // Let the browser step back too, so its Back/Forward buttons stay in
        // sync; the popstate listener below does the actual screen change.
        try {
          window.history.back();
          return;
        } catch (e) {}
      }
      popHistory();
      return;
    }
    // No history (e.g. deep-linked straight into a screen) -- fall back
    // to a sensible root instead of doing nothing.
    showScreen(isAuthenticated ? HOME_SCREEN : 'login');
  }, [isWeb, isAuthenticated, popHistory, showScreen]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // true = handled, stay in the app; false = nothing left (e.g. on Home),
      // let the OS exit the app as normal.
      return popHistory();
    });
    return () => subscription.remove();
  }, [popHistory]);

  useEffect(() => {
    if (!isWeb) return;
    try {
      window.history.replaceState({ mbgoIndex: 0 }, '', '/');
    } catch (e) {}
    const onPopState = (event: PopStateEvent) => {
      const index = typeof event.state?.mbgoIndex === 'number' ? event.state.mbgoIndex : 0;
      if (index < webIndexRef.current) {
        popHistory();
      } else if (index > webIndexRef.current) {
        // Browser Forward: re-open the screen we last stepped back from.
        const next = forwardRef.current.pop();
        if (next) {
          historyRef.current.push(activeScreenRef.current);
          showScreen(next);
        }
      }
      webIndexRef.current = index;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isWeb, popHistory, showScreen]);

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
      resetTo(HOME_SCREEN);
    }
  }, [isInitializing, isAuthenticated]);

  useEffect(() => {
    // Mirror of the effect above: if the session dies mid-use (e.g. the
    // refresh token expired and axios's interceptor cleared it), route back
    // to login instead of leaving the user stranded on a screen where every
    // API call now silently fails.
    if (!isInitializing && !isAuthenticated && !['login', 'register', 'forgot'].includes(activeScreen)) {
      resetTo('login');
    }
  }, [isInitializing, isAuthenticated]);

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!isInitializing) {
      const timer = setTimeout(() => setShowSplash(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isInitializing]);

  if (isInitializing || showSplash) {
    return <ScreenSplash />;
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'login':
      case 'register':
      case 'forgot':
        return <ScreenRiderAuth activeScreen={activeScreen} onNavigate={navigate} />;
      case '31': return <ScreenRiderHome onNavigate={navigate} />;
      case 'vehicle-select': return <ScreenVehicleSelection onNavigate={navigate} onBack={goBack} />;
      case '32': return <ScreenFareSummary onNavigate={navigate} onBack={goBack} />;
      case '33': return <ScreenPaymentGateway onNavigate={navigate} onBack={goBack} />;
      case '34': return <ScreenLiveTracking onNavigate={navigate} onBack={goBack} />;
      case '35': return <ScreenMyTrips onNavigate={navigate} />;
      case '36': return <ScreenRiderProfileAmit onNavigate={navigate} />;
      case '37': return <ScreenHelpSupport onNavigate={navigate} onBack={goBack} />;
      case '38': return <ScreenNotifications onNavigate={navigate} onBack={goBack} />;
      case '39': return <ScreenSavedItems onNavigate={navigate} />;
      case '40': return <ScreenRiderProfileAshutosh onNavigate={navigate} />;
      case '41': return <ScreenRiderDocuments onNavigate={navigate} onBack={goBack} />;
      default: return <ScreenRiderAuth activeScreen="login" onNavigate={navigate} />;
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {renderScreen()}
    </View>
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
