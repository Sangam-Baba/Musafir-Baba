import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
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
import { useRideStore } from '../../../store/useRideStore';
import { getRideById } from '../../../api/ride.api';

export default function ScreenLiveTracking({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack?: () => void }) {
  // Navigation active screen: '31' | '32' | '33' | '34' | '35'
  const activeScreen = '34';

  const rideId = useRideStore((s) => s.rideId);
  const draftPickup = useRideStore((s) => s.pickup);
  const draftDrop = useRideStore((s) => s.drop);
  const [ride, setRide] = useState<any>(null);

  // Referenced only by the unreachable Screen 32/33 blocks bundled below (dead code, never rendered)
  const [date] = useState('2025-05-20');
  const [time] = useState('08:00 AM');
  const [addInsurance, setAddInsurance] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('upi_cards');

  const pickup = ride?.pickup?.address || draftPickup;
  const drop = ride?.drop?.address || draftDrop;

  // Driver/vehicle identity is hidden by the backend (assignedDriverId/
  // assignedVehicleId/assignedPartnerId come back null) until 24h before the
  // trip -- distinguish "not assigned yet" from "assigned but not revealed
  // yet" so we don't show the misleading "Waiting for partner..." once a
  // partner has actually accepted.
  const PARTNER_ASSIGNED_STATUSES = ['ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'ONGOING', 'COMPLETED'];
  const isPartnerAssigned = PARTNER_ASSIGNED_STATUSES.includes(ride?.status);
  const detailsGated = isPartnerAssigned && ride?.detailsRevealed === false;

  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await getRideById(rideId);
        if (!cancelled) setRide(res.data.data);
      } catch (error) {
        console.error('Poll ride status error:', error);
      }
    };

    poll();
    const interval = setInterval(() => {
      if (ride?.status === 'COMPLETED' || ride?.status === 'CANCELLED') {
        clearInterval(interval);
        return;
      }
      poll();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [rideId, ride?.status]);

  const statusMessages: Record<string, { title: string; subtitle: string }> = {
    AWAITING_ASSIGNMENT: { title: 'Finding you a partner...', subtitle: 'This usually takes a few minutes.' },
    ACCEPTED: { title: 'Partner Assigned!', subtitle: 'Your ride partner is getting ready.' },
    DRIVER_EN_ROUTE: { title: 'Partner is on the way!', subtitle: 'Your ride partner is heading to pick-up.' },
    ARRIVED: { title: 'Partner has arrived', subtitle: 'Your partner is waiting at the pick-up point.' },
    ONGOING: { title: 'Trip in progress', subtitle: 'Enjoy your ride!' },
    COMPLETED: { title: 'Trip completed', subtitle: 'Thanks for riding with MBGO!' },
    CANCELLED: { title: 'Ride cancelled', subtitle: 'This ride is no longer active.' },
  };
  const currentStatusInfo = statusMessages[ride?.status] || statusMessages.AWAITING_ASSIGNMENT;

  // Screen 35 Trips tab
  const [tripsTab, setTripsTab] = useState('completed'); // 'upcoming' | 'completed' | 'cancelled'

  // Toast notification state
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
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

                <Text className="flex items-center gap-2 cursor-pointer">
                  <TextInput 
                    type="checkbox" 
                    checked={addInsurance}
                    onChangeText={(e) => setAddInsurance(e.target.checked)}
                    className="w-4 h-4 accent-[#FF3B00] rounded"
                  />
                  <View className="">
                    <Text className="text-xs font-black text-slate-900 block">Add for ₹200</Text>
                    <Text className="text-[8px] text-slate-400 font-bold block">(Recommended)</Text>
                  </View>
                </Text>
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
                <TouchableOpacity onPress={() => (onBack ? onBack() : onNavigate('31'))} className="p-1 hover:bg-slate-100 rounded-full">
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
                    <View className=""><Text className="text-xs font-black text-emerald-900">{currentStatusInfo.title}</Text></View>
                    <View className=""><Text className="text-[10px] font-bold text-emerald-700">{currentStatusInfo.subtitle}</Text></View>
                  </View>
                </View>
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
                    <Text className="text-slate-700 font-medium">{pickup}</Text>
                  </View>
                  <View className="flex items-center gap-1.5 flex-row">
                    <MapPin className="w-3 h-3 text-[#FF3B00]"/>
                    <Text className="text-slate-700 font-medium">{drop}</Text>
                  </View>
                  <View className="border-t border-slate-100 pt-1 mt-1"><Text className="text-[9px] text-slate-500 font-bold">
                    {ride?.distanceKm ?? '-'} km
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
                      {detailsGated ? '—' : (ride?.assignedDriverId?.name ? ride.assignedDriverId.name.slice(0, 2).toUpperCase() : '-')}
                    </Text></View>
                    <View>
                      <Text className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        {detailsGated
                          ? 'Details available soon'
                          : (ride?.assignedDriverId?.name || ride?.assignedPartnerId?.fullName || 'Waiting for partner...')}
                      </Text>
                      <View className="mt-0.5"><Text className="text-[10px] font-bold text-slate-500">
                        {detailsGated
                          ? 'Driver & vehicle details will be shared 24 hours before your trip.'
                          : (ride?.assignedVehicleId ? `${ride.assignedVehicleId.registrationNumber} • ${ride.assignedVehicleId.brand} ${ride.assignedVehicleId.model}` : 'Vehicle not yet assigned')}
                      </Text></View>
                    </View>
                  </View>

                  <View className="flex items-center gap-2 flex-row">
                    <TouchableOpacity onPress={() => showToast(detailsGated ? 'Partner contact available 24 hours before your trip' : (ride?.assignedPartnerId?.mobileNumber ? `Calling ${ride.assignedPartnerId.mobileNumber}...` : 'Partner not yet assigned'))} className="p-2.5 bg-emerald-100 rounded-2xl hover:bg-emerald-200 transition">
                      <Phone className="w-4 h-4"/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => showToast("Chat coming soon")} className="p-2.5 bg-blue-100 rounded-2xl hover:bg-blue-200 transition">
                      <MessageSquare className="w-4 h-4"/>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ride Progress Stepper Line */}
                {(() => {
                  const order = ['ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'COMPLETED'];
                  const currentIndex = Math.max(order.indexOf(ride?.status), ride?.status === 'ONGOING' ? 2 : -1);
                  const stepClass = (i: number) => (currentIndex >= i ? 'bg-emerald-500' : 'bg-slate-100');
                  const lineClass = (i: number) => (currentIndex >= i ? 'bg-emerald-500' : 'bg-slate-200');
                  return (
                    <View className="pt-2 flex justify-between items-center flex-row">
                      <View className="space-y-1">
                        <View className={`w-6 h-6 rounded-full ${stepClass(0)} flex items-center justify-center mx-auto flex-row`}><Check className="w-3.5 h-3.5"/></View>
                        <View><Text className="text-slate-700 font-medium">Partner Assigned</Text></View>
                      </View>
                      <View className={`w-6 h-[2px] ${lineClass(1)} -mt-3`}></View>
                      <View className="space-y-1">
                        <View className={`w-6 h-6 rounded-full ${stepClass(1)} flex items-center justify-center mx-auto flex-row`}><Car className="w-3.5 h-3.5"/></View>
                        <View><Text className="text-slate-700 font-medium">On the Way</Text></View>
                      </View>
                      <View className={`w-6 h-[2px] ${lineClass(2)} -mt-3`}></View>
                      <View className="space-y-1">
                        <View className={`w-6 h-6 rounded-full ${stepClass(2)} flex items-center justify-center mx-auto flex-row`}><MapPin className="w-3 h-3"/></View>
                        <View><Text className="text-slate-700 font-medium">Arrived at Pickup</Text></View>
                      </View>
                      <View className={`w-6 h-[2px] ${lineClass(3)} -mt-3`}></View>
                      <View className="space-y-1">
                        <View className={`w-6 h-6 rounded-full ${stepClass(3)} flex items-center justify-center mx-auto flex-row`}><Check className="w-3.5 h-3.5"/></View>
                        <View><Text className="text-slate-700 font-medium">Trip Completed</Text></View>
                      </View>
                    </View>
                  );
                })()}
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
                    <View className=""><Text className="text-base font-black text-[#FF3B00]">₹{(ride?.totalAmount ?? 0).toLocaleString('en-IN')}</Text></View>
                    {ride?.paymentInfo?.status === 'Paid' && (
                      <Text className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md inline-block mt-1">
                        Paid ✓
                      </Text>
                    )}
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
                  <TouchableOpacity className="bg-[#FF3B00] px-3 py-1.5 rounded-xl shadow-sm"><Text className="text-white">All Trips</Text></TouchableOpacity>
                  <TouchableOpacity className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl"><Text className="text-slate-700">Outstation</Text></TouchableOpacity>
                  <TouchableOpacity className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl"><Text className="text-slate-700">Local</Text></TouchableOpacity>
                </View>
                <TouchableOpacity className="border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl flex items-center gap-1 flex-row">
                  <Filter className="w-3 h-3"/><Text className="text-slate-700"> Filter
                </Text></TouchableOpacity>
              </View>

              {/* Refer & Earn Banner */}
              <View className="bg-orange-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between shadow-sm flex-row">
                <View className="flex items-center gap-2.5 flex-row">
                  <Gift className="w-5 h-5 text-[#FF3B00] shrink-0"/>
                  <View>
                    <View className=""><Text className="text-xs font-black text-slate-900">Refer & Earn</Text></View>
                    <View className=""><Text className="text-[10px] text-slate-500 font-semibold">Refer your friends and earn exciting rewards.</Text></View>
                  </View>
                </View>
                <TouchableOpacity className="bg-[#FF3B00] hover:bg-orange-600 px-3 py-1.5 rounded-xl shadow-sm shrink-0"><Text className="text-[10px] font-black text-white">
                  Refer Now &gt;
                </Text></TouchableOpacity>
              </View>

              {/* Completed Trips List */}
              <View className="space-y-3">
                <View className=""><Text className="text-xs font-black text-slate-900">Completed Trips</Text></View>

                {/* Trip Card 1 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
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
                    <Text className="text-slate-700 font-medium">Driver Ramesh Kumar ★ 4.8</Text>
                    <Text className="text-slate-700 font-medium">20 May 2025, 01:45 PM</Text>
                  </View>

                  {/* Actions Row */}
                  <View className="flex-row flex-wrap gap-2 pt-1">
                    <TouchableOpacity onPress={() => showToast("Downloading Invoice...")} className="flex-1 border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <Download className="w-3 h-3 text-slate-500"/><Text className="text-[10px] font-black text-slate-700"> Download Invoice
                    </Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => showToast("Opening Receipt...")} className="flex-1 border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <Receipt className="w-3 h-3 text-slate-500"/><Text className="text-[10px] font-black text-slate-700"> Get Receipt
                    </Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => onNavigate('31')} className="flex-1 bg-[#FF3B00] hover:bg-orange-600 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <RotateCw className="w-3 h-3"/><Text className="text-white text-[10px] font-black"> Book Again
                    </Text></TouchableOpacity>
                  </View>
                </View>

                {/* Trip Card 2 */}
                <View className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3">
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
                    <Text className="text-slate-700 font-medium">Driver Mahesh Yadav ★ 4.7</Text>
                    <Text className="text-slate-700 font-medium">18 May 2025, 06:30 PM</Text>
                  </View>

                  {/* Actions Row */}
                  <View className="flex-row flex-wrap gap-2 pt-1">
                    <TouchableOpacity onPress={() => showToast("Downloading Invoice...")} className="flex-1 border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <Download className="w-3 h-3 text-slate-500"/><Text className="text-[10px] font-black text-slate-700"> Download Invoice
                    </Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => showToast("Opening Receipt...")} className="flex-1 border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
                      <Receipt className="w-3 h-3 text-slate-500"/><Text className="text-[10px] font-black text-slate-700"> Get Receipt
                    </Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => onNavigate('31')} className="flex-1 bg-[#FF3B00] hover:bg-orange-600 py-1.5 rounded-xl flex items-center justify-center gap-1 flex-row">
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

        </ScrollView>

        {/* Global Bottom App Navigation Bar */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 py-2.5 px-6 flex justify-between items-center z-30 flex-row">
          
          <TouchableOpacity 
            onPress={() => onNavigate('31')}
            className="flex flex-col items-center"
          >
            <Car className="w-5 h-5"/>
            <Text className="text-slate-700 font-medium">Home</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onNavigate('35')}
            className="flex flex-col items-center"
          >
            <Calendar className="w-5 h-5"/>
            <Text className="text-slate-700 font-medium">My Trips</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onNavigate('32')}
            className="flex flex-col items-center"
          >
            <Receipt className="w-5 h-5"/>
            <Text className="text-slate-700 font-medium">Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => onNavigate('36')}
            className="flex flex-col items-center"
          >
            <User className="w-5 h-5"/>
            <Text className="text-slate-700 font-medium">Profile</Text>
          </TouchableOpacity>

        </View>

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
// FORCE_REBUILD_CACHE_BUST_1786123613902
console.log('CACHE_BUST_1786124057433');

console.log('CACHE_BUST_BARS_1786124237186');

console.log('CACHE_BUST_PROFILE_FIX_1786124506904');

console.log('CACHE_BUST_PROFILE_36_1786124896531');

console.log('CACHE_BUST_HTML_TO_RN_1786128166244');

console.log('CACHE_BUST_AST_FIX_1786128723734');
