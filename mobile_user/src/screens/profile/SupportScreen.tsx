import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, SafeAreaView } from 'react-native';
import RiderBottomNavbar from '../../components/RiderBottomNavbar';
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
  AlertCircle,
  ArrowLeft
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function SupportScreen() {
  const navigation = useNavigation<any>();
  // Navigation active screen selector: '36' | '37' | '38' | '39' | '40'
  const activeScreen = '39';

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
    <View className="flex flex-col items-center justify-center min-h-screen bg-slate-900 selection:bg-orange-500 selection:text-white sm:py-6">
      
      {/* Top Test Navigation Switcher */}
      <View className="w-full max-w-[430px] mb-3 px-3 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar bg-slate-800/90 rounded-2xl border border-slate-700 shadow-lg flex-row">
        <Text className="text-orange-400 font-black shrink-0">Screens:</Text>
        <View className="flex gap-1 shrink-0 flex-row">
          <View 
            onPress={() => navigation.navigate('ProfileMenuScreen')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '36' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            36. Profile (Amit)
          </Text></View>
          <View 
            onPress={() => navigation.navigate('WalletScreen')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '37' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            37. Support
          </Text></View>
          <View 
            onPress={() => navigation.navigate('SettingsScreen')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '38' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            38. Notifications
          </Text></View>
          <View 
            onPress={() => navigation.navigate('SupportScreen')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '39' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            39. Saved
          </Text></View>
          <View 
            onPress={() => navigation.navigate('AboutScreen')}
            className={`px-2 py-1 rounded-xl transition ${activeScreen === '40' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            40. Profile (Ashutosh)
          </Text></View>
        </View>
      </View>

      {/* Main Mobile Frame */}
      <View className="w-full max-w-[430px] bg-[#FAFAFA] min-h-[920px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        

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
                  <TouchableOpacity onPress={() => navigation.navigate('WalletScreen')} className="flex flex-col items-center hover:text-orange-600 transition">
                    <Headphones className="w-5 h-5"/>
                    <Text className="text-[9px] font-bold text-slate-500 -mt-0.5">Support</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('SettingsScreen')} className="flex flex-col items-center hover:text-orange-600 relative transition">
                    <Bell className="w-5 h-5"/>
                    <Text className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-0 right-0 border border-white"></Text>
                    <Text className="text-[9px] font-bold text-slate-500 -mt-0.5">Notifications</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* User Identity Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs">
                <View className="flex items-center justify-between flex-row">
                  <View className="flex items-center gap-3.5 flex-row">
                    <View className="relative">
                      <View className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center flex-row">
                        <Image 
                          source={{ uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" }} 
                          alt="Amit Sharma" 
                          className="w-full h-full object-cover"
                        />
                      </View>
                      <View className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center absolute bottom-0 right-0 border border-white shadow-xs flex-row">
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
              <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs grid grid-cols-2 divide-x divide-slate-100">
                <TouchableOpacity onPress={() => showToast("Opening Wallet...")} className="flex items-center gap-3 pr-2 cursor-pointer hover:opacity-80 transition flex-row">
                  <View className="w-10 h-10 rounded-2xl bg-orange-100/80 flex items-center justify-center shrink-0 flex-row">
                    <Wallet className="w-5 h-5"/>
                  </View>
                  <View className="space-y-0.5 flex-1 min-w-0">
                    <View className=""><Text className="text-[10px] font-extrabold text-slate-500">MB Wallet</Text></View>
                    <View className=""><Text className="text-xs font-black text-[#FF3B00] truncate">₹1,250.00</Text></View>
                  </View>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0"/>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => showToast("Viewing Available Coupons...")} className="flex items-center gap-3 pl-3 cursor-pointer hover:opacity-80 transition flex-row">
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
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {[
                    { icon: User, label: 'Personal Information' },
                    { icon: MapPin, label: 'Saved Addresses', action: () => navigation.navigate('SupportScreen') },
                    { icon: CreditCard, label: 'Payment Methods' },
                    { icon: FileText, label: 'My Documents' },
                    { icon: Gift, label: 'Refer & Earn' },
                    { icon: Settings, label: 'Settings' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <View 
                        key={idx} 
                        onPress={item.action || (() => showToast(`Opening ${item.label}...`))}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer flex-row"
                      >
                        <View className="flex items-center gap-3 flex-row">
                          <Icon className="w-4 h-4 text-slate-700"/>
                          <Text>{item.label}</Text>
                        </View>
                        <ChevronRight className="w-4 h-4 text-slate-400"/>
                      </View>
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
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {[
                    { icon: Car, label: 'Trip Preferences' },
                    { icon: Headphones, label: 'Help & Support', action: () => navigation.navigate('WalletScreen') },
                    { icon: Shield, label: 'Terms & Conditions' },
                    { icon: Shield, label: 'Privacy Policy' },
                    { icon: HelpCircle, label: 'About MBGO' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <View 
                        key={idx} 
                        onPress={item.action || (() => showToast(`Opening ${item.label}...`))}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer flex-row"
                      >
                        <View className="flex items-center gap-3 flex-row">
                          <Icon className="w-4 h-4 text-slate-700"/>
                          <Text>{item.label}</Text>
                        </View>
                        <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </View>
                    );
                  })}
                </View>
              </View>

              {/* Logout Button */}
              <View 
                onPress={() => showToast("Logging out...")}
                className="w-full bg-white border border-[#FF3B00] hover:bg-orange-50 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 active:scale-98 shadow-2xs flex-row"
              >
                <LogOut className="w-4 h-4"/>
                <Text>Logout</Text>
              </View>

            </View>
          )}

          {/* ==========================================
              SCREEN 37: HELP & SUPPORT - (37.png)
             ========================================== */}
          {activeScreen === '37' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header */}
              <View className="flex flex-row items-center justify-between pt-1 pb-1">
                <TouchableOpacity onPress={() => navigation.navigate('ProfileMenuScreen')} className="p-1">
                  <ChevronRight size={20} color="#0F172A" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
                <Text className="text-base font-bold text-slate-900">Help & Support</Text>
                <TouchableOpacity onPress={() => showToast("Opening 24x7 Hotline...")} className="flex flex-col items-center">
                  <Headphones size={18} color="#0F172A" />
                  <Text className="text-[8.5px] text-slate-500 mt-0.5">Support</Text>
                </TouchableOpacity>
              </View>

              {/* Support Agent Banner */}
              <View className="bg-[#FFF8F2] border border-orange-100 rounded-2xl p-3 shadow-2xs">
                <View className="flex flex-row items-center">
                  {/* Agent Graphic */}
                  <View className="w-16 h-16 relative shrink-0 justify-center items-center">
                    <View className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
                      <Image 
                        source={{ uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" }} 
                        className="w-full h-full" 
                      />
                    </View>
                    <View className="absolute top-0 right-0 bg-white px-1.5 py-0.5 rounded-full shadow-2xs border border-orange-100">
                      <Text className="text-[#FF3B00] text-[8px] font-bold">Hello!</Text>
                    </View>
                  </View>

                  <View className="flex-1 pl-2 space-y-1">
                    <Text className="text-sm font-bold text-slate-900 leading-tight">We're here to help you!</Text>
                    <Text className="text-[9px] text-slate-500 leading-snug">Our support team is available 24x7 to assist you.</Text>
                    
                    <View className="flex flex-row gap-2 pt-1">
                      <TouchableOpacity onPress={() => showToast("Dialing Support...")} className="bg-[#FF3B00] px-2.5 py-1.5 rounded-lg flex-1 flex flex-row items-center justify-center gap-1 active:opacity-90">
                        <Phone size={11} color="#FFFFFF" />
                        <Text className="text-white text-[9px] font-semibold">Call Support</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => showToast("Starting Live Chat...")} className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg flex-1 flex flex-row items-center justify-center gap-1 active:opacity-90">
                        <MessageSquare size={11} color="#475569" />
                        <Text className="text-slate-700 text-[9px] font-semibold">Chat with Us</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quick Help Grid */}
              <View className="space-y-2">
                <Text className="text-xs font-bold text-slate-900">Quick Help</Text>
                <View className="bg-white border border-slate-100 rounded-2xl p-3 shadow-2xs flex flex-row flex-wrap justify-between gap-y-3">
                  {[
                    { icon: Package, label: 'My Bookings', desc: 'View your trips', color: 'bg-orange-50 text-[#FF3B00]' },
                    { icon: Wallet, label: 'Payments', desc: 'Payment related issues', color: 'bg-blue-50 text-blue-600' },
                    { icon: Car, label: 'Ride & Driver', desc: 'Issues with driver or trip', color: 'bg-emerald-50 text-emerald-600' },
                    { icon: MapPin, label: 'Locations', desc: 'Pick-up, drop & route issues', color: 'bg-purple-50 text-purple-600' },
                    { icon: Tag, label: 'Coupons & Offers', desc: 'Coupons not working?', color: 'bg-amber-50 text-amber-600' },
                    { icon: FileText, label: 'Invoices & Bills', desc: 'Download or view invoices', color: 'bg-pink-50 text-pink-600' },
                    { icon: RotateCcw, label: 'Refunds', desc: 'Refund status & related issues', color: 'bg-cyan-50 text-cyan-600' },
                    { icon: MoreHorizontal, label: 'Others', desc: 'Other queries and issues', color: 'bg-slate-100 text-slate-600' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <TouchableOpacity key={idx} 
                        onPress={() => showToast(`Opening Help topic: ${item.label}...`)}
                        className="w-[23%] flex flex-col items-center text-center space-y-0.5"
                      >
                        <View className={`w-8 h-8 rounded-full flex items-center justify-center ${item.color} mb-0.5`}>
                          <Icon size={15} />
                        </View>
                        <Text className="text-[9px] font-semibold text-slate-900 text-center leading-tight">{item.label}</Text>
                        <Text className="text-[7px] text-slate-400 text-center leading-tight">{item.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Common Queries Accordion */}
              <View className="space-y-2">
                <Text className="text-xs font-bold text-slate-900">Common Queries</Text>
                <View className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {[
                    { icon: Clock, iconBg: 'bg-orange-50 text-[#FF3B00]', q: 'How can I book a ride?', a: 'Enter your pick-up and drop locations, choose date and time, select vehicle type, and tap Search Cabs to proceed.' },
                    { icon: CreditCard, iconBg: 'bg-[#FFF0EB] text-[#FF5500]', q: 'What payment methods are available?', a: 'We accept UPI, Credit/Debit Cards, Net Banking, Wallets (Paytm, PhonePe), and Pay Later via Simpl.' },
                    { icon: Car, iconBg: 'bg-[#FFF0EB] text-[#FF5500]', q: 'How can I change / cancel my booking?', a: 'Go to My Trips section, select your upcoming booking and tap Edit or Cancel Ride.' },
                    { icon: Shield, iconBg: 'bg-[#FFF0EB] text-[#FF5500]', q: 'Is it safe to travel with MBGO?', a: 'Yes! All drivers undergo criminal & background checks, and all rides feature live GPS safety tracking.' },
                    { icon: Gift, iconBg: 'bg-[#FFF0EB] text-[#FF5500]', q: 'How does MBGO Refer & Earn work?', a: 'Share your referral link with friends. When they complete their first ride, you earn bonus wallet cash.' },
                  ].map((faq, idx) => {
                    const FaqIcon = faq.icon;
                    return (
                      <View key={idx} className="p-2.5">
                        <TouchableOpacity 
                          onPress={() => toggleFaq(idx)}
                          className="w-full flex flex-row items-center justify-between"
                        >
                          <View className="flex flex-row items-center gap-2 flex-1 pr-2">
                            <View className={`w-5 h-5 rounded-full flex items-center justify-center ${faq.iconBg}`}>
                              <FaqIcon size={11} />
                            </View>
                            <Text className="text-[11px] font-medium text-slate-800 flex-1">{faq.q}</Text>
                          </View>
                          <ChevronDown size={13} color="#94A3B8" style={{ transform: [{ rotate: openFaq === idx ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>
                        {openFaq === idx && (
                          <Text className="text-[10px] text-slate-500 leading-relaxed pl-7 pt-1.5 mt-1 border-t border-slate-50">
                            {faq.a}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Need More Help Section */}
              <View className="space-y-2">
                <Text className="text-xs font-bold text-slate-900">Need more help?</Text>
                
                <TouchableOpacity onPress={() => showToast("Opening Ticket Submission Form...")}
                  className="bg-white border border-slate-100 rounded-xl p-2.5 flex flex-row items-center justify-between shadow-2xs"
                >
                  <View className="flex flex-row items-center gap-2">
                    <View className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Mail size={14} color="#2563EB" />
                    </View>
                    <View>
                      <Text className="text-[11px] font-semibold text-slate-900">Submit a Request</Text>
                      <Text className="text-[8.5px] text-slate-400">We will get back to you via email</Text>
                    </View>
                  </View>
                  <ChevronRight size={13} color="#94A3B8" />
                </TouchableOpacity>

                <View className="bg-[#F4F8FF] border border-blue-100 rounded-xl p-2 flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center gap-1.5 flex-1 pr-2">
                    <AlertCircle size={13} color="#2563EB" />
                    <Text className="text-[9px] text-blue-900 flex-1">Your feedback helps us improve our service.</Text>
                  </View>
                  <TouchableOpacity onPress={() => showToast("Opening Feedback Dialog...")} className="bg-white border border-blue-400 px-2 py-0.5 rounded-lg flex flex-row items-center gap-0.5">
                    <Text className="text-[9px] font-medium text-blue-600">Give Feedback</Text>
                    <ChevronRight size={9} color="#2563EB" />
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
                <TouchableOpacity onPress={() => navigation.navigate('ProfileMenuScreen')} className="p-1 hover:bg-slate-100 rounded-full">
                  <ChevronRight className="w-5 h-5 rotate-180"/>
                </TouchableOpacity>
                <Text className="text-base font-black text-slate-900">Notifications</Text>
                <TouchableOpacity onPress={() => showToast("All marked as read!")} className="flex items-center gap-1 flex-row">
                  <CheckCircle2 className="w-3.5 h-3.5"/><Text className="text-[10px] font-black text-[#FF3B00]"> Mark all as read
                </Text></TouchableOpacity>
              </View>

              {/* Category Filter Pills */}
              <View className="flex border-b border-slate-200 overflow-x-auto no-scrollbar flex-row">
                {['All', 'Bookings', 'Payments', 'Offers', 'System'].map((tab) => (
                  <View 
                    key={tab}
                    onPress={() => setNotificationTab(tab)}
                    className={`px-4 py-2 text-center transition shrink-0 ${
                      notificationTab === tab ? 'text-[#FF3B00] border-b-2 border-[#FF3B00] font-black' : 'hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </View>
                ))}
              </View>

              {/* Notification List */}
              <View className="space-y-3">
                
                {/* Item 1 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2 relative">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row">
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></View>
                      <View className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0 flex-row">
                        <CheckCircle2 className="w-5 h-5"/>
                      </View>
                      <View>
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
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2 relative">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row">
                      <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0"></View>
                      <View className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 flex-row">
                        <CreditCard className="w-5 h-5"/>
                      </View>
                      <View>
                        <Text className="text-xs font-black text-slate-900">Payment Successful</Text>
                        <Text className="text-[10px] text-slate-600 font-bold mt-0.5">Your payment of ₹6,250 for booking MBGO2505200001 was successful.</Text>
                      </View>
                    </View>
                    <Text className="text-[9px] font-bold text-slate-400 shrink-0">10 mins ago</Text>
                  </View>
                </View>

                {/* Item 3 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row">
                      <View className="w-9 h-9 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 flex-row">
                        <Car className="w-5 h-5"/>
                      </View>
                      <View>
                        <Text className="text-xs font-black text-slate-900">Driver Assigned</Text>
                        <Text className="text-[10px] text-slate-600 font-bold mt-0.5">Ramesh Kumar is assigned to your trip on 20 May 2025 at 08:00 AM.</Text>
                      </View>
                    </View>
                    <Text className="text-[9px] font-bold text-slate-400 shrink-0">1 day ago</Text>
                  </View>
                </View>

                {/* Item 4 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row">
                      <View className="w-9 h-9 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0 flex-row">
                        <Clock className="w-5 h-5"/>
                      </View>
                      <View>
                        <Text className="text-xs font-black text-slate-900">Trip Reminder</Text>
                        <Text className="text-[10px] text-slate-600 font-bold mt-0.5">Your trip from New Delhi to Jaipur is tomorrow at 08:00 AM. We wish you a safe journey!</Text>
                      </View>
                    </View>
                    <Text className="text-[9px] font-bold text-slate-400 shrink-0">1 day ago</Text>
                  </View>
                </View>

                {/* Item 5 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                  <View className="flex items-start justify-between gap-2 flex-row">
                    <View className="flex items-start gap-2.5 flex-row">
                      <View className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 flex-row">
                        <Tag className="w-5 h-5"/>
                      </View>
                      <View>
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
                <TouchableOpacity onPress={() => showToast("Push Notifications Enabled!")} className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-xs shrink-0"><Text className="text-[10px] font-black text-white">
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
                <TouchableOpacity onPress={() => navigation.navigate('SettingsScreen')} className="p-1 hover:bg-slate-100 rounded-full relative">
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

                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2.5">
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
                        <View className="">{route.stateFrom}<Text className="text-[9px] text-slate-400 font-bold"> • </Text>{route.stateTo}</View>
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

                <View className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-row">
                  {[
                    { name: 'Priya Sharma', tag: 'You', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' },
                    { name: 'Madhulika Das', tag: 'Wife', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' },
                    { name: 'Bindeshwar Lal', tag: 'Father', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150' },
                  ].map((p, idx) => (
                    <View key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex items-center gap-2 min-w-[125px] shadow-2xs flex-row">
                      <Image src={p.img} alt={p.name} className="w-8 h-8 rounded-full object-cover shrink-0"/>
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
                </View>
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

                <View className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-row">
                  {[
                    { label: 'Home', default: true, address: 'Najafgarh, New Delhi - 110043' },
                    { label: 'Office', default: true, address: 'Najafgarh Road, New Delhi - 110043' },
                    { label: 'IGI Airport', default: false, address: 'Indira Gandhi Intl. Airport - 110037' },
                  ].map((addr, idx) => (
                    <View key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-3 min-w-[155px] shadow-2xs space-y-1">
                      <View className="flex justify-between items-center flex-row">
                        <Text className="text-xs font-black text-slate-900">{addr.label}</Text>
                        {addr.default && <Text className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.2 rounded">Default</Text>}
                      </View>
                      <View className=""><Text numberOfLines={2} className="text-slate-600">{addr.address}</Text></View>
                    </View>
                  ))}
                </View>
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

                <View className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Sedan' },
                    { label: 'SUV' },
                    { label: 'Innova' },
                    { label: 'Tempo Traveller' },
                  ].map((v, idx) => (
                    <View key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col items-center justify-center space-y-1 shadow-2xs">
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

                <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
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
              SCREEN 40: ENHANCED PROFILE (PRIYA) - (40.png)
             ========================================== */}
          {activeScreen === '40' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <View className="flex flex-row items-center justify-between pt-1 pb-2">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1 hover:bg-slate-100 rounded-full">
                  <ArrowLeft className="w-5 h-5 text-slate-800" />
                </TouchableOpacity>
                <Text className="text-lg font-black text-slate-900">Profile</Text>
                <View className="flex items-center gap-3 flex-row">
                  <TouchableOpacity onPress={() => navigation.navigate('WalletScreen')} className="flex flex-col items-center hover:text-orange-600 transition">
                    <Headphones className="w-5 h-5"/>
                    <Text className="text-[9px] font-bold text-slate-500 -mt-0.5">Support</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('SettingsScreen')} className="flex flex-col items-center hover:text-orange-600 relative transition">
                    <Bell className="w-5 h-5"/>
                    <Text className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-0 right-0 border border-white"></Text>
                    <Text className="text-[9px] font-bold text-slate-500 -mt-0.5">Notifications</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* User Identity Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs">
                <View className="flex items-center justify-between flex-row">
                  <View className="flex items-center gap-3.5 flex-row">
                    <View className="relative">
                      <View className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center flex-row">
                        <Image 
                          source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200" }} 
                          alt="Priya Sharma" 
                          className="w-full h-full object-cover"
                        />
                      </View>
                      <View className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center absolute bottom-0 right-0 border border-white shadow-xs flex-row">
                        <Camera className="w-3 h-3"/>
                      </View>
                    </View>

                    <View className="space-y-0.5">
                      <Text className="text-base font-black text-slate-900">Priya Sharma</Text>
                      <View className=""><Text className="text-xs font-bold text-slate-600">+91 98765 43210</Text></View>
                      <View className=""><Text className="text-[11px] font-medium text-slate-500">priya.sharma@example.com</Text></View>
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
              <View className="grid grid-cols-4 gap-2">
                
                {/* Wallet */}
                <View className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-2xs space-y-1">
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
                <View className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-2xs space-y-1">
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
                <View className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-2xs space-y-1">
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
                <View className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between shadow-2xs space-y-1">
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
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  <TouchableOpacity onPress={() => showToast("Personal Information...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><User className="w-4 h-4 text-slate-700"/><Text>Personal Information</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('SupportScreen')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><MapPin className="w-4 h-4 text-slate-700"/><Text>Saved Addresses</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('SupportScreen')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
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
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  <TouchableOpacity onPress={() => showToast("Settings...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
                    <View className="flex items-center gap-3 flex-row"><Settings className="w-4 h-4 text-slate-700"/><Text>Settings</Text></View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('SettingsScreen')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
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
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  <TouchableOpacity onPress={() => navigation.navigate('WalletScreen')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer flex-row">
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
              <View 
                onPress={() => showToast("Logging out...")}
                className="w-full bg-white border border-[#FF3B00] hover:bg-orange-50 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 active:scale-98 shadow-2xs flex-row"
              >
                <LogOut className="w-4 h-4"/>
                <Text>Logout</Text>
              </View>

              <View className="pt-1"><Text className="text-[10px] text-center font-extrabold text-slate-400">
                MBGO is powered by </Text><Text className="text-[#FF3B00]">MusafirBaba</Text>
              </View>

            </View>
          )}

        </ScrollView>

        {/* Reusable Rider Bottom App Navigation Bar */}
        <RiderBottomNavbar activeScreen={activeScreen} navigation={navigation} />

        {/* Global Notification Toast */}
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
console.log('CACHE_BUST_FINAL_BARS_1786125430912');

console.log('CACHE_BUST_AST_FIX_1786128723604');
