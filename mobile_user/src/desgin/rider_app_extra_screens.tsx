import React, { useState } from 'react';
import {
  User,
  Headphones,
  Bell,
  Camera,
  Wallet,
  Tag,
  Gift,
  Award,
  ChevronRight,
  ChevronDown,
  MapPin,
  CreditCard,
  FileText,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  Phone,
  MessageSquare,
  Package,
  RotateCcw,
  RefreshCw,
  MoreHorizontal,
  Mail,
  Heart,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Car,
  Globe,
  Sliders,
  Check,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // Navigation active screen selector: '36' | '37' | '38' | '39' | '40'
  const [activeScreen, setActiveScreen] = useState('36');

  // Interactive state for FAQs in Help & Support (Screen 37)
  const [openFaq, setOpenFaq] = useState(null);
  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Category tab for Notifications (Screen 38)
  const [notificationTab, setNotificationTab] = useState('All');

  // Toast notification system
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 font-sans text-slate-900 selection:bg-orange-500 selection:text-white sm:py-6">
      
      {/* Top Test Navigation Switcher */}
      <div className="w-full max-w-[430px] mb-3 px-3 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar bg-slate-800/90 rounded-2xl border border-slate-700 shadow-lg text-[11px] font-bold text-slate-300">
        <span className="text-orange-400 font-black shrink-0">Screens:</span>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => setActiveScreen('36')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '36' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            36. Profile (Amit)
          </button>
          <button 
            onClick={() => setActiveScreen('37')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '37' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            37. Support
          </button>
          <button 
            onClick={() => setActiveScreen('38')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '38' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            38. Notifications
          </button>
          <button 
            onClick={() => setActiveScreen('39')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '39' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            39. Saved
          </button>
          <button 
            onClick={() => setActiveScreen('40')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '40' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            40. Profile (Ashutosh)
          </button>
        </div>
      </div>

      {/* Main Mobile Frame */}
      <div className="w-full max-w-[430px] bg-[#FAFAFA] min-h-[920px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        {/* Phone Status Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 pt-3 pb-1 flex justify-between items-center text-xs font-bold text-slate-900 border-b border-slate-100/50">
          <span>9:41</span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-extrabold">5G</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          </div>
        </div>

        {/* Scrollable Main Body Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-20">

          {/* ==========================================
              SCREEN 36: PROFILE (AMIT SHARMA) - (36.png)
             ========================================== */}
          {activeScreen === '36' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="w-6"></div>
                <h1 className="text-lg font-black text-slate-900">Profile</h1>
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveScreen('37')} className="flex flex-col items-center text-slate-800 hover:text-orange-600 transition">
                    <Headphones className="w-5 h-5"/>
                    <span className="text-[9px] font-bold text-slate-500 -mt-0.5">Support</span>
                  </button>
                  <button onClick={() => setActiveScreen('38')} className="flex flex-col items-center text-slate-800 hover:text-orange-600 relative transition">
                    <Bell className="w-5 h-5"/>
                    <span className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-0 right-0 border border-white"></span>
                    <span className="text-[9px] font-bold text-slate-500 -mt-0.5">Notifications</span>
                  </button>
                </div>
              </div>

              {/* User Identity Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                        <img 
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" 
                          alt="Amit Sharma" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center absolute bottom-0 right-0 border border-white shadow-xs">
                        <Camera className="w-3 h-3"/>
                      </button>
                    </div>

                    <div className="space-y-0.5">
                      <h2 className="text-base font-black text-slate-900">Amit Sharma</h2>
                      <div className="text-xs font-bold text-slate-600">+91 98765 43210</div>
                      <div className="text-[11px] font-medium text-slate-500">amit.sharma@gmail.com</div>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600"/> Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => showToast("Opening Edit Profile...")} className="text-xs font-black text-[#FF3B00] hover:underline flex items-center gap-0.5 shrink-0 self-start pt-1">
                    Edit Profile <ChevronRight className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>

              {/* Wallet & Coupons Card Row */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs grid grid-cols-2 divide-x divide-slate-100">
                <div onClick={() => showToast("Opening Wallet...")} className="flex items-center gap-3 pr-2 cursor-pointer hover:opacity-80 transition">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100/80 text-[#FF3B00] flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5"/>
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="text-[10px] font-extrabold text-slate-500">MB Wallet</div>
                    <div className="text-xs font-black text-[#FF3B00] truncate">₹1,250.00</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0"/>
                </div>

                <div onClick={() => showToast("Viewing Available Coupons...")} className="flex items-center gap-3 pl-3 cursor-pointer hover:opacity-80 transition">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5"/>
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="text-[10px] font-extrabold text-slate-500">My Coupons</div>
                    <div className="text-xs font-black text-emerald-600 truncate">3 Available</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0"/>
                </div>
              </div>

              {/* ACCOUNT Section */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Account</div>
                <div className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {[
                    { icon: User, label: 'Personal Information' },
                    { icon: MapPin, label: 'Saved Addresses', action: () => setActiveScreen('39') },
                    { icon: CreditCard, label: 'Payment Methods' },
                    { icon: FileText, label: 'My Documents' },
                    { icon: Gift, label: 'Refer & Earn' },
                    { icon: Settings, label: 'Settings' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div 
                        key={idx} 
                        onClick={item.action || (() => showToast(`Opening ${item.label}...`))}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-xs font-extrabold text-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-slate-700"/>
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400"/>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* OTHERS Section */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Others</div>
                <div className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {[
                    { icon: Car, label: 'Trip Preferences' },
                    { icon: Headphones, label: 'Help & Support', action: () => setActiveScreen('37') },
                    { icon: Shield, label: 'Terms & Conditions' },
                    { icon: Shield, label: 'Privacy Policy' },
                    { icon: HelpCircle, label: 'About MBGO' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div 
                        key={idx} 
                        onClick={item.action || (() => showToast(`Opening ${item.label}...`))}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-xs font-extrabold text-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-slate-700"/>
                          <span>{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400"/>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={() => showToast("Logging out...")}
                className="w-full bg-white border border-[#FF3B00] hover:bg-orange-50 text-[#FF3B00] font-black text-xs py-3.5 rounded-2xl transition flex items-center justify-center gap-2 active:scale-98 shadow-2xs"
              >
                <LogOut className="w-4 h-4"/>
                <span>Logout</span>
              </button>

            </div>
          )}

          {/* ==========================================
              SCREEN 37: HELP & SUPPORT - (37.png)
             ========================================== */}
          {activeScreen === '37' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setActiveScreen('36')} className="p-1 hover:bg-slate-100 rounded-full text-slate-800">
                  <ChevronRight className="w-5 h-5 rotate-180"/>
                </button>
                <h1 className="text-base font-black text-slate-900">Help & Support</h1>
                <button onClick={() => showToast("Opening 24x7 Hotline...")} className="p-1 text-slate-800 hover:bg-slate-100 rounded-full">
                  <Headphones className="w-5 h-5"/>
                </button>
              </div>

              {/* Support Agent Banner */}
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 border border-orange-200/80 rounded-3xl p-4 relative overflow-hidden shadow-2xs">
                <div className="flex items-start justify-between">
                  {/* Agent Illustration Graphic */}
                  <div className="w-24 h-24 relative shrink-0">
                    <div className="w-20 h-20 rounded-full bg-orange-200/60 flex items-center justify-center absolute top-1 left-1">
                      <Headphones className="w-10 h-10 text-[#FF3B00]"/>
                    </div>
                    <div className="absolute top-0 right-1 bg-white text-[#FF3B00] text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs border border-orange-200">
                      Hello!
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 pl-2">
                    <h2 className="text-sm font-black text-slate-900 leading-tight">We're here to help you!</h2>
                    <p className="text-[10px] text-slate-600 font-bold leading-snug">Our support team is available 24x7 to assist you.</p>
                    
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button onClick={() => showToast("Dialing Support +91 1800 123 4567...")} className="bg-[#FF3B00] hover:bg-orange-600 text-white text-[10px] font-black px-3 py-2 rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5">
                        <Phone className="w-3.5 h-3.5"/> Call Support
                      </button>
                      <button onClick={() => showToast("Starting Live Chat...")} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-[10px] font-black px-3 py-2 rounded-xl shadow-2xs transition active:scale-95 flex items-center justify-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-600"/> Chat with Us
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Help Grid */}
              <div className="space-y-2 pt-1">
                <h2 className="text-xs font-black text-slate-900">Quick Help</h2>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: Package, label: 'My Bookings', desc: 'View your trips', color: 'bg-orange-100 text-orange-600' },
                    { icon: Wallet, label: 'Payments', desc: 'Payment related issues', color: 'bg-blue-100 text-blue-600' },
                    { icon: Car, label: 'Ride & Driver', desc: 'Issues with driver or trip', color: 'bg-emerald-100 text-emerald-600' },
                    { icon: MapPin, label: 'Locations', desc: 'Pick-up, drop & route issues', color: 'bg-purple-100 text-purple-600' },
                    { icon: Tag, label: 'Coupons & Offers', desc: 'Coupons not working?', color: 'bg-amber-100 text-amber-600' },
                    { icon: FileText, label: 'Invoices & Bills', desc: 'Download or view invoices', color: 'bg-pink-100 text-pink-600' },
                    { icon: RotateCcw, label: 'Refunds', desc: 'Refund status & issues', color: 'bg-cyan-100 text-cyan-600' },
                    { icon: MoreHorizontal, label: 'Others', desc: 'Other queries and issues', color: 'bg-slate-100 text-slate-600' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => showToast(`Opening Help topic: ${item.label}...`)}
                        className="bg-white border border-slate-100 rounded-2xl p-2 flex flex-col items-center text-center space-y-1 shadow-2xs hover:border-orange-200 transition cursor-pointer"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.color}`}>
                          <Icon className="w-4 h-4"/>
                        </div>
                        <span className="text-[9px] font-black text-slate-900 leading-tight">{item.label}</span>
                        <span className="text-[7px] text-slate-400 font-bold leading-tight">{item.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Common Queries Accordion */}
              <div className="space-y-2 pt-1">
                <h2 className="text-xs font-black text-slate-900">Common Queries</h2>
                <div className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden text-xs">
                  {[
                    { q: 'How can I book a ride?', a: 'Enter your pick-up and drop locations, choose date and time, select vehicle type, and tap Search Cabs to proceed.' },
                    { q: 'What payment methods are available?', a: 'We accept UPI, Credit/Debit Cards, Net Banking, Wallets (Paytm, PhonePe), and Pay Later via Simpl.' },
                    { q: 'How can I change / cancel my booking?', a: 'Go to My Trips section, select your upcoming booking and tap Edit or Cancel Ride.' },
                    { q: 'Is it safe to travel with MBGO?', a: 'Yes! All drivers undergo criminal & background checks, and all rides feature live GPS safety tracking.' },
                    { q: 'How does MBGO Refer & Earn work?', a: 'Share your referral link with friends. When they complete their first ride, you earn bonus wallet cash.' },
                  ].map((faq, idx) => (
                    <div key={idx} className="p-3.5 space-y-2">
                      <button 
                        onClick={() => toggleFaq(idx)}
                        className="w-full flex items-center justify-between text-left font-black text-slate-800 hover:text-[#FF3B00] transition"
                      >
                        <span className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF3B00]"></div>
                          {faq.q}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-[#FF3B00]' : ''}`}/>
                      </button>
                      {openFaq === idx && (
                        <p className="text-[11px] text-slate-600 font-bold leading-relaxed pl-3.5 border-l-2 border-orange-200">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Need More Help Footer */}
              <div className="space-y-2 pt-1">
                <h2 className="text-xs font-black text-slate-900">Need more help?</h2>
                
                <div 
                  onClick={() => showToast("Opening Ticket Submission Form...")}
                  className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-orange-300 transition shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Mail className="w-4 h-4"/>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">Submit a Request</div>
                      <div className="text-[9px] text-slate-400 font-bold">We will get back to you via email</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400"/>
                </div>

                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-blue-900">Your feedback helps us improve our service.</span>
                  <button onClick={() => showToast("Opening Feedback Dialog...")} className="text-[10px] font-black text-blue-600 bg-white border border-blue-200 px-3 py-1 rounded-xl shadow-xs shrink-0 flex items-center gap-1">
                    Give Feedback <ChevronRight className="w-3 h-3"/>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              SCREEN 38: NOTIFICATIONS - (38.png)
             ========================================== */}
          {activeScreen === '38' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setActiveScreen('36')} className="p-1 hover:bg-slate-100 rounded-full text-slate-800">
                  <ChevronRight className="w-5 h-5 rotate-180"/>
                </button>
                <h1 className="text-base font-black text-slate-900">Notifications</h1>
                <button onClick={() => showToast("All marked as read!")} className="text-[10px] font-black text-[#FF3B00] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5"/> Mark all as read
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex border-b border-slate-200 text-xs font-black text-slate-500 overflow-x-auto no-scrollbar">
                {['All', 'Bookings', 'Payments', 'Offers', 'System'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setNotificationTab(tab)}
                    className={`px-4 py-2 text-center transition shrink-0 ${
                      notificationTab === tab ? 'text-[#FF3B00] border-b-2 border-[#FF3B00] font-black' : 'hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div className="space-y-3">
                
                {/* Item 1 */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2 relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                      <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5"/>
                      </div>
                      <div>
                        <h2 className="text-xs font-black text-slate-900">Trip Completed</h2>
                        <p className="text-[10px] text-slate-600 font-bold mt-0.5">Your trip from New Delhi to Jaipur has been completed. Thank you for traveling with MBGO!</p>
                        <div className="pt-1.5">
                          <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
                            Booking ID: MBGO2505200001
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">2 mins ago</span>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2 relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0"></div>
                      <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5"/>
                      </div>
                      <div>
                        <h2 className="text-xs font-black text-slate-900">Payment Successful</h2>
                        <p className="text-[10px] text-slate-600 font-bold mt-0.5">Your payment of ₹6,250 for booking MBGO2505200001 was successful.</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">10 mins ago</span>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-orange-100 text-[#FF3B00] flex items-center justify-center shrink-0">
                        <Car className="w-5 h-5"/>
                      </div>
                      <div>
                        <h2 className="text-xs font-black text-slate-900">Driver Assigned</h2>
                        <p className="text-[10px] text-slate-600 font-bold mt-0.5">Ramesh Kumar is assigned to your trip on 20 May 2025 at 08:00 AM.</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">1 day ago</span>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5"/>
                      </div>
                      <div>
                        <h2 className="text-xs font-black text-slate-900">Trip Reminder</h2>
                        <p className="text-[10px] text-slate-600 font-bold mt-0.5">Your trip from New Delhi to Jaipur is tomorrow at 08:00 AM. We wish you a safe journey!</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">1 day ago</span>
                  </div>
                </div>

                {/* Item 5 */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Tag className="w-5 h-5"/>
                      </div>
                      <div>
                        <h2 className="text-xs font-black text-slate-900">Special Offer for You!</h2>
                        <p className="text-[10px] text-slate-600 font-bold mt-0.5">Get up to 15% OFF on your next booking. Use code: <span className="text-[#FF3B00] font-black">NEXT15</span></p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">3 days ago</span>
                  </div>
                </div>

              </div>

              {/* Enable Push Notifications Banner */}
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-blue-600 shrink-0"/>
                  <div>
                    <div className="text-xs font-black text-blue-950">Enable Push Notifications</div>
                    <div className="text-[9px] text-slate-500 font-bold">Stay updated with your bookings, offers and alerts.</div>
                  </div>
                </div>
                <button onClick={() => showToast("Push Notifications Enabled!")} className="text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-xs shrink-0">
                  Enable Now
                </button>
              </div>

              {/* Privacy Footer Banner */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-emerald-950">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600"/>
                  <div>
                    <div className="text-xs font-black">Your Privacy, Our Priority</div>
                    <div className="text-[9px] text-emerald-700 font-medium">We never share your personal information with anyone.</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600"/>
              </div>

            </div>
          )}

          {/* ==========================================
              SCREEN 39: SAVED ITEMS - (39.png)
             ========================================== */}
          {activeScreen === '39' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h1 className="text-lg font-black text-slate-900">Saved</h1>
                  <p className="text-[10px] text-slate-400 font-bold">Quick access to your favorite items</p>
                </div>
                <button onClick={() => setActiveScreen('38')} className="p-1 text-slate-800 hover:bg-slate-100 rounded-full relative">
                  <Bell className="w-5 h-5"/>
                  <span className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-1 right-1"></span>
                </button>
              </div>

              {/* Section 1: Saved Routes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF3B00] flex items-center justify-center"><MapPin className="w-3.5 h-3.5"/></div>
                    <span>Saved Routes</span>
                  </div>
                  <button className="text-[10px] font-black text-[#FF3B00]">View All &gt;</button>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2.5">
                  {[
                    { from: 'New Delhi', to: 'Jaipur', stateFrom: 'Delhi', stateTo: 'Rajasthan', car: 'Sedan' },
                    { from: 'New Delhi', to: 'Haridwar', stateFrom: 'Delhi', stateTo: 'Uttarakhand', car: 'SUV' },
                    { from: 'New Delhi', to: 'Agra', stateFrom: 'Delhi', stateTo: 'Uttar Pradesh', car: 'Innova' },
                  ].map((route, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <div className="space-y-0.5">
                        <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                          <span>{route.from}</span>
                          <span className="text-slate-400">⇄</span>
                          <span>{route.to}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold">{route.stateFrom} • {route.stateTo}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Car className="w-3 h-3"/> {route.car}
                        </span>
                        <MoreHorizontal className="w-4 h-4 text-slate-400 cursor-pointer"/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Saved Travellers */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><User className="w-3.5 h-3.5"/></div>
                    <span>Saved Travellers</span>
                  </div>
                  <button className="text-[10px] font-black text-blue-600">View All &gt;</button>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { name: 'Ashutosh Rai', tag: 'You', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150' },
                    { name: 'Madhulika Das', tag: 'Wife', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' },
                    { name: 'Bindeshwar Lal', tag: 'Father', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150' },
                  ].map((p, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex items-center gap-2 min-w-[125px] shadow-2xs">
                      <img src={p.img} alt={p.name} className="w-8 h-8 rounded-full object-cover shrink-0"/>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-slate-900 truncate">{p.name}</div>
                        <div className="text-[8px] text-slate-400 font-bold">{p.tag}</div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => showToast("Add New Traveller dialog...")} className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-2.5 flex flex-col items-center justify-center min-w-[100px] text-slate-600 hover:bg-slate-100 transition">
                    <Plus className="w-4 h-4"/>
                    <span className="text-[9px] font-black mt-0.5">Add New</span>
                  </button>
                </div>
              </div>

              {/* Section 3: Saved Addresses */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><MapPin className="w-3.5 h-3.5"/></div>
                    <span>Saved Addresses</span>
                  </div>
                  <button className="text-[10px] font-black text-emerald-600">View All &gt;</button>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { label: 'Home', default: true, address: 'Najafgarh, New Delhi - 110043' },
                    { label: 'Office', default: true, address: 'Najafgarh Road, New Delhi - 110043' },
                    { label: 'IGI Airport', default: false, address: 'Indira Gandhi Intl. Airport - 110037' },
                  ].map((addr, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-3 min-w-[155px] shadow-2xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900">{addr.label}</span>
                        {addr.default && <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.2 rounded">Default</span>}
                      </div>
                      <div className="text-[9px] text-slate-500 font-semibold leading-tight line-clamp-2">{addr.address}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Favourite Vehicles */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Car className="w-3.5 h-3.5"/></div>
                    <span>Favourite Vehicles</span>
                  </div>
                  <button className="text-[10px] font-black text-purple-600">View All &gt;</button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Sedan' },
                    { label: 'SUV' },
                    { label: 'Innova' },
                    { label: 'Tempo Traveller' },
                  ].map((v, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col items-center justify-center text-center space-y-1 shadow-2xs">
                      <Car className="w-5 h-5 text-slate-700"/>
                      <span className="text-[9px] font-black text-slate-800">{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 5: Recently Viewed Quotations */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><FileText className="w-3.5 h-3.5"/></div>
                    <span>Recently Viewed Quotations</span>
                  </div>
                  <button className="text-[10px] font-black text-amber-600">View All &gt;</button>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>New Delhi</span>
                        <span className="text-slate-300">--------</span>
                        <span className="w-2 h-2 rounded-full bg-[#FF3B00]"></span>
                        <span>Jaipur, Rajasthan</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold">20 May 2025 • One Way • 2 Passengers • Sedan</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">₹6,250</div>
                      <button onClick={() => showToast("Rebooking New Delhi to Jaipur...")} className="mt-1 border border-[#FF3B00] text-[#FF3B00] text-[9px] font-black px-2.5 py-1 rounded-xl hover:bg-orange-50 transition">
                        Rebook
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              SCREEN 40: ENHANCED PROFILE (ASHUTOSH) - (40.png)
             ========================================== */}
          {activeScreen === '40' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pt-1">
                <div className="w-6"></div>
                <h1 className="text-lg font-black text-slate-900">Profile</h1>
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveScreen('37')} className="flex flex-col items-center text-slate-800 hover:text-orange-600 transition">
                    <Headphones className="w-5 h-5"/>
                    <span className="text-[9px] font-bold text-slate-500 -mt-0.5">Support</span>
                  </button>
                  <button onClick={() => setActiveScreen('38')} className="flex flex-col items-center text-slate-800 hover:text-orange-600 relative transition">
                    <Bell className="w-5 h-5"/>
                    <span className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-0 right-0 border border-white"></span>
                    <span className="text-[9px] font-bold text-slate-500 -mt-0.5">Notifications</span>
                  </button>
                </div>
              </div>

              {/* User Identity Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" 
                          alt="Ashutosh Rai" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center absolute bottom-0 right-0 border border-white shadow-xs">
                        <Camera className="w-3 h-3"/>
                      </button>
                    </div>

                    <div className="space-y-0.5">
                      <h2 className="text-base font-black text-slate-900">Ashutosh Rai</h2>
                      <div className="text-xs font-bold text-slate-600">+91 98765 43210</div>
                      <div className="text-[11px] font-medium text-slate-500">ashutosh.rai@gmail.com</div>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600"/> Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => showToast("Editing Profile...")} className="text-xs font-black text-[#FF3B00] hover:underline flex items-center gap-0.5 shrink-0 self-start pt-1">
                    Edit Profile <ChevronRight className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>

              {/* 4-Column Quick Stats Grid */}
              <div className="grid grid-cols-4 gap-2">
                
                {/* Wallet */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-2xs text-center space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-orange-100 text-[#FF3B00] flex items-center justify-center mx-auto">
                    <Wallet className="w-4 h-4"/>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold text-slate-400">MB Wallet</div>
                    <div className="text-[10px] font-black text-[#FF3B00]">₹1,250.00</div>
                  </div>
                  <button onClick={() => showToast("Add Money...")} className="bg-orange-50 text-[#FF3B00] text-[8px] font-black py-0.5 rounded-md">
                    Add Money
                  </button>
                </div>

                {/* Coupons */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-2xs text-center space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Tag className="w-4 h-4"/>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold text-slate-400">My Coupons</div>
                    <div className="text-[10px] font-black text-emerald-600">3 Available</div>
                  </div>
                  <button onClick={() => showToast("Viewing Coupons...")} className="bg-emerald-50 text-emerald-700 text-[8px] font-black py-0.5 rounded-md">
                    View Coupons
                  </button>
                </div>

                {/* Refer */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-2xs text-center space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <Gift className="w-4 h-4"/>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold text-slate-400">Refer & Earn</div>
                    <div className="text-[10px] font-black text-blue-600">₹250 Earned</div>
                  </div>
                  <button onClick={() => showToast("Inviting friends...")} className="bg-blue-50 text-blue-700 text-[8px] font-black py-0.5 rounded-md">
                    Invite Now
                  </button>
                </div>

                {/* Rewards */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-2xs text-center space-y-1">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <Award className="w-4 h-4"/>
                  </div>
                  <div>
                    <div className="text-[8px] font-bold text-slate-400">MB Rewards</div>
                    <div className="text-[10px] font-black text-amber-600">250 Points</div>
                  </div>
                  <button onClick={() => showToast("View Rewards...")} className="bg-amber-50 text-amber-700 text-[8px] font-black py-0.5 rounded-md">
                    View Rewards
                  </button>
                </div>

              </div>

              {/* ACCOUNT List */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Account</div>
                <div className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden text-xs font-extrabold text-slate-900">
                  <div onClick={() => showToast("Personal Information...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><User className="w-4 h-4 text-slate-700"/><span>Personal Information</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => setActiveScreen('39')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-slate-700"/><span>Saved Addresses</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => setActiveScreen('39')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><User className="w-4 h-4 text-slate-700"/><span>Saved Travellers</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => showToast("Payment Methods...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><CreditCard className="w-4 h-4 text-slate-700"/><span>Payment Methods</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => showToast("MB Wallet...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><Wallet className="w-4 h-4 text-slate-700"/><span>MB Wallet</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => showToast("My Documents...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-slate-700"/><span>My Documents</span></div>
                    <div className="flex items-center gap-1">
                      <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.2 rounded">Verified</span>
                      <ChevronRight className="w-4 h-4 text-slate-400"/>
                    </div>
                  </div>
                  <div onClick={() => showToast("Emergency Contacts...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><Shield className="w-4 h-4 text-slate-700"/><span>Emergency Contacts</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                </div>
              </div>

              {/* PREFERENCES List */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Preferences</div>
                <div className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden text-xs font-extrabold text-slate-900">
                  <div onClick={() => showToast("Settings...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><Settings className="w-4 h-4 text-slate-700"/><span>Settings</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => setActiveScreen('38')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><Bell className="w-4 h-4 text-slate-700"/><span>Notification Preferences</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => showToast("Language Selection...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-slate-700"/><span>Language</span></div>
                    <div className="flex items-center gap-1 text-slate-400 font-bold text-[11px]">
                      <span>English</span>
                      <ChevronRight className="w-4 h-4 text-slate-400"/>
                    </div>
                  </div>
                </div>
              </div>

              {/* MORE List */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">More</div>
                <div className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden text-xs font-extrabold text-slate-900">
                  <div onClick={() => setActiveScreen('37')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><Headphones className="w-4 h-4 text-slate-700"/><span>Help & Support</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => showToast("Privacy Policy...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><Shield className="w-4 h-4 text-slate-700"/><span>Privacy Policy</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => showToast("Terms & Conditions...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-slate-700"/><span>Terms & Conditions</span></div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                  <div onClick={() => showToast("About MBGO v2.1.0...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-3"><HelpCircle className="w-4 h-4 text-slate-700"/><span>About MBGO</span></div>
                    <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px]">
                      <span>v 2.1.0</span>
                      <ChevronRight className="w-4 h-4 text-slate-400"/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={() => showToast("Logging out...")}
                className="w-full bg-white border border-[#FF3B00] hover:bg-orange-50 text-[#FF3B00] font-black text-xs py-3.5 rounded-2xl transition flex items-center justify-center gap-2 active:scale-98 shadow-2xs"
              >
                <LogOut className="w-4 h-4"/>
                <span>Logout</span>
              </button>

              <div className="text-[10px] text-center font-extrabold text-slate-400 pt-1">
                MBGO is powered by <span className="text-[#FF3B00]">MusafirBaba</span>
              </div>

            </div>
          )}

        </div>

        {/* Global Rider Bottom App Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 py-2 px-6 flex justify-between items-center z-30">
          
          <button 
            onClick={() => setActiveScreen('36')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '36' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Car className="w-5 h-5"/>
            <span>Home</span>
          </button>

          <button 
            onClick={() => setActiveScreen('38')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '38' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Calendar className="w-5 h-5"/>
            <span>Bookings</span>
          </button>

          <button 
            onClick={() => setActiveScreen('39')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '39' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Heart className="w-5 h-5"/>
            <span>Saved</span>
          </button>

          <button 
            onClick={() => setActiveScreen('37')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '37' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Headphones className="w-5 h-5"/>
            <span>Support</span>
          </button>

          <button 
            onClick={() => setActiveScreen('40')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '40' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <User className="w-5 h-5"/>
            <span>Profile</span>
          </button>

        </div>

        {/* Global Notification Toast */}
        {toastMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-black px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-slate-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Home Indicator Line */}
        <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto my-1.5 relative z-40" />

      </div>
    </div>
  );
}