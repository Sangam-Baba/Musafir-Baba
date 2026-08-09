import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Car, Calendar, Headphones, User } from 'lucide-react-native';

interface RiderBottomNavbarProps {
  activeScreen?: string;
  onNavigate?: (screen: string) => void;
  navigation?: any;
}

export const RiderBottomNavbar: React.FC<RiderBottomNavbarProps> = ({
  activeScreen,
  onNavigate,
  navigation,
}) => {
  const handlePress = (screenId: string, screenName: string) => {
    if (onNavigate) {
      onNavigate(screenId);
    } else if (navigation && navigation.navigate) {
      navigation.navigate(screenName);
    }
  };

  const isHomeActive = activeScreen === '31' || activeScreen === '36' && false; // Screen 31 is Rider Home
  const isTripsActive = activeScreen === '35' || activeScreen === '38';
  const isSupportActive = activeScreen === '37' || activeScreen === '39';
  const isProfileActive = activeScreen === '36' || activeScreen === '40';

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', zIndex: 40, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
      
      <TouchableOpacity 
        onPress={() => handlePress('31', 'ProfileMenuScreen')}
        style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 2 }}
      >
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <Car size={18} color={activeScreen === '31' ? '#FF5500' : '#94A3B8'} />
        </View>
        <Text style={{ fontSize: 9.5, fontWeight: activeScreen === '31' ? '800' : '600', color: activeScreen === '31' ? '#FF5500' : '#94A3B8', marginTop: 2 }}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => handlePress('35', 'SettingsScreen')}
        style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 2 }}
      >
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <Calendar size={18} color={activeScreen === '35' ? '#FF5500' : '#94A3B8'} />
        </View>
        <Text style={{ fontSize: 9.5, fontWeight: activeScreen === '35' ? '800' : '600', color: activeScreen === '35' ? '#FF5500' : '#94A3B8', marginTop: 2 }}>My Trips</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => handlePress('37', 'SupportScreen')}
        style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 2 }}
      >
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <Headphones size={18} color={activeScreen === '37' ? '#FF5500' : '#94A3B8'} />
        </View>
        <Text style={{ fontSize: 9.5, fontWeight: activeScreen === '37' ? '800' : '600', color: activeScreen === '37' ? '#FF5500' : '#94A3B8', marginTop: 2 }}>Support</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => handlePress('36', 'AboutScreen')}
        style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 2 }}
      >
        <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
          <User size={18} color={activeScreen === '36' ? '#FF5500' : '#94A3B8'} />
        </View>
        <Text style={{ fontSize: 9.5, fontWeight: activeScreen === '36' ? '800' : '600', color: activeScreen === '36' ? '#FF5500' : '#94A3B8', marginTop: 2 }}>Profile</Text>
      </TouchableOpacity>

    </View>
  );
};
export default RiderBottomNavbar;
