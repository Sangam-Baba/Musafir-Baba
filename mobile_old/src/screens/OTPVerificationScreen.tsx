import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';

type OTPVerificationRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

export const OTPVerificationScreen = () => {
  const [otp, setOtp] = useState('');
  const route = useRoute<OTPVerificationRouteProp>();
  const setToken = useAuthStore((state) => state.setToken);

  const handleVerify = () => {
    // Fake token for placeholder to simulate successful login
    setToken('fake-jwt-token-123');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP for {route.params.phone}</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter 6-digit OTP"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        maxLength={6}
      />
      <Button title="Verify & Login" onPress={handleVerify} disabled={otp.length < 6} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 20, borderRadius: 5, textAlign: 'center', fontSize: 18 }
});
