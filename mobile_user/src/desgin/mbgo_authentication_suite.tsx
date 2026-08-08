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
} from 'lucide-react';

export default function App() {
  // Navigation active screen: 'login' | 'register' | 'forgot'
  const [activeScreen, setActiveScreen] = useState('login');

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
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 font-sans text-slate-900 selection:bg-[#FF4500] selection:text-white sm:py-6">
      
      {/* Top Test Navigation Bar */}
      <div className="w-full max-w-[430px] mb-3 px-3 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl text-[11px] font-bold text-slate-300">
        <span className="text-[#FF4500] font-black shrink-0">MBGO Auth:</span>
        <div className="flex gap-1.5 shrink-0">
          <button 
            onClick={() => { setActiveScreen('login'); setForgotStep(1); }}
            className={`px-3 py-1 rounded-xl transition ${activeScreen === 'login' ? 'bg-[#FF4500] text-white font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            1. Sign In
          </button>
          <button 
            onClick={() => setActiveScreen('register')}
            className={`px-3 py-1 rounded-xl transition ${activeScreen === 'register' ? 'bg-[#FF4500] text-white font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            2. Register
          </button>
          <button 
            onClick={() => { setActiveScreen('forgot'); setForgotStep(1); }}
            className={`px-3 py-1 rounded-xl transition ${activeScreen === 'forgot' ? 'bg-[#FF4500] text-white font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            3. Forgot Password
          </button>
        </div>
      </div>

      {/* Main Mobile Frame Container */}
      <div className="w-full max-w-[430px] bg-[#F4F6F9] min-h-[920px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6">

          {/* =========================================================
              HERO BACKGROUND SECTION (TOP HALF MATCHING REFERENCE IMAGE)
             ========================================================= */}
          <div className="relative min-h-[290px] w-full bg-gradient-to-b from-slate-100 via-sky-50 to-amber-50/40 overflow-hidden pt-3 px-5">
            
            {/* Real SUV Backdrop Image on Right */}
            <div className="absolute right-0 top-12 w-[62%] h-[210px] pointer-events-none z-0">
              <img 
                src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=1000" 
                alt="MBGO Vehicle" 
                className="w-full h-full object-cover object-left opacity-90 drop-shadow-xl"
              />
              {/* Subtle background skyline & bird graphic details overlay */}
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-sky-50/40 to-sky-50"></div>
            </div>

            {/* Status Bar */}
            <div className="relative z-20 flex justify-between items-center text-xs font-black text-slate-800 pb-2">
              <span>17:02</span>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-[10px] font-extrabold text-slate-700">VoLTE</span>
                <span className="text-[10px] bg-slate-200 text-slate-800 px-1 rounded font-black">5G</span>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-bold text-slate-700">33%</span>
              </div>
            </div>

            {/* Top Header Bar */}
            <div className="relative z-20 flex items-center justify-between pt-1 pb-4">
              {/* MBGO Brand Logo */}
              <div className="flex flex-col">
                <div className="flex items-center text-2xl font-black tracking-tight leading-none">
                  <span className="text-[#0B132B]">MB</span>
                  <span className="text-[#FF4500]">GO</span>
                </div>
                <div className="text-[8px] font-extrabold text-slate-500 tracking-wider uppercase mt-0.5">
                  powered by musafirbaba
                </div>
              </div>

              {/* Portal Pill Badge */}
              <div className="bg-white text-slate-900 font-extrabold text-[11px] px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-slate-200/80">
                <Building2 className="w-3.5 h-3.5 text-[#FF4500]"/>
                <span>Partner Portal</span>
              </div>
            </div>

            {/* Hero Heading Slogan */}
            <div className="relative z-20 max-w-[240px] pt-1 space-y-1">
              <h1 className="text-2xl font-black text-[#0B132B] leading-tight tracking-tight">
                {activeScreen === 'login' && (
                  <>Welcome Back,<br/><span className="text-[#FF4500]">Partner!</span></>
                )}
                {activeScreen === 'register' && (
                  <>Create Your<br/><span className="text-[#FF4500]">Account!</span></>
                )}
                {activeScreen === 'forgot' && (
                  <>Reset Your<br/><span className="text-[#FF4500]">Password</span></>
                )}
              </h1>
              <p className="text-[11px] font-medium text-slate-600 leading-snug">
                {activeScreen === 'login' && 'Sign in to manage your trips, bookings and earnings — all in one place.'}
                {activeScreen === 'register' && 'Join MBGO today to book outstation rides at 0% markup.'}
                {activeScreen === 'forgot' && 'Enter your registered details to recover your account access.'}
              </p>
            </div>

            {/* Dynamic Swooping Orange Wave Graphic on Left */}
            <div className="absolute -bottom-2 left-0 w-36 h-20 bg-gradient-to-r from-[#FF4500] to-orange-500 rounded-tr-[50px] opacity-90 -z-0"></div>
          </div>

          {/* =========================================================
              FLOATING WHITE CARD OVERLAY (FORM SECTION MATCHING IMAGE)
             ========================================================= */}
          <div className="px-4 -mt-6 relative z-30">
            <div className="bg-white border border-slate-200/80 rounded-[32px] p-5 shadow-2xl space-y-4">

              {/* ----------------------------------------------------
                  1. SIGN IN SCREEN
                 ---------------------------------------------------- */}
              {activeScreen === 'login' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-center space-y-0.5 pb-1">
                    <h2 className="text-xl font-extrabold text-slate-900">Sign in to your account</h2>
                    <p className="text-xs font-semibold text-slate-400">Continue to your partner dashboard</p>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Email Address</label>
                    <div className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition shadow-2xs">
                      <Mail className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="partner@example.com" 
                        className="w-full bg-transparent font-bold text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-700">Password</label>
                      <button 
                        onClick={() => { setActiveScreen('forgot'); setForgotStep(1); }} 
                        className="text-xs font-bold text-[#FF4500] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition shadow-2xs">
                      <Lock className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password" 
                        className="w-full bg-transparent font-bold text-xs text-slate-900 focus:outline-none placeholder:text-slate-400"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>

                  {/* Checkbox & WhatsApp Help Row */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                      <input 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-[#FF4500] accent-[#FF4500] border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <span>Remember me</span>
                    </label>

                    <button 
                      type="button"
                      onClick={() => showToast("Opening WhatsApp Support...")}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 hover:text-emerald-600 transition bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100"
                    >
                      <span>Need help?</span>
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600"/>
                    </button>
                  </div>

                  {/* Primary CTA Button */}
                  <button 
                    onClick={() => showToast("Signing in to MBGO Dashboard...")}
                    className="w-full bg-[#FF4500] hover:bg-orange-600 active:scale-98 text-white font-black text-sm py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 mt-2"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4"/>
                  </button>

                  {/* Divider */}
                  <div className="relative py-2 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                    <span className="relative bg-white px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">OR</span>
                  </div>

                  {/* Register Switch Prompt */}
                  <div className="text-center text-xs font-bold text-slate-600">
                    <span>Don't have an account? </span>
                    <button 
                      onClick={() => setActiveScreen('register')}
                      className="text-[#FF4500] font-black hover:underline inline-flex items-center gap-0.5"
                    >
                      Register Here <ChevronRight className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  2. SIGN UP / REGISTER SCREEN
                 ---------------------------------------------------- */}
              {activeScreen === 'register' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="text-center space-y-0.5 pb-1">
                    <h2 className="text-xl font-extrabold text-slate-900">Create New Account</h2>
                    <p className="text-xs font-semibold text-slate-400">Fill in your details to get started</p>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Full Name</label>
                    <div className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition">
                      <User className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ashutosh Rai" 
                        className="w-full bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Email Address</label>
                    <div className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition">
                      <Mail className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ashutosh@example.com" 
                        className="w-full bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Mobile Number</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition">
                      <span className="text-xs font-black text-slate-700 border-r border-slate-200 pr-2">+91</span>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210" 
                        className="w-full bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Password</label>
                    <div className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500] transition">
                      <Lock className="w-4 h-4 text-[#FF4500] shrink-0"/>
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="Create password" 
                        className="w-full bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>

                  {/* Register Button */}
                  <button 
                    onClick={() => {
                      showToast("Account created successfully!");
                      setActiveScreen('login');
                    }}
                    className="w-full bg-[#FF4500] hover:bg-orange-600 active:scale-98 text-white font-black text-sm py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 mt-2"
                  >
                    <span>Create Account</span>
                    <Sparkles className="w-4 h-4"/>
                  </button>

                  <div className="text-center text-xs font-bold text-slate-600 pt-1">
                    <span>Already have an account? </span>
                    <button 
                      onClick={() => setActiveScreen('login')}
                      className="text-[#FF4500] font-black hover:underline"
                    >
                      Sign In Here
                    </button>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  3. FORGOT PASSWORD SCREEN (MULTI-STEP RECOVERY)
                 ---------------------------------------------------- */}
              {activeScreen === 'forgot' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  
                  {/* Step Indicators */}
                  <div className="flex justify-center items-center gap-2 pb-1">
                    <div className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center transition ${forgotStep >= 1 ? 'bg-[#FF4500] text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                    <div className={`w-8 h-0.5 ${forgotStep >= 2 ? 'bg-[#FF4500]' : 'bg-slate-200'}`}></div>
                    <div className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center transition ${forgotStep >= 2 ? 'bg-[#FF4500] text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                    <div className={`w-8 h-0.5 ${forgotStep >= 3 ? 'bg-[#FF4500]' : 'bg-slate-200'}`}></div>
                    <div className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center transition ${forgotStep >= 3 ? 'bg-[#FF4500] text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
                  </div>

                  {/* STEP 1: ENTER EMAIL / PHONE */}
                  {forgotStep === 1 && (
                    <div className="space-y-3">
                      <div className="text-center space-y-0.5">
                        <h2 className="text-base font-black text-slate-900">Forgot Password?</h2>
                        <p className="text-xs font-semibold text-slate-400">Enter email or phone to receive OTP code</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">Email Address or Phone</label>
                        <div className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500]">
                          <Mail className="w-4 h-4 text-[#FF4500] shrink-0"/>
                          <input 
                            type="text" 
                            defaultValue="ashutosh.rai@gmail.com"
                            className="w-full bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          showToast("OTP sent to your email & mobile");
                          setForgotStep(2);
                        }}
                        className="w-full bg-[#FF4500] hover:bg-orange-600 text-white font-black text-sm py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2"
                      >
                        <span>Send Verification Code</span>
                        <ArrowRight className="w-4 h-4"/>
                      </button>
                    </div>
                  )}

                  {/* STEP 2: VERIFY OTP CODE */}
                  {forgotStep === 2 && (
                    <div className="space-y-3">
                      <div className="text-center space-y-0.5">
                        <h2 className="text-base font-black text-slate-900">Enter OTP Code</h2>
                        <p className="text-xs font-semibold text-slate-400">Code sent to ashutosh.rai@gmail.com</p>
                      </div>

                      <div className="flex justify-center gap-2 py-2">
                        {otpCode.map((digit, idx) => (
                          <input 
                            key={idx}
                            type="text" 
                            maxLength={1}
                            value={digit}
                            readOnly
                            className="w-12 h-12 text-center text-lg font-black bg-slate-50 border-2 border-[#FF4500] rounded-2xl text-slate-900 shadow-2xs"
                          />
                        ))}
                      </div>

                      <button 
                        onClick={() => {
                          showToast("OTP verified successfully!");
                          setForgotStep(3);
                        }}
                        className="w-full bg-[#FF4500] hover:bg-orange-600 text-white font-black text-sm py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2"
                      >
                        <span>Verify & Proceed</span>
                        <CheckCircle2 className="w-4 h-4"/>
                      </button>

                      <div className="text-center text-xs font-bold text-slate-400">
                        Didn't receive code? <button onClick={() => showToast("Resending OTP...")} className="text-[#FF4500] underline">Resend OTP</button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SET NEW PASSWORD */}
                  {forgotStep === 3 && (
                    <div className="space-y-3">
                      <div className="text-center space-y-0.5">
                        <h2 className="text-base font-black text-slate-900">Create New Password</h2>
                        <p className="text-xs font-semibold text-slate-400">Enter a strong new password for your account</p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">New Password</label>
                        <div className="flex items-center gap-2.5 border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-slate-50/50 focus-within:bg-white focus-within:border-[#FF4500]">
                          <Lock className="w-4 h-4 text-[#FF4500] shrink-0"/>
                          <input 
                            type="password" 
                            defaultValue="newpassword123"
                            className="w-full bg-transparent font-bold text-xs text-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          showToast("Password updated! Please sign in.");
                          setActiveScreen('login');
                          setForgotStep(1);
                        }}
                        className="w-full bg-[#FF4500] hover:bg-orange-600 text-white font-black text-sm py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2"
                      >
                        <span>Update Password</span>
                        <Check className="w-4 h-4"/>
                      </button>
                    </div>
                  )}

                  {/* Back to Login */}
                  <div className="text-center text-xs font-bold text-slate-600 pt-1 border-t border-slate-100">
                    <button 
                      onClick={() => { setActiveScreen('login'); setForgotStep(1); }}
                      className="text-[#FF4500] font-black hover:underline"
                    >
                      ← Back to Sign In
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>

          {/* =========================================================
              BOTTOM 4-COLUMN FEATURE GRID (1:1 MATCH WITH LOGINSCREEN.JPEG)
             ========================================================= */}
          <div className="px-4 pt-6 space-y-4">
            
            <div className="bg-slate-200/50 border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs grid grid-cols-4 gap-1 text-center divide-x divide-slate-200">
              
              {/* Pillar 1 */}
              <div className="flex flex-col items-center justify-between px-1 space-y-1">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF4500] flex items-center justify-center shadow-2xs">
                  <Shield className="w-4 h-4"/>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-slate-900 leading-tight">Verified Platform</div>
                  <div className="text-[8px] text-slate-500 font-bold leading-tight mt-0.5">Safe & Trusted</div>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="flex flex-col items-center justify-between px-1 space-y-1">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF4500] flex items-center justify-center shadow-2xs">
                  <IndianRupee className="w-4 h-4"/>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-slate-900 leading-tight">Better Earnings</div>
                  <div className="text-[8px] text-slate-500 font-bold leading-tight mt-0.5">More Opportunities</div>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="flex flex-col items-center justify-between px-1 space-y-1">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF4500] flex items-center justify-center shadow-2xs">
                  <Headphones className="w-4 h-4"/>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-slate-900 leading-tight">Dedicated Support</div>
                  <div className="text-[8px] text-slate-500 font-bold leading-tight mt-0.5">Always with you</div>
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="flex flex-col items-center justify-between px-1 space-y-1">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF4500] flex items-center justify-center shadow-2xs">
                  <TrendingUp className="w-4 h-4"/>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold text-slate-900 leading-tight">Grow With Us</div>
                  <div className="text-[8px] text-slate-500 font-bold leading-tight mt-0.5">Drive. Earn. Repeat.</div>
                </div>
              </div>

            </div>

            {/* Bottom Security Footer Assurance Badge */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-slate-500">
              <Shield className="w-3.5 h-3.5 text-emerald-600"/>
              <span>Secure • Reliable • Transparent</span>
            </div>

          </div>

        </div>

        {/* Global Toast Notification */}
        {toastMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-black px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-slate-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Home Indicator Bar */}
        <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto my-1.5 relative z-40" />

      </div>
    </div>
  );
}