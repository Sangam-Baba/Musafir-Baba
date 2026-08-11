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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/types';
import { API_BASE_URL } from '../utils/config';

type ForgotPasswordNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
type ForgotPasswordRouteProp = RouteProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const route = useRoute<ForgotPasswordRouteProp>();

  const [step, setStep] = useState<1 | 2>(1); // Step 1: Send OTP, Step 2: Reset Password
  const [email, setEmail] = useState(route.params?.initialEmail || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Request Password Reset OTP
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/partner/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (res.ok || data.success) {
        setSuccessMessage('Reset OTP sent securely to your email address.');
        setStep(2);
      } else {
        setErrorMessage(data.message || 'Failed to send reset OTP. Verify email address.');
      }
    } catch (error) {
      console.error(`Forgot password error [${API_BASE_URL}/partner/auth/forgot-password]:`, error);
      setErrorMessage('Unable to connect to server. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP & new password
  const handleResetPassword = async () => {
    if (!otp.trim() || !newPassword) {
      setErrorMessage('Please enter the OTP and your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/partner/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok || data.success) {
        setSuccessMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigation.navigate('Login');
        }, 1500);
      } else {
        setErrorMessage(data.message || 'Invalid OTP code or password reset failed.');
      }
    } catch (error) {
      console.error(`Reset password error [${API_BASE_URL}/partner/auth/reset-password]:`, error);
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
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* =========================================================
            TOP HERO BANNER IMAGE (authBanner.png)
           ========================================================= */}
        <View style={styles.heroBannerContainer}>
          <Image 
            source={require('../../assets/authBanner.png')} 
            style={styles.heroBannerImage}
            resizeMode="cover"
          />
        </View>

        {/* =========================================================
            FLOATING WHITE FORM CARD (1:1 MATCH WITH REFERENCE SCREENSHOT 1)
           ========================================================= */}
        <View style={styles.cardContainer}>
          <View style={styles.whiteCard}>

            {/* Card Title & Subtitle */}
            <Text style={styles.cardMainTitle}>
              {step === 1 ? 'Forgot Password?' : 'Create New Password'}
            </Text>
            <Text style={styles.cardMainSubtitle}>
              {step === 1
                ? 'Enter email to receive 6-digit OTP verification code'
                : 'Enter the OTP code sent to your email & set password'}
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
                {/* Email Field */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Registered Email Address</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="mail-outline" size={18} color="#FE5300" style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.textInput}
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

                {/* Send Verification Code CTA Button */}
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleForgotPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.btnInnerRow}>
                      <Text style={styles.btnText}>Send Verification Code</Text>
                      <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Back to Login Link */}
                <View style={styles.switchPromptBox}>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.registerHereLink}>‹ Back to Sign In</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* OTP Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>OTP Code</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="key-outline" size={18} color="#FE5300" style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.textInput}
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

                {/* New Password Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>New Password</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="lock-closed-outline" size={18} color="#FE5300" style={styles.inputLeftIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter new password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (errorMessage) setErrorMessage('');
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeToggleBtn}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Reset Password Button */}
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.btnInnerRow}>
                      <Text style={styles.btnText}>Update Password</Text>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Back Link */}
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={{ marginTop: 16, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b' }}>
                    ‹ Resend OTP or Change Email
                  </Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </View>

        {/* =========================================================
            BOTTOM 4-COLUMN FEATURE GRID (1:1 MATCH WITH REFERENCE SCREENSHOT 2)
           ========================================================= */}
        <View style={styles.bottomSection}>
          <View style={styles.featureGridBox}>
            
            {/* Feature 1 */}
            <View style={styles.featureColItem}>
              <View style={styles.featureIconBadge}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#FE5300" />
              </View>
              <Text style={styles.featureHeading} numberOfLines={1}>Verified Platform</Text>
              <Text style={styles.featureSubheading} numberOfLines={1}>Safe & Trusted</Text>
            </View>

            {/* Feature 2 */}
            <View style={[styles.featureColItem, styles.featureColDivider]}>
              <View style={styles.featureIconBadge}>
                <Text style={styles.rupeeSymbolText}>₹</Text>
              </View>
              <Text style={styles.featureHeading} numberOfLines={1}>Better Earnings</Text>
              <Text style={styles.featureSubheading} numberOfLines={1}>More Opportunities</Text>
            </View>

            {/* Feature 3 */}
            <View style={[styles.featureColItem, styles.featureColDivider]}>
              <View style={styles.featureIconBadge}>
                <Ionicons name="headset-outline" size={18} color="#FE5300" />
              </View>
              <Text style={styles.featureHeading} numberOfLines={1}>Dedicated Support</Text>
              <Text style={styles.featureSubheading} numberOfLines={1}>Always with you</Text>
            </View>

            {/* Feature 4 */}
            <View style={[styles.featureColItem, styles.featureColDivider]}>
              <View style={styles.featureIconBadge}>
                <Ionicons name="trending-up-outline" size={18} color="#FE5300" />
              </View>
              <Text style={styles.featureHeading} numberOfLines={1}>Grow With Us</Text>
              <Text style={styles.featureSubheading} numberOfLines={1}>Drive. Earn. Repeat.</Text>
            </View>

          </View>

          {/* Bottom Security Footer Line with Green Pill Badge */}
          <View style={styles.securityAssuranceRow}>
            <View style={styles.greenShieldPill}>
              <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
            </View>
            <Text style={styles.securityAssuranceText}>Secure • Reliable • Transparent</Text>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
  },
  heroBannerContainer: {
    width: '100%',
    aspectRatio: 2624 / 1632,
    backgroundColor: '#ffffff',
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  cardContainer: {
    paddingHorizontal: 16,
    marginTop: -44,
    zIndex: 20,
  },
  whiteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  cardMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardMainSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
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
    marginBottom: 16,
  },
  successText: {
    color: '#166534',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputLeftIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  eyeToggleBtn: {
    padding: 6,
  },
  primaryBtn: {
    backgroundColor: '#FE5300',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FE5300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  switchPromptBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  registerHereLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FE5300',
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  featureGridBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featureColItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  featureColDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
  },
  featureIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  rupeeSymbolText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FE5300',
  },
  featureHeading: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  featureSubheading: {
    fontSize: 8,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  securityAssuranceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  greenShieldPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  securityAssuranceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
});
