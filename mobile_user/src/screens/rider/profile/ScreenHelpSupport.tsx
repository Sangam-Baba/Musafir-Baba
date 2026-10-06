import { Text, View, TouchableOpacity, Image, ScrollView } from 'react-native';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import React, { useState } from 'react';
import {
  Receipt,
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
} from 'lucide-react-native';

export default function ScreenHelpSupport({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  // Navigation active screen selector: '36' | '37' | '38' | '39' | '40'
  const activeScreen = '37' as string;

  // Interactive state for FAQs in Help & Support (Screen 37)
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Category tab for Notifications (Screen 38)
  const [notificationTab, setNotificationTab] = useState('All');

  // Toast notification system
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  return (
    <View className="flex-1 bg-slate-900 selection:bg-orange-500 selection:text-white">
      
      {/* Main Mobile Frame */}
      <View className="flex-1 bg-[#F8FAFC] relative">
        
        

        {/* Scrollable Main Body Content */}
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

          {/* ==========================================
              SCREEN 36: PROFILE (AMIT SHARMA) - (36.png)
             ========================================== */}
          {activeScreen === '36' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <View className="w-6"></View>
                <Text className="text-lg font-black text-slate-900">Profile</Text>
                <View className="flex items-center gap-3 flex-row">
                  <TouchableOpacity onPress={() => onNavigate('37')} className="flex flex-col items-center hover:text-orange-600 transition">
                    <Headphones className="w-5 h-5"/>
                    <Text className="text-[9px] font-bold text-slate-500 -mt-0.5">Support</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onNavigate('38')} className="flex flex-col items-center hover:text-orange-600 relative transition">
                    <Bell className="w-5 h-5"/>
                    <Text className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-0 right-0 border border-white"></Text>
                    <Text className="text-[9px] font-bold text-slate-500 -mt-0.5">Notifications</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* User Identity Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm">
                <View className="flex items-center justify-between flex-row">
                  <View className="flex items-center gap-3.5 flex-row">
                    <View className="relative">
                      <View className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center flex-row">
                        <Image source={{ uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" }} 
                          accessibilityLabel="Amit Sharma" 
                          className="w-full h-full object-cover" />
                      </View>
                      <View className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center absolute bottom-0 right-0 border border-white shadow-sm flex-row">
                        <Camera className="w-3 h-3"/>
                      </View>
                    </View>

                    <View className="space-y-0.5">
                      <Text className="text-base font-black text-slate-900">Amit Sharma</Text>
                      <View className=""><Text className="text-xs font-bold text-slate-600">+91 98765 43210</Text></View>
                      <View className=""><Text className="text-[11px] font-medium text-slate-500">amit.sharma@gmail.com</Text></View>
                      <View className="pt-1">
                        <Text className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600"/> Verified
                        </Text>
                      </View>
                  </View>
                  </View>

                  <TouchableOpacity onPress={() => showToast("Opening Edit Profile...")} className="hover:underline flex items-center gap-0.5 shrink-0 self-start pt-1 flex-row"><Text className="text-xs font-black text-[#FF3B00]">
                    Edit Profile </Text><ChevronRight className="w-3.5 h-3.5"/>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Wallet & Coupons Card Row */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm flex-row flex-wrap divide-x divide-slate-100">
                <TouchableOpacity onPress={() => showToast("Opening Wallet...")} className="flex-1 flex items-center gap-3 pr-2 cursor-pointer hover:opacity-80 transition flex-row">
                  <View className="w-10 h-10 rounded-2xl bg-orange-100/80 flex items-center justify-center shrink-0 flex-row">
                    <Wallet className="w-5 h-5"/>
                  </View>
                  <View className="space-y-0.5 flex-1 min-w-0">
                    <View className=""><Text className="text-[10px] font-extrabold text-slate-500">MB Wallet</Text></View>
                    <View className=""><Text className="text-xs font-black text-[#FF3B00] truncate">₹1,250.00</Text></View>
                  </View>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0"/>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => showToast("Viewing Available Coupons...")} className="flex-1 flex items-center gap-3 pl-3 cursor-pointer hover:opacity-80 transition flex-row">
                  <View className="w-10 h-10 rounded-2xl bg-emerald-100/80 flex items-center justify-center shrink-0 flex-row">
                    <Tag className="w-5 h-5"/>
                  </View>
                  <View className="space-y-0.5 flex-1 min-w-0">
                    <View className=""><Text className="text-[10px] font-extrabold text-slate-500">My Coupons</Text></View>
                    <View className=""><Text className="text-xs font-black text-emerald-600 truncate">3 Available</Text></View>
                  </View>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0"/>
                </TouchableOpacity>
              </View>

              {/* ACCOUNT Section */}
              <View className="space-y-2 pt-1">
                {/* Account heading commented out for now
                <View className="px-1"><Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account</Text></View>
                */}
                {/* ACCOUNT suboptions commented out
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                  {[
                    { icon: User, label: 'Personal Information' },
                    { icon: MapPin, label: 'Saved Addresses', action: () => onNavigate('39') },
                    { icon: CreditCard, label: 'Payment Methods' },
                    { icon: FileText, label: 'My Documents' },
                    { icon: Gift, label: 'Refer & Earn' },
                    { icon: Settings, label: 'Settings' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <TouchableOpacity key={idx} 
                        onPress={item.action || (() => showToast(`Opening ${item.label}...`))}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer flex-row"
                      >
                        <View className="flex items-center gap-3 flex-row">
                          <Icon className="w-4 h-4 text-slate-700"/>
                          <Text>{item.label}</Text>
                        </View>
                        <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                    );
                  })}
                </View>
                */}
              </View>

              {/* OTHERS Section */}
              <View className="space-y-2 pt-1">
                {/* Others heading commented out for now
                <View className="px-1"><Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Others</Text></View>
                */}
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                  {[
                    { icon: Car, label: 'Trip Preferences' },
                    { icon: Headphones, label: 'Help & Support', action: () => onNavigate('37') },
                    { icon: Shield, label: 'Terms & Conditions' },
                    { icon: Shield, label: 'Privacy Policy' },
                    { icon: HelpCircle, label: 'About MBGO' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <TouchableOpacity key={idx} 
                        onPress={item.action || (() => showToast(`Opening ${item.label}...`))}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer flex-row"
                      >
                        <View className="flex items-center gap-3 flex-row">
                          <Icon className="w-4 h-4 text-slate-700"/>
                          <Text>{item.label}</Text>
                        </View>
                        <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Logout Button */}
              <TouchableOpacity 
                onPress={() => onNavigate('login')}
                className="w-full bg-white border border-[#FF3B00] hover:bg-orange-50 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 active:scale-98 shadow-sm flex-row"
              >
                <LogOut className="w-4 h-4"/>
                <Text>Logout</Text>
              </TouchableOpacity>

            </View>
          )}

          {/* ==========================================
              SCREEN 37: HELP & SUPPORT - (37.png)
             ========================================== */}
          {activeScreen === '37' && (
            <View style={{ padding: 12, gap: 14 }}>

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                <TouchableOpacity
                  onPress={() => (onBack ? onBack() : onNavigate('36'))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ChevronRight size={18} color="#0F172A" strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A', letterSpacing: -0.2 }}>Help & support</Text>
                <View style={{ width: 36 }} />
              </View>

              {/* Contact card */}
              <View style={{ backgroundColor: '#FFF5EF', borderRadius: 18, padding: 16, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                    <Headphones size={22} color="#FF4500" strokeWidth={1.75} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#0F172A' }}>How can we help?</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '400', color: '#64748B', marginTop: 2 }}>Our support team is available 24x7.</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => showToast("Dialing Support...")} activeOpacity={0.85} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#FF4500', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Phone size={15} color="#FFFFFF" strokeWidth={2} />
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#FFFFFF' }}>Call us</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("Starting Live Chat...")} activeOpacity={0.85} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FED7C3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <MessageSquare size={15} color="#0F172A" strokeWidth={2} />
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#0F172A' }}>Chat with us</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Help Grid */}
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Browse topics</Text>
                <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6, flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
                  {[
                    { icon: Package, label: 'My bookings', tint: '#EA580C', bg: '#FFF5EF', action: () => onNavigate('35') },
                    { icon: Wallet, label: 'Payments', tint: '#2563EB', bg: '#EFF6FF' },
                    { icon: Car, label: 'Ride & driver', tint: '#059669', bg: '#ECFDF5' },
                    { icon: MapPin, label: 'Locations', tint: '#7C3AED', bg: '#F5F3FF' },
                    { icon: Tag, label: 'Offers', tint: '#D97706', bg: '#FFFBEB' },
                    { icon: FileText, label: 'Invoices', tint: '#DB2777', bg: '#FDF2F8' },
                    { icon: RotateCcw, label: 'Refunds', tint: '#0891B2', bg: '#ECFEFF' },
                    { icon: MoreHorizontal, label: 'Others', tint: '#475569', bg: '#F1F5F9' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <TouchableOpacity key={idx}
                        onPress={item.action || (() => showToast(`Opening Help topic: ${item.label}...`))}
                        style={{ width: '25%', alignItems: 'center', gap: 8 }}
                      >
                        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={18} color={item.tint} strokeWidth={2} />
                        </View>
                        <Text style={{ fontSize: 11.5, fontWeight: '500', color: '#334155', textAlign: 'center' }}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Common Queries Accordion */}
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Frequently asked</Text>
                <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, overflow: 'hidden' }}>
                  {[
                    { q: 'How do I book a ride?', a: 'Enter your pick-up and drop locations, choose the date and time, tap Search Cabs, pick a vehicle and pay to confirm.' },
                    { q: 'What payment methods are available?', a: 'You can pay securely through PayU using UPI, debit/credit cards, net banking or wallets.' },
                    { q: 'How can I change or cancel my booking?', a: 'Contact our support team with your Booking ID (shown in My Trips) and we will help you change or cancel it.' },
                    { q: 'When will I get driver details?', a: 'Driver and vehicle details are shared once a partner is assigned, and no earlier than 24 hours before your trip.' },
                    { q: 'Are tolls and parking included?', a: 'Fuel and driver charges are included in your fare. Tolls, parking, state taxes and permits are paid on the trip.' },
                  ].map((faq, idx, arr) => {
                    const isOpen = openFaq === idx;
                    return (
                      <View key={idx} style={{ borderBottomWidth: idx === arr.length - 1 ? 0 : 1, borderBottomColor: '#F1F5F9' }}>
                        <TouchableOpacity
                          onPress={() => toggleFaq(idx)}
                          style={{ paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                        >
                          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500', color: '#0F172A' }}>{faq.q}</Text>
                          <ChevronDown size={16} color="#94A3B8" strokeWidth={2} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>
                        {isOpen && (
                          <Text style={{ fontSize: 12.5, fontWeight: '400', color: '#64748B', lineHeight: 19, paddingHorizontal: 14, paddingBottom: 14, marginTop: -4 }}>
                            {faq.a}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Need More Help */}
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Still need help?</Text>
                <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF2F6', borderRadius: 16, overflow: 'hidden' }}>
                  <TouchableOpacity onPress={() => showToast("Opening Ticket Submission Form...")}
                    style={{ paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                      <Mail size={16} color="#2563EB" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#0F172A' }}>Submit a request</Text>
                      <Text style={{ fontSize: 12, fontWeight: '400', color: '#64748B', marginTop: 1 }}>We'll reply by email</Text>
                    </View>
                    <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("Opening Feedback Dialog...")}
                    style={{ paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' }}>
                      <Heart size={16} color="#7C3AED" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#0F172A' }}>Give feedback</Text>
                      <Text style={{ fontSize: 12, fontWeight: '400', color: '#64748B', marginTop: 1 }}>Help us improve MBGO</Text>
                    </View>
                    <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          )}

          {/* ==========================================
              SCREEN 38: NOTIFICATIONS - (38.png)
             ========================================== */}
          {activeScreen === '38' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <TouchableOpacity onPress={() => onNavigate('36')} className="p-1 hover:bg-slate-100 rounded-full">
                  <ChevronRight className="w-5 h-5 rotate-180"/>
                </TouchableOpacity>
                <Text className="text-base font-black text-slate-900">Notifications</Text>
                <TouchableOpacity onPress={() => showToast("All marked as read!")} className="flex items-center gap-1 flex-row">
                  <CheckCircle2 className="w-3.5 h-3.5"/><Text className="text-[10px] font-black text-[#FF3B00]"> Mark all as read
                </Text></TouchableOpacity>
              </View>

              {/* Category Filter Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex border-b border-slate-200 overflow-x-auto no-scrollbar flex-row">
                {['All', 'Bookings', 'Payments', 'Offers', 'System'].map((tab) => (
                  <TouchableOpacity 
                    key={tab}
                    onPress={() => setNotificationTab(tab)}
                    className={`px-4 py-2 text-center transition shrink-0 ${
                      notificationTab === tab ? 'text-[#FF3B00] border-b-2 border-[#FF3B00] font-black' : 'hover:text-slate-800'
                    }`}
                  >
                    <Text>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Notification List */}
              <View className="space-y-3">
                
                {/* Item 1 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-2 relative">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row flex-1 min-w-0">
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></View>
                      <View className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 flex-row">
                        <CheckCircle2 className="w-5 h-5"/>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-xs font-black text-slate-900">Trip Completed</Text>
                        <Text className="text-[10px] text-slate-600 font-bold mt-0.5">Your trip from New Delhi to Jaipur has been completed. Thank you for traveling with MBGO!</Text>
                        <View className="pt-1.5">
                          <Text className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
                            Booking ID: MBGO2505200001
                          </Text>
                        </View>
                  </View>
                    </View>
                    <Text className="text-[9px] font-bold text-slate-400 shrink-0">2 mins ago</Text>
                  </View>
                </View>

                {/* Item 2 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-2 relative">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row flex-1 min-w-0">
                      <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0"></View>
                      <View className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 flex-row">
                        <CreditCard className="w-5 h-5"/>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-xs font-black text-slate-900">Payment Successful</Text>
                        <Text className="text-[10px] text-slate-600 font-bold mt-0.5">Your payment of ₹6,250 for booking MBGO2505200001 was successful.</Text>
                      </View>
                    </View>
                    <Text className="text-[9px] font-bold text-slate-400 shrink-0">10 mins ago</Text>
                  </View>
                </View>

                {/* Item 3 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-2">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row flex-1 min-w-0">
                      <View className="w-9 h-9 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 flex-row">
                        <Car className="w-5 h-5"/>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-xs font-black text-slate-900">Driver Assigned</Text>
                        <Text className="text-[10px] text-slate-600 font-bold mt-0.5">Ramesh Kumar is assigned to your trip on 20 May 2025 at 08:00 AM.</Text>
                      </View>
                    </View>
                    <Text className="text-[9px] font-bold text-slate-400 shrink-0">1 day ago</Text>
                  </View>
                </View>

                {/* Item 4 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-2">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row flex-1 min-w-0">
                      <View className="w-9 h-9 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0 flex-row">
                        <Clock className="w-5 h-5"/>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-xs font-black text-slate-900">Trip Reminder</Text>
                        <Text className="text-[10px] text-slate-600 font-bold mt-0.5">Your trip from New Delhi to Jaipur is tomorrow at 08:00 AM. We wish you a safe journey!</Text>
                      </View>
                    </View>
                    <Text className="text-[9px] font-bold text-slate-400 shrink-0">1 day ago</Text>
                  </View>
                </View>

                {/* Item 5 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-2">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row flex-1 min-w-0">
                      <View className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 flex-row">
                        <Tag className="w-5 h-5"/>
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-xs font-black text-slate-900">Special Offer for You!</Text>
                        <Text className="text-[10px] text-slate-600 font-bold mt-0.5">Get up to 15% OFF on your next booking. Use code: <Text className="text-[#FF3B00] font-black">NEXT15</Text></Text>
                      </View>
                    </View>
                    <Text className="text-[9px] font-bold text-slate-400 shrink-0">3 days ago</Text>
                  </View>
                  </View>

              </View>

              {/* Enable Push Notifications Banner */}
              <View className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between flex-row">
                <View className="flex items-center gap-2.5 flex-row">
                  <Bell className="w-5 h-5 text-blue-600 shrink-0"/>
                  <View>
                    <View className=""><Text className="text-xs font-black text-blue-950">Enable Push Notifications</Text></View>
                    <View className=""><Text className="text-[9px] text-slate-500 font-bold">Stay updated with your bookings, offers and alerts.</Text></View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => showToast("Push Notifications Enabled!")} className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-sm shrink-0"><Text className="text-[10px] font-black text-white">
                  Enable Now
                </Text></TouchableOpacity>
              </View>

              {/* Privacy Footer Banner */}
              <View className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between flex-row">
                <View className="flex items-center gap-2 flex-row">
                  <Shield className="w-4 h-4 text-emerald-600"/>
                  <View>
                    <View className=""><Text className="text-xs font-black">Your Privacy, Our Priority</Text></View>
                    <View className=""><Text className="text-[9px] text-emerald-700 font-medium">We never share your personal information with anyone.</Text></View>
                  </View>
                </View>
                <ChevronRight className="w-4 h-4 text-emerald-600"/>
              </View>

            </View>
          )}

          {/* ==========================================
              SCREEN 39: SAVED ITEMS - (39.png)
             ========================================== */}
          {activeScreen === '39' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <View>
                  <Text className="text-lg font-black text-slate-900">Saved</Text>
                  <Text className="text-[10px] text-slate-400 font-bold">Quick access to your favorite items</Text>
                </View>
                <TouchableOpacity onPress={() => onNavigate('38')} className="p-1 hover:bg-slate-100 rounded-full relative">
                  <Bell className="w-5 h-5"/>
                  <Text className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-1 right-1"></Text>
                </TouchableOpacity>
              </View>

              {/* Section 1: Saved Routes */}
              <View className="space-y-2">
                <View className="flex justify-between items-center flex-row">
                  <View className="flex items-center gap-1.5 flex-row">
                    <View className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center flex-row"><MapPin className="w-3.5 h-3.5"/></View>
                    <Text>Saved Routes</Text>
                  </View>
                  <View className=""><Text className="text-[10px] font-black text-[#FF3B00]">View All &gt;</Text></View>
                </View>

                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-2.5">
                  {[
                    { from: 'New Delhi', to: 'Jaipur', stateFrom: 'Delhi', stateTo: 'Rajasthan', car: 'Sedan' },
                    { from: 'New Delhi', to: 'Haridwar', stateFrom: 'Delhi', stateTo: 'Uttarakhand', car: 'SUV' },
                    { from: 'New Delhi', to: 'Agra', stateFrom: 'Delhi', stateTo: 'Uttar Pradesh', car: 'Innova' },
                  ].map((route, idx) => (
                    <View key={idx} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0 flex-row">
                      <View className="space-y-0.5">
                        <View className="flex items-center gap-2 flex-row">
                          <Text>{route.from}</Text>
                          <Text className="text-slate-400">⇄</Text>
                          <Text>{route.to}</Text>
                        </View>
                        <View className=""><Text className="text-[9px] text-slate-400 font-bold">{route.stateFrom} • {route.stateTo}</Text></View>
                      </View>
                      <View className="flex items-center gap-2 flex-row">
                        <Text className="bg-slate-100 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Car className="w-3 h-3"/> {route.car}
                        </Text>
                        <MoreHorizontal className="w-4 h-4 text-slate-400 cursor-pointer"/>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Section 2: Saved Travellers */}
              <View className="space-y-2">
                <View className="flex justify-between items-center flex-row">
                  <View className="flex items-center gap-1.5 flex-row">
                    <View className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-row"><User className="w-3.5 h-3.5"/></View>
                    <Text>Saved Travellers</Text>
                  </View>
                  <View className=""><Text className="text-[10px] font-black text-blue-600">View All &gt;</Text></View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-row">
                  {[
                    { name: 'Ashutosh Rai', tag: 'You', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150' },
                    { name: 'Madhulika Das', tag: 'Wife', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' },
                    { name: 'Bindeshwar Lal', tag: 'Father', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150' },
                  ].map((p, idx) => (
                    <View key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex items-center gap-2 min-w-[125px] shadow-sm flex-row">
                      <Image source={{ uri: p.img }} accessibilityLabel={p.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <View className="min-w-0">
                        <View className=""><Text>{p.name}</Text></View>
                        <View className=""><Text>{p.tag}</Text></View>
                  </View>
                    </View>
                  ))}
                  <TouchableOpacity onPress={() => showToast("Add New Traveller dialog...")} className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-2.5 flex flex-col items-center justify-center min-w-[100px] hover:bg-slate-100 transition">
                    <Plus className="w-4 h-4"/>
                    <Text className="text-[9px] font-black mt-0.5">Add New</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Section 3: Saved Addresses */}
              <View className="space-y-2">
                <View className="flex justify-between items-center flex-row">
                  <View className="flex items-center gap-1.5 flex-row">
                    <View className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-row"><MapPin className="w-3.5 h-3.5"/></View>
                    <Text>Saved Addresses</Text>
                  </View>
                  <View className=""><Text className="text-[10px] font-black text-emerald-600">View All &gt;</Text></View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-row">
                  {[
                    { label: 'Home', default: true, address: 'Najafgarh, New Delhi - 110043' },
                    { label: 'Office', default: true, address: 'Najafgarh Road, New Delhi - 110043' },
                    { label: 'IGI Airport', default: false, address: 'Indira Gandhi Intl. Airport - 110037' },
                  ].map((addr, idx) => (
                    <View key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-3 min-w-[155px] shadow-sm space-y-1">
                      <View className="flex justify-between items-center flex-row">
                        <Text className="text-xs font-black text-slate-900">{addr.label}</Text>
                        {addr.default && <Text className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.2 rounded">Default</Text>}
                      </View>
                      <View className=""><Text numberOfLines={2} className="text-slate-600">{addr.address}</Text></View>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Section 4: Favourite Vehicles */}
              <View className="space-y-2">
                <View className="flex justify-between items-center flex-row">
                  <View className="flex items-center gap-1.5 flex-row">
                    <View className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center flex-row"><Car className="w-3.5 h-3.5"/></View>
                    <Text>Favourite Vehicles</Text>
                  </View>
                  <View className=""><Text className="text-[10px] font-black text-purple-600">View All &gt;</Text></View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {[
                    { label: 'Sedan' },
                    { label: 'SUV' },
                    { label: 'Innova' },
                    { label: 'Tempo Traveller' },
                  ].map((v, idx) => (
                    <View key={idx} className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col items-center justify-center space-y-1 shadow-sm">
                      <Car className="w-5 h-5 text-slate-700"/>
                      <Text className="text-[9px] font-black text-slate-800">{v.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Section 5: Recently Viewed Quotations */}
              <View className="space-y-2">
                <View className="flex justify-between items-center flex-row">
                  <View className="flex items-center gap-1.5 flex-row">
                    <View className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-row"><FileText className="w-3.5 h-3.5"/></View>
                    <Text>Recently Viewed Quotations</Text>
                  </View>
                  <View className=""><Text className="text-[10px] font-black text-amber-600">View All &gt;</Text></View>
                </View>

                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-2">
                  <View className="flex justify-between items-center flex-row">
                    <View className="space-y-0.5">
                      <View className="flex items-center gap-1.5 flex-row">
                        <Text className="w-2 h-2 rounded-full bg-emerald-500"></Text>
                        <Text>New Delhi</Text>
                        <Text className="text-slate-300">--------</Text>
                        <Text className="w-2 h-2 rounded-full bg-[#FF3B00]"></Text>
                        <Text>Jaipur, Rajasthan</Text>
                      </View>
                      <View className=""><Text className="text-[9px] text-slate-400 font-bold">20 May 2025 • One Way • 2 Passengers • Sedan</Text></View>
                    </View>

                    <View className="">
                      <View className=""><Text className="text-xs font-black text-slate-900">₹6,250</Text></View>
                      <TouchableOpacity onPress={() => showToast("Rebooking New Delhi to Jaipur...")} className="mt-1 border border-[#FF3B00] px-2.5 py-1 rounded-xl hover:bg-orange-50 transition"><Text className="text-[#FF3B00] text-[9px] font-black">
                        Rebook
                      </Text></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

            </View>
          )}

          {/* ==========================================
              SCREEN 40: ENHANCED PROFILE (ASHUTOSH) - (40.png)
             ========================================== */}
          {activeScreen === '40' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <View className="w-6"></View>
                <Text className="text-lg font-black text-slate-900">Profile</Text>
                <View className="flex items-center gap-3 flex-row">
                  <TouchableOpacity onPress={() => onNavigate('37')} className="flex flex-col items-center hover:text-orange-600 transition">
                    <Headphones className="w-5 h-5"/>
                    <Text className="text-[9px] font-bold text-slate-500 -mt-0.5">Support</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onNavigate('38')} className="flex flex-col items-center hover:text-orange-600 relative transition">
                    <Bell className="w-5 h-5"/>
                    <Text className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-0 right-0 border border-white"></Text>
                    <Text className="text-[9px] font-bold text-slate-500 -mt-0.5">Notifications</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* User Identity Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm">
                <View className="flex items-center justify-between flex-row">
                  <View className="flex items-center gap-3.5 flex-row">
                    <View className="relative">
                      <View className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center flex-row">
                        <Image source={{ uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" }} 
                          accessibilityLabel="Ashutosh Rai" 
                          className="w-full h-full object-cover" />
                      </View>
                      <View className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center absolute bottom-0 right-0 border border-white shadow-sm flex-row">
                        <Camera className="w-3 h-3"/>
                      </View>
                    </View>

                    <View className="space-y-0.5">
                      <Text className="text-base font-black text-slate-900">Ashutosh Rai</Text>
                      <View className=""><Text className="text-xs font-bold text-slate-600">+91 98765 43210</Text></View>
                      <View className=""><Text className="text-[11px] font-medium text-slate-500">ashutosh.rai@gmail.com</Text></View>
                      <View className="pt-1">
                        <Text className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600"/> Verified
                        </Text>
                      </View>
                  </View>
                  </View>

                  <TouchableOpacity onPress={() => showToast("Editing Profile...")} className="hover:underline flex items-center gap-0.5 shrink-0 self-start pt-1 flex-row"><Text className="text-xs font-black text-[#FF3B00]">
                    Edit Profile </Text><ChevronRight className="w-3.5 h-3.5"/>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 4-Column Quick Stats Grid */}
              <View className="flex-row flex-wrap gap-2">
                
                {/* Wallet */}
                <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-sm space-y-1">
                  <View className="w-7 h-7 rounded-xl bg-orange-100 flex items-center justify-center mx-auto flex-row">
                    <Wallet className="w-4 h-4"/>
                  </View>
                  <View>
                    <View className=""><Text className="text-[8px] font-bold text-slate-400">MB Wallet</Text></View>
                    <View className=""><Text className="text-[10px] font-black text-[#FF3B00]">₹1,250.00</Text></View>
                  </View>
                  <TouchableOpacity onPress={() => showToast("Add Money...")} className="bg-orange-50 py-0.5 rounded-md"><Text className="text-[#FF3B00] text-[8px] font-black">
                    Add Money
                  </Text></TouchableOpacity>
                </View>

                {/* Coupons */}
                <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-sm space-y-1">
                  <View className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto flex-row">
                    <Tag className="w-4 h-4"/>
                  </View>
                  <View>
                    <View className=""><Text className="text-[8px] font-bold text-slate-400">My Coupons</Text></View>
                    <View className=""><Text className="text-[10px] font-black text-emerald-600">3 Available</Text></View>
                  </View>
                  <TouchableOpacity onPress={() => showToast("Viewing Coupons...")} className="bg-emerald-50 py-0.5 rounded-md"><Text className="text-emerald-700 text-[8px] font-black">
                    View Coupons
                  </Text></TouchableOpacity>
                </View>

                {/* Refer */}
                <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-sm space-y-1">
                  <View className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center mx-auto flex-row">
                    <Gift className="w-4 h-4"/>
                  </View>
                  <View>
                    <View className=""><Text className="text-[8px] font-bold text-slate-400">Refer & Earn</Text></View>
                    <View className=""><Text className="text-[10px] font-black text-blue-600">₹250 Earned</Text></View>
                  </View>
                  <TouchableOpacity onPress={() => showToast("Inviting friends...")} className="bg-blue-50 py-0.5 rounded-md"><Text className="text-blue-700 text-[8px] font-black">
                    Invite Now
                  </Text></TouchableOpacity>
                </View>

                {/* Rewards */}
                <View className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-sm space-y-1">
                  <View className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center mx-auto flex-row">
                    <Award className="w-4 h-4"/>
                  </View>
                  <View>
                    <View className=""><Text className="text-[8px] font-bold text-slate-400">MB Rewards</Text></View>
                    <View className=""><Text className="text-[10px] font-black text-amber-600">250 Points</Text></View>
                  </View>
                  <TouchableOpacity onPress={() => showToast("View Rewards...")} className="bg-amber-50 py-0.5 rounded-md"><Text className="text-amber-700 text-[8px] font-black">
                    View Rewards
                  </Text></TouchableOpacity>
                </View>

              </View>

              {/* ACCOUNT List */}
              <View className="space-y-2 pt-1">
                <View className="px-1"><Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Account</Text></View>
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                  <TouchableOpacity onPress={() => showToast("Personal Information...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><User className="w-4 h-4 text-slate-700"/><Text>Personal Information</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onNavigate('39')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><MapPin className="w-4 h-4 text-slate-700"/><Text>Saved Addresses</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onNavigate('39')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><User className="w-4 h-4 text-slate-700"/><Text>Saved Travellers</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("Payment Methods...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><CreditCard className="w-4 h-4 text-slate-700"/><Text>Payment Methods</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("MB Wallet...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><Wallet className="w-4 h-4 text-slate-700"/><Text>MB Wallet</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("My Documents...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><FileText className="w-4 h-4 text-slate-700"/><Text>My Documents</Text></View>
                    <View className="flex items-center gap-1 flex-row">
                      <Text className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.2 rounded">Verified</Text>
                      <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("Emergency Contacts...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><Shield className="w-4 h-4 text-slate-700"/><Text>Emergency Contacts</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PREFERENCES List */}
              <View className="space-y-2 pt-1">
                <View className="px-1"><Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Preferences</Text></View>
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                  <TouchableOpacity onPress={() => showToast("Settings...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><Settings className="w-4 h-4 text-slate-700"/><Text>Settings</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onNavigate('38')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><Bell className="w-4 h-4 text-slate-700"/><Text>Notification Preferences</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("Language Selection...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><Globe className="w-4 h-4 text-slate-700"/><Text>Language</Text></View>
                    <View className="flex items-center gap-1 flex-row">
                      <Text>English</Text>
                      <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </View>
                  </TouchableOpacity>
                  </View>
              </View>

              {/* MORE List */}
              <View className="space-y-2 pt-1">
                <View className="px-1"><Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">More</Text></View>
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                  <TouchableOpacity onPress={() => onNavigate('37')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><Headphones className="w-4 h-4 text-slate-700"/><Text>Help & Support</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("Privacy Policy...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><Shield className="w-4 h-4 text-slate-700"/><Text>Privacy Policy</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("Terms & Conditions...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><FileText className="w-4 h-4 text-slate-700"/><Text>Terms & Conditions</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => showToast("About MBGO v2.1.0...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><HelpCircle className="w-4 h-4 text-slate-700"/><Text>About MBGO</Text></View>
                    <View className="flex items-center gap-1 flex-row">
                      <Text>v 2.1.0</Text>
                      <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </View>
                  </TouchableOpacity>
                  </View>
              </View>

              {/* Logout Button */}
              <TouchableOpacity 
                onPress={() => onNavigate('login')}
                className="w-full bg-white border border-[#FF3B00] hover:bg-orange-50 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 active:scale-98 shadow-sm flex-row"
              >
                <LogOut className="w-4 h-4"/>
                <Text>Logout</Text>
              </TouchableOpacity>

              <View className="pt-1"><Text className="text-[10px] text-center font-extrabold text-slate-400">
                MBGO is powered by </Text><Text className="text-[#FF3B00]">MusafirBaba</Text>
              </View>

            </View>
          )}

        </ScrollView>

        {/* Reusable Rider Bottom App Navigation Bar */}
        <RiderBottomNavbar activeScreen={activeScreen} onNavigate={onNavigate} />

        {/* Global Notification Toast */}
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
// FORCE_REBUILD_CACHE_BUST_1786123613906
console.log('CACHE_BUST_1786124057439');

console.log('CACHE_BUST_BARS_1786124237191');

console.log('CACHE_BUST_PROFILE_36_1786124896537');

console.log('CACHE_BUST_PROFILE_NAVBAR_1786125091850');

console.log('CACHE_BUST_STANDARDIZE_NAVBAR_1786125270467');

console.log('CACHE_BUST_FINAL_BARS_1786125430918');

console.log('CACHE_BUST_LOGOUT_1786125695805');

console.log('CACHE_BUST_IMG_TO_IMAGE_1786127909116');

console.log('CACHE_BUST_HTML_TO_RN_1786128166254');

console.log('CACHE_BUST_AST_FIX_1786128723868');
