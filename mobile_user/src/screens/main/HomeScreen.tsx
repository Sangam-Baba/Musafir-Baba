import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, SafeAreaView, Linking } from 'react-native';
import React, { useState } from 'react';

const LOGO_TRANSPARENT = require('../../assets/mbgoLogo_transparent.png');
import {
  Menu,
  Bell,
  MapPin,
  Calendar,
  Clock,
  Car,
  ChevronRight,
  Plane,
  Navigation,
  RotateCcw,
  Building2,
  Palmtree,
  Globe,
  FileCheck,
  ShieldCheck,
  Headphones,
  Lock,
  ArrowLeft,
  Edit2,
  Users,
  Briefcase,
  Snowflake,
  CheckCircle2,
  XCircle,
  Shield,
  HelpCircle,
  CreditCard,
  Zap,
  Building,
  Wallet,
  Clock3,
  Copy,
  Share2,
  MoreHorizontal,
  Download,
  Receipt,
  RotateCw,
  Gift,
  Filter,
  Check,
  Search,
  SlidersHorizontal,
  User,
  ArrowUpDown,
  LocateFixed,
  Phone,
  MessageSquare,
  Compass,
  Award
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  // Navigation active screen: '31' | '32' | '33' | '34' | '35'
  const activeScreen: string = '31';

  // Form State for Screen 31
  const [tripType, setTripType] = useState<'oneway' | 'roundway'>('oneway');
  const [pickup, setPickup] = useState('New Delhi, Delhi');
  const [drop, setDrop] = useState('Jaipur, Rajasthan');
  const [date, setDate] = useState('2025-05-20');
  const [time, setTime] = useState('08:00 AM');
  const [vehicleType, setVehicleType] = useState('Sedan (Dzire, Etios or similar)');

  // Screen 32 Add-ons
  const [addInsurance, setAddInsurance] = useState(true);

  // Screen 33 Payment method
  const [paymentMethod, setPaymentMethod] = useState('upi_cards');

  // Screen 35 Trips tab
  const [tripsTab, setTripsTab] = useState('completed'); // 'upcoming' | 'completed' | 'cancelled'

  // Toast notification state
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const swapLocations = () => {
    const temp = pickup;
    setPickup(drop);
    setDrop(temp);
    showToast('Locations swapped');
  };

  return (
    <View className="flex flex-col items-center justify-center min-h-screen bg-slate-900 selection:bg-orange-500 selection:text-white sm:py-6">
      
      {/* Top Test Navigation Switcher Bar */}
      <View className="w-full max-w-[430px] mb-3 px-3 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar bg-slate-800/90 rounded-2xl border border-slate-700 shadow-lg flex-row">
        <Text className="text-orange-400 font-black shrink-0">MBGO Screens:</Text>
        <View className="flex gap-1 shrink-0 flex-row">
          <TouchableOpacity 
            onPress={() => navigation.navigate('HomeScreen')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '31' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            31. Home
          </Text></TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('SearchDestinationScreen')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '32' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            32. Fare
          </Text></TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('VehicleSelectionScreen')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '33' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            33. Payment
          </Text></TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('RideStatusScreen')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '34' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            34. Tracking
          </Text></TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('MyTripsScreen')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '35' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          ><Text>
            35. My Trips
          </Text></TouchableOpacity>
        </View>
      </View>

      {/* Main Mobile App Viewport Container */}
      <View className="w-full max-w-[430px] bg-[#F8FAFC] min-h-[920px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        

        {/* Scrollable Main Screen Content */}
        <View className="flex-1 overflow-y-auto no-scrollbar pb-24">

          {/* ==========================================
              SCREEN 31: RIDER HOME & SEARCH (31.png)
             ========================================== */}
          {activeScreen === '31' && (
            <View style={{ padding: 12, gap: 10 }}>
              
              {/* Header Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2, paddingBottom: 2 }}>
                <TouchableOpacity onPress={() => navigation.navigate('ProfileMenuScreen')} style={{ padding: 2 }}>
                  <Menu size={20} color="#0F172A" />
                </TouchableOpacity>

                {/* Brand Logo */}
                <View style={{ alignItems: 'center' }}>
                  <Image source={LOGO_TRANSPARENT} style={{ width: 100, height: 28 }} resizeMode="contain" />
                  <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#64748B', marginTop: -3 }}>
                    powered by musafirbaba
                  </Text>
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('AboutScreen')} style={{ padding: 2, position: 'relative' }}>
                  <Bell size={20} color="#0F172A" />
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B00', position: 'absolute', top: 3, right: 3, borderWidth: 1, borderColor: '#FFFFFF' }} />
                </TouchableOpacity>
              </View>

              {/* Greeting & Hero Header */}
              <View style={{ paddingTop: 2, paddingBottom: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF3B00', marginBottom: 1 }}>Hello,</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A', lineHeight: 22 }}>
                  Where would you{'\n'}like to go today?
                </Text>
              </View>

              {/* Main Booking Search Card */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, gap: 10, position: 'relative', zIndex: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
                
                {/* Trip Type Selector Tab */}
                <View style={{ flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 3, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' }}>
                  <TouchableOpacity
                    onPress={() => setTripType('oneway')}
                    style={{ flex: 1, paddingVertical: 5, borderRadius: 8, backgroundColor: tripType === 'oneway' ? '#FFFFFF' : 'transparent', alignItems: 'center', justifyContent: 'center', shadowColor: tripType === 'oneway' ? '#000' : 'transparent', shadowOpacity: 0.04, shadowRadius: 2, elevation: tripType === 'oneway' ? 1 : 0 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: tripType === 'oneway' ? '#FF3B00' : '#64748B' }}>One Way</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTripType('roundway')}
                    style={{ flex: 1, paddingVertical: 5, borderRadius: 8, backgroundColor: tripType === 'roundway' ? '#FFFFFF' : 'transparent', alignItems: 'center', justifyContent: 'center', shadowColor: tripType === 'roundway' ? '#000' : 'transparent', shadowOpacity: 0.04, shadowRadius: 2, elevation: tripType === 'roundway' ? 1 : 0 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: tripType === 'roundway' ? '#FF3B00' : '#64748B' }}>Round Trip</Text>
                  </TouchableOpacity>
                </View>

                {/* Pick-up Location */}
                <View>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Pick-up Location</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#10B981', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981' }} />
                      </View>
                      <TextInput
                        value={pickup}
                        onChangeText={setPickup}
                        placeholder="Enter pick-up location"
                        placeholderTextColor="#94A3B8"
                        style={{ flex: 1, backgroundColor: 'transparent', fontSize: 12, fontWeight: '700', color: '#0F172A', padding: 0 }}
                      />
                    </View>
                    <TouchableOpacity onPress={() => showToast("Detecting location...")} style={{ padding: 2 }}>
                      <LocateFixed size={16} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Drop Location */}
                <View>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Drop Location</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <MapPin size={16} color="#FF3B00" />
                      <TextInput
                        value={drop}
                        onChangeText={setDrop}
                        placeholder="Enter drop location"
                        placeholderTextColor="#94A3B8"
                        style={{ flex: 1, backgroundColor: 'transparent', fontSize: 12, fontWeight: '700', color: '#0F172A', padding: 0 }}
                      />
                    </View>
                    <TouchableOpacity onPress={swapLocations} style={{ padding: 2 }}>
                      <ArrowUpDown size={16} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Date & Time Selector Row */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                  <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#F8FAFC', paddingRight: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Date</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Calendar size={15} color="#3B82F6" />
                      <TextInput
                        value={date}
                        onChangeText={setDate}
                        style={{ flex: 1, backgroundColor: 'transparent', fontSize: 11, fontWeight: 'bold', color: date ? '#0F172A' : '#CBD5E1', padding: 0 }}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Time</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Clock size={15} color="#3B82F6" />
                      <TextInput
                        value={time}
                        onChangeText={setTime}
                        style={{ flex: 1, backgroundColor: 'transparent', fontSize: 11, fontWeight: 'bold', color: time ? '#0F172A' : '#CBD5E1', padding: 0 }}
                      />
                    </View>
                  </View>
                </View>

                {/* Vehicle Type Picker */}
                <TouchableOpacity style={{ borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Vehicle Type</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Car size={15} color="#6366F1" />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: vehicleType ? '#0F172A' : '#CBD5E1' }}>{vehicleType || 'Select vehicle type'}</Text>
                    </View>
                    <ChevronRight size={14} color="#94A3B8" />
                  </View>
                </TouchableOpacity>

                {/* Search Cabs Action Button */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('SearchDestinationScreen')}
                  style={{ width: '100%', height: 38, backgroundColor: '#FF3B00', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13, textAlign: 'center' }}>
                    Search Cabs
                  </Text>
                </TouchableOpacity>

              </View>

              {/* Popular Services Section */}
              <View style={{ gap: 6, paddingTop: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>Popular Services</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('https://musafirbaba.com/')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF3B00' }}>View All </Text>
                    <ChevronRight size={12} color="#FF3B00" />
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
                  {[
                    { icon: Palmtree, label: 'Tour\nPackages', bg: '#FEF3C7', iconColor: '#F59E0B', action: () => Linking.openURL('https://musafirbaba.com/holidays') },
                    { icon: Globe, label: 'International\nTrips', bg: '#F0FDF4', iconColor: '#16A34A', action: () => Linking.openURL('https://musafirbaba.com/holidays/international-tour-packages') },
                    { icon: FileCheck, label: 'Visa\nServices', bg: '#FEF2F2', iconColor: '#EF4444', action: () => Linking.openURL('https://musafirbaba.com/visa') },
                    { icon: Building2, label: 'Corporate\nTravel', bg: '#F3E8FF', iconColor: '#8B5CF6', action: () => Linking.openURL('https://musafirbaba.com/holidays/mountain-treks') },
                  ].map((srv, idx) => {
                    const Icon = srv.icon;
                    return (
                      <TouchableOpacity 
                        key={idx}
                        onPress={srv.action}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#F1F5F9',
                          borderRadius: 14,
                          padding: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 74,
                          height: 84,
                        }}
                      >
                        <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: srv.bg, marginBottom: 4 }}>
                          <Icon size={17} color={srv.iconColor} />
                        </View>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#1E293B', textAlign: 'center', lineHeight: 11 }}>{srv.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Banner Card */}
              <View style={{ backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ gap: 2, flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#0F172A', lineHeight: 14 }}>
                    Travel with comfort{'\n'}at the best prices
                  </Text>
                  <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '600' }}>Safe | Reliable | On-time</Text>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('SearchDestinationScreen')}
                    style={{ backgroundColor: '#FF3B00', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>Book Now</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ width: 56, height: 48, borderRadius: 10, backgroundColor: '#FFE8D9', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={26} color="#FF3B00" />
                </View>
              </View>

              {/* Why Travel With MBGO? Section */}
              <View style={{ gap: 6, paddingTop: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>Why travel with MBGO?</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { icon: ShieldCheck, label: 'Verified\nPartners', bg: '#ECFDF5', iconColor: '#10B981' },
                    { icon: Award, label: 'Best Price\nGuarantee', bg: '#FFF5EF', iconColor: '#FF3B00' },
                    { icon: Headphones, label: '24x7\nSupport', bg: '#EFF6FF', iconColor: '#3B82F6' },
                    { icon: Lock, label: 'Safe & Secure\nRide', bg: '#F3E8FF', iconColor: '#8B5CF6' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <View key={idx} style={{ flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, padding: 8, alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: item.bg }}>
                          <Icon size={14} color={item.iconColor} />
                        </View>
                        <Text style={{ fontSize: 8.5, fontWeight: '800', color: '#1E293B', textAlign: 'center', lineHeight: 10 }}>{item.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

            </View>
          )}

          {/* ==========================================
              SCREEN 32: FARE SUMMARY (32.png)
             ========================================== */}
          {activeScreen === '32' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <TouchableOpacity onPress={() => navigation.navigate('HomeScreen')} className="p-1 hover:bg-slate-100 rounded-full">
                  <ArrowLeft className="w-5 h-5"/>
                </TouchableOpacity>
                <Text className="text-base font-black text-slate-900">Fare Summary</Text>
                <View className="w-5"></View>
              </View>

              {/* Route & Trip Details Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                <View className="flex justify-between items-start border-b border-slate-100 pb-3 flex-row">
                  <View className="space-y-2 flex-1">
                    <View className="flex items-start gap-2 flex-row">
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></View>
                      <View>
                        <View className="">{pickup}</View>
                        <View className=""><Text className="text-[10px] text-slate-400 font-bold">Pick-up</Text></View>
                      </View>
                    </View>

                    <View className="flex items-start gap-2 flex-row">
                      <View className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] mt-1 shrink-0"></View>
                      <View>
                        <View className="">{drop}</View>
                        <View className=""><Text className="text-[10px] text-slate-400 font-bold">Drop</Text></View>
                      </View>
                    </View>
                  </View>

                  <View className="space-y-1">
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('HomeScreen')}
                      className="flex items-center gap-1 justify-end ml-auto flex-row"
                    >
                      <Edit2 className="w-3 h-3"/><Text className="text-[10px] font-bold text-[#FF3B00]"> Edit Trip
                    </Text></TouchableOpacity>
                    <View className="flex items-center justify-end gap-1 pt-1 flex-row">
                      <Calendar className="w-3 h-3 text-slate-400"/> {date}
                    </View>
                    <View className="flex items-center justify-end gap-1 flex-row">
                      <Clock className="w-3 h-3 text-slate-400"/> {time}
                    </View>
                    <View className=""><Text className="text-[10px] font-bold text-slate-500 uppercase">One Way</Text></View>
                  </View>
                </View>

                {/* Vehicle Choice Row */}
                <View className="flex items-center justify-between pt-1 flex-row">
                  <View className="flex items-center gap-3 flex-row">
                    <View className="w-16 h-11 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden flex-row">
                      <Car className="w-9 h-9 text-slate-700"/>
                    </View>
                    <View>
                      <View className=""><Text className="text-xs font-black text-slate-900">Sedan</Text></View>
                      <View className=""><Text className="text-[10px] text-slate-500 font-bold">Dzire, Etios, Amaze or similar</Text></View>
                      <View className="flex items-center gap-2 pt-1 flex-row">
                        <Text className="flex items-center gap-0.5"><Users className="w-3 h-3 text-slate-400"/> 4 Passengers</Text>
                        <Text className="flex items-center gap-0.5"><Briefcase className="w-3 h-3 text-slate-400"/> 2 Bags</Text>
                        <Text className="flex items-center gap-0.5 text-emerald-600"><Snowflake className="w-3 h-3"/> AC Vehicle</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => navigation.navigate('HomeScreen')} className="flex items-center gap-0.5 flex-row">
                    <Edit2 className="w-3 h-3"/><Text className="text-[10px] font-bold text-[#FF3B00]"> Change
                  </Text></TouchableOpacity>
                </View>
              </View>

              {/* Itemized Fare Breakdown Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                <View className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row">
                  <Text className="text-xs font-black text-slate-900">Fare Breakdown</Text>
                  <Text className="text-[10px] font-bold text-slate-400">Amount (₹)</Text>
                </View>

                <View className="space-y-2.5">
                  <View className="flex justify-between items-center flex-row">
                    <Text className="flex items-center gap-2 text-slate-600">
                      <View className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-row"><Car className="w-3.5 h-3.5"/></View>
                      Base Fare (275 km)
                    </Text>
                    <Text className="font-black text-slate-900">5,200</Text>
                  </View>

                  <View className="flex justify-between items-center flex-row">
                    <Text className="flex items-center gap-2 text-slate-600">
                      <View className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-row"><User className="w-3.5 h-3.5"/></View>
                      Driver Allowance
                    </Text>
                    <Text className="font-black text-slate-900">450</Text>
                  </View>

                  <View className="flex justify-between items-center flex-row">
                    <Text className="flex items-center gap-2 text-slate-600">
                      <View className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-row"><Navigation className="w-3.5 h-3.5"/></View>
                      Toll & Taxes
                    </Text>
                    <Text className="font-black text-slate-900">300</Text>
                  </View>

                  <View className="flex justify-between items-center flex-row">
                    <Text className="flex items-center gap-2 text-slate-600">
                      <View className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-row"><Building2 className="w-3.5 h-3.5"/></View>
                      Parking Charges
                    </Text>
                    <Text className="font-black text-slate-900">300</Text>
                  </View>

                  <View className="flex justify-between items-center flex-row">
                    <Text className="flex items-center gap-2">
                      <View className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-row"><Gift className="w-3.5 h-3.5"/></View>
                      Discount (WELCOME10)
                    </Text>
                    <Text className="font-black">-200</Text>
                  </View>

                  <View className="pt-2.5 border-t border-slate-100 flex justify-between items-center flex-row">
                    <View>
                      <View className=""><Text className="text-sm font-black text-slate-900">Total Amount</Text></View>
                      <View className=""><Text className="text-[9px] text-slate-400 font-medium">All inclusive of taxes</Text></View>
                    </View>
                    <View className=""><Text className="text-lg font-black text-slate-900">₹6,250</Text></View>
                  </View>
                </View>
              </View>

              {/* Savings Banner */}
              <View className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between flex-row">
                <View className="flex items-center gap-2.5 flex-row">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/>
                  <View>
                    <View className=""><Text className="text-xs font-black text-emerald-900">You are saving ₹1,050 on this booking</Text></View>
                    <View className=""><Text className="text-[10px] font-bold text-emerald-700">Best price guaranteed!</Text></View>
                  </View>
                </View>
                <Award className="w-6 h-6 text-emerald-600 shrink-0"/>
              </View>

              {/* Secure Booking Insurance */}
              <View className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between flex-row">
                <View className="flex items-center gap-2.5 flex-row">
                  <ShieldCheck className="w-5 h-5 text-[#FF3B00] shrink-0"/>
                  <View>
                    <View className=""><Text className="text-xs font-black text-slate-900">Secure your booking</Text></View>
                    <View className=""><Text className="text-[10px] text-slate-500 font-bold">Refundable in case of cancellation</Text></View>
                  </View>
                </View>

                <TouchableOpacity 
                  onPress={() => setAddInsurance(!addInsurance)}
                  className="flex-row items-center gap-2"
                >
                  <View style={{ width: 16, height: 16, backgroundColor: addInsurance ? '#FF3B00' : 'transparent', borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: addInsurance ? 0 : 1, borderColor: '#cbd5e1' }}>
                    {addInsurance && <Check size={12} color="white" />}
                  </View>
                  <View className="">
                    <Text className="text-xs font-black text-slate-900 block">Add for ₹200</Text>
                    <Text className="text-[8px] text-slate-400 font-bold block">(Recommended)</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Total Payable & Proceed Button Bar */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 space-y-3 shadow-md">
                <View className="flex justify-between items-center flex-row">
                  <View className="flex items-center gap-2.5 flex-row">
                    <Wallet className="w-5 h-5 text-[#FF3B00]"/>
                    <View>
                      <View className=""><Text className="text-[10px] text-slate-400 font-bold uppercase">To be paid</Text></View>
                      <View className=""><Text className="text-base font-black text-slate-900">₹</Text>{addInsurance ? '6,450' : '6,250'}</View>
                    </View>
                  </View>
                  <View className="flex items-center gap-1 flex-row">
                    <ShieldCheck className="w-3.5 h-3.5"/><Text className="text-[10px] font-extrabold text-emerald-600"> 100% Secure Payment
                  </Text></View>
                </View>

                <TouchableOpacity 
                  onPress={() => navigation.navigate('VehicleSelectionScreen')}
                  className="w-full bg-[#FF3B00] hover:bg-orange-600 py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 transition active:scale-98 flex items-center justify-center gap-2 flex-row"
                >
                  <Lock className="w-4 h-4"/>
                  <Text>Proceed to Booking</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-[10px] text-center text-slate-400 font-bold flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500"/>
                Your payment and personal details are 100% secure.
              </Text>

            </View>
          )}

          {/* ==========================================
              SCREEN 33: PAYMENT SCREEN (33.png)
             ========================================== */}
          {activeScreen === '33' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <TouchableOpacity onPress={() => navigation.navigate('SearchDestinationScreen')} className="p-1 hover:bg-slate-100 rounded-full">
                  <ArrowLeft className="w-5 h-5"/>
                </TouchableOpacity>
                <Text className="text-base font-black text-slate-900">Payment</Text>
                <Text className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                  <ShieldCheck className="w-3.5 h-3.5"/> 100% Secure
                </Text>
              </View>

              {/* Confirmation Banner */}
              <View className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between flex-row">
                <View className="flex items-center gap-2.5 flex-row">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/>
                  <View>
                    <View className=""><Text className="text-xs font-black text-emerald-900">Your booking is confirmed!</Text></View>
                    <View className=""><Text className="text-[10px] font-bold text-emerald-700">Complete your payment to confirm your ride.</Text></View>
                  </View>
                </View>
                <View className="shrink-0">
                  <View className=""><Text className="text-[8px] font-bold text-slate-400 uppercase">Booking ID</Text></View>
                  <View className=""><Text className="text-[9px] font-black text-slate-900">MBGO2505200001</Text></View>
                </View>
              </View>

              {/* Trip Details Summary Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-3">
                <View className="flex justify-between items-start flex-row">
                  <View className="space-y-1">
                    <View className="flex items-center gap-1.5 flex-row">
                      <View className="w-2 h-2 rounded-full bg-emerald-500"></View>
                      <Text>New Delhi, Delhi</Text>
                    </View>
                    <View className="pl-3"><Text className="text-[10px] text-slate-400 font-bold">Pick-up</Text></View>

                    <View className="flex items-center gap-1.5 pt-1 flex-row">
                      <View className="w-2 h-2 rounded-full bg-[#FF3B00]"></View>
                      <Text>Jaipur, Rajasthan</Text>
                    </View>
                    <View className="pl-3"><Text className="text-[10px] text-slate-400 font-bold">Drop</Text></View>
                  </View>

                  <View className="space-y-1">
                    <View><Calendar className="w-3 h-3 inline text-slate-400"/><Text> 20 May 2025</Text></View>
                    <View><Clock className="w-3 h-3 inline text-slate-400"/><Text> 08:00 AM</Text></View>
                    <View className=""><Text className="text-slate-500">One Way</Text></View>
                    <View><Users className="w-3 h-3 inline text-slate-400"/><Text> 2 Passengers</Text></View>
                    <View><Briefcase className="w-3 h-3 inline text-slate-400"/><Text> 2 Bags</Text></View>
                  </View>

                  <View className="shrink-0">
                    <View className=""><Text className="text-xs font-black text-slate-900">Sedan</Text></View>
                    <View className=""><Text className="text-[9px] text-slate-400 font-bold">Dzire, Etios</Text></View>
                    <View className="pt-1"><Text className="text-[9px] text-emerald-600 font-bold">4 Seats • AC</Text></View>
                  </View>
                </View>
              </View>

              {/* Fare Summary Accordion snippet */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                <View className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row">
                  <Text className="text-xs font-black text-slate-900">Fare Summary</Text>
                  <View className="">
                    <View className=""><Text className="text-xs font-black text-[#FF3B00]">Total Amount ₹6,250</Text></View>
                    <View className=""><Text className="text-[8px] font-bold text-slate-400">All inclusive of taxes</Text></View>
                  </View>
                </View>

                <View className="flex justify-between items-center flex-row">
                  <Text>Discount (WELCOME10)</Text>
                  <Text>-200</Text>
                </View>
              </View>

              {/* Choose Payment Method Section */}
              <View className="space-y-2">
                <Text className="text-xs font-black text-slate-900 uppercase tracking-wider">Choose Payment Method</Text>

                <View className="space-y-2">
                  
                  {/* UPI / Cards Option */}
                  <TouchableOpacity 
                    onPress={() => setPaymentMethod('upi_cards')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'upi_cards' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View className="flex items-center gap-3 flex-row">
                      <CreditCard className="w-5 h-5 text-[#FF3B00]"/>
                      <View>
                        <View className=""><Text className="text-xs font-black text-slate-900">UPI / Cards</Text></View>
                        <View className=""><Text className="text-[10px] text-slate-500 font-semibold">Visa, Mastercard, Rupay, Amex</Text></View>
                      </View>
                    </View>

                    <View className="flex items-center gap-2 flex-row">
                      <View className="flex items-center gap-1 flex-row">
                        <Text className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded">VISA</Text>
                        <Text className="bg-red-100 text-red-800 px-1 py-0.5 rounded">MC</Text>
                        <Text className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">RuPay</Text>
                      </View>
                      <View className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'upi_cards' ? 'border-[#FF3B00] bg-[#FF3B00]' : 'border-slate-300'}`}>
                        {paymentMethod === 'upi_cards' && <View className="w-1.5 h-1.5 rounded-full bg-white"></View>}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* UPI Direct */}
                  <TouchableOpacity 
                    onPress={() => setPaymentMethod('upi')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'upi' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View className="flex items-center gap-3 flex-row">
                      <Zap className="w-5 h-5 text-blue-500"/>
                      <View>
                        <View className=""><Text className="text-xs font-black text-slate-900">UPI</Text></View>
                        <View className=""><Text className="text-[10px] text-slate-500 font-semibold">Pay using any UPI app</Text></View>
                      </View>
                    </View>

                    <View className="flex items-center gap-2 flex-row">
                      <View className="flex items-center gap-1 flex-row">
                        <Text className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded">Paytm</Text>
                        <Text className="bg-purple-50 text-purple-700 px-1 py-0.5 rounded">PhonePe</Text>
                      </View>
                      <View className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'upi' ? 'border-[#FF3B00] bg-[#FF3B00]' : 'border-slate-300'}`}>
                        {paymentMethod === 'upi' && <View className="w-1.5 h-1.5 rounded-full bg-white"></View>}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Net Banking */}
                  <TouchableOpacity 
                    onPress={() => setPaymentMethod('netbanking')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'netbanking' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View className="flex items-center gap-3 flex-row">
                      <Building className="w-5 h-5 text-purple-600"/>
                      <View>
                        <View className=""><Text className="text-xs font-black text-slate-900">Net Banking</Text></View>
                        <View className=""><Text className="text-[10px] text-slate-500 font-semibold">All major banks supported</Text></View>
                      </View>
                    </View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>

                  {/* Wallets */}
                  <TouchableOpacity 
                    onPress={() => setPaymentMethod('wallet')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'wallet' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View className="flex items-center gap-3 flex-row">
                      <Wallet className="w-5 h-5 text-emerald-600"/>
                      <View>
                        <View className=""><Text className="text-xs font-black text-slate-900">Wallets</Text></View>
                        <View className=""><Text className="text-[10px] text-slate-500 font-semibold">Paytm, PhonePe, Amazon Pay & more</Text></View>
                      </View>
                    </View>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </TouchableOpacity>

                  {/* Pay Later */}
                  <TouchableOpacity 
                    onPress={() => setPaymentMethod('paylater')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'paylater' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View className="flex items-center gap-3 flex-row">
                      <Clock3 className="w-5 h-5 text-amber-600"/>
                      <View>
                        <View className=""><Text className="text-xs font-black text-slate-900">Pay Later</Text></View>
                        <View className=""><Text className="text-[10px] text-slate-500 font-semibold">Buy now, pay later options (Simpl)</Text></View>
                      </View>
                    </View>
                    <Text className="text-[9px] font-black bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded">Simpl</Text>
                  </TouchableOpacity>

                </View>
              </View>

              {/* Pay Now Button */}
              <TouchableOpacity 
                onPress={() => navigation.navigate('RideStatusScreen')}
                className="w-full bg-[#FF3B00] hover:bg-orange-600 py-3.5 rounded-2xl shadow-xl shadow-orange-500/30 transition active:scale-98 flex items-center justify-center gap-2 mt-4 flex-row"
              >
                <Lock className="w-4 h-4"/>
                <Text>Pay Now ₹6,250</Text>
                <ChevronRight className="w-4 h-4 ml-1"/>
              </TouchableOpacity>

              <Text className="text-[10px] text-center text-slate-400 font-bold">
                By proceeding, you agree to our <a href="#" className="text-[#FF3B00] underline">Terms & Conditions</a>
              </Text>

            </View>
          )}

          {/* ==========================================
              SCREEN 34: LIVE TRACKING (34.png)
             ========================================== */}
          {activeScreen === '34' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <TouchableOpacity onPress={() => navigation.navigate('HomeScreen')} className="p-1 hover:bg-slate-100 rounded-full">
                  <ArrowLeft className="w-5 h-5"/>
                </TouchableOpacity>
                <Text className="text-base font-black text-slate-900">Live Tracking</Text>
                <View className="flex items-center gap-2 flex-row">
                  <TouchableOpacity className="p-1 hover:bg-slate-100 rounded-full"><Headphones className="w-5 h-5"/></TouchableOpacity>
                  <TouchableOpacity className="p-1 hover:bg-slate-100 rounded-full relative"><Bell className="w-5 h-5"/><Text className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-1 right-1"></Text></TouchableOpacity>
                </View>
              </View>

              {/* Partner Assigned Status Banner */}
              <View className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between flex-row">
                <View className="flex items-center gap-2.5 flex-row">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/>
                  <View>
                    <View className=""><Text className="text-xs font-black text-emerald-900">Partner Assigned!</Text></View>
                    <View className=""><Text className="text-[10px] font-bold text-emerald-700">Your ride partner is on the way.</Text></View>
                  </View>
                </View>
                <TouchableOpacity className="bg-white border border-emerald-200 px-2.5 py-1 rounded-xl"><Text className="text-[10px] font-black text-emerald-800">
                  View Details
                </Text></TouchableOpacity>
              </View>

              {/* Vector Map Graphic Box */}
              <View className="bg-[#E2E8F0] border border-slate-300 rounded-3xl h-52 relative overflow-hidden flex flex-col justify-between p-3 shadow-inner">
                {/* Map Grid Pattern */}
                <View className="absolute inset-0 opacity-30 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></View>
                
                {/* Highway Route Curve Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 50 40 Q 180 90 320 170" stroke="#059669" strokeWidth="5" fill="none" strokeDasharray="8 4"/>
                </svg>

                {/* Floating Map Route Info Card */}
                <View className="relative z-10 bg-white/95 backdrop-blur-xs p-2.5 rounded-2xl shadow-md self-start max-w-[210px] space-y-1">
                  <View className="flex items-center gap-1.5 flex-row">
                    <View className="w-2 h-2 rounded-full bg-emerald-500"></View>
                    <Text>New Delhi, Delhi</Text>
                  </View>
                  <View className="flex items-center gap-1.5 flex-row">
                    <MapPin className="w-3 h-3 text-[#FF3B00]"/>
                    <Text>Jaipur, Rajasthan</Text>
                  </View>
                  <View className="border-t border-slate-100 pt-1 mt-1"><Text className="text-[9px] text-slate-500 font-bold">
                    275 km • 5h 20m remaining
                  </Text></View>
                </View>

                {/* Moving Car Icon on Map */}
                <View className="relative z-10 self-center bg-[#FF3B00] p-2.5 rounded-full shadow-xl animate-bounce">
                  <Car className="w-6 h-6"/>
                </View>

                {/* Map Floating Right Controls */}
                <View className="relative z-10 self-end flex flex-col gap-1">
                  <TouchableOpacity className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center flex-row">
                    <LocateFixed className="w-4 h-4"/>
                  </TouchableOpacity>
                  <TouchableOpacity className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center flex-row">
                    <Navigation className="w-4 h-4"/>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Driver Details Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                <View className="flex items-center justify-between flex-row">
                  <View className="flex items-center gap-3 flex-row">
                    <View className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center flex-row"><Text className="text-white font-black text-sm">
                      RK
                    </Text></View>
                    <View>
                      <Text className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        Ramesh Kumar
                        <Text className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-black">
                          ★ 4.8
                        </Text>
                      </Text>
                      <View className="mt-0.5"><Text className="text-[10px] font-bold text-slate-500">
                        DL 1ZD 1234 • White Dzire
                      </Text></View>
                      <View className=""><Text className="text-[9px] font-bold text-slate-400">Z1234567</Text></View>
                    </View>
                  </View>

                  <View className="flex items-center gap-2 flex-row">
                    <TouchableOpacity onPress={() => showToast("Calling Driver Ramesh...")} className="p-2.5 bg-emerald-100 rounded-2xl hover:bg-emerald-200 transition">
                      <Phone className="w-4 h-4"/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => showToast("Opening Chat...")} className="p-2.5 bg-blue-100 rounded-2xl hover:bg-blue-200 transition">
                      <MessageSquare className="w-4 h-4"/>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ETA Sub-banner */}
                <View className="bg-emerald-50/60 rounded-2xl p-2.5 flex items-center justify-between flex-row">
                  <View className="flex items-center gap-2 flex-row">
                    <Clock className="w-4 h-4 text-[#FF3B00]"/>
                    <View>
                      <View className=""><Text className="text-xs font-black text-slate-900">Your partner is 15 min away</Text></View>
                      <View className=""><Text className="text-[9px] text-slate-500 font-semibold">from your pickup location</Text></View>
                    </View>
                  </View>
                  <TouchableOpacity className=""><Text className="text-[10px] font-black text-emerald-700">View ETA</Text></TouchableOpacity>
                </View>

                {/* Ride Progress Stepper Line */}
                <View className="pt-2 flex justify-between items-center flex-row">
                  <View className="space-y-1">
                    <View className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center mx-auto flex-row"><Check className="w-3.5 h-3.5"/></View>
                    <View><Text>Partner Assigned</Text></View>
                  </View>
                  <View className="w-6 h-[2px] bg-emerald-500 -mt-3"></View>
                  <View className="space-y-1">
                    <View className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mx-auto flex-row"><Car className="w-3.5 h-3.5"/></View>
                    <View><Text>On the Way</Text></View>
                  </View>
                  <View className="w-6 h-[2px] bg-slate-200 -mt-3"></View>
                  <View className="space-y-1">
                    <View className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mx-auto flex-row"><MapPin className="w-3 h-3"/></View>
                    <View><Text>Arrived at Pickup</Text></View>
                  </View>
                  <View className="w-6 h-[2px] bg-slate-200 -mt-3"></View>
                  <View className="space-y-1">
                    <View className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mx-auto flex-row"><Check className="w-3.5 h-3.5"/></View>
                    <View><Text>Trip Completed</Text></View>
                  </View>
                </View>
              </View>

              {/* Trip Details Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                <View className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row">
                  <Text className="font-black text-slate-900">Trip Details</Text>
                  <TouchableOpacity className=""><Text className="text-[10px] font-bold text-[#FF3B00]">View Details &gt;</Text></TouchableOpacity>
                </View>

                <View className="flex justify-between items-start flex-row">
                  <View className="space-y-1">
                    <View className="">{pickup}</View>
                    <View className=""><Text className="text-[9px] text-slate-400 font-bold">Pick-up</Text></View>
                    <View className="pt-1">{drop}</View>
                    <View className=""><Text className="text-[9px] text-slate-400 font-bold">Drop</Text></View>
                  </View>

                  <View className="shrink-0">
                    <View className=""><Text className="text-[10px] text-slate-400 font-bold">Total Amount</Text></View>
                    <View className=""><Text className="text-base font-black text-[#FF3B00]">₹6,250</Text></View>
                    <Text className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md inline-block mt-1">
                      Paid ✓
                    </Text>
                    <View className="mt-0.5"><Text className="text-[9px] text-slate-400 font-bold">UPI / Cards</Text></View>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex gap-2 flex-row">
                <TouchableOpacity 
                  onPress={() => showToast("Trip Status Shared!")}
                  className="flex-1 bg-white border border-[#FF3B00] hover:bg-orange-50 py-3 rounded-2xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 flex-row"
                >
                  <Share2 className="w-4 h-4"/>
                  <Text>Share Trip Status</Text>
                </TouchableOpacity>
                <TouchableOpacity className="p-3 border border-slate-200 hover:bg-slate-50 rounded-2xl">
                  <MoreHorizontal className="w-5 h-5"/>
                </TouchableOpacity>
              </View>

            </View>
          )}

          {/* ==========================================
              SCREEN 35: MY TRIPS (35.png)
             ========================================== */}
          {activeScreen === '35' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <Text className="text-lg font-black text-slate-900">My Trips</Text>
                <TouchableOpacity className="p-1 hover:bg-slate-100 rounded-full relative">
                  <Bell className="w-5 h-5"/>
                  <Text className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-1 right-1"></Text>
                </TouchableOpacity>
              </View>

              {/* Status Tabs */}
              <View className="flex border-b border-slate-200 flex-row">
                <TouchableOpacity 
                  onPress={() => setTripsTab('upcoming')}
                  className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
                    tripsTab === 'upcoming' ? 'text-[#FF3B00] border-b-2 border-[#FF3B00]' : 'hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4"/><Text className="text-center"> Upcoming
                </Text></TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setTripsTab('completed')}
                  className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
                    tripsTab === 'completed' ? 'text-[#FF3B00] border-b-2 border-[#FF3B00]' : 'hover:text-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4"/><Text className="text-center"> Completed
                </Text></TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setTripsTab('cancelled')}
                  className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
                    tripsTab === 'cancelled' ? 'text-[#FF3B00] border-b-2 border-[#FF3B00]' : 'hover:text-slate-800'
                  }`}
                >
                  <XCircle className="w-4 h-4"/><Text className="text-center"> Cancelled
                </Text></TouchableOpacity>
              </View>

              {/* Filter Pills Row */}
              <View className="flex justify-between items-center flex-row">
                <View className="flex gap-1.5 flex-row">
                  <TouchableOpacity className="bg-[#FF3B00] px-3 py-1.5 rounded-xl shadow-2xs"><Text className="text-white">All Trips</Text></TouchableOpacity>
                  <TouchableOpacity className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl"><Text className="text-slate-700">Outstation</Text></TouchableOpacity>
                  <TouchableOpacity className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl"><Text className="text-slate-700">Local</Text></TouchableOpacity>
                </View>
                <TouchableOpacity className="border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl flex items-center gap-1 flex-row">
                  <Filter className="w-3 h-3"/><Text className="text-slate-700"> Filter
                </Text></TouchableOpacity>
              </View>

              {/* Refer & Earn Banner */}
              <View className="bg-gradient-to-r from-amber-50 to-orange-100 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between shadow-2xs flex-row">
                <View className="flex items-center gap-2.5 flex-row">
                  <Gift className="w-5 h-5 text-[#FF3B00] shrink-0"/>
                  <View>
                    <View className=""><Text className="text-xs font-black text-slate-900">Refer & Earn</Text></View>
                    <View className=""><Text className="text-[10px] text-slate-500 font-semibold">Refer your friends and earn exciting rewards.</Text></View>
                  </View>
                </View>
                <TouchableOpacity className="bg-[#FF3B00] hover:bg-orange-600 px-3 py-1.5 rounded-xl shadow-xs shrink-0"><Text className="text-[10px] font-black text-white">
                  Refer Now &gt;
                </Text></TouchableOpacity>
              </View>

              {/* Completed Trips List */}
              <View className="space-y-3">
                <View className=""><Text className="text-xs font-black text-slate-900">Completed Trips</Text></View>

                {/* Trip Card 1 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                  <View className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row">
                    <Text className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md">
                      ✓ Completed
                    </Text>
                    <Text className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1">
                      Booking ID: MBGO2505200001 <Copy className="w-3 h-3 text-slate-400 cursor-pointer"/>
                    </Text>
                  </View>

                  <View className="flex justify-between items-start gap-2 flex-row">
                    <View className="space-y-2">
                      <View className="flex items-start gap-2 flex-row">
                        <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0"></View>
                        <View>
                          <View className=""><Text className="text-xs font-black text-slate-900">New Delhi, Delhi</Text></View>
                          <View className=""><Text className="text-[9px] text-slate-400 font-bold">Pick-up</Text></View>
                        </View>
                      </View>

                      <View className="flex items-start gap-2 flex-row">
                        <View className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] mt-0.5 shrink-0"></View>
                        <View>
                          <View className=""><Text className="text-xs font-black text-slate-900">Jaipur, Rajasthan</Text></View>
                          <View className=""><Text className="text-[9px] text-slate-400 font-bold">Drop</Text></View>
                        </View>
                      </View>
                    </View>

                    <View className="shrink-0">
                      <View className=""><Text className="text-xs font-black text-slate-900">Sedan</Text></View>
                      <View className=""><Text className="text-[10px] text-slate-400 font-bold">Dzire, Etios, Amaze</Text></View>
                      <View className=""><Text className="text-[10px] text-slate-500 font-bold">4 Seats • AC</Text></View>
                      <View className="mt-1"><Text className="text-sm font-black text-[#FF3B00]">₹6,250</Text></View>
                    </View>
                  </View>

                  <View className="bg-slate-50 rounded-2xl p-2.5 flex items-center justify-between flex-row">
                    <Text>Driver Ramesh Kumar ★ 4.8</Text>
                    <Text>20 May 2025, 01:45 PM</Text>
                  </View>

                  {/* Actions Row */}
                  <View className="grid grid-cols-3 gap-2 pt-1">
                    <TouchableOpacity onPress={() => showToast("Downloading Invoice...")} className="border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <Download className="w-3 h-3 text-slate-500"/><Text className="text-[10px] font-black text-slate-700"> Download Invoice
                    </Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => showToast("Opening Receipt...")} className="border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <Receipt className="w-3 h-3 text-slate-500"/><Text className="text-[10px] font-black text-slate-700"> Get Receipt
                    </Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('HomeScreen')} className="bg-[#FF3B00] hover:bg-orange-600 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <RotateCw className="w-3 h-3"/><Text className="text-white text-[10px] font-black"> Book Again
                    </Text></TouchableOpacity>
                  </View>
                </View>

                {/* Trip Card 2 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                  <View className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row">
                    <Text className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md">
                      ✓ Completed
                    </Text>
                    <Text className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1">
                      Booking ID: MBGO1805200002 <Copy className="w-3 h-3 text-slate-400 cursor-pointer"/>
                    </Text>
                  </View>

                  <View className="flex justify-between items-start gap-2 flex-row">
                    <View className="space-y-2">
                      <View className="flex items-start gap-2 flex-row">
                        <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0"></View>
                        <View>
                          <View className=""><Text className="text-xs font-black text-slate-900">Gurugram, Haryana</Text></View>
                          <View className=""><Text className="text-[9px] text-slate-400 font-bold">Pick-up</Text></View>
                        </View>
                      </View>

                      <View className="flex items-start gap-2 flex-row">
                        <View className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] mt-0.5 shrink-0"></View>
                        <View>
                          <View className=""><Text className="text-xs font-black text-slate-900">Agra, Uttar Pradesh</Text></View>
                          <View className=""><Text className="text-[9px] text-slate-400 font-bold">Drop</Text></View>
                        </View>
                      </View>
                    </View>

                    <View className="shrink-0">
                      <View className=""><Text className="text-xs font-black text-slate-900">SUV</Text></View>
                      <View className=""><Text className="text-[10px] text-slate-400 font-bold">Ertiga, Carens</Text></View>
                      <View className=""><Text className="text-[10px] text-slate-500 font-bold">6 Seats • AC</Text></View>
                      <View className="mt-1"><Text className="text-sm font-black text-[#FF3B00]">₹9,750</Text></View>
                    </View>
                  </View>

                  <View className="bg-slate-50 rounded-2xl p-2.5 flex items-center justify-between flex-row">
                    <Text>Driver Mahesh Yadav ★ 4.7</Text>
                    <Text>18 May 2025, 06:30 PM</Text>
                  </View>

                  {/* Actions Row */}
                  <View className="grid grid-cols-3 gap-2 pt-1">
                    <TouchableOpacity onPress={() => showToast("Downloading Invoice...")} className="border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <Download className="w-3 h-3 text-slate-500"/><Text className="text-[10px] font-black text-slate-700"> Download Invoice
                    </Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => showToast("Opening Receipt...")} className="border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <Receipt className="w-3 h-3 text-slate-500"/><Text className="text-[10px] font-black text-slate-700"> Get Receipt
                    </Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('HomeScreen')} className="bg-[#FF3B00] hover:bg-orange-600 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <RotateCw className="w-3 h-3"/><Text className="text-white text-[10px] font-black"> Book Again
                    </Text></TouchableOpacity>
                  </View>
                </View>

              </View>

              {/* Support Card Footer */}
              <View className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between flex-row">
                <View className="flex items-center gap-2.5 flex-row">
                  <Headphones className="w-5 h-5 text-blue-600 shrink-0"/>
                  <View>
                    <View className=""><Text className="text-xs font-black text-blue-900">Need help with your trip?</Text></View>
                    <View className=""><Text className="text-[10px] text-slate-500 font-semibold">Our support team is available 24x7.</Text></View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => showToast("Opening Support...")} className="bg-white border border-blue-200 px-2.5 py-1 rounded-xl shrink-0"><Text className="text-[10px] font-black text-blue-700">
                  Contact Support &gt;
                </Text></TouchableOpacity>
              </View>

            </View>
          )}

        </View>

        {/* Global Bottom App Navigation Bar */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 py-2.5 px-6 flex justify-between items-center z-30 flex-row">
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('HomeScreen')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '31' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Car className="w-5 h-5"/>
            <Text>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('MyTripsScreen')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '35' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Calendar className="w-5 h-5"/>
            <Text>My Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('SearchDestinationScreen')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '32' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Receipt className="w-5 h-5"/>
            <Text>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate("Profile")}
            className={`flex flex-col items-center text-[10px] font-black transition text-slate-400 hover:text-slate-600`}
          >
            <User className="w-5 h-5"/>
            <Text>Profile</Text>
          </TouchableOpacity>

        </View>

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
console.log('CACHE_BUST_FINAL_BARS_1786125430901');

console.log('CACHE_BUST_AST_FIX_1786128723307');
