import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/api/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CopilotProvider } from 'react-native-copilot';

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <CopilotProvider tooltipStyle={{ backgroundColor: '#ffffff', borderRadius: 8 }} stepNumberComponent={() => null}>
          <RootNavigator />
        </CopilotProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
