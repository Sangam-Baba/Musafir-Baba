import { Text, View, TouchableOpacity, Image, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import { useAuthStore } from '../../../store/useAuthStore';
import { getRiderProfile, updateRiderProfile, uploadRiderProfilePicture } from '../../../api/riderProfile.api';
import React, { useEffect, useState } from 'react';
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

export default function ScreenRiderProfileAmit({ onNavigate }: { onNavigate: (screen: string) => void }) {
  // Navigation active screen selector: '36' | '37' | '38' | '39' | '40'
  const activeScreen: string = '36';

  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  // Edit Profile bottom drawer (Screen 36)
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editMobileNumber, setEditMobileNumber] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // The login response only carries fullName/mobileNumber/profilePicture --
  // isVerified (and other admin/server-driven fields) is never in the store
  // until we actually fetch the full profile, so do that on mount to pick
  // up e.g. an admin-side verification that happened after the rider logged in.
  useEffect(() => {
    getRiderProfile()
      .then((res) => setProfile({ ...(profile || {}), ...res.data.data }))
      .catch(() => {
        // Non-fatal -- screen still works with whatever is already in the store.
      });
  }, []);

  const openEditDrawer = () => {
    setEditFullName(profile?.fullName || '');
    setEditMobileNumber(profile?.mobileNumber || '');
    setShowEditDrawer(true);
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      showToast('Full name cannot be empty');
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await updateRiderProfile({ fullName: editFullName.trim(), mobileNumber: editMobileNumber.trim() });
      setProfile({ ...(profile || {}), ...res.data.data });
      showToast('Profile updated successfully');
      setShowEditDrawer(false);
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setIsUploadingAvatar(true);
    try {
      const res = await uploadRiderProfilePicture(result.assets[0].uri);
      setProfile({ ...(profile || {}), profilePicture: res.data.data.profilePicture });
      showToast('Profile picture updated');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      
      {/* Main Mobile Frame */}
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', position: 'relative' }}>
        
        

        {/* Scrollable Main Body Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>

          {/* ==========================================
              SCREEN 36: PROFILE (AMIT SHARMA) - (36.png)
             ========================================== */}
          {activeScreen === '36' && (
            <View style={{ padding: 12, gap: 10 }}>
              
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                <View style={{ width: 40 }} />
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#1E293B' }}>Profile</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => onNavigate('37')} style={{ alignItems: 'center' }}>
                    <Headphones size={18} color="#475569" />
                    <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B', marginTop: 1 }}>Support</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onNavigate('38')} style={{ alignItems: 'center', position: 'relative' }}>
                    <Bell size={18} color="#475569" />
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF5500', position: 'absolute', top: 0, right: 2, borderWidth: 1, borderColor: '#FFFFFF' }} />
                    <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B', marginTop: 1 }}>Notifications</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* User Identity Card */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={handlePickAvatar} disabled={isUploadingAvatar} style={{ position: 'relative' }}>
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#E2E8F0', borderWidth: 2, borderColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                        {profile?.profilePicture ? (
                          <Image source={{ uri: profile.profilePicture }}
                            accessibilityLabel={profile?.fullName || 'Rider'}
                            style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <User size={26} color="#94A3B8" />
                        )}
                        {isUploadingAvatar && (
                          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#475569', alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 0, right: 0, borderWidth: 1, borderColor: '#FFFFFF' }}>
                        <Camera size={10} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    <View style={{ gap: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>{profile?.fullName || 'Rider'}</Text>
                      {!!profile?.mobileNumber && (
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>+91 {profile.mobileNumber}</Text>
                      )}
                      {!!profile?.email && (
                        <Text style={{ fontSize: 10, fontWeight: '500', color: '#64748B' }}>{profile.email}</Text>
                      )}
                      {profile?.isVerified && (
                        <View style={{ paddingTop: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' }}>
                            <CheckCircle2 size={11} color="#059669" />
                            <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#047857' }}>Verified</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity onPress={openEditDrawer} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingTop: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF5500' }}>Edit Profile </Text>
                    <ChevronRight size={13} color="#FF5500" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Wallet & Coupons Card Row */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => showToast("Opening Wallet...")} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFF5EF', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={18} color="#FF5500" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B' }}>MB Wallet</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF5500' }}>₹{(profile?.walletBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </View>
                  <ChevronRight size={14} color="#94A3B8" />
                </TouchableOpacity>

                <View style={{ width: 1, height: 28, backgroundColor: '#F1F5F9' }} />

                <TouchableOpacity onPress={() => showToast("Viewing Available Coupons...")} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                    <Tag size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B' }}>My Coupons</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>3 Available</Text>
                  </View>
                  <ChevronRight size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* ACCOUNT Section */}
              <View style={{ gap: 4, paddingTop: 2 }}>
                {/* ACCOUNT heading commented out for now
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.5, paddingLeft: 2 }}>ACCOUNT</Text>
                */}
                {/* ACCOUNT suboptions commented out
                <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, overflow: 'hidden' }}>
                  {[
                    { icon: User, label: 'Personal Information' },
                    { icon: MapPin, label: 'Saved Addresses', action: () => onNavigate('39') },
                    { icon: CreditCard, label: 'Payment Methods' },
                    { icon: FileText, label: 'My Documents' },
                    { icon: Gift, label: 'Refer & Earn' },
                    { icon: Settings, label: 'Settings' },
                  ].map((item, idx, arr) => {
                    const Icon = item.icon;
                    return (
                      <TouchableOpacity key={idx} 
                        onPress={item.action || (() => showToast(`Opening ${item.label}...`))}
                        style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: idx === arr.length - 1 ? 0 : 1, borderBottomColor: '#F8FAFC' }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Icon size={16} color="#475569" />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>{item.label}</Text>
                        </View>
                        <ChevronRight size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                */}
              </View>

              {/* OTHERS Section */}
              <View style={{ gap: 4, paddingTop: 2 }}>
                {/* OTHERS heading commented out for now
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.5, paddingLeft: 2 }}>OTHERS</Text>
                */}
                <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, overflow: 'hidden' }}>
                  {[
                    { icon: FileText, label: 'Documents', action: () => onNavigate('41') },
                    { icon: Car, label: 'Trip Preferences' },
                    { icon: Headphones, label: 'Help & Support', action: () => onNavigate('37') },
                    { icon: Shield, label: 'Terms & Conditions' },
                    { icon: Shield, label: 'Privacy Policy' },
                    { icon: HelpCircle, label: 'About MBGO' },
                  ].map((item, idx, arr) => {
                    const Icon = item.icon;
                    return (
                      <TouchableOpacity key={idx} 
                        onPress={item.action || (() => showToast(`Opening ${item.label}...`))}
                        style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: idx === arr.length - 1 ? 0 : 1, borderBottomColor: '#F8FAFC' }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Icon size={16} color="#475569" />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>{item.label}</Text>
                        </View>
                        <ChevronRight size={14} color="#94A3B8" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Logout Button */}
              <TouchableOpacity 
                onPress={() => onNavigate('login')}
                style={{ width: '100%', height: 40, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FF5500', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
              >
                <LogOut size={16} color="#FF5500" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF5500' }}>Logout</Text>
              </TouchableOpacity>

              {/* Edit Profile Bottom Drawer */}
              <Modal visible={showEditDrawer} transparent animationType="fade" onRequestClose={() => setShowEditDrawer(false)}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
                  onPress={() => setShowEditDrawer(false)}
                  activeOpacity={1}
                >
                  <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#0F172A' }}>Edit Profile</Text>

                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Full Name</Text>
                      <TextInput
                        value={editFullName}
                        onChangeText={setEditFullName}
                        placeholder="Your full name"
                        placeholderTextColor="#94A3B8"
                        style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, color: '#0F172A', backgroundColor: '#F8FAFC' }}
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Mobile Number</Text>
                      <TextInput
                        value={editMobileNumber}
                        onChangeText={setEditMobileNumber}
                        placeholder="Your mobile number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, color: '#0F172A', backgroundColor: '#F8FAFC' }}
                      />
                    </View>

                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Email</Text>
                      <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 42, justifyContent: 'center', backgroundColor: '#F1F5F9' }}>
                        <Text style={{ fontSize: 13, color: '#94A3B8' }}>{profile?.email || '-'}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={handleSaveProfile}
                      disabled={isSavingProfile}
                      style={{ width: '100%', height: 42, backgroundColor: '#FF5500', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
                    >
                      {isSavingProfile ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Save Changes</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowEditDrawer(false)} style={{ alignItems: 'center', paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Cancel</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>

            </View>
          )}

          {/* ==========================================
              SCREEN 37: HELP & SUPPORT - (37.png)
             ========================================== */}
          {activeScreen === '37' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <TouchableOpacity onPress={() => onNavigate('36')} className="p-1 hover:bg-slate-100 rounded-full">
                  <ChevronRight className="w-5 h-5 rotate-180"/>
                </TouchableOpacity>
                <Text className="text-base font-black text-slate-900">Help & Support</Text>
                <TouchableOpacity onPress={() => showToast("Opening 24x7 Hotline...")} className="p-1 hover:bg-slate-100 rounded-full">
                  <Headphones className="w-5 h-5"/>
                </TouchableOpacity>
              </View>

              {/* Support Agent Banner */}
              <View className="bg-orange-50 border border-orange-200/80 rounded-3xl p-4 relative overflow-hidden shadow-sm">
                <View className="flex items-start justify-between flex-row">
                  {/* Agent Illustration Graphic */}
                  <View className="w-24 h-24 relative shrink-0">
                    <View className="w-20 h-20 rounded-full bg-orange-200/60 flex items-center justify-center absolute top-1 left-1 flex-row">
                      <Headphones className="w-10 h-10 text-[#FF3B00]"/>
                    </View>
                    <View className="absolute top-0 right-1 bg-white px-2 py-0.5 rounded-full shadow-sm border border-orange-200"><Text className="text-[#FF3B00] text-[9px] font-black">
                      Hello!
                    </Text></View>
                  </View>

                  <View className="space-y-2 flex-1 pl-2">
                    <Text className="text-sm font-black text-slate-900 leading-tight">We're here to help you!</Text>
                    <Text className="text-[10px] text-slate-600 font-bold leading-snug">Our support team is available 24x7 to assist you.</Text>
                    
                    <View className="flex flex-col sm:flex-row gap-2 pt-1">
                      <TouchableOpacity onPress={() => showToast("Dialing Support +91 1800 123 4567...")} className="bg-[#FF3B00] hover:bg-orange-600 px-3 py-2 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 flex-row">
                        <Phone className="w-3.5 h-3.5"/><Text className="text-white text-[10px] font-black"> Call Support
                      </Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => showToast("Starting Live Chat...")} className="bg-white border border-slate-300 hover:bg-slate-50 px-3 py-2 rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 flex-row">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-600"/><Text className="text-slate-800 text-[10px] font-black"> Chat with Us
                      </Text></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quick Help Grid */}
              <View className="space-y-2 pt-1">
                <Text className="text-xs font-black text-slate-900">Quick Help</Text>
                <View className="flex-row flex-wrap gap-2">
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
                      <TouchableOpacity key={idx} 
                        onPress={() => showToast(`Opening Help topic: ${item.label}...`)}
                        className="w-[23%] bg-white border border-slate-100 rounded-2xl p-2 flex flex-col items-center space-y-1 shadow-sm hover:border-orange-200 transition cursor-pointer"
                      >
                        <View className={`w-8 h-8 rounded-full flex items-center justify-center ${item.color}`}>
                          <Icon className="w-4 h-4"/>
                        </View>
                        <Text className="text-[9px] font-black text-slate-900 leading-tight">{item.label}</Text>
                        <Text className="text-[7px] text-slate-400 font-bold leading-tight">{item.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Common Queries Accordion */}
              <View className="space-y-2 pt-1">
                <Text className="text-xs font-black text-slate-900">Common Queries</Text>
                <View className="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-sm overflow-hidden">
                  {[
                    { q: 'How can I book a ride?', a: 'Enter your pick-up and drop locations, choose date and time, select vehicle type, and tap Search Cabs to proceed.' },
                    { q: 'What payment methods are available?', a: 'We accept UPI, Credit/Debit Cards, Net Banking, Wallets (Paytm, PhonePe), and Pay Later via Simpl.' },
                    { q: 'How can I change / cancel my booking?', a: 'Go to My Trips section, select your upcoming booking and tap Edit or Cancel Ride.' },
                    { q: 'Is it safe to travel with MBGO?', a: 'Yes! All drivers undergo criminal & background checks, and all rides feature live GPS safety tracking.' },
                    { q: 'How does MBGO Refer & Earn work?', a: 'Share your referral link with friends. When they complete their first ride, you earn bonus wallet cash.' },
                  ].map((faq, idx) => (
                    <View key={idx} className="p-3.5 space-y-2">
                      <TouchableOpacity 
                        onPress={() => toggleFaq(idx)}
                        className="w-full flex items-center justify-between hover:text-[#FF3B00] transition flex-row"
                      >
                        <Text className="flex items-center gap-2">
                          <View className="w-1.5 h-1.5 rounded-full bg-[#FF3B00]"></View>
                          {faq.q}
                        </Text>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-[#FF3B00]' : ''}`}/>
                      </TouchableOpacity>
                      {openFaq === idx && (
                        <Text className="text-[11px] text-slate-600 font-bold leading-relaxed pl-3.5 border-l-2 border-orange-200">
                          {faq.a}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Need More Help Footer */}
              <View className="space-y-2 pt-1">
                <Text className="text-xs font-black text-slate-900">Need more help?</Text>
                
                <TouchableOpacity onPress={() => showToast("Opening Ticket Submission Form...")}
                  className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-orange-300 transition shadow-sm flex-row"
                >
                  <View className="flex items-center gap-2.5 flex-row">
                    <View className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-row">
                      <Mail className="w-4 h-4"/>
                    </View>
                    <View>
                      <View className=""><Text className="text-xs font-black text-slate-900">Submit a Request</Text></View>
                      <View className=""><Text className="text-[9px] text-slate-400 font-bold">We will get back to you via email</Text></View>
                  </View>
                  </View>
                  <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>

                <View className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between flex-row">
                  <Text className="text-[10px] font-extrabold text-blue-900">Your feedback helps us improve our service.</Text>
                  <TouchableOpacity onPress={() => showToast("Opening Feedback Dialog...")} className="bg-white border border-blue-200 px-3 py-1 rounded-xl shadow-sm shrink-0 flex items-center gap-1 flex-row"><Text className="text-[10px] font-black text-blue-600">
                    Give Feedback </Text><ChevronRight className="w-3 h-3"/>
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
// FORCE_REBUILD_CACHE_BUST_1786123613908
console.log('CACHE_BUST_1786124057441');

console.log('CACHE_BUST_BARS_1786124237193');

console.log('CACHE_BUST_PROFILE_36_1786124896539');

console.log('CACHE_BUST_PROFILE_NAVBAR_1786125091861');

console.log('CACHE_BUST_STANDARDIZE_NAVBAR_1786125270484');

console.log('CACHE_BUST_FINAL_BARS_1786125430922');

console.log('CACHE_BUST_LOGOUT_1786125695817');

console.log('CACHE_BUST_IMG_TO_IMAGE_1786127909120');

console.log('CACHE_BUST_HTML_TO_RN_1786128166257');

console.log('CACHE_BUST_AST_FIX_1786128723930');
