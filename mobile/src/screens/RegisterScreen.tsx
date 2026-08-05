import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/types';
import { API_BASE_URL } from '../utils/config';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen = () => {
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Credentials, Step 2: OTP
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigation = useNavigation<RegisterScreenNavigationProp>();

  // Step 1: Submit email & password to initiate registration
  const handleRegister = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/partner/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (res.ok || data.success) {
        setSuccessMessage('OTP sent securely to your email. Please check your inbox.');
        setStep(2);
      } else {
        setErrorMessage(data.message || 'Failed to register. Please try again.');
      }
    } catch (error) {
      console.error(`Register error [${API_BASE_URL}/partner/auth/register]:`, error);
      setErrorMessage('Unable to connect to server. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit OTP code for email verification
  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/partner/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });

      const data = await res.json();

      if (res.ok || data.success) {
        setSuccessMessage('Email verified successfully! Redirecting to login...');
        setTimeout(() => {
          navigation.navigate('Login');
        }, 1500);
      } else {
        setErrorMessage(data.message || 'Invalid or expired OTP code.');
      }
    } catch (error) {
      console.error(`Verify OTP error [${API_BASE_URL}/partner/auth/verify-otp]:`, error);
      setErrorMessage('Unable to connect to server. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#e84118" />

      {/* Premium Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Image
            source={require('../../assets/mbconnect.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>NEW PARTNER</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/mbconnect.png')}
              style={styles.cardLogo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>
            {step === 1 ? 'Partner Registration' : 'Verify Email'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Create your account to join the fleet and manage bookings.'
              : `Enter the 6-digit verification code sent to ${email}`}
          </Text>

          {/* Feedback Banners */}
          {errorMessage ? (
            <View style={styles.errorAlert}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successAlert}>
              <Ionicons name="checkmark-circle" size={18} color="#166534" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {step === 1 ? (
            <>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="partner@example.com"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  (!email.trim() || !password || loading) && styles.buttonDisabled,
                ]}
                onPress={handleRegister}
                disabled={!email.trim() || !password || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>Send OTP Verification</Text>
                    <Ionicons name="key-outline" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Enter 6-Digit OTP Code</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="123456"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, (!otp.trim() || loading) && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={!otp.trim() || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Text style={styles.buttonText}>Verify & Complete Registration</Text>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setStep(1);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                style={styles.backStepButton}
              >
                <Text style={styles.backStepText}>← Change email address</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBanner: {
    backgroundColor: '#FE5300',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#FE5300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingRight: 10,
  },
  headerLogo: {
    width: 130,
    height: 34,
    tintColor: '#ffffff',
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardLogo: {
    width: 130,
    height: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  successText: {
    color: '#166534',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  otpInput: {
    letterSpacing: 8,
    fontSize: 18,
    fontWeight: '800',
  },
  eyeIcon: {
    padding: 6,
  },
  button: {
    backgroundColor: '#FE5300',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FE5300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  backStepButton: {
    alignItems: 'center',
    marginTop: 14,
  },
  backStepText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FE5300',
  },
});
