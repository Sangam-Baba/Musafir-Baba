import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileStackParamList } from './types';
import { PersonalDetailsScreen } from '../screens/PersonalDetailsScreen';
import { FleetRegistryScreen } from '../screens/FleetRegistryScreen';
import { VehicleSettingsScreen } from '../screens/VehicleSettingsScreen';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const Stack = createStackNavigator<ProfileStackParamList>();

type MenuNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileMenu'>;

const ProfileMenuScreen = () => {
  const navigation = useNavigation<MenuNavigationProp>();
  
  const menuItems = [
    { title: 'Personal Details', screen: 'PersonalDetails' as const },
    { title: 'Fleet Registry', screen: 'FleetRegistry' as const },
    { title: 'Vehicle Settings', screen: 'VehicleSettings' as const },
  ];

  return (
    <View style={styles.container}>
      {menuItems.map((item, index) => (
        <TouchableOpacity 
          key={index} 
          style={styles.menuItem}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Text style={styles.menuText}>{item.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMenu" component={ProfileMenuScreen} />
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <Stack.Screen name="FleetRegistry" component={FleetRegistryScreen} />
      <Stack.Screen name="VehicleSettings" component={VehicleSettingsScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  menuItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  }
});
