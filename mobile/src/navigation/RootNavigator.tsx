import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { AuthStack } from './AuthStack';
import { MainTabNavigator } from './MainTabNavigator';
import { View, ActivityIndicator } from 'react-native';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { API_BASE_URL } from '../utils/config';
import { Alert } from 'react-native';
import { applyPendingReferral } from '../api/referral.api';

import ScreenSplash from '../screens/ScreenSplash';

export const RootNavigator = () => {
  const { isAuthenticated, hasCompletedOnboarding, initialize } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
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
    if (isReady) {
      const timer = setTimeout(() => setShowSplash(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

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

  // Referral code typed on Register (email or Google sign-up): attach it once
  // the partner is signed in, and tell them whether it worked.
  useEffect(() => {
    if (!isAuthenticated) return;
    applyPendingReferral()
      .then((r) => {
        if (r) Alert.alert(r.ok ? 'Referral code added' : 'Referral code not added', r.message);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  if (!isReady || showSplash) {
    return <ScreenSplash />;
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
