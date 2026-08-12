import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { AuthStack } from './AuthStack';
import { MainTabNavigator } from './MainTabNavigator';
import { View, ActivityIndicator } from 'react-native';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { API_BASE_URL } from '../utils/config';

export const RootNavigator = () => {
  const { isAuthenticated, hasCompletedOnboarding, initialize } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const { expoPushToken, notification } = usePushNotifications();
  useRealtimeNotifications();

  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error('Failed to initialize auth store:', error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };
    initApp();
    return () => {
      isMounted = false;
    };
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated && expoPushToken) {
      const token = useAuthStore.getState().token;
      fetch(`${API_BASE_URL}/partner/push-token`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pushToken: expoPushToken })
      }).catch(e => console.log('Error syncing push token', e));
    }
  }, [isAuthenticated, expoPushToken]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FE5300" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthStack />
      ) : (
        <MainTabNavigator />
      )}
    </NavigationContainer>
  );
};
