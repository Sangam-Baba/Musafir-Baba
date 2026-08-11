import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, SafeAreaView } from 'react-native';
import React, { useState } from 'react';

const MBGO_LOGO = require('../../desgin/mbgoLogo.png');
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
import { useNavigation } from '@react-navigation/native';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  // Navigation active screen: 'login' | 'register' | 'forgot'
  const activeScreen: string = 'register';

  // Form States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Input Values
  const [email, setEmail] = useState('partner@example.com');
  const [password, setPassword] = useState('••••••••••••');
  
  // Register Form State
  const [fullName, setFullName] = useState('Ashutosh Rai');
  const [phone, setPhone] = useState('9876543210');
  
  // Forgot Password Steps: 1 (Email Input) -> 2 (OTP Input) -> 3 (New Password)
  const [forgotStep, setForgotStep] = useState(1);
  const [otpCode, setOtpCode] = useState(['4', '8', '9', '2']);

  // Toast System
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <View className="flex flex-col items-center justify-center min-h-screen bg-slate-950 selection:bg-[#FF4500] selection:text-white sm:py-6">
      
      {/* Top Test Navigation Bar */}
      <View className="w-full max-w-[430px] mb-3 px-3 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl flex-row">
        <Text className="text-[#FF4500] font-black shrink-0">MBGO Auth:</Text>
        <View className="flex gap-1.5 shrink-0 flex-row">
          <TouchableOpacity 
            onPress={() => { navigation.navigate('LoginScreen'); setForgotStep(1); }}
            className={`px-3 py-1 rounded-xl transition ${activeScreen === 'login' ? 'bg-[#FF4500] text-white font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          ><Text>
            1. Sign In
          </Text></TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('RegisterScreen')}
            className={`px-3 py-1 rounded-xl transition ${activeScreen === 'register' ? 'bg-[#FF4500] text-white font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          ><Text>
            2. Register
          </Text></TouchableOpacity>
          <TouchableOpacity 
            onPress={() => { navigation.navigate('ForgotPasswordScreen'); setForgotStep(1); }}
            className={`px-3 py-1 rounded-xl transition ${activeScreen === 'forgot' ? 'bg-[#FF4500] text-white font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          ><Text>
            3. Forgot Password
          </Text></TouchableOpacity>
        </View>
      </View>

      {/* Main Mobile Frame Container */}
      <View className="w-full max-w-[430px] bg-[#F4F6F9] min-h-[920px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        {/* Scrollable Content Body */}
        <View className="flex-1 overflow-y-auto no-scrollbar pb-6">

          {/* =========================================================
              HERO BACKGROUND SECTION (TOP HALF MATCHING REFERENCE IMAGE)
             ========================================================= */}
          <View className="relative min-h-[290px] w-full bg-gradient-to-b from-slate-100 via-sky-50 to-amber-50/40 overflow-hidden pt-3 px-5">
            
            {/* Real SUV Backdrop Image on Right */}
            <View className="absolute right-0 top-12 w-[62%] h-[210px] pointer-events-none z-0" pointerEvents="none">
              <Image 
                source={{ uri: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=1000" }} 
                alt="MBGO Vehicle" 
                className="w-full h-full object-cover object-left opacity-90 drop-shadow-xl"
              />
              {/* Subtle background skyline & bird graphic details overlay */}
              <View className="absolute inset-0 bg-gradient-to-l from-transparent via-sky-50/40 to-sky-50"></View>
            </View>

            {/* Status Bar */}
            <View className="relative z-20 flex justify-between items-center pb-2 flex-row">
              <Text>17:02</Text>
              <View className="flex items-center gap-1 flex-row">
                <Text className="text-[10px] font-extrabold text-slate-700">VoLTE</Text>
                <Text className="text-[10px] bg-slate-200 text-slate-800 px-1 rounded font-black">5G</Text>
                <View className="w-2.5 h-2.5 rounded-full bg-emerald-500"></View>
                <Text className="text-[10px] font-bold text-slate-700">33%</Text>
              </View>
            </View>

            {/* Top Header Bar */}
            <View className="relative z-20 flex items-center justify-between pt-1 pb-4 flex-row">
              {/* MBGO Brand Logo - 3x Enlarged Image */}
              <Image source={MBGO_LOGO} style={{ width: 220, height: 72 }} resizeMode="contain" />

              {/* Portal Pill Badge */}
              <View className="bg-white px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-slate-200/80 flex-row">
                <Building2 className="w-3.5 h-3.5 text-[#FF4500]"/>
                <Text>Partner Portal</Text>
              </View>
            </View>

            {/* Hero Heading Slogan */}
            <View className="relative z-20 max-w-[240px] pt-1 space-y-1">
              <Text className="text-2xl font-black text-[#0B132B] leading-tight tracking-tight">
                {activeScreen === 'login' && (
                  <>Welcome Back,<br/><Text className="text-[#FF4500]">Partner!</Text></>
                )}
                {activeScreen === 'register' && (
                  <>Create Your<br/><Text className="text-[#FF4500]">Account!</Text></>
                )}
                {activeScreen === 'forgot' && (
                  <>Reset Your<br/><Text className="text-[#FF4500]">Password</Text></>
                )}
              </Text>
              <Text className="text-[11px] font-medium text-slate-600 leading-snug">
                {activeScreen === 'login' && 'Sign in to manage your trips, bookings and earnings — all in one place.'}
                {activeScreen === 'register' && 'Join MBGO today to book outstation rides at 0% markup.'}
                {activeScreen === 'forgot' && 'Enter your registered details to recover your account access.'}
              </Text>
            </View>

            {/* Dynamic Swooping Orange Wave Graphic on Left */}
            <View className="absolute -bottom-2 left-0 w-36 h-20 bg-gradient-to-r from-[#FF4500] to-orange-500 rounded-tr-[50px] opacity-90 -z-0"></View>
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
                    <Text className="text-xs font-semibold text-slate-400">Continue to your partner dashboard</Text>
                  </View>

                  {/* Email Field */}
                  <View className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Email Address</label>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition shadow-2xs flex-row">
                      <Mail className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput 
                        keyboardType="email-address" 
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
                      <label className="block text-xs font-bold text-slate-700">Password</label>
                      <TouchableOpacity 
                        onPress={() => { navigation.navigate('ForgotPasswordScreen'); setForgotStep(1); }} 
                        className="hover:underline"
                      ><Text className="text-xs font-bold text-[#FF4500]">
                        Forgot Password?
                      </Text></TouchableOpacity>
                    </View>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition shadow-2xs flex-row">
                      <Lock className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput 
                        secureTextEntry={!showPassword} 
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
                    <TouchableOpacity 
                      onPress={() => setRememberMe(!rememberMe)}
                      className="flex items-center gap-2 font-bold text-slate-700 flex-row"
                    >
                      <View className={`w-4 h-4 rounded border items-center justify-center ${rememberMe ? 'bg-[#FF4500] border-[#FF4500]' : 'border-slate-300 bg-white'}`}>
                        {rememberMe && <Text className="text-white text-[10px] font-bold">✓</Text>}
                      </View>
                      <Text className="text-xs font-bold text-slate-700">Remember me</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => showToast("Opening WhatsApp Support...")}
                      className="flex items-center gap-1.5 hover:text-emerald-600 transition bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex-row"
                    >
                      <Text className="text-xs font-bold text-emerald-700">Need help?</Text>
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600"/>
                    </TouchableOpacity>
                  </View>

                  {/* Primary CTA Button */}
                  <TouchableOpacity 
                    onPress={() => navigation.replace("Main")}
                    className="w-full bg-[#FF4500] hover:bg-orange-600 active:scale-98 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 mt-2 flex-row"
                  >
                    <Text>Sign In</Text>
                    <ArrowRight className="w-4 h-4"/>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View className="relative py-2">
                    <View className="absolute inset-0 flex items-center flex-row"><View className="w-full border-t border-slate-100"></View></View>
                    <Text className="relative bg-white px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">OR</Text>
                  </View>

                  {/* Register Switch Prompt */}
                  <View className="">
                    <Text>Don't have an account? </Text>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('RegisterScreen')}
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
              {activeScreen === 'register' && (
                <View className="space-y-3 animate-in fade-in duration-200">
                  <View className="space-y-0.5 pb-1">
                    <Text className="text-xl font-extrabold text-slate-900">Create New Account</Text>
                    <Text className="text-xs font-semibold text-slate-400">Fill in your details to get started</Text>
                  </View>

                  {/* Full Name */}
                  <View className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Full Name</label>
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
                    <label className="block text-xs font-bold text-slate-700">Email Address</label>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition flex-row">
                      <Mail className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput 
                        keyboardType="email-address" 
                        value={email}
                        onChangeText={setEmail}
                        placeholder="ashutosh@example.com" 
                        className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                    </View>
                  </View>

                  {/* Phone Number */}
                  <View className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Mobile Number</label>
                    <View className="flex items-center gap-2 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition flex-row">
                      <Text className="text-xs font-black text-slate-700 border-r border-slate-200 pr-2">+91</Text>
                      <TextInput 
                        keyboardType="phone-pad" 
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="98765 43210" 
                        className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Password</label>
                    <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition flex-row">
                      <Lock className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <TextInput 
                        secureTextEntry={!showPassword} 
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
                    onPress={() => {
                      navigation.replace("Main");
                      showToast("Account created successfully!");
                      navigation.navigate('LoginScreen');
                    }}
                    className="w-full bg-[#FF4500] hover:bg-orange-600 active:scale-98 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 mt-2 flex-row"
                  >
                    <Text>Create Account</Text>
                    <Sparkles className="w-4 h-4"/>
                  </TouchableOpacity>

                  <View className="pt-1">
                    <Text>Already have an account? </Text>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('LoginScreen')}
                      className="hover:underline"
                    ><Text className="text-[#FF4500] font-black">
                      Sign In Here
                    </Text></TouchableOpacity>
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
                        <label className="block text-xs font-bold text-slate-700">Email Address or Phone</label>
                        <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] flex-row">
                          <Mail className="w-4 h-4 text-[#FF4500] shrink-0"/>
                          <TextInput 
                             
                            defaultValue="ashutosh.rai@gmail.com"
                            className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                          />
                        </View>
                      </View>

                      <TouchableOpacity 
                        onPress={() => {
                          showToast("OTP sent to your email & mobile");
                          setForgotStep(2);
                        }}
                        className="w-full bg-[#FF4500] hover:bg-orange-600 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 flex-row"
                      >
                        <Text>Send Verification Code</Text>
                        <ArrowRight className="w-4 h-4"/>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* STEP 2: VERIFY OTP CODE */}
                  {forgotStep === 2 && (
                    <View className="space-y-3">
                      <View className="space-y-0.5">
                        <Text className="text-base font-black text-slate-900">Enter OTP Code</Text>
                        <Text className="text-xs font-semibold text-slate-400">Code sent to ashutosh.rai@gmail.com</Text>
                      </View>

                      <View className="flex justify-center gap-2 py-2 flex-row">
                        {otpCode.map((digit, idx) => (
                          <TextInput 
                            key={idx}
                            maxLength={1}
                            value={digit}
                            editable={false}
                            className="w-12 h-12 text-center text-lg font-black bg-slate-50 border-2 border-[#FF4500] rounded-2xl text-slate-900 shadow-2xs"
                          />
                        ))}
                      </View>

                      <TouchableOpacity 
                        onPress={() => {
                          showToast("OTP verified successfully!");
                          setForgotStep(3);
                        }}
                        className="w-full bg-[#FF4500] hover:bg-orange-600 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 flex-row"
                      >
                        <Text>Verify & Proceed</Text>
                        <CheckCircle2 className="w-4 h-4"/>
                      </TouchableOpacity>

                      <View className=""><Text className="text-center text-xs font-bold text-slate-400">
                        Didn't receive code? </Text><TouchableOpacity onPress={() => showToast("Resending OTP...")} className="underline"><Text className="text-[#FF4500]">Resend OTP</Text></TouchableOpacity>
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
                        <label className="block text-xs font-bold text-slate-700">New Password</label>
                        <View className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] flex-row">
                          <Lock className="w-4 h-4 text-[#FF4500] shrink-0"/>
                          <TextInput 
                            secureTextEntry={true} 
                            defaultValue="newpassword123"
                            className="flex-1 bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                          />
                        </View>
                      </View>

                      <TouchableOpacity 
                        onPress={() => {
                          showToast("Password updated! Please sign in.");
                          navigation.navigate('LoginScreen');
                          setForgotStep(1);
                        }}
                        className="w-full bg-[#FF4500] hover:bg-orange-600 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 flex-row"
                      >
                        <Text>Update Password</Text>
                        <Check className="w-4 h-4"/>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Back to Login */}
                  <View className="pt-1 border-t border-slate-100">
                    <TouchableOpacity 
                      onPress={() => { navigation.navigate('LoginScreen'); setForgotStep(1); }}
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
            
            <View className="bg-slate-200/50 border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs grid grid-cols-4 gap-1 divide-x divide-slate-200">
              
              {/* Pillar 1 */}
              <View className="flex flex-col items-center justify-between px-1 space-y-1">
                <View className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shadow-2xs flex-row">
                  <Shield className="w-4 h-4"/>
                </View>
                <View>
                  <View className=""><Text className="text-[10px] font-extrabold text-slate-900 leading-tight">Verified Platform</Text></View>
                  <View className="mt-0.5"><Text className="text-[8px] text-slate-500 font-bold leading-tight">Safe & Trusted</Text></View>
                </View>
              </View>

              {/* Pillar 2 */}
              <View className="flex flex-col items-center justify-between px-1 space-y-1">
                <View className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shadow-2xs flex-row">
                  <IndianRupee className="w-4 h-4"/>
                </View>
                <View>
                  <View className=""><Text className="text-[10px] font-extrabold text-slate-900 leading-tight">Better Earnings</Text></View>
                  <View className="mt-0.5"><Text className="text-[8px] text-slate-500 font-bold leading-tight">More Opportunities</Text></View>
                </View>
              </View>

              {/* Pillar 3 */}
              <View className="flex flex-col items-center justify-between px-1 space-y-1">
                <View className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shadow-2xs flex-row">
                  <Headphones className="w-4 h-4"/>
                </View>
                <View>
                  <View className=""><Text className="text-[10px] font-extrabold text-slate-900 leading-tight">Dedicated Support</Text></View>
                  <View className="mt-0.5"><Text className="text-[8px] text-slate-500 font-bold leading-tight">Always with you</Text></View>
                </View>
              </View>

              {/* Pillar 4 */}
              <View className="flex flex-col items-center justify-between px-1 space-y-1">
                <View className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shadow-2xs flex-row">
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
              <Text>Secure • Reliable • Transparent</Text>
            </View>

          </View>

        </View>

        {/* Global Toast Notification */}
        {toastMsg && (
          <View className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-slate-800 animate-in fade-in flex-row">
            <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
            <Text>{toastMsg}</Text>
          </View>
        )}

        

      </View>
    </View>
  );
}
console.log('CACHE_BUST_FINAL_BARS_1786125430900');

console.log('CACHE_BUST_HTML_TO_RN_1786128166224');

console.log('CACHE_BUST_AST_FIX_1786128723237');
