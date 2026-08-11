import React, { useState } from 'react';

// =============================================================================
// [WEB PREVIEW ONLY]: Inline SVG Icons for interactive web sandbox rendering
// =============================================================================

interface IconProps {
  color?: string;
  size?: number;
}

const UserIcon = ({ color = "currentColor", size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = ({ color = "currentColor", size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = ({ color = "currentColor", size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = ({ color = "currentColor", size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ color = "currentColor", size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const ChevronRightIcon = ({ color = "currentColor", size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ArrowRightIcon = ({ color = "currentColor", size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CarBadgeIcon = ({ color = "#FF5500", size = 26 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H7c-.7 0-1.3.3-1.8.7C4.3 8.6 3 10 3 10s-2.7.6-4.5 1.1C.7 11.3 0 12.1 0 13v3c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
    <path d="M5 10l1.5-3.5C6.8 6.2 7.3 6 8 6h8c.7 0 1.2.2 1.5.5L19 10" />
  </svg>
);

const ShieldCheckIcon = ({ color = "#FF5500", size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const AwardIcon = ({ color = "#FF5500", size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

const HeadsetIcon = ({ color = "#FF5500", size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

const WorldMapBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
    <svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none" className="opacity-25">
      <path d="M30 40 Q45 20 60 45 T90 35 T120 50 Q110 90 80 100 Q40 90 30 40 Z" fill="#CBD5E1" opacity="0.6" />
      <path d="M180 30 Q220 15 260 30 T320 40 T380 35 Q370 80 320 90 Q240 85 180 30 Z" fill="#CBD5E1" opacity="0.6" />
      <path d="M210 110 Q240 100 270 120 T280 160 Q230 180 210 110 Z" fill="#CBD5E1" opacity="0.5" />
      
      <path d="M 40 80 Q 180 -10 340 60" fill="none" stroke="#FF5500" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.45" />
      <path d="M 90 40 Q 200 80 360 110" fill="none" stroke="#FF5500" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

      <circle cx="40" cy="80" r="4" fill="#FF5500" />
      <circle cx="40" cy="80" r="8" fill="#FF5500" opacity="0.2" />

      <circle cx="340" cy="60" r="4" fill="#FF5500" />
      <circle cx="340" cy="60" r="8" fill="#FF5500" opacity="0.2" />

      <circle cx="360" cy="110" r="3.5" fill="#FF5500" />

      <g transform="translate(190, 24) rotate(12)">
        <path d="M2 12l5-2 3 5 2-1-2-6 5-2c.6-.3.8-1 .5-1.5-.3-.6-1-.8-1.5-.5L9 6 6 1 4 2l2 5-5 2V12z" fill="#FF5500" opacity="0.75" />
      </g>
    </svg>
  </div>
);

const BrandLogo = () => (
  <div className="flex flex-col items-center mb-4 z-10">
    <div className="flex items-baseline font-black tracking-tight text-5xl">
      <span className="text-[#0B1E3D] tracking-tighter">mb</span>
      <div className="flex items-baseline text-[#FF5500]">
        <span>g</span>
        <div className="relative inline-flex items-center">
          <span>o</span>
          <div className="absolute right-[2px] top-[3px]">
            <svg width="14" height="18" viewBox="0 0 24 30" fill="none">
              <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 30 12 30C12 30 24 21 24 12C24 5.37 18.63 0 12 0ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" fill="#FF5500" />
              <path d="M6 22 L18 22" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    <div className="flex items-center text-xs space-x-1 -mt-1 font-medium">
      <span className="text-[#0B1E3D]/80">powered by</span>
      <span className="font-extrabold text-[#0B1E3D]">musafir</span>
      <span className="font-extrabold text-[#FF5500]">baba</span>
    </div>
  </div>
);

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  showBorder?: boolean;
}

const FeatureItem = ({ icon, title, description, showBorder = true }: FeatureItemProps) => (
  <div className={`flex-1 flex flex-col items-center text-center px-1 ${showBorder ? 'border-r border-slate-100' : ''}`}>
    <div className="w-10 h-10 rounded-full bg-[#FFF5EF] flex items-center justify-center mb-1.5 shadow-sm">
      {icon}
    </div>
    <span className="text-[11px] font-extrabold text-[#0B1E3D] leading-tight mb-0.5">{title}</span>
    <span className="text-[9px] font-medium text-slate-500 leading-tight whitespace-pre-line">{description}</span>
  </div>
);

export default function App() {
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailId.trim()) {
      setModalMessage('Please enter your email ID.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailId.trim())) {
      setModalMessage('Please enter a valid email address.');
      return;
    }
    if (!password.trim()) {
      setModalMessage('Please enter your password.');
      return;
    }
    setModalMessage(`Signing in with ${emailId.trim()}... Welcome back!`);
  };

  const handleForgotPassword = () => {
    setModalMessage('A password reset link has been sent to your registered email address.');
  };

  const handleCreateAccount = () => {
    setModalMessage('Redirecting to Account Registration...');
  };

  const handleCustomerPortal = () => {
    setModalMessage('Opening Customer Portal...');
  };

  // ===========================================================================
  // [WEB PREVIEW ONLY]: Device Frame Container for HTML/Tailwind Preview
  // ===========================================================================
  return (
    <div className="min-h-screen bg-[#F3F6FA] flex flex-col items-center justify-center p-3 sm:p-6 font-sans antialiased selection:bg-[#FF5500]/20 selection:text-[#FF5500]">
      {/* Mobile Frame */}
      <div className="w-full max-w-[420px] bg-slate-50 min-h-[810px] rounded-[36px] shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col relative my-auto">

        {/* Header */}
        <div className="w-full px-5 pt-4 pb-2 flex justify-end z-20">
          <button
            onClick={handleCustomerPortal}
            className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <UserIcon color="#1E293B" size={15} />
            <span>Customer Portal</span>
            <ChevronRightIcon color="#1E293B" size={13} />
          </button>
        </div>

        {/* Scroll Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col items-center">
          
          {/* Hero Banner */}
          <div className="w-full relative py-3 flex flex-col items-center text-center">
            <WorldMapBackground />
            <BrandLogo />

            <h1 className="text-3xl font-semibold text-[#0B1E3D] leading-snug tracking-tight z-10">
              Your Journey,<br />
              <span className="text-[#FF5500]">Our Priority.</span>
            </h1>

            <div className="w-9 h-[3px] bg-[#FF5500] rounded-full my-3" />

            <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed z-10">
              Premium rides.<br />
              Trusted every mile.
            </p>
          </div>

          {/* Main Login Card */}
          <div className="w-full bg-white rounded-3xl p-6 pt-11 mt-6 mb-5 relative shadow-xl shadow-slate-900/5 border border-slate-100 flex flex-col">
            
            {/* Top Floating Car Badge */}
            <div className="absolute -top-7 left-0 right-0 flex justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-[#FFF5EF] border-2 border-[#FFE8D9] flex items-center justify-center shadow-md shadow-[#FF5500]/10">
                <CarBadgeIcon color="#FF5500" size={26} />
              </div>
            </div>

            <h2 className="text-xl font-black text-[#0B1E3D] text-center">Welcome Back!</h2>
            <p className="text-xs text-slate-500 text-center mb-6">Sign in to book your next ride</p>

            <form onSubmit={handleSignIn} className="space-y-4">
              
              {/* Field 1: Email ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 block">Email ID</label>
                <div className="flex items-center bg-[#FAFAFC] border border-slate-200 rounded-xl px-3 h-12 focus-within:border-[#FF5500] transition-colors">
                  <div className="mr-2.5">
                    <MailIcon color="#94A3B8" size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    value={emailId}
                    onChange={(e) => setEmailId(e.target.value)}
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 block">Password</label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold text-[#FF5500] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="flex items-center bg-[#FAFAFC] border border-slate-200 rounded-xl px-3 h-12 focus-within:border-[#FF5500] transition-colors">
                  <div className="mr-2.5">
                    <LockIcon color="#94A3B8" size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOffIcon color="#94A3B8" size={18} /> : <EyeIcon color="#94A3B8" size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-[#FF5500] to-[#FF6B1A] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#FF5500]/25 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 mt-2"
              >
                <span>Sign In to Continue</span>
                <ArrowRightIcon color="#FFFFFF" size={18} />
              </button>
            </form>

            {/* Account Creation Link */}
            <div className="flex items-center justify-center space-x-1 mt-6 text-xs">
              <span className="text-slate-500 font-medium">New here?</span>
              <button
                type="button"
                onClick={handleCreateAccount}
                className="font-bold text-[#FF5500] hover:underline flex items-center space-x-0.5"
              >
                <span>Create an account</span>
                <ArrowRightIcon color="#FF5500" size={13} />
              </button>
            </div>

          </div>

          {/* Bottom Features Bar */}
          <div className="w-full bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center justify-between">
            <FeatureItem
              icon={<ShieldCheckIcon color="#FF5500" size={20} />}
              title="Safe & Reliable"
              description={`Your safety,\nour promise`}
            />
            <FeatureItem
              icon={<AwardIcon color="#FF5500" size={20} />}
              title="Best Experience"
              description={`Comfort on\nevery ride`}
            />
            <FeatureItem
              icon={<HeadsetIcon color="#FF5500" size={20} />}
              title="24x7 Support"
              description={`We're always\nhere for you`}
              showBorder={false}
            />
          </div>

        </div>

        {/* Modal Overlay */}
        {modalMessage && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-6 w-full max-w-[280px] text-center shadow-2xl flex flex-col items-center">
              <h3 className="text-base font-extrabold text-[#0B1E3D] mb-2">Notice</h3>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed">{modalMessage}</p>
              <button
                onClick={() => setModalMessage(null)}
                className="bg-[#FF5500] text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}