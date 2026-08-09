import { View, Text, TouchableOpacity, TextInput, ScrollView, Image } from 'react-native';
import React, { useState } from 'react';
import { createRide } from '../../../api/ride.api';
import { useRideStore } from '../../../store/useRideStore';
import {
  Menu,
  Bell,
  MapPin,
  Calendar,
  Clock,
  Car,
  ChevronRight,
  ChevronDown,
  Plane,
  Navigation,
  RotateCcw,
  Building2,
  Palmtree,
  ShieldCheck,
  Headphones,
  Lock,
  ArrowLeft,
  ArrowRight,
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
  Award,
  Tag
} from 'lucide-react-native';

export default function ScreenFareSummary({ onNavigate }: { onNavigate: (screen: string) => void }) {
  // Navigation active screen: '31' | '32' | '33' | '34' | '35'
  const activeScreen: '31' | '32' | '33' | '34' | '35' = '32';

  const pickup = useRideStore((s) => s.pickup);
  const drop = useRideStore((s) => s.drop);
  const date = useRideStore((s) => s.rideDate);
  const time = useRideStore((s) => s.rideTime);
  const quote = useRideStore((s) => s.quote);
  const selectedOffer = useRideStore((s) => s.selectedOffer);
  const passengerCount = useRideStore((s) => s.passengerCount);
  const setRide = useRideStore((s) => s.setRide);
  const [isBooking, setIsBooking] = useState(false);

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

  const handleProceedToBooking = async () => {
    if (!selectedOffer) {
      showToast('Please search for cabs again');
      onNavigate('31');
      return;
    }
    setIsBooking(true);
    try {
      const res = await createRide({
        pickup: { address: pickup },
        drop: { address: drop },
        rideDate: date,
        rideTime: time,
        vehicleCategory: selectedOffer.category,
        passengerCount,
      });
      setRide(res.data.data.rideId, res.data.data.totalAmount);
      onNavigate('33');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not create booking, please try again');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      
      {/* Main Mobile App Viewport Container */}
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', position: 'relative' }}>
        
        

        {/* Scrollable Main Screen Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>


          {/* ==========================================
              SCREEN 32: FARE SUMMARY (32.png)
             ========================================== */}
          {activeScreen === '32' && (
            <View style={{ padding: 12, gap: 10 }}>
              
              {/* Header Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                <TouchableOpacity onPress={() => onNavigate('31')} style={{ padding: 4, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9' }}>
                  <ArrowLeft size={18} color="#0F172A" />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Fare Summary</Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Card 1: Route & Vehicle Summary Card */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, gap: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
                
                {/* Top Row: ONE-WAY TRIP badge & Distance */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
                  <View style={{ backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FF5500', letterSpacing: 0.5 }}>ONE-WAY TRIP</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Navigation size={13} color="#475569" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>{quote?.distanceKm ?? 298.4} km</Text>
                  </View>
                </View>

                {/* Pickup & Drop Timeline */}
                <View style={{ gap: 10, paddingVertical: 2, position: 'relative' }}>
                  
                  {/* Pickup Location */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#10B981', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981' }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 }}>PICKUP LOCATION</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 1 }} numberOfLines={1}>
                          {pickup || 'New Delhi, Delhi'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>Delhi NCR</Text>
                    </View>
                  </View>

                  {/* Vertical Dashed Line */}
                  <View style={{ position: 'absolute', left: 6, top: 16, bottom: 20, width: 1, borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#CBD5E1' }} />

                  {/* Drop Location */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FF5500', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF5500' }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 }}>DROP LOCATION</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 1 }} numberOfLines={1}>
                          {drop || 'Jaipur, Rajasthan'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>Pink City</Text>
                    </View>
                  </View>

                </View>

                {/* Date/Time Footer */}
                <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 8, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="#0F172A" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>
                      {date || '2026-08-13'}  <Text style={{ color: '#94A3B8' }}>•</Text>  {time || '02:34 PM'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onNavigate('31')}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF5500' }}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* Selected Vehicle Details Sub-Block */}
                <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 48, height: 44, borderRadius: 12, backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={22} color="#FF5500" />
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                        {selectedOffer?.category || 'Sedan'}
                      </Text>
                      <TouchableOpacity onPress={() => onNavigate('vehicle-select')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Edit2 size={11} color="#FF5500" />
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF5500' }}>Change</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={{ fontSize: 10, fontWeight: '500', color: '#64748B' }} numberOfLines={1}>
                      {selectedOffer?.vehicleName || 'Maruti Suzuki Dzire VDI'}
                    </Text>

                    {/* Inline Feature Badges */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                        <Users size={9.5} color="#475569" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#475569' }}>
                          {selectedOffer?.seatingCapacity || passengerCount || 4} Passengers
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                        <Briefcase size={9.5} color="#475569" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#475569' }}>
                          {selectedOffer?.category === 'SUV' ? '4 Bags' : '2 Bags'}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                        <Snowflake size={9.5} color="#059669" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669' }}>
                          AC Vehicle
                        </Text>
                      </View>
                    </View>

                  </View>
                </View>

              </View>

              {/* Card 2: Fare Breakdown & Savings Card */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, gap: 8, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Fare Breakdown</Text>
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>Amount (₹)</Text>
                </View>

                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
                        <Car size={11} color="#475569" />
                      </View>
                      <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#334155' }}>Base Fare ({quote?.distanceKm || 298.4} km)</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>{(selectedOffer?.baseFare || 5200).toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={11} color="#475569" />
                      </View>
                      <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#334155' }}>Driver Allowance</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>{(selectedOffer?.driverAllowance || 450).toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={11} color="#475569" />
                      </View>
                      <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#334155' }}>Toll & Taxes</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>300</Text>
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', borderStyle: 'dashed', paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                        <Tag size={11} color="#059669" />
                      </View>
                      <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#059669' }}>Discount (WELCOME10)</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>-200</Text>
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 6, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>Total Amount</Text>
                      <Text style={{ fontSize: 8.5, fontWeight: '500', color: '#94A3B8' }}>All inclusive of taxes</Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>₹{(selectedOffer?.totalAmount || 6250).toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {/* Integrated Savings Strip */}
                <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 10, padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={16} color="#059669" />
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857' }}>You are saving ₹1,050 on this booking</Text>
                      <Text style={{ fontSize: 8.5, fontWeight: '600', color: '#059669' }}>Best price guaranteed!</Text>
                    </View>
                  </View>
                  <Award size={14} color="#059669" />
                </View>

              </View>

              {/* Card 3: Payment Total & Booking Action Button */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, gap: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet size={16} color="#FF5500" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>To be paid</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <CheckCircle2 size={10} color="#059669" />
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#059669' }}>100% Secure Payment</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#0F172A' }}>₹{(selectedOffer?.totalAmount || 6250).toLocaleString('en-IN')}</Text>
                </View>

                {/* Primary Action Button */}
                <TouchableOpacity
                  onPress={handleProceedToBooking}
                  disabled={isBooking}
                  style={{ width: '100%', height: 40, backgroundColor: isBooking ? '#CBD5E1' : '#FF5500', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 6 }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5, textAlign: 'center' }}>
                    {isBooking ? 'Booking...' : 'Proceed to Booking'}
                  </Text>
                  <ArrowRight size={15} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <ShieldCheck size={11} color="#059669" />
                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#64748B' }}>
                    Your payment and personal details are 100% secure.
                  </Text>
                </View>

              </View>

            </View>
          )}

          {/* ==========================================
              SCREEN 33: PAYMENT SCREEN (33.png)
             ========================================== */}
          {activeScreen === '33' && (
            <View style={{ padding: 12, gap: 10 }}>
              
              {/* Header Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                <TouchableOpacity onPress={() => onNavigate('32')} style={{ padding: 4, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9' }}>
                  <ArrowLeft size={18} color="#0F172A" />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Payment</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <ShieldCheck size={14} color="#059669" />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>100% Secure</Text>
                </View>
              </View>

              {/* Confirmation Banner */}
              <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <CheckCircle2 size={20} color="#059669" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#047857' }}>Your booking is confirmed!</Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#059669' }}>Complete your payment to confirm your ride.</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', paddingLeft: 6 }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 }}>BOOKING ID</Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#0F172A' }}>MBGO2505200001</Text>
                </View>
              </View>

              {/* Trip Summary Strip Card (Identical to other screens) */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
                
                {/* Top Row: ONE-WAY TRIP badge & Distance */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }}>
                  <View style={{ backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FF5500', letterSpacing: 0.5 }}>ONE-WAY TRIP</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Navigation size={13} color="#475569" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>{quote?.distanceKm ?? 298.4} km</Text>
                  </View>
                </View>

                {/* Middle Section: Pickup & Drop Timeline with Region Tags */}
                <View style={{ gap: 12, paddingVertical: 2, position: 'relative' }}>
                  
                  {/* Pickup Location */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#10B981', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981' }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 }}>PICKUP LOCATION</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 1 }} numberOfLines={1}>
                          {pickup || 'New Delhi, Delhi'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>Delhi NCR</Text>
                    </View>
                  </View>

                  {/* Vertical Dashed Line */}
                  <View style={{ position: 'absolute', left: 6, top: 16, bottom: 20, width: 1, borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#CBD5E1' }} />

                  {/* Drop Location */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FF5500', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF5500' }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 }}>DROP LOCATION</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 1 }} numberOfLines={1}>
                          {drop || 'Jaipur, Rajasthan'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#64748B' }}>Pink City</Text>
                    </View>
                  </View>

                </View>

                {/* Bottom Footer Row: Date, Time & Selected Vehicle */}
                <View style={{ borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="#0F172A" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>
                      {date || '2026-08-13'}  <Text style={{ color: '#94A3B8' }}>•</Text>  {time || '02:34 PM'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>
                    {selectedOffer?.category || 'Tempo Traveller'} ({selectedOffer?.seatingCapacity || 12} Seats • AC)
                  </Text>
                </View>

              </View>

              {/* Amount Payable Card */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
                <View>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 }}>AMOUNT PAYABLE</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                    ₹{(selectedOffer?.totalAmount || 6665).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#059669' }}>All taxes included</Text>
                </View>
              </View>

              {/* Payment Options Section */}
              <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, gap: 8, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 }}>
                  PAYMENT OPTIONS
                </Text>
                <Text style={{ fontSize: 10.5, fontWeight: '500', color: '#64748B', lineHeight: 15 }}>
                  You'll be taken to our secure payment partner PayU, where you can pay using UPI, Debit/Credit Card, Net Banking or Wallet — whichever you prefer.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#334155' }}>⚡ UPI</Text>
                  </View>
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#334155' }}>💳 Cards</Text>
                  </View>
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#334155' }}>🏦 Net Banking</Text>
                  </View>
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#334155' }}>👛 Wallets</Text>
                  </View>
                </View>
              </View>

              {/* Primary Action Button */}
              <TouchableOpacity 
                onPress={() => onNavigate('34')}
                style={{ width: '100%', height: 40, backgroundColor: '#FF5500', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 6, marginTop: 4 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>
                  Pay Now ₹{(selectedOffer?.totalAmount || 6665).toLocaleString('en-IN')}
                </Text>
                <ArrowRight size={15} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={{ fontSize: 9.5, textAlign: 'center', color: '#64748B', fontWeight: '500' }}>
                By proceeding, you agree to our <Text style={{ color: '#FF5500', fontWeight: '700' }}>Terms & Conditions</Text>
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

              {/* Trip Cards List: Render MOCK DUMMY TRIPS matching target screenshot */}
              {[
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
              ].map((trip, idx) => (
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
                            {trip.pickup?.address}
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
                            {trip.drop?.address}
                          </Text>
                          <Text style={{ fontSize: 8.5, fontWeight: '600', color: '#94A3B8', marginTop: 1 }}>Drop</Text>
                        </View>
                      </View>
                    </View>

                    {/* Col 2: Schedule & Specs */}
                    <View style={{ width: 88, gap: 3, borderLeftWidth: 1, borderLeftColor: '#F1F5F9', paddingLeft: 5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Calendar size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.rideDate}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.rideTime}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <ArrowUpDown size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.tripType}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Users size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.passengers}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Briefcase size={10} color="#64748B" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#334155' }}>{trip.bags}</Text>
                      </View>
                    </View>

                    {/* Col 3: Vehicle Info & Graphic */}
                    <View style={{ width: 85, gap: 2, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F1F5F9', paddingLeft: 5 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '900', color: '#0F172A', textAlign: 'center' }}>
                        {trip.vehicleCategory}
                      </Text>
                      <Text style={{ fontSize: 8, fontWeight: '600', color: '#64748B', textAlign: 'center' }} numberOfLines={1}>
                        {trip.vehicleSubtext}
                      </Text>

                      <View style={{ width: 46, height: 26, borderRadius: 6, backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FFE8D9', alignItems: 'center', justifyContent: 'center', marginVertical: 2 }}>
                        <Car size={16} color="#FF5500" />
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#475569' }}>{trip.seats}</Text>
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
                        <Text style={{ fontSize: 12.5, fontWeight: '900', color: '#059669' }}>₹{trip.totalAmount.toLocaleString('en-IN')}</Text>
                        <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 8, fontWeight: '800', color: '#059669' }}>Paid ✓</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#94A3B8' }}>Driver</Text>
                        <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#0F172A' }}>{trip.driverName}</Text>
                        <View style={{ backgroundColor: '#059669', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 7.5, fontWeight: '800', color: '#FFFFFF' }}>★ {trip.driverRating}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Row 2: Trip Completion Time */}
                    <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#94A3B8' }}>Trip Completed</Text>
                      <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#334155' }}>{trip.completedTime}</Text>
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

        {/* No bottom navbar on Fare Summary detail flow screen */}

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
// FORCE_REBUILD_CACHE_BUST_1786123613902
console.log('CACHE_BUST_1786124057431');

console.log('CACHE_BUST_BARS_1786124237184');

console.log('CACHE_BUST_PROFILE_FIX_1786124506893');

console.log('CACHE_BUST_PROFILE_36_1786124896524');

console.log('CACHE_BUST_HTML_TO_RN_1786128166242');

console.log('CACHE_BUST_AST_FIX_1786128723703');
