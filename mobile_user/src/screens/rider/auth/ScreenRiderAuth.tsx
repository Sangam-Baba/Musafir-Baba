import { View, Text, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  User,
  UserPlus,
  KeyRound,
  Phone,
  ChevronRight,
  ChevronDown,
  Car,
  Headphones,
  Award,
  Check,
} from 'lucide-react-native';
import { loginRider, registerRider, verifyRiderOtp, resendRiderOtp, forgotRiderPassword, resetRiderPassword } from '../../../api/riderAuth.api';
import { useAuthStore } from '../../../store/useAuthStore';

// Use high-resolution MBGO brand logo asset
const LOGO_TRANSPARENT = require('../../../assets/mbgoLogo_transparent.png');
const MBGO_LOGO = require('../../../desgin/mbgoLogo.png');

// =============================================================================
// Shared Presentational Components (Explicit React Native Styles)
// =============================================================================

const GoogleIcon = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </Svg>
);

const WorldMapBackground = () => (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.2 }} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none">
      <Path d="M30 40 Q45 20 60 45 T90 35 T120 50 Q110 90 80 100 Q40 90 30 40 Z" fill="#CBD5E1" opacity="0.6" />
      <Path d="M180 30 Q220 15 260 30 T320 40 T380 35 Q370 80 320 90 Q240 85 180 30 Z" fill="#CBD5E1" opacity="0.6" />
      <Path d="M210 110 Q240 100 270 120 T280 160 Q230 180 210 110 Z" fill="#CBD5E1" opacity="0.5" />
      
      <Path d="M 40 80 Q 180 -10 340 60" fill="none" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.45" />
      <Path d="M 90 40 Q 200 80 360 110" fill="none" stroke="#FF5500" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

      <Circle cx="40" cy="80" r="4" fill="#FF5500" />
      <Circle cx="40" cy="80" r="8" fill="#FF5500" opacity="0.2" />

      <Circle cx="340" cy="60" r="4" fill="#FF5500" />
      <Circle cx="340" cy="60" r="8" fill="#FF5500" opacity="0.2" />

      <Circle cx="360" cy="110" r="3.5" fill="#FF5500" />

      <G x="190" y="24" rotation="12">
        <Path d="M2 12l5-2 3 5 2-1-2-6 5-2c.6-.3.8-1 .5-1.5-.3-.6-1-.8-1.5-.5L9 6 6 1 4 2l2 5-5 2V12z" fill="#FF5500" opacity="0.75" />
      </G>
    </Svg>
  </View>
);

const BrandLogo = () => (
  <View style={{ alignItems: 'center', marginBottom: 6, zIndex: 10 }}>
    <Image source={MBGO_LOGO} style={{ width: 220, height: 72 }} resizeMode="contain" />
  </View>
);

function StepProgress({ currentStep, steps }: { currentStep: number; steps: { num: number; label: string }[] }) {
  return (
    <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
      {steps.map((s, idx) => {
        const isActive = currentStep === s.num;
        const isDone = currentStep > s.num;
        return (
          <React.Fragment key={s.num}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: isDone ? '#10B981' : isActive ? '#FF5500' : '#F1F5F9', marginRight: 4 }}>
                {isDone ? <Check size={12} color="#FFFFFF" /> : <Text style={{ fontSize: 10, fontWeight: '900', color: isActive ? '#FFFFFF' : '#94A3B8' }}>{s.num}</Text>}
              </View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? '#0F172A' : isDone ? '#475569' : '#94A3B8' }}>{s.label}</Text>
            </View>
            {idx < steps.length - 1 && (
              <View style={{ flex: 1, height: 1.5, marginHorizontal: 6, maxWidth: 20, backgroundColor: currentStep > s.num ? '#10B981' : '#E2E8F0' }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function OtpBoxes({
  digits,
  onChangeDigit,
  refsArray,
}: {
  digits: string[];
  onChangeDigit: (value: string, index: number) => void;
  refsArray: React.MutableRefObject<Array<TextInput | null>>;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
      {digits.map((digit, idx) => (
        <TextInput
          key={idx}
          ref={(el) => { refsArray.current[idx] = el; }}
          value={digit}
          onChangeText={(v) => onChangeDigit(v.replace(/[^0-9]/g, '').slice(-1), idx)}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
              refsArray.current[idx - 1]?.focus();
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          style={{ width: 38, height: 40, textAlign: 'center', fontSize: 16, fontWeight: '900', backgroundColor: '#FAFAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, color: '#0F172A' }}
        />
      ))}
    </View>
  );
}

function ResendRow({ timer, isDisabled, onResend }: { timer: number; isDisabled: boolean; onResend: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
        Resend code in: <Text style={{ fontWeight: '900', color: '#FF5500' }}>0:{timer < 10 ? `0${timer}` : timer}</Text>
      </Text>
      <TouchableOpacity disabled={isDisabled} onPress={onResend}>
        <Text style={{ fontSize: 11, fontWeight: '900', color: isDisabled ? '#CBD5E1' : '#FF5500', textDecorationLine: 'underline' }}>Resend OTP</Text>
      </TouchableOpacity>
    </View>
  );
}

function FeatureItem({ icon, title, description, showBorder = true }: { icon: React.ReactNode; title: string; description: string; showBorder?: boolean }) {
  return (
    <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', paddingHorizontal: 2, borderRightWidth: showBorder ? 1 : 0, borderRightColor: '#F1F5F9' }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF5EF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        {icon}
      </View>
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#0B1E3D', textAlign: 'center', marginBottom: 2 }}>{title}</Text>
      <Text style={{ fontSize: 8, fontWeight: '500', color: '#64748B', textAlign: 'center' }}>{description}</Text>
    </View>
  );
}

function HeroBackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 4, alignSelf: 'flex-start' }}>
      <ArrowLeft size={12} color="#334155" />
      <Text style={{ fontSize: 10, fontWeight: '900', color: '#334155', marginLeft: 4 }}>Back</Text>
    </TouchableOpacity>
  );
}

export default function ScreenRiderAuth({ activeScreen, onNavigate }: { activeScreen: string, onNavigate: (screen: string) => void }) {
  const setToken = useAuthStore((s) => s.setToken);
  const setProfile = useAuthStore((s) => s.setProfile);

  // Form States
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Input Values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [registerStep, setRegisterStep] = useState<'form' | 'otp' | 'success'>('form');
  const [registerOtpDigits, setRegisterOtpDigits] = useState(['', '', '', '', '', '']);
  const registerOtpRefs = useRef<Array<TextInput | null>>([]);

  // Forgot Password Steps: 1 (Email Input) -> 2 (OTP Input) -> 3 (New Password) -> 4 (Success)
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpDigits, setForgotOtpDigits] = useState(['', '', '', '', '', '']);
  const forgotOtpRefs = useRef<Array<TextInput | null>>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpTimer, setOtpTimer] = useState(30);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  useEffect(() => {
    const isOtpStepActive = (activeScreen === 'register' && registerStep === 'otp') || (activeScreen === 'forgot' && forgotStep === 2);
    if (!isOtpStepActive || otpTimer <= 0) {
      if (otpTimer <= 0) setIsResendDisabled(false);
      return;
    }
    const interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [activeScreen, registerStep, forgotStep, otpTimer]);

  const startOtpCountdown = () => {
    setOtpTimer(30);
    setIsResendDisabled(true);
  };

  // Toast System
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Please enter mobile number/email and password');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await loginRider({ email, password });
      await setToken(res.data.accessToken, res.data.refreshToken);
      setProfile({ ...(res.data.profile || {}), email });
      showToast('Signed in successfully');
      onNavigate('31');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !registerPassword) {
      showToast('Please fill in all fields');
      return;
    }
    if (!agreedToTerms) {
      showToast('Please agree to the Terms of Service & Privacy Policy');
      return;
    }
    setIsSubmitting(true);
    try {
      await registerRider({ fullName, email, mobileNumber: phone, password: registerPassword });
      showToast('OTP sent to your email');
      setRegisterOtpDigits(['', '', '', '', '', '']);
      setRegisterStep('otp');
      startOtpCountdown();
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterOtpChange = (value: string, index: number) => {
    const next = [...registerOtpDigits];
    next[index] = value;
    setRegisterOtpDigits(next);
    if (value && index < 5) registerOtpRefs.current[index + 1]?.focus();
  };

  const handleVerifyRegisterOtp = async () => {
    const registerOtp = registerOtpDigits.join('');
    if (registerOtp.length < 6) {
      showToast('Enter the 6-digit OTP sent to your email');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyRiderOtp({ email, otp: registerOtp });
      const res = await loginRider({ email, password: registerPassword });
      await setToken(res.data.accessToken, res.data.refreshToken);
      setProfile({ ...(res.data.profile || {}), email });
      setRegisterStep('success');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    try {
      await resendRiderOtp({ email });
      setRegisterOtpDigits(['', '', '', '', '', '']);
      startOtpCountdown();
      registerOtpRefs.current[0]?.focus();
      showToast('OTP resent to your email');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not resend OTP');
    }
  };

  const handleSendResetOtp = async () => {
    if (!forgotEmail) {
      showToast('Enter your registered email');
      return;
    }
    setIsSubmitting(true);
    try {
      await forgotRiderPassword({ email: forgotEmail });
      showToast('OTP sent to your email');
      setForgotOtpDigits(['', '', '', '', '', '']);
      setForgotStep(2);
      startOtpCountdown();
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not send OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotOtpChange = (value: string, index: number) => {
    const next = [...forgotOtpDigits];
    next[index] = value;
    setForgotOtpDigits(next);
    if (value && index < 5) forgotOtpRefs.current[index + 1]?.focus();
  };

  const handleResendForgotOtp = async () => {
    try {
      await forgotRiderPassword({ email: forgotEmail });
      setForgotOtpDigits(['', '', '', '', '', '']);
      startOtpCountdown();
      forgotOtpRefs.current[0]?.focus();
      showToast('OTP resent to your email');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not resend OTP');
    }
  };

  const handleVerifyForgotOtp = () => {
    const forgotOtp = forgotOtpDigits.join('');
    if (forgotOtp.length < 6) {
      showToast('Enter the 6-digit OTP sent to your email');
      return;
    }
    setForgotStep(3);
  };

  const handleResetPassword = async () => {
    const forgotOtp = forgotOtpDigits.join('');
    if (!newPassword) {
      showToast('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      await resetRiderPassword({ email: forgotEmail, otp: forgotOtp, newPassword });
      setForgotStep(4);
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForgotFlow = () => {
    setForgotStep(1);
    setForgotEmail('');
    setForgotOtpDigits(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
  };

  const showHeroBack =
    (activeScreen === 'register' && registerStep === 'otp') ||
    (activeScreen === 'forgot' && (forgotStep === 2 || forgotStep === 3));

  const handleHeroBack = () => {
    if (activeScreen === 'register') setRegisterStep('form');
    else if (activeScreen === 'forgot') setForgotStep(forgotStep - 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      {/* Main Mobile Frame Container */}
      <View style={{ flex: 1, backgroundColor: '#F4F6F9', position: 'relative' }}>

        {/* Header Navigation Bar */}
        <View style={{ width: '100%', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', zIndex: 20, position: 'absolute', top: 0, left: 0, right: 0 }}>
          <TouchableOpacity onPress={() => showToast('Opening Customer Portal...')} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9' }}>
            <User size={13} color="#1E293B" />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#1E293B', marginLeft: 4, marginRight: 2 }}>Customer Portal</Text>
            <ChevronRight size={11} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* Content Body (No Scroll) */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 10, paddingTop: 34 }} showsVerticalScrollIndicator={false}>

          {/* =========================================================
              HERO BRAND SECTION
             ========================================================= */}
          <View style={{ position: 'relative', width: '100%', backgroundColor: '#F3F6FA', paddingTop: 4, paddingHorizontal: 16, paddingBottom: 2, alignItems: 'center', overflow: 'hidden' }}>
            <WorldMapBackground />

            <View style={{ width: '100%', alignItems: 'flex-start', zIndex: 10, minHeight: showHeroBack ? undefined : 2 }}>
              {showHeroBack && <HeroBackButton onPress={handleHeroBack} />}
            </View>

            <BrandLogo />

            {/* Dynamic Hero Titles per Screen */}
            {activeScreen === 'login' && (
              <>
                <Text style={{ fontSize: 23, fontWeight: '600', color: '#0B1E3D', textAlign: 'center', marginTop: 2, zIndex: 10, lineHeight: 30 }}>
                  Your Journey,{'\n'}
                  <Text style={{ color: '#FF5500', fontWeight: '600' }}>Our Priority.</Text>
                </Text>
                <View style={{ width: 32, height: 2.5, backgroundColor: '#FF5500', borderRadius: 1, marginVertical: 6, zIndex: 10 }} />
                <Text style={{ fontSize: 13, fontWeight: '400', color: '#475569', textAlign: 'center', zIndex: 10, lineHeight: 18 }}>
                  Premium rides.{'\n'}Trusted every mile.
                </Text>
              </>
            )}

            {activeScreen === 'register' && (
              <>
                <Text style={{ fontSize: 23, fontWeight: '600', color: '#0B1E3D', textAlign: 'center', marginTop: 2, zIndex: 10, lineHeight: 30 }}>
                  Start Your Journey,{'\n'}
                  <Text style={{ color: '#FF5500', fontWeight: '600' }}>Join Us Today.</Text>
                </Text>
                <View style={{ width: 32, height: 2.5, backgroundColor: '#FF5500', borderRadius: 1, marginVertical: 6, zIndex: 10 }} />
                <Text style={{ fontSize: 13, fontWeight: '400', color: '#475569', textAlign: 'center', zIndex: 10, lineHeight: 18 }}>
                  Create an account in seconds{'\n'}to book your next ride.
                </Text>
              </>
            )}

            {activeScreen === 'forgot' && (
              <>
                <Text style={{ fontSize: 23, fontWeight: '600', color: '#0B1E3D', textAlign: 'center', marginTop: 2, zIndex: 10, lineHeight: 30 }}>
                  Account Recovery,{'\n'}
                  <Text style={{ color: '#FF5500', fontWeight: '600' }}>Made Simple.</Text>
                </Text>
                <View style={{ width: 32, height: 2.5, backgroundColor: '#FF5500', borderRadius: 1, marginVertical: 6, zIndex: 10 }} />
                <Text style={{ fontSize: 13, fontWeight: '400', color: '#475569', textAlign: 'center', zIndex: 10, lineHeight: 18 }}>
                  Follow quick steps to reset{'\n'}your account password.
                </Text>
              </>
            )}
          </View>

          {/* =========================================================
              FLOATING WHITE CARD OVERLAY (FORM SECTION)
             ========================================================= */}
          <View style={{ paddingHorizontal: 14, marginTop: 24, zIndex: 30 }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#F1F5F9',
                borderRadius: 24,
                paddingHorizontal: 18,
                paddingBottom: 20,
                paddingTop: 34,
                position: 'relative',
              }}
            >

              {/* Stepper Bar (Register/Forgot) */}
              {(activeScreen === 'register' && registerStep !== 'success') && (
                <StepProgress currentStep={registerStep === 'form' ? 1 : registerStep === 'otp' ? 2 : 3} steps={[{ num: 1, label: 'Details' }, { num: 2, label: 'OTP' }, { num: 3, label: 'Ready' }]} />
              )}
              {(activeScreen === 'forgot' && forgotStep < 4) && (
                <View style={{ marginBottom: 16 }}>
                  <StepProgress currentStep={forgotStep} steps={[{ num: 1, label: 'Email' }, { num: 2, label: 'OTP' }, { num: 3, label: 'Reset' }]} />
                </View>
              )}

              {/* Floating Center Icon Badge (Perfect Circle) */}
              {!(activeScreen === 'register' && registerStep === 'success') && !(activeScreen === 'forgot' && forgotStep === 4) && (
                <View style={{ position: 'absolute', top: -22, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF5EF', borderWidth: 2, borderColor: '#FFE8D9', alignItems: 'center', justifyContent: 'center' }}>
                    {activeScreen === 'login' && <Car size={22} color="#FF5500" />}
                    {activeScreen === 'register' && <UserPlus size={22} color="#FF5500" />}
                    {activeScreen === 'forgot' && <KeyRound size={22} color="#FF5500" />}
                  </View>
                </View>
              )}

              {/* ----------------------------------------------------
                  1. SIGN IN SCREEN
                 ---------------------------------------------------- */}
              {activeScreen === 'login' && (
                <View style={{ gap: 10 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#0B1E3D' }}>Welcome Back!</Text>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>Sign in to book your next ride</Text>
                  </View>

                  {/* Email ID Field */}
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>Email ID</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, height: 40, backgroundColor: '#FAFAFC' }}>
                      <View style={{ marginRight: 8 }}>
                        <Mail size={15} color="#94A3B8" />
                      </View>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Enter your email address"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '600', fontSize: 12, color: '#0F172A' }}
                      />
                    </View>
                  </View>

                  {/* Password Field */}
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>Password</Text>
                      <TouchableOpacity onPress={() => { onNavigate('forgot'); resetForgotFlow(); }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#FF5500' }}>Forgot password?</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, height: 40, backgroundColor: '#FAFAFC' }}>
                      <View style={{ marginRight: 8 }}>
                        <Lock size={15} color="#94A3B8" />
                      </View>
                      <TextInput
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        placeholderTextColor="#94A3B8"
                        style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '600', fontSize: 12, color: '#0F172A' }}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={15} color="#94A3B8" /> : <Eye size={15} color="#94A3B8" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Primary CTA Button */}
                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isSubmitting}
                    style={{ width: '100%', height: 40, backgroundColor: '#FF5500', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12, marginRight: 6 }}>{isSubmitting ? 'Signing in...' : 'Sign In to Continue'}</Text>
                    <ArrowRight size={15} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Divider: OR (Commented for now) */}
                  {/*
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#94A3B8', paddingHorizontal: 8 }}>OR</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
                  </View>
                  */}

                  {/* Google Sign In Button (Commented for now) */}
                  {/*
                  <TouchableOpacity
                    onPress={() => showToast('Google Sign In coming soon')}
                    style={{ width: '100%', height: 40, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <GoogleIcon size={15} />
                    <Text style={{ color: '#1E293B', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>Continue with Google</Text>
                  </TouchableOpacity>
                  */}

                  {/* Register Switch Prompt */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>New here?</Text>
                    <TouchableOpacity onPress={() => onNavigate('register')} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#FF5500' }}>Create an account</Text>
                      <ChevronRight size={12} color="#FF5500" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ----------------------------------------------------
                  2. SIGN UP / REGISTER SCREEN
                 ---------------------------------------------------- */}
              {activeScreen === 'register' && registerStep === 'form' && (
                <View style={{ gap: 8 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#0B1E3D' }}>Create Account</Text>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>Sign up to manage and book premium rides</Text>
                  </View>

                  {/* Full Name */}
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0F172A' }}>Full Name</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, height: 38, backgroundColor: '#FAFAFC' }}>
                      <View style={{ marginRight: 6 }}>
                        <User size={14} color="#94A3B8" />
                      </View>
                      <TextInput
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="John Doe"
                        placeholderTextColor="#94A3B8"
                        style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '600', fontSize: 12, color: '#0F172A' }}
                      />
                    </View>
                  </View>

                  {/* Email Address */}
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0F172A' }}>Email ID</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, height: 38, backgroundColor: '#FAFAFC' }}>
                      <View style={{ marginRight: 6 }}>
                        <Mail size={14} color="#94A3B8" />
                      </View>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="user@example.com"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '600', fontSize: 12, color: '#0F172A' }}
                      />
                    </View>
                  </View>

                  {/* Phone Number */}
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0F172A' }}>Mobile Number</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, height: 38, backgroundColor: '#FAFAFC' }}>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 6, borderRightWidth: 1, borderRightColor: '#E2E8F0', marginRight: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0F172A', marginRight: 2 }}>+91</Text>
                        <ChevronDown size={11} color="#64748B" />
                      </TouchableOpacity>
                      <Phone size={14} color="#94A3B8" />
                      <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Enter mobile number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '600', fontSize: 12, color: '#0F172A', marginLeft: 6 }}
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0F172A' }}>Password</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, height: 38, backgroundColor: '#FAFAFC' }}>
                      <View style={{ marginRight: 6 }}>
                        <Lock size={14} color="#94A3B8" />
                      </View>
                      <TextInput
                        secureTextEntry={!showPassword}
                        value={registerPassword}
                        onChangeText={setRegisterPassword}
                        placeholder="At least 6 characters"
                        placeholderTextColor="#94A3B8"
                        style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '600', fontSize: 12, color: '#0F172A' }}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={14} color="#94A3B8" /> : <Eye size={14} color="#94A3B8" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Terms & Conditions Agreement */}
                  <TouchableOpacity onPress={() => setAgreedToTerms(!agreedToTerms)} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 2 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: agreedToTerms ? '#FF5500' : '#CBD5E1', backgroundColor: agreedToTerms ? '#FF5500' : '#FFFFFF', marginRight: 6 }}>
                      {agreedToTerms && <Check size={10} color="#FFFFFF" />}
                    </View>
                    <Text style={{ fontSize: 10, color: '#64748B', flex: 1 }}>
                      I agree to the <Text style={{ fontWeight: 'bold', color: '#334155', textDecorationLine: 'underline' }}>Terms of Service</Text> & <Text style={{ fontWeight: 'bold', color: '#334155', textDecorationLine: 'underline' }}>Privacy Policy</Text>
                    </Text>
                  </TouchableOpacity>

                  {/* Register Button */}
                  <TouchableOpacity
                    onPress={handleRegister}
                    disabled={isSubmitting}
                    style={{ width: '100%', height: 40, backgroundColor: '#FF5500', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12, marginRight: 6 }}>{isSubmitting ? 'Sending code...' : 'Send Verification Code'}</Text>
                    <ArrowRight size={15} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B' }}>Already have an account?</Text>
                    <TouchableOpacity onPress={() => onNavigate('login')}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#FF5500', marginLeft: 4 }}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ----------------------------------------------------
                  2b. REGISTER: EMAIL OTP VERIFICATION
                 ---------------------------------------------------- */}
              {activeScreen === 'register' && registerStep === 'otp' && (
                <View style={{ gap: 8 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#0B1E3D' }}>Verify Your Email</Text>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748B', textAlign: 'center' }}>
                      We've sent a 6-digit code to{'\n'}
                      <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>{email}</Text>
                    </Text>
                  </View>

                  <OtpBoxes digits={registerOtpDigits} onChangeDigit={handleRegisterOtpChange} refsArray={registerOtpRefs} />

                  <ResendRow timer={otpTimer} isDisabled={isResendDisabled} onResend={handleResendRegisterOtp} />

                  <TouchableOpacity
                    onPress={handleVerifyRegisterOtp}
                    disabled={isSubmitting}
                    style={{ width: '100%', height: 40, backgroundColor: '#FF5500', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12, marginRight: 6 }}>{isSubmitting ? 'Verifying...' : 'Verify & Create Account'}</Text>
                    <CheckCircle2 size={15} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={{ alignItems: 'center', paddingTop: 2 }}>
                    <TouchableOpacity onPress={() => setRegisterStep('form')}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#64748B', textDecorationLine: 'underline' }}>Change Registration Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ----------------------------------------------------
                  2c. REGISTER: SUCCESS
                 ---------------------------------------------------- */}
              {activeScreen === 'register' && registerStep === 'success' && (
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECFDF5', borderWidth: 2, borderColor: '#A7F3D0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <CheckCircle2 size={28} color="#10b981" />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#0B1E3D', marginBottom: 2 }}>Account Created!</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginBottom: 16, paddingHorizontal: 8 }}>
                    Welcome aboard, <Text style={{ fontWeight: 'bold', color: '#1E293B' }}>{fullName || 'Traveler'}</Text>! Your mbgo account has been created successfully.
                  </Text>

                  <TouchableOpacity
                    onPress={() => { setRegisterStep('form'); onNavigate('31'); }}
                    style={{ width: '100%', height: 40, backgroundColor: '#0B1E3D', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12, marginRight: 6 }}>Sign In & Book Ride</Text>
                    <ArrowRight size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* ----------------------------------------------------
                  3. FORGOT PASSWORD SCREEN - STEP 1: EMAIL
                 ---------------------------------------------------- */}
              {activeScreen === 'forgot' && forgotStep === 1 && (
                <View style={{ gap: 16 }}>
                  <View style={{ alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0B1E3D', marginBottom: 4 }}>Forgot Password?</Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748B', textAlign: 'center', lineHeight: 16 }}>Enter registered Email ID to receive a 6-digit code</Text>
                  </View>

                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>Registered Email ID</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#FAFAFC' }}>
                      <View style={{ marginRight: 8 }}>
                        <Mail size={16} color="#94A3B8" />
                      </View>
                      <TextInput
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        placeholder="you@example.com"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '500', fontSize: 13, color: '#0F172A' }}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleSendResetOtp}
                    disabled={isSubmitting}
                    style={{ width: '100%', height: 44, backgroundColor: '#FF5500', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13, marginRight: 8 }}>{isSubmitting ? 'Sending...' : 'Send Verification Code'}</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748B' }}>Remembered your password?</Text>
                    <TouchableOpacity onPress={() => { onNavigate('login'); resetForgotFlow(); }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF5500', marginLeft: 4 }}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 2: VERIFY OTP CODE */}
              {activeScreen === 'forgot' && forgotStep === 2 && (
                <View style={{ gap: 14 }}>
                  <View style={{ alignItems: 'center', marginBottom: 2 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0B1E3D', marginBottom: 4 }}>Verify OTP Code</Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748B', textAlign: 'center', lineHeight: 16 }}>
                      We've sent a 6-digit code to{'\n'}
                      <Text style={{ fontWeight: '600', color: '#1E293B' }}>{forgotEmail}</Text>
                    </Text>
                  </View>

                  <OtpBoxes digits={forgotOtpDigits} onChangeDigit={handleForgotOtpChange} refsArray={forgotOtpRefs} />

                  <ResendRow timer={otpTimer} isDisabled={isResendDisabled} onResend={handleResendForgotOtp} />

                  <TouchableOpacity
                    onPress={handleVerifyForgotOtp}
                    style={{ width: '100%', height: 44, backgroundColor: '#FF5500', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13, marginRight: 8 }}>Verify Code</Text>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={{ alignItems: 'center', paddingTop: 6 }}>
                    <TouchableOpacity onPress={() => setForgotStep(1)}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B', textDecorationLine: 'underline' }}>Change Email ID</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 3: SET NEW PASSWORD */}
              {activeScreen === 'forgot' && forgotStep === 3 && (
                <View style={{ gap: 14 }}>
                  <View style={{ alignItems: 'center', marginBottom: 2 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#0B1E3D', marginBottom: 4 }}>Reset Password</Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748B', textAlign: 'center', lineHeight: 16 }}>Set a strong new password for your mbgo account</Text>
                  </View>

                  {/* New Password */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>New Password</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#FAFAFC' }}>
                      <View style={{ marginRight: 8 }}>
                        <Lock size={16} color="#94A3B8" />
                      </View>
                      <TextInput
                        secureTextEntry={!showNewPassword}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="At least 6 characters"
                        placeholderTextColor="#94A3B8"
                        style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '500', fontSize: 13, color: '#0F172A' }}
                      />
                      <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm Password */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>Confirm Password</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#FAFAFC' }}>
                      <View style={{ marginRight: 8 }}>
                        <Lock size={16} color="#94A3B8" />
                      </View>
                      <TextInput
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Re-enter your password"
                        placeholderTextColor="#94A3B8"
                        style={{ flex: 1, backgroundColor: 'transparent', fontWeight: '500', fontSize: 13, color: '#0F172A' }}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={isSubmitting}
                    style={{ width: '100%', height: 44, backgroundColor: '#FF5500', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13, marginRight: 8 }}>{isSubmitting ? 'Updating...' : 'Reset Password'}</Text>
                    <Check size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 4: RESET SUCCESS */}
              {activeScreen === 'forgot' && forgotStep === 4 && (
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECFDF5', borderWidth: 2, borderColor: '#A7F3D0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <CheckCircle2 size={28} color="#10b981" />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#0B1E3D', marginBottom: 2 }}>Password Changed!</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginBottom: 16, paddingHorizontal: 8 }}>
                    Your mbgo account password has been updated successfully. You can now sign in with your new password.
                  </Text>

                  <TouchableOpacity
                    onPress={() => { resetForgotFlow(); onNavigate('login'); }}
                    style={{ width: '100%', height: 40, backgroundColor: '#0B1E3D', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 12, marginRight: 6 }}>Back to Sign In</Text>
                    <ArrowRight size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

            </View>
          </View>

          {/* =========================================================
              BOTTOM 3-COLUMN FEATURE GRID
             ========================================================= */}
          <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 10, flexDirection: 'row' }}>
              <FeatureItem icon={<ShieldCheck size={16} color="#FF5500" />} title="Safe & Reliable" description={`Your safety,\nour promise`} />
              <FeatureItem icon={<Award size={16} color="#FF5500" />} title="Best Experience" description={`Comfort on\nevery ride`} />
              <FeatureItem icon={<Headphones size={16} color="#FF5500" />} title="24x7 Support" description={`We're always\nhere for you`} showBorder={false} />
            </View>
          </View>

        </ScrollView>

        {/* Global Toast Notification */}
        {toastMsg ? (
          <View style={{ position: 'absolute', top: 24, left: 16, right: 16, alignItems: 'center', zIndex: 50 }} pointerEvents="none">
            <View style={{ maxWidth: '100%', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#1E293B', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}>
              <CheckCircle2 size={16} color="#34d399" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', flexShrink: 1 }}>{toastMsg}</Text>
            </View>
          </View>
        ) : null}

      </View>
    </View>
  );
}
