import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { OnboardingStackParamList } from './types';
import { PersonalDetailsScreen } from '../screens/PersonalDetailsScreen';
import { FleetRegistryScreen } from '../screens/FleetRegistryScreen';
import { VehicleSettingsScreen } from '../screens/VehicleSettingsScreen';

const Stack = createStackNavigator<OnboardingStackParamList>();

export const OnboardingStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        },
        headerTintColor: '#0f172a',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen 
        name="PersonalDetails" 
        component={PersonalDetailsScreen} 
        options={{ title: 'Profile Setup (1/5)' }}
      />
      <Stack.Screen 
        name="FleetRegistry" 
        component={FleetRegistryScreen} 
        options={{ title: 'Fleet Registry (4/5)' }}
      />
      <Stack.Screen 
        name="VehicleSettings" 
        component={VehicleSettingsScreen} 
        options={{ title: 'Vehicle Settings (5/5)' }}
      />
    </Stack.Navigator>
  );
};
