import 'react-native-gesture-handler';
import './src/api/fetchInterceptor';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/api/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CopilotProvider } from 'react-native-copilot';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

// Single, app-wide safe-area guard: pads the entire navigator (every screen,
// including the tab bar) away from the status bar / notch and the bottom
// gesture bar in one place, instead of each of the ~25 screens hand-rolling
// its own guessed top-padding constant. Mirrors the same pattern used in
// mbgo's App.tsx.
function AppContent() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <QueryClientProvider client={queryClient}>
        <CopilotProvider tooltipStyle={{ backgroundColor: '#ffffff', borderRadius: 8 }} stepNumberComponent={() => null}>
          <RootNavigator />
        </CopilotProvider>
      </QueryClientProvider>
    </View>
  );
}
