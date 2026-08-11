import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { InboxScreen } from '../screens/InboxScreen';
import { ProfileStack } from './ProfileStack';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const token = useAuthStore((state) => state.token);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/partner/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setUnreadCount(result.unreadCount ?? 0);
      })
      .catch((error) => console.error('Error fetching unread count:', error));
  }, [token]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FE5300',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Earnings') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Inbox') {
            iconName = focused ? 'mail' : 'mail-outline';
          } else if (route.name === 'Menu') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={focused ? 22 : 20} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ title: 'Bookings' }}
      />
      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ title: 'Earnings' }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ title: 'Inbox', tabBarBadge: unreadCount > 0 ? unreadCount : undefined, tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 10, fontWeight: '800' } }}
      />
      <Tab.Screen
        name="Menu"
        component={ProfileStack}
        options={{ title: 'Menu' }}
      />
    </Tab.Navigator>
  );
};
