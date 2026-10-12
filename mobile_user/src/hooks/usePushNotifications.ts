import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useNotificationStore } from '../store/useNotificationStore';

// Expo Go (SDK 53+) no longer supports expo-notifications' Android push path at
// all, and it surfaces that as a hard console.error (which shows as a
// blocking full-screen error overlay) the moment any Notifications.* API is
// touched. There's no development build in this workflow yet, so push
// notifications simply aren't available while testing via Expo Go — every
// Notifications call below is skipped in that case so the app keeps running.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // expo-notifications 0.32 shows foreground notifications only with
      // shouldShowBanner / shouldShowList (shouldShowAlert is deprecated).
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (isExpoGo) {
      console.log('Push notifications are unavailable in Expo Go (SDK 53+) — use a development build to test them.');
      return;
    }

    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Tapping a push notification: hand its data to App.tsx, which opens the
    // related screen (see openNotificationTarget). Also covers the tap that
    // launched the app from a closed state.
    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification?.request?.content?.data as Record<string, any> | undefined;
      if (!response) return;
      if (data && Object.keys(data).length) useNotificationStore.getState().setPendingOpen(data);
      // The OS keeps returning the last tapped notification on every launch
      // until it's cleared -- clear it so an old tap isn't re-opened later.
      try {
        Notifications.clearLastNotificationResponse();
      } catch {}
    };
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleResponse);
    Notifications.getLastNotificationResponseAsync().then(handleResponse).catch(() => {});

    return () => {
      // removeNotificationSubscription no longer exists in this SDK.
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken, notification };
};

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B00',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.log('Missing EAS projectId in app.json (extra.eas.projectId); cannot fetch push token.');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log("Expo Push Token:", token);
    } catch (e) {
      console.log("Error getting token:", e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
