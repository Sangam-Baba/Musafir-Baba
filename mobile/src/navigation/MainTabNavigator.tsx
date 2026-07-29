import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileStack } from './ProfileStack';
import { useAuthStore } from '../store/useAuthStore';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

import { FleetRegistryScreen } from '../screens/FleetRegistryScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => {
  const logout = useAuthStore((state) => state.logout);

  const HeaderLogoutButton = () => (
    <TouchableOpacity onPress={logout} style={styles.logoutButton}>
      <Text style={styles.logoutText}>Logout</Text>
    </TouchableOpacity>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerRight: () => <HeaderLogoutButton />,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={HomeScreen} 
        options={{ title: 'Dashboard' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack} 
        options={{ title: 'Profile' }} 
      />
      <Tab.Screen 
        name="Fleet" 
        component={FleetRegistryScreen}
        options={{ title: 'Fleet' }} 
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 16,
    padding: 8,
  },
  logoutText: {
    color: colors.primary,
    fontWeight: 'bold',
  }
});
