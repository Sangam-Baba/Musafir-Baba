import { View, Text, TouchableOpacity, TextInput, Image, ScrollView } from 'react-native';
import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  CheckCircle2,
  MessageCircle,
  User,
  Phone,
  ChevronRight,
  Sparkles,
  Car,
  Headphones,
  TrendingUp,
  Award,
  Check,
  Building2,
  IndianRupee,
  RefreshCw
} from 'lucide-react-native';
import { loginRider, registerRider, verifyRiderOtp, resendRiderOtp, forgotRiderPassword, resetRiderPassword } from '../../../api/riderAuth.api';
import { useAuthStore } from '../../../store/useAuthStore';

export default function ScreenRiderAuth({ activeScreen, onNavigate }: { activeScreen: string, onNavigate: (screen: string) => void }) {
  // Navigation active screen: 'login' | 'register' | 'forgot'
  // State passed via props

  const setToken = useAuthStore((s) => s.setToken);
  const setProfile = useAuthStore((s) => s.setProfile);

  // Form States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Input Values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  // 'form' -> collecting details, 'otp' -> verifying email before first login
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [registerOtp, setRegisterOtp] = useState('');

  // Forgot Password Steps: 1 (Email Input) -> 2 (OTP Input) -> 3 (New Password)
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Toast System
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Please enter email and password');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await loginRider({ email, password });
      await setToken(res.data.accessToken);
      setProfile({ ...(res.data.profile || {}), email });
      showToast('Signed in successfully');
      onNavigate('31');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !registerPassword) {
      showToast('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await registerRider({ fullName, email, mobileNumber: phone, password: registerPassword });
      showToast('OTP sent to your email');
      setRegisterStep('otp');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyRegisterOtp = async () => {
    if (!registerOtp) {
      showToast('Enter the OTP sent to your email');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyRiderOtp({ email, otp: registerOtp });
      const res = await loginRider({ email, password: registerPassword });
      await setToken(res.data.accessToken);
      setProfile({ ...(res.data.profile || {}), email });
      showToast('Account created successfully!');
      setRegisterStep('form');
      onNavigate('31');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setIsSubmitting(false);
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
      setForgotStep(2);
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not send OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!forgotOtp || !newPassword) {
      showToast('Enter the OTP and a new password');
      return;
    }
    setIsSubmitting(true);
    try {
      await resetRiderPassword({ email: forgotEmail, otp: forgotOtp, newPassword });
      showToast('Password updated! Please sign in.');
      setForgotStep(1);
      setForgotOtp('');
      setNewPassword('');
      onNavigate('login');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950 selection:bg-[#FF4500] selection:text-white">
      
      {/* Main Mobile Frame Container */}
      <View className="flex-1 bg-[#F4F6F9] relative">
        
        {/* Scrollable Content Body */}
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

          {/* =========================================================
              HERO BACKGROUND SECTION (TOP HALF MATCHING REFERENCE IMAGE)
             ========================================================= */}
          <View className="relative min-h-[290px] w-full bg-slate-50/40 overflow-hidden pt-3 px-5">
            
            {/* Real SUV Backdrop Image on Right */}
            <View className="absolute right-0 top-12 w-[62%] h-[210px] pointer-events-none z-0" pointerEvents="none">
              <Image source={{ uri: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=1000" }} 
                accessibilityLabel="MBGO Vehicle" 
                className="w-full h-full object-cover object-left opacity-90 drop-shadow-xl" />
              {/* Subtle background skyline & bird graphic details overlay */}
              <View className="absolute inset-0 bg-sky-50/40"></View>
            </View>

            {/* Status Bar */}
            <View className="relative z-20 flex justify-between items-center pb-2 flex-row">
              <Text className="text-xs font-black text-slate-800">17:02</Text>
              <View className="flex items-center gap-1 flex-row">
                <Text className="text-[10px] font-extrabold text-slate-700">VoLTE</Text>
                <Text className="text-[10px] bg-slate-200 text-slate-800 px-1 rounded font-black">5G</Text>
                <View className="w-2.5 h-2.5 rounded-full bg-emerald-500"></View>
                <Text className="text-[10px] font-bold text-slate-700">33%</Text>
              </View>
            </View>

            {/* Top Header Bar */}
            <View className="relative z-20 flex items-center justify-between pt-1 pb-4 flex-row">
              {/* MBGO Brand Logo */}
              <View className="flex flex-col">
                <View className="flex items-center flex-row">
                  <Text className="text-[#0B132B]">MB</Text>
                  <Text className="text-[#FF4500]">GO</Text>
                </View>
                <View className="mt-0.5"><Text className="text-[8px] font-extrabold text-slate-500 tracking-wider uppercase">
                  powered by musafirbaba
                </Text></View>
              </View>

              {/* Portal Pill Badge */}
              <View className="bg-white px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-slate-200/80 flex-row">
                <Building2 className="w-3.5 h-3.5 text-[#FF4500]"/>
                <Text className="text-slate-900 font-extrabold text-[11px]">Rider Portal</Text>
              </View>
            </View>

            {/* Hero Heading Slogan */}
            <View className="relative z-20 w-[135px] pt-1 space-y-1">
              <Text className="text-2xl font-black text-[#0B132B] leading-tight tracking-tight">
                {activeScreen === 'login' && (
                  <>Welcome Back,{'\n'}<Text className="text-[#FF4500]">Rider!</Text></>
                )}
                {activeScreen === 'register' && (
                  <>Create Your{'\n'}<Text className="text-[#FF4500]">Account!</Text></>
                )}
                {activeScreen === 'forgot' && (
                  <>Reset Your{'\n'}<Text className="text-[#FF4500]">Password</Text></>
                )}
              </Text>
              <Text className="text-[11px] font-medium text-slate-600 leading-snug">
                {activeScreen === 'login' && 'Sign in to manage your trips, bookings and earnings — all in one place.'}
                {activeScreen === 'register' && 'Join MBGO today to book outstation rides at 0% markup.'}
                {activeScreen === 'forgot' && 'Enter your registered details to recover your account access.'}
              </Text>
            </View>

            {/* Dynamic Swooping Orange Wave Graphic on Left */}
            <View className="absolute -bottom-2 left-0 w-36 h-20 bg-[#FF4500] rounded-tr-[50px] opacity-90 -z-0"></View>
          </View>

          {/* =========================================================
              FLOATING WHITE CARD OVERLAY (FORM SECTION MATCHING IMAGE)
             ========================================================= */}
          <View className="px-4 -mt-6 relative z-30">
            <View className="bg-white border border-slate-200/80 rounded-[32px] p-5 shadow-2xl space-y-4">

              {/* ----------------------------------------------------
                  1. SIGN IN SCREEN
                 ---------------------------------------------------- */}
              {activeScreen === 'login' && (
                <View className="space-y-4 animate-in fade-in duration-200">
                  <View className="space-y-0.5 pb-1">
                    <Text className="text-xl font-extrabold text-slate-900">Sign in to your account</Text>
                    <Text className="text-xs font-semibold text-slate-400">Continue to your rider dashboard</Text>
                  </View>

                  {/* Email Field */}
                  <View className="space-y-1">
                    <Text className="block text-xs font-bold text-slate-700">Email Address</Text>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition shadow-sm flex-row">
                      <Mail className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput 
                        type="email" 
                        value={email} 
                        onChangeText={setEmail}
                        placeholder="partner@example.com" 
                        className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
                      />
                    </View>
                  </View>

                  {/* Password Field */}
                  <View className="space-y-1">
                    <View className="flex justify-between items-center flex-row">
                      <Text className="block text-xs font-bold text-slate-700">Password</Text>
                      <TouchableOpacity 
                        onPress={() => { onNavigate('forgot'); setForgotStep(1); }} 
                        className="hover:underline">
                        <Text className="text-xs font-bold text-[#FF4500]">Forgot Password?</Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition shadow-sm flex-row">
                      <Lock className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChangeText={setPassword}
                        placeholder="Enter your password" 
                        className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
                      />
                      <TouchableOpacity 
                         
                        onPress={() => setShowPassword(!showPassword)}
                        className="hover:text-slate-600 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Checkbox & WhatsApp Help Row */}
                  <View className="flex items-center justify-between pt-1 flex-row">
                    <Text className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                      <TextInput 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChangeText={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-[#FF4500] accent-[#FF4500] border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <Text className="text-xs font-bold text-slate-700">Remember me</Text>
                    </Text>

                    <TouchableOpacity 
                      
                      onPress={() => showToast("Opening WhatsApp Support...")}
                      className="flex items-center gap-1.5 hover:text-emerald-600 transition bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex-row"
                    >
                      <Text className="text-[10px] font-black text-emerald-700">Need help?</Text>
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600"/>
                    </TouchableOpacity>
                  </View>

                  {/* Primary CTA Button */}
                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isSubmitting}
                    className="w-full bg-[#FF4500] hover:bg-orange-600 active:scale-98 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 mt-2 flex-row"
                  >
                    <Text className="text-white font-bold text-sm">{isSubmitting ? 'Signing in...' : 'Sign In'}</Text>
                    <ArrowRight className="w-4 h-4 text-white"/>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View className="relative py-2">
                    <View className="absolute inset-0 flex items-center flex-row"><View className="w-full border-t border-slate-100"></View></View>
                    <Text className="relative bg-white px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">OR</Text>
                  </View>

                  {/* Register Switch Prompt */}
                  <View className="">
                    <Text className="text-xs font-bold text-slate-500">Don't have an account? </Text>
                    <TouchableOpacity 
                      onPress={() => onNavigate('register')}
                      className="hover:underline inline-flex items-center gap-0.5"
                    ><Text className="text-[#FF4500] font-black">
                      Register Here </Text><ChevronRight className="w-3.5 h-3.5"/>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ----------------------------------------------------
                  2. SIGN UP / REGISTER SCREEN
                 ---------------------------------------------------- */}
              {activeScreen === 'register' && registerStep === 'form' && (
                <View className="space-y-3 animate-in fade-in duration-200">
                  <View className="space-y-0.5 pb-1">
                    <Text className="text-xl font-extrabold text-slate-900">Create New Account</Text>
                    <Text className="text-xs font-semibold text-slate-400">Fill in your details to get started</Text>
                  </View>

                  {/* Full Name */}
                  <View className="space-y-1">
                    <Text className="block text-xs font-bold text-slate-700">Full Name</Text>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition flex-row">
                      <User className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput 
                         
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Ashutosh Rai" 
                        className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                    </View>
                  </View>

                  {/* Email Address */}
                  <View className="space-y-1">
                    <Text className="block text-xs font-bold text-slate-700">Email Address</Text>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition flex-row">
                      <Mail className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput 
                        type="email" 
                        value={email}
                        onChangeText={setEmail}
                        placeholder="ashutosh@example.com" 
                        className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                    </View>
                  </View>

                  {/* Phone Number */}
                  <View className="space-y-1">
                    <Text className="block text-xs font-bold text-slate-700">Mobile Number</Text>
                    <View className="flex items-center gap-2 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition flex-row">
                      <Text className="text-xs font-black text-slate-700 border-r border-slate-200 pr-2">+91</Text>
                      <TextInput 
                        type="tel" 
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="98765 43210" 
                        className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View className="space-y-1">
                    <Text className="block text-xs font-bold text-slate-700">Password</Text>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition flex-row">
                      <Lock className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput
                        secureTextEntry={!showPassword}
                        value={registerPassword}
                        onChangeText={setRegisterPassword}
                        placeholder="Create password"
                        className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                      <TouchableOpacity

                        onPress={() => setShowPassword(!showPassword)}
                        className="hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Register Button */}
                  <TouchableOpacity
                    onPress={handleRegister}
                    disabled={isSubmitting}
                    className="w-full bg-[#FF4500] hover:bg-orange-600 active:scale-98 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 mt-2 flex-row"
                  >
                    <Text className="text-white font-bold text-sm">{isSubmitting ? 'Creating account...' : 'Create Account'}</Text>
                    <Sparkles className="w-4 h-4 text-white"/>
                  </TouchableOpacity>

                  <View className="pt-1">
                    <Text className="text-xs font-bold text-slate-500">Already have an account? </Text>
                    <TouchableOpacity
                      onPress={() => onNavigate('login')}
                      className="hover:underline"
                    ><Text className="text-[#FF4500] font-black">
                      Sign In Here
                    </Text></TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ----------------------------------------------------
                  2b. REGISTER: EMAIL OTP VERIFICATION
                 ---------------------------------------------------- */}
              {activeScreen === 'register' && registerStep === 'otp' && (
                <View className="space-y-3 animate-in fade-in duration-200">
                  <View className="space-y-0.5 pb-1">
                    <Text className="text-xl font-extrabold text-slate-900">Verify Your Email</Text>
                    <Text className="text-xs font-semibold text-slate-400">Enter the OTP sent to {email}</Text>
                  </View>

                  <View className="space-y-1">
                    <Text className="block text-xs font-bold text-slate-700">OTP Code</Text>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] flex-row">
                      <Shield className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput
                        value={registerOtp}
                        onChangeText={setRegisterOtp}
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleVerifyRegisterOtp}
                    disabled={isSubmitting}
                    className="w-full bg-[#FF4500] hover:bg-orange-600 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 flex-row"
                  >
                    <Text className="text-white font-bold text-sm">{isSubmitting ? 'Verifying...' : 'Verify & Continue'}</Text>
                    <CheckCircle2 className="w-4 h-4"/>
                  </TouchableOpacity>

                  <View className="">
                    <Text className="text-center text-xs font-bold text-slate-400">Didn't receive code? </Text>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await resendRiderOtp({ email });
                          showToast('OTP resent to your email');
                        } catch (error: any) {
                          showToast(error?.response?.data?.message || 'Could not resend OTP');
                        }
                      }}
                      className="underline"
                    >
                      <Text className="text-[#FF4500]">Resend OTP</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ----------------------------------------------------
                  3. FORGOT PASSWORD SCREEN (MULTI-STEP RECOVERY)
                 ---------------------------------------------------- */}
              {activeScreen === 'forgot' && (
                <View className="space-y-4 animate-in fade-in duration-200">
                  
                  {/* Step Indicators */}
                  <View className="flex justify-center items-center gap-2 pb-1 flex-row">
                    <View className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center transition ${forgotStep >= 1 ? 'bg-[#FF4500] text-white' : 'bg-slate-100 text-slate-400'}`}><Text className="text-xs font-black">1</Text></View>
                    <View className={`w-8 h-0.5 ${forgotStep >= 2 ? 'bg-[#FF4500]' : 'bg-slate-200'}`}></View>
                    <View className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center transition ${forgotStep >= 2 ? 'bg-[#FF4500] text-white' : 'bg-slate-100 text-slate-400'}`}><Text className="text-xs font-black">2</Text></View>
                    <View className={`w-8 h-0.5 ${forgotStep >= 3 ? 'bg-[#FF4500]' : 'bg-slate-200'}`}></View>
                    <View className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center transition ${forgotStep >= 3 ? 'bg-[#FF4500] text-white' : 'bg-slate-100 text-slate-400'}`}><Text className="text-xs font-black">3</Text></View>
                  </View>

                  {/* STEP 1: ENTER EMAIL / PHONE */}
                  {forgotStep === 1 && (
                    <View className="space-y-3">
                      <View className="space-y-0.5">
                        <Text className="text-base font-black text-slate-900">Forgot Password?</Text>
                        <Text className="text-xs font-semibold text-slate-400">Enter email or phone to receive OTP code</Text>
                      </View>

                      <View className="space-y-1">
                        <Text className="block text-xs font-bold text-slate-700">Email Address or Phone</Text>
                        <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] flex-row">
                          <Mail className="w-4 h-4 text-[#FF4500] shrink-0"/>
                          <TextInput
                            value={forgotEmail}
                            onChangeText={setForgotEmail}
                            placeholder="you@example.com"
                            className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                          />
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={handleSendResetOtp}
                        disabled={isSubmitting}
                        className="w-full bg-[#FF4500] hover:bg-orange-600 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 flex-row"
                      >
                        <Text className="text-white font-bold text-sm">{isSubmitting ? 'Sending...' : 'Send Verification Code'}</Text>
                        <ArrowRight className="w-4 h-4"/>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* STEP 2: VERIFY OTP CODE */}
                  {forgotStep === 2 && (
                    <View className="space-y-3">
                      <View className="space-y-0.5">
                        <Text className="text-base font-black text-slate-900">Enter OTP Code</Text>
                        <Text className="text-xs font-semibold text-slate-400">Code sent to {forgotEmail}</Text>
                      </View>

                      <View className="flex justify-center gap-2 py-2 flex-row">
                        <TextInput
                          value={forgotOtp}
                          onChangeText={setForgotOtp}
                          maxLength={6}
                          placeholder="••••••"
                          className="w-40 h-12 text-center text-lg font-black bg-slate-50 border-2 border-[#FF4500] rounded-2xl text-slate-900 shadow-sm"
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          if (!forgotOtp) {
                            showToast('Enter the OTP sent to your email');
                            return;
                          }
                          setForgotStep(3);
                        }}
                        className="w-full bg-[#FF4500] hover:bg-orange-600 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 flex-row"
                      >
                        <Text className="text-white font-bold text-sm">Verify & Proceed</Text>
                        <CheckCircle2 className="w-4 h-4"/>
                      </TouchableOpacity>

                      <View className=""><Text className="text-center text-xs font-bold text-slate-400">
                        Didn't receive code? </Text><TouchableOpacity onPress={async () => {
                          try {
                            await forgotRiderPassword({ email: forgotEmail });
                            showToast('OTP resent to your email');
                          } catch (error: any) {
                            showToast(error?.response?.data?.message || 'Could not resend OTP');
                          }
                        }} className="underline"><Text className="text-[#FF4500]">Resend OTP</Text></TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* STEP 3: SET NEW PASSWORD */}
                  {forgotStep === 3 && (
                    <View className="space-y-3">
                      <View className="space-y-0.5">
                        <Text className="text-base font-black text-slate-900">Create New Password</Text>
                        <Text className="text-xs font-semibold text-slate-400">Enter a strong new password for your account</Text>
                      </View>

                      <View className="space-y-1">
                        <Text className="block text-xs font-bold text-slate-700">New Password</Text>
                        <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] flex-row">
                          <Lock className="w-4 h-4 text-[#FF4500] shrink-0"/>
                          <TextInput
                            secureTextEntry={true}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Enter new password"
                            className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                          />
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={handleResetPassword}
                        disabled={isSubmitting}
                        className="w-full bg-[#FF4500] hover:bg-orange-600 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 flex-row"
                      >
                        <Text className="text-white font-bold text-sm">{isSubmitting ? 'Updating...' : 'Update Password'}</Text>
                        <Check className="w-4 h-4"/>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Back to Login */}
                  <View className="pt-1 border-t border-slate-100">
                    <TouchableOpacity 
                      onPress={() => { onNavigate('login'); setForgotStep(1); }}
                      className="hover:underline"
                    ><Text className="text-[#FF4500] font-black">
                      ← Back to Sign In
                    </Text></TouchableOpacity>
                  </View>

                </View>
              )}

            </View>
          </View>

          {/* =========================================================
              BOTTOM 4-COLUMN FEATURE GRID (1:1 MATCH WITH LOGINSCREEN.JPEG)
             ========================================================= */}
          <View className="px-4 pt-6 space-y-4">
            
            <View className="bg-slate-200/50 border border-slate-200/80 rounded-3xl p-3.5 shadow-sm flex-row flex-wrap gap-1 divide-x divide-slate-200">
              
              {/* Pillar 1 */}
              <View className="flex-1 flex flex-col items-center justify-between px-1 space-y-1">
                <View className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shadow-sm flex-row">
                  <Shield className="w-4 h-4"/>
                </View>
                <View>
                  <View className=""><Text className="text-[10px] font-extrabold text-slate-900 leading-tight">Verified Platform</Text></View>
                  <View className="mt-0.5"><Text className="text-[8px] text-slate-500 font-bold leading-tight">Safe & Trusted</Text></View>
                </View>
              </View>

              {/* Pillar 2 */}
              <View className="flex-1 flex flex-col items-center justify-between px-1 space-y-1">
                <View className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shadow-sm flex-row">
                  <IndianRupee className="w-4 h-4"/>
                </View>
                <View>
                  <View className=""><Text className="text-[10px] font-extrabold text-slate-900 leading-tight">Better Earnings</Text></View>
                  <View className="mt-0.5"><Text className="text-[8px] text-slate-500 font-bold leading-tight">More Opportunities</Text></View>
                </View>
              </View>

              {/* Pillar 3 */}
              <View className="flex-1 flex flex-col items-center justify-between px-1 space-y-1">
                <View className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shadow-sm flex-row">
                  <Headphones className="w-4 h-4"/>
                </View>
                <View>
                  <View className=""><Text className="text-[10px] font-extrabold text-slate-900 leading-tight">Dedicated Support</Text></View>
                  <View className="mt-0.5"><Text className="text-[8px] text-slate-500 font-bold leading-tight">Always with you</Text></View>
                </View>
              </View>

              {/* Pillar 4 */}
              <View className="flex-1 flex flex-col items-center justify-between px-1 space-y-1">
                <View className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shadow-sm flex-row">
                  <TrendingUp className="w-4 h-4"/>
                </View>
                <View>
                  <View className=""><Text className="text-[10px] font-extrabold text-slate-900 leading-tight">Grow With Us</Text></View>
                  <View className="mt-0.5"><Text className="text-[8px] text-slate-500 font-bold leading-tight">Drive. Earn. Repeat.</Text></View>
                </View>
              </View>

            </View>

            {/* Bottom Security Footer Assurance Badge */}
            <View className="flex items-center justify-center gap-1.5 flex-row">
              <Shield className="w-3.5 h-3.5 text-emerald-600"/>
              <Text className="text-[10px] font-medium text-slate-400 tracking-wider">Secure • Reliable • Transparent</Text>
            </View>

          </View>

        </ScrollView>

        {/* Global Toast Notification */}
        {toastMsg && (
          <View className="absolute top-6 self-center bg-slate-900 px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-slate-800 flex-row">
            <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
            <Text className="text-white text-xs font-bold text-center">{toastMsg}</Text>
          </View>
        )}

        

      </View>
    </View>
  );
}
// FORCE_REBUILD_CACHE_BUST_1786123613895
console.log('CACHE_BUST_1786124057422');

console.log('CACHE_BUST_BARS_1786124237174');

console.log('CACHE_BUST_FINAL_BARS_1786125430914');

console.log('CACHE_BUST_IMG_TO_IMAGE_1786127909100');

console.log('CACHE_BUST_HTML_TO_RN_1786128166239');

console.log('CACHE_BUST_AST_FIX_1786128723661');
