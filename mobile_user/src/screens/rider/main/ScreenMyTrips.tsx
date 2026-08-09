import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';
import React, { useState, useEffect } from 'react';
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
import { getMyRides } from '../../../api/ride.api';

export default function ScreenMyTrips({ onNavigate }: { onNavigate: (screen: string) => void }) {
  // Navigation active screen: '31' | '32' | '33' | '34' | '35'
  const activeScreen: string = '35';

  const [trips, setTrips] = useState<any[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);

  // Form State for Screen 31
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

  useEffect(() => {
    let cancelled = false;
    setIsLoadingTrips(true);
    getMyRides(tripsTab as 'upcoming' | 'completed' | 'cancelled')
      .then((res) => {
        if (!cancelled) setTrips(res.data.data || []);
      })
      .catch((error) => {
        console.error('Get my rides error:', error);
        if (!cancelled) setTrips([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTrips(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripsTab]);

  const swapLocations = () => {
    const temp = pickup;
    setPickup(drop);
    setDrop(temp);
    showToast('Locations swapped');
  };

  return (
    <View className="flex-1 bg-slate-900 selection:bg-orange-500 selection:text-white">
      
      {/* Main Mobile App Viewport Container */}
      <View className="flex-1 bg-[#F8FAFC] relative">
        
        

        {/* Scrollable Main Screen Content */}
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

          {/* ==========================================
              SCREEN 32: FARE SUMMARY (32.png)
             ========================================== */}
          {activeScreen === '32' && (
            <View className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <View className="flex items-center justify-between pt-1 flex-row">
                <TouchableOpacity onPress={() => onNavigate('31')} className="p-1 hover:bg-slate-100 rounded-full">
                  <ArrowLeft className="w-5 h-5"/>
                </TouchableOpacity>
                <Text className="text-base font-black text-slate-900">Fare Summary</Text>
                <View className="w-5"></View>
              </View>

              {/* Route & Trip Details Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
                <View className="flex justify-between items-start border-b border-slate-100 pb-3 flex-row">
                  <View className="space-y-2 flex-1">
                    <View className="flex items-start gap-2 flex-row">
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></View>
                      <View>
                        <View className=""><Text className="text-xs font-black text-slate-900">{pickup}</Text></View>
                        <View className=""><Text className="text-[10px] text-slate-400 font-bold">Pick-up</Text></View>
                      </View>
                    </View>

                    <View className="flex items-start gap-2 flex-row">
                      <View className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] mt-1 shrink-0"></View>
                      <View>
                        <View className=""><Text className="text-xs font-black text-slate-900">{drop}</Text></View>
                        <View className=""><Text className="text-[10px] text-slate-400 font-bold">Drop</Text></View>
                      </View>
                    </View>
                  </View>

                  <View className="space-y-1">
                    <TouchableOpacity 
                      onPress={() => onNavigate('31')}
                      className="flex items-center gap-1 justify-end ml-auto flex-row"
                    >
                      <Edit2 className="w-3 h-3"/><Text className="text-[10px] font-bold text-[#FF3B00]"> Edit Trip
                    </Text></TouchableOpacity>
                    <View className="flex items-center justify-end gap-1 pt-1 flex-row"><Calendar className="w-3 h-3 text-slate-400"/><Text className="text-[10px] font-bold text-slate-700">{date}</Text></View>
                    <View className="flex items-center justify-end gap-1 flex-row"><Clock className="w-3 h-3 text-slate-400"/><Text className="text-[10px] font-bold text-slate-700">{time}</Text></View>
                    <View className=""><Text className="text-[10px] font-bold text-slate-500 uppercase">One Way</Text></View>
                  </View>
                </View>

                {/* Vehicle Choice Row */}
                <View className="flex items-center justify-between pt-1 flex-row">
                  <View className="flex items-center gap-3 flex-row flex-1 min-w-0">
                    <View className="w-16 h-11 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden flex-row shrink-0">
                      <Car className="w-9 h-9 text-slate-700"/>
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className=""><Text className="text-xs font-black text-slate-900">Sedan</Text></View>
                      <View className=""><Text className="text-[10px] text-slate-500 font-bold">Dzire, Etios, Amaze or similar</Text></View>
                      <View className="flex items-center gap-2 pt-1 flex-row flex-wrap">
                        <Text className="flex items-center gap-0.5"><Users className="w-3 h-3 text-slate-400"/> 4 Passengers</Text>
                        <Text className="flex items-center gap-0.5"><Briefcase className="w-3 h-3 text-slate-400"/> 2 Bags</Text>
                        <Text className="flex items-center gap-0.5 text-emerald-600"><Snowflake className="w-3 h-3"/> AC Vehicle</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => onNavigate('31')} className="flex items-center gap-0.5 flex-row shrink-0 ml-2">
                    <Edit2 className="w-3 h-3"/><Text className="text-[10px] font-bold text-[#FF3B00]"> Change
                  </Text></TouchableOpacity>
                </View>
              </View>

              {/* Itemized Fare Breakdown Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
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
                  activeOpacity={0.7}
                  className="flex flex-row items-center gap-2"
                >
                  <View className={`w-4 h-4 border rounded flex items-center justify-center ${addInsurance ? 'bg-[#FF3B00] border-[#FF3B00]' : 'border-slate-400 bg-white'}`}>
                    {addInsurance && <Text className="text-white text-[10px] font-bold">✓</Text>}
                  </View>
                  <View>
                    <Text className="text-xs font-black text-slate-900">Add for ₹200</Text>
                    <Text className="text-[8px] text-slate-400 font-bold">(Recommended)</Text>
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
                      <View className=""><Text className="text-base font-black text-slate-900">₹{addInsurance ? '6,450' : '6,250'}</Text></View>
                    </View>
                  </View>
                  <View className="flex items-center gap-1 flex-row">
                    <ShieldCheck className="w-3.5 h-3.5"/><Text className="text-[10px] font-extrabold text-emerald-600"> 100% Secure Payment
                  </Text></View>
                </View>

                <TouchableOpacity 
                  onPress={() => onNavigate('33')}
                  className="w-full bg-[#FF3B00] hover:bg-orange-600 py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 transition active:scale-98 flex items-center justify-center gap-2 flex-row"
                >
                  <Lock className="w-4 h-4"/>
                  <Text className="text-slate-700 font-medium">Proceed to Booking</Text>
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
                <TouchableOpacity onPress={() => onNavigate('32')} className="p-1 hover:bg-slate-100 rounded-full">
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
              <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-3">
                <View className="flex justify-between items-start flex-row">
                  <View className="space-y-1">
                    <View className="flex items-center gap-1.5 flex-row">
                      <View className="w-2 h-2 rounded-full bg-emerald-500"></View>
                      <Text className="text-slate-700 font-medium">New Delhi, Delhi</Text>
                    </View>
                    <View className="pl-3"><Text className="text-[10px] text-slate-400 font-bold">Pick-up</Text></View>

                    <View className="flex items-center gap-1.5 pt-1 flex-row">
                      <View className="w-2 h-2 rounded-full bg-[#FF3B00]"></View>
                      <Text className="text-slate-700 font-medium">Jaipur, Rajasthan</Text>
                    </View>
                    <View className="pl-3"><Text className="text-[10px] text-slate-400 font-bold">Drop</Text></View>
                  </View>

                  <View className="space-y-1">
                    <View><Calendar className="w-3 h-3 inline text-slate-400"/><Text className="text-slate-700 font-medium">20 May 2025</Text></View>
                    <View><Clock className="w-3 h-3 inline text-slate-400"/><Text className="text-slate-700 font-medium">08:00 AM</Text></View>
                    <View className=""><Text className="text-slate-500">One Way</Text></View>
                    <View><Users className="w-3 h-3 inline text-slate-400"/><Text className="text-slate-700 font-medium">2 Passengers</Text></View>
                    <View><Briefcase className="w-3 h-3 inline text-slate-400"/><Text className="text-slate-700 font-medium">2 Bags</Text></View>
                  </View>

                  <View className="shrink-0">
                    <View className=""><Text className="text-xs font-black text-slate-900">Sedan</Text></View>
                    <View className=""><Text className="text-[9px] text-slate-400 font-bold">Dzire, Etios</Text></View>
                    <View className="pt-1"><Text className="text-[9px] text-emerald-600 font-bold">4 Seats • AC</Text></View>
                  </View>
                </View>
              </View>

              {/* Fare Summary Accordion snippet */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-2">
                <View className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row">
                  <Text className="text-xs font-black text-slate-900">Fare Summary</Text>
                  <View className="">
                    <View className=""><Text className="text-xs font-black text-[#FF3B00]">Total Amount ₹6,250</Text></View>
                    <View className=""><Text className="text-[8px] font-bold text-slate-400">All inclusive of taxes</Text></View>
                  </View>
                </View>

                <View className="flex justify-between items-center flex-row">
                  <Text className="text-slate-700 font-medium">Discount (WELCOME10)</Text>
                  <Text className="text-slate-700 font-medium">-200</Text>
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
                onPress={() => onNavigate('34')}
                className="w-full bg-[#FF3B00] hover:bg-orange-600 py-3.5 rounded-2xl shadow-xl shadow-orange-500/30 transition active:scale-98 flex items-center justify-center gap-2 mt-4 flex-row"
              >
                <Lock className="w-4 h-4"/>
                <Text className="text-slate-700 font-medium">Pay Now ₹6,250</Text>
                <ChevronRight className="w-4 h-4 ml-1"/>
              </TouchableOpacity>

              <Text className="text-[10px] text-center text-slate-400 font-bold">
                By proceeding, you agree to our <Text className="text-[#FF3B00] underline">Terms & Conditions</Text>
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
                <TouchableOpacity onPress={() => onNavigate('31')} className="p-1 hover:bg-slate-100 rounded-full">
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
                

                {/* Floating Map Route Info Card */}
                <View className="relative z-10 bg-white/95 backdrop-blur-xs p-2.5 rounded-2xl shadow-md self-start max-w-[210px] space-y-1">
                  <View className="flex items-center gap-1.5 flex-row">
                    <View className="w-2 h-2 rounded-full bg-emerald-500"></View>
                    <Text className="text-slate-700 font-medium">New Delhi, Delhi</Text>
                  </View>
                  <View className="flex items-center gap-1.5 flex-row">
                    <MapPin className="w-3 h-3 text-[#FF3B00]"/>
                    <Text className="text-slate-700 font-medium">Jaipur, Rajasthan</Text>
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
              <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
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
                    <View><Text className="text-slate-700 font-medium">Partner Assigned</Text></View>
                  </View>
                  <View className="w-6 h-[2px] bg-emerald-500 -mt-3"></View>
                  <View className="space-y-1">
                    <View className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mx-auto flex-row"><Car className="w-3.5 h-3.5"/></View>
                    <View><Text className="text-slate-700 font-medium">On the Way</Text></View>
                  </View>
                  <View className="w-6 h-[2px] bg-slate-200 -mt-3"></View>
                  <View className="space-y-1">
                    <View className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mx-auto flex-row"><MapPin className="w-3 h-3"/></View>
                    <View><Text className="text-slate-700 font-medium">Arrived at Pickup</Text></View>
                  </View>
                  <View className="w-6 h-[2px] bg-slate-200 -mt-3"></View>
                  <View className="space-y-1">
                    <View className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mx-auto flex-row"><Check className="w-3.5 h-3.5"/></View>
                    <View><Text className="text-slate-700 font-medium">Trip Completed</Text></View>
                  </View>
                </View>
              </View>

              {/* Trip Details Card */}
              <View className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-sm space-y-2">
                <View className="flex justify-between items-center border-b border-slate-100 pb-2 flex-row">
                  <Text className="font-black text-slate-900">Trip Details</Text>
                  <TouchableOpacity className=""><Text className="text-[10px] font-bold text-[#FF3B00]">View Details &gt;</Text></TouchableOpacity>
                </View>

                <View className="flex justify-between items-start flex-row">
                  <View className="space-y-1">
                    <View className=""><Text className="text-xs font-black text-slate-900">{pickup}</Text></View>
                    <View className=""><Text className="text-[9px] text-slate-400 font-bold">Pick-up</Text></View>
                    <View className="pt-1"><Text>{drop}</Text></View>
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
                  <Text className="text-slate-700 font-medium">Share Trip Status</Text>
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
            <View style={{ padding: 12, gap: 10 }}>
              
              {/* Header Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>My Trips</Text>
                <TouchableOpacity style={{ alignItems: 'center', position: 'relative' }}>
                  <View style={{ position: 'relative' }}>
                    <Bell size={20} color="#0F172A" />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF5500', position: 'absolute', top: 0, right: 0 }} />
                  </View>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: '#64748B', marginTop: 1 }}>Notifications</Text>
                </TouchableOpacity>
              </View>

              {/* Status Tabs (Upcoming, Completed, Cancelled) */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingTop: 2 }}>
                <TouchableOpacity 
                  onPress={() => setTripsTab('upcoming')}
                  style={{ flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderBottomWidth: tripsTab === 'upcoming' ? 2 : 0, borderBottomColor: '#FF5500' }}
                >
                  <Calendar size={14} color={tripsTab === 'upcoming' ? '#FF5500' : '#64748B'} />
                  <Text style={{ fontSize: 12, fontWeight: tripsTab === 'upcoming' ? '800' : '600', color: tripsTab === 'upcoming' ? '#FF5500' : '#64748B' }}>Upcoming</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setTripsTab('completed')}
                  style={{ flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderBottomWidth: tripsTab === 'completed' ? 2 : 0, borderBottomColor: '#FF5500' }}
                >
                  <CheckCircle2 size={14} color={tripsTab === 'completed' ? '#FF5500' : '#64748B'} />
                  <Text style={{ fontSize: 12, fontWeight: tripsTab === 'completed' ? '800' : '600', color: tripsTab === 'completed' ? '#FF5500' : '#64748B' }}>Completed</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setTripsTab('cancelled')}
                  style={{ flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderBottomWidth: tripsTab === 'cancelled' ? 2 : 0, borderBottomColor: '#FF5500' }}
                >
                  <XCircle size={14} color={tripsTab === 'cancelled' ? '#FF5500' : '#64748B'} />
                  <Text style={{ fontSize: 12, fontWeight: tripsTab === 'cancelled' ? '800' : '600', color: tripsTab === 'cancelled' ? '#FF5500' : '#64748B' }}>Cancelled</Text>
                </TouchableOpacity>
              </View>

              {/* Filter Pills Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity style={{ backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FF5500' }}>All Trips</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>Outstation</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B' }}>Local</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Filter size={12} color="#475569" />
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569' }}>Filter</Text>
                </TouchableOpacity>
              </View>

              {/* Refer & Earn Banner */}
              <View style={{ backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FFE8D9', alignItems: 'center', justifyContent: 'center' }}>
                    <Gift size={18} color="#FF5500" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Refer & Earn</Text>
                    <Text style={{ fontSize: 9.5, fontWeight: '600', color: '#64748B', marginTop: 1 }}>Refer your friends and earn exciting rewards.</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => showToast("Opening Referral Program...")} style={{ height: 30, backgroundColor: '#FF5500', borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>Refer Now</Text>
                  <ChevronRight size={12} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Completed Trips Header */}
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A', paddingTop: 2 }}>
                {tripsTab === 'completed' ? 'Completed Trips' : tripsTab === 'upcoming' ? 'Upcoming Trips' : 'Cancelled Trips'}
              </Text>

              {isLoadingTrips && (
                <Text style={{ textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94A3B8', paddingVertical: 12 }}>Loading trips...</Text>
              )}

              {/* Trip Cards List: Render real API trips if available, otherwise render MOCK DUMMY TRIPS matching target screenshot */}
              {(!isLoadingTrips && trips.length > 0 ? trips : [
                {
                  _id: 'MBGO2505200001',
                  status: 'COMPLETED',
                  pickup: { address: 'New Delhi, Delhi' },
                  drop: { address: 'Jaipur, Rajasthan' },
                  rideDate: '20 May 2025',
                  rideTime: '08:00 AM',
                  tripType: 'One Way',
                  passengers: '2 Passengers',
                  bags: '2 Bags',
                  vehicleCategory: 'Sedan',
                  vehicleSubtext: 'Dzire, Etios, Amaze or similar',
                  seats: '4 Seats',
                  ac: true,
                  totalAmount: 6250,
                  driverName: 'Ramesh Kumar',
                  driverRating: '4.8',
                  completedTime: '20 May 2025, 01:45 PM'
                },
                {
                  _id: 'MBGO1805200002',
                  status: 'COMPLETED',
                  pickup: { address: 'Gurugram, Haryana' },
                  drop: { address: 'Agra, Uttar Pradesh' },
                  rideDate: '18 May 2025',
                  rideTime: '07:30 AM',
                  tripType: 'Round Trip',
                  passengers: '3 Passengers',
                  bags: '3 Bags',
                  vehicleCategory: 'SUV',
                  vehicleSubtext: 'Ertiga, Carens or similar',
                  seats: '6 Seats',
                  ac: true,
                  totalAmount: 9750,
                  driverName: 'Mahesh Yadav',
                  driverRating: '4.7',
                  completedTime: '18 May 2025, 06:30 PM'
                }
              ]).map((trip, idx) => (
                <View key={trip._id || idx} style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 12, gap: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
                  
                  {/* Card Header: Status Badge & Booking ID */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 }}>
                    <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <CheckCircle2 size={10} color="#059669" />
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#059669' }}>Completed</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B' }}>Booking ID: {trip._id}</Text>
                      <TouchableOpacity onPress={() => showToast("Booking ID copied!")}>
                        <Copy size={11} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 3-Column Layout: Route, Schedule, Vehicle Box */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    
                    {/* Col 1: Route Timeline */}
                    <View style={{ flex: 1, gap: 10, position: 'relative', minWidth: 0, paddingRight: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                        <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5, borderColor: '#10B981', backgroundColor: '#FFFFFF', marginTop: 3 }} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                            {trip.pickup?.address || trip.pickupLocation}
                          </Text>
                          <Text style={{ fontSize: 8.5, fontWeight: '600', color: '#94A3B8', marginTop: 1 }}>Pick-up</Text>
                        </View>
                      </View>

                      {/* Vertical line */}
                      <View style={{ position: 'absolute', left: 4, top: 12, bottom: 16, width: 1, borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#CBD5E1' }} />

                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                        <View style={{ width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5, borderColor: '#FF5500', backgroundColor: '#FFFFFF', marginTop: 3 }} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                            {trip.drop?.address || trip.dropLocation}
                          </Text>
                          <Text style={{ fontSize: 8.5, fontWeight: '600', color: '#94A3B8', marginTop: 1 }}>Drop</Text>
                        </View>
                      </View>
                    </View>

                    {/* Col 2: Schedule & Specs */}
                    <View style={{ width: 88, gap: 3, borderLeftWidth: 1, borderLeftColor: '#F1F5F9', paddingLeft: 5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Calendar size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.rideDate || '20 May 2025'}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.rideTime || '08:00 AM'}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <ArrowUpDown size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.tripType || 'One Way'}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Users size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.passengers || '2 Passengers'}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Briefcase size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.bags || '2 Bags'}</Text>
                      </View>
                    </View>

                    {/* Col 3: Vehicle Info & Graphic */}
                    <View style={{ width: 85, gap: 2, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F1F5F9', paddingLeft: 5 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                        {trip.vehicleCategory || 'Sedan'}
                      </Text>
                      <Text style={{ fontSize: 8, fontWeight: '600', color: '#64748B', textAlign: 'center' }} numberOfLines={1}>
                        {trip.vehicleSubtext || 'Dzire, Etios'}
                      </Text>

                      <View style={{ width: 46, height: 26, borderRadius: 6, backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', alignItems: 'center', justifyContent: 'center', marginVertical: 2 }}>
                        <Car size={16} color="#FF5500" />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#475569' }}>{trip.seats || '4 Seats'}</Text>
                        <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#059669' }}>• AC</Text>
                      </View>
                    </View>

                  </View>

                  {/* Middle Info Bar: 2-Row Responsive Non-Overflowing Layout */}
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, gap: 6 }}>
                    {/* Row 1: Total Amount & Driver */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#94A3B8' }}>Total Amount</Text>
                        <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#059669' }}>₹{(trip.totalAmount || 6250).toLocaleString('en-IN')}</Text>
                        <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 8, fontWeight: '800', color: '#059669' }}>Paid ✓</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#94A3B8' }}>Driver</Text>
                        <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#0F172A' }}>{trip.driverName || 'Ramesh Kumar'}</Text>
                        <View style={{ backgroundColor: '#059669', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 7.5, fontWeight: '800', color: '#FFFFFF' }}>★ {trip.driverRating || '4.8'}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Row 2: Trip Completion Time */}
                    <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#94A3B8' }}>Trip Completed</Text>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#334155' }}>{trip.completedTime || '20 May 2025, 01:45 PM'}</Text>
                    </View>
                  </View>

                  {/* Card Action Buttons Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity onPress={() => showToast("Downloading Invoice...")} style={{ flex: 1, height: 32, borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#FFFFFF' }}>
                      <Download size={11} color="#FF5500" />
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#FF5500' }}>Download Invoice</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => showToast("Opening Receipt...")} style={{ flex: 1, height: 32, borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#FFFFFF' }}>
                      <Receipt size={11} color="#FF5500" />
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#FF5500' }}>Get Receipt</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => onNavigate('31')} style={{ flex: 1, height: 32, borderWidth: 1, borderColor: '#FF5500', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#FFF5EF' }}>
                      <RotateCw size={11} color="#FF5500" />
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#FF5500' }}>Book Again</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              ))}

              {/* Support Card Banner */}
              <View style={{ backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Headphones size={18} color="#0284C7" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0369A1' }}>Need help with your trip?</Text>
                    <Text style={{ fontSize: 9.5, fontWeight: '600', color: '#0284C7' }}>Our support team is available 24x7 to assist you.</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => showToast("Opening Support...")} style={{ height: 28, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0284C7', borderRadius: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#0284C7' }}>Contact Support</Text>
                  <ChevronRight size={10} color="#0284C7" />
                </TouchableOpacity>
              </View>

            </View>
          )}

        </ScrollView>

        {/* Reusable Rider Bottom App Navigation Bar */}
        <RiderBottomNavbar activeScreen={activeScreen} onNavigate={onNavigate} />

        {/* Global Notification Toast */}
        {toastMsg ? (
          <View className="absolute top-6 self-center bg-slate-900 px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-slate-800 flex-row">
            <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
            <Text>{toastMsg}</Text>
          </View>
        ) : null}

        

      </View>
    </View>
  );
}
// FORCE_REBUILD_CACHE_BUST_1786123613903
console.log('CACHE_BUST_1786124057434');

console.log('CACHE_BUST_BARS_1786124237187');

console.log('CACHE_BUST_PROFILE_FIX_1786124506905');

console.log('CACHE_BUST_PROFILE_36_1786124896533');

console.log('CACHE_BUST_HTML_TO_RN_1786128166246');

console.log('CACHE_BUST_AST_FIX_1786128723767');
