import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch, ActivityIndicator, Modal, Platform, Image, Linking } from 'react-native';
import React, { useState, useEffect, useRef, createElement } from 'react';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import RiderBottomNavbar from '../../../components/RiderBottomNavbar';

const LOGO_TRANSPARENT = require('../../../assets/mbgoLogo_transparent.png');
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
  Award,
  Route
} from 'lucide-react-native';
import { getRideQuote, searchLocations, reverseGeocode, LocationSuggestion } from '../../../api/ride.api';
import { useRideStore } from '../../../store/useRideStore';

export default function ScreenRiderHome({ onNavigate }: { onNavigate: (screen: string) => void }) {
  // Navigation active screen: '31' | '32' | '33' | '34' | '35'
  const activeScreen: string = '31';

  const setSearch = useRideStore((s) => s.setSearch);
  const setQuote = useRideStore((s) => s.setQuote);

  // Form State for Screen 31
  const [tripType, setTripType] = useState<'oneway' | 'roundway'>('oneway');
  const [pickup, setPickup] = useState('New Delhi, Delhi');
  const [drop, setDrop] = useState('Jaipur, Rajasthan');
  // Coordinates from the selected autocomplete suggestion (or GPS), so the
  // backend can skip re-geocoding the address text -- forward-geocoding a
  // long reverse-geocoded display string (e.g. "Municipal Corporation,
  // Jaipur Tehsil, Jaipur, Rajasthan, 302001, India") isn't always reliable,
  // which was causing "Could not resolve pickup/drop location" failures.
  // Cleared whenever the user free-types so we don't send stale coords for
  // a manually-edited address.
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  // Return date/time only apply (and are required) for a Round Trip -- see
  // the "One Way" / "Round Trip" toggle below, which previously changed
  // color but didn't actually do anything.
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Date / Time / Vehicle Type / Passengers pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);

  const VEHICLE_CATEGORIES = [
    { category: 'Hatchback', label: 'Hatchback (Swift, i10 or similar)' },
    { category: 'Sedan', label: 'Sedan (Dzire, Etios or similar)' },
    { category: 'SUV', label: 'SUV (Ertiga, Innova or similar)' },
    { category: 'Tempo Traveller', label: 'Tempo Traveller (12-16 seater)' },
  ];

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatTime = (d: Date) => {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  };

  // `@react-native-community/datetimepicker` has no web implementation (it
  // renders nothing and just logs a warning there), so the web build falls
  // back to real HTML date/time inputs instead of the native picker.
  const isWeb = Platform.OS === 'web';

  // Browsers can't be told to skip rendering their own calendar/clock icon on
  // a date/time input via inline styles (it's a pseudo-element), so inject one
  // small, scoped stylesheet rule to tone it down instead of showing two icons
  // (ours + the browser's) side by side.
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    const styleId = 'mbgo-native-datetime-input-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .mbgo-native-datetime-input {
        color-scheme: light;
      }
      .mbgo-native-datetime-input::-webkit-calendar-picker-indicator {
        opacity: 0.55;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }, [isWeb]);

  const to12Hour = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    let hours = h % 12;
    if (hours === 0) hours = 12;
    return `${String(hours).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const to24Hour = (display: string) => {
    const match = display.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match) return '';
    let [, h, m, ampm] = match;
    let hours = parseInt(h, 10);
    if (ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${m}`;
  };

  // Free (Nominatim-backed) location search-as-you-type, no paid Maps API.
  // Nominatim's public server asks for at most ~1 request/second, so we debounce
  // generously and use a request sequence number to ignore slow, stale responses
  // that would otherwise overwrite newer results out of order.
  const [activeField, setActiveField] = useState<'pickup' | 'drop' | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationSuggestion[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDrop, setIsSearchingDrop] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const pickupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupRequestSeq = useRef(0);
  const dropRequestSeq = useRef(0);
  // Measured height of the label+input block (not including the dropdown
  // itself) so the suggestions list can be positioned absolutely right
  // below it instead of rendering in-flow, which was shifting the whole
  // form (Vehicle Type, Search Cabs button, etc.) up/down on every
  // keystroke and made typing feel janky.
  const [pickupFieldHeight, setPickupFieldHeight] = useState(0);
  const [dropFieldHeight, setDropFieldHeight] = useState(0);

  useEffect(() => {
    if (activeField !== 'pickup' || pickup.trim().length < 3) {
      setPickupSuggestions([]);
      setIsSearchingPickup(false);
      return;
    }
    if (pickupDebounceRef.current) clearTimeout(pickupDebounceRef.current);
    setIsSearchingPickup(true);
    const seq = ++pickupRequestSeq.current;
    pickupDebounceRef.current = setTimeout(async () => {
      try {
        const res = await searchLocations(pickup);
        if (seq === pickupRequestSeq.current) setPickupSuggestions(res.data.data);
      } catch {
        if (seq === pickupRequestSeq.current) setPickupSuggestions([]);
      } finally {
        if (seq === pickupRequestSeq.current) setIsSearchingPickup(false);
      }
    }, 600);
    return () => {
      if (pickupDebounceRef.current) clearTimeout(pickupDebounceRef.current);
    };
  }, [pickup, activeField]);

  useEffect(() => {
    if (activeField !== 'drop' || drop.trim().length < 3) {
      setDropSuggestions([]);
      setIsSearchingDrop(false);
      return;
    }
    if (dropDebounceRef.current) clearTimeout(dropDebounceRef.current);
    setIsSearchingDrop(true);
    const seq = ++dropRequestSeq.current;
    dropDebounceRef.current = setTimeout(async () => {
      try {
        const res = await searchLocations(drop);
        if (seq === dropRequestSeq.current) setDropSuggestions(res.data.data);
      } catch {
        if (seq === dropRequestSeq.current) setDropSuggestions([]);
      } finally {
        if (seq === dropRequestSeq.current) setIsSearchingDrop(false);
      }
    }, 600);
    return () => {
      if (dropDebounceRef.current) clearTimeout(dropDebounceRef.current);
    };
  }, [drop, activeField]);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const res = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      setPickup(res.data.data.address);
      setPickupCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      setActiveField(null);
      setPickupSuggestions([]);
    } catch (error: any) {
      showToast('Could not detect your location');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSearchCabs = async () => {
    if (!pickup || !drop) {
      showToast('Enter both pick-up and drop locations');
      return;
    }
    if (!date || !time) {
      showToast('Please select a date and time');
      return;
    }
    if (tripType === 'roundway' && (!returnDate || !returnTime)) {
      showToast('Please select a return date and time for your round trip');
      return;
    }
    setIsSearching(true);
    try {
      const res = await getRideQuote({
        pickup: { address: pickup, ...(pickupCoords || {}) },
        drop: { address: drop, ...(dropCoords || {}) },
      });
      if (!res.data.data.offers.length) {
        showToast('No vehicles currently serve this route');
        return;
      }
      setSearch({
        pickup,
        drop,
        pickupCoords,
        dropCoords,
        rideDate: date,
        rideTime: time,
        passengerCount,
        tripType: tripType === 'roundway' ? 'ROUND_TRIP' : 'ONE_WAY',
        returnDate: tripType === 'roundway' ? returnDate : '',
        returnTime: tripType === 'roundway' ? returnTime : '',
      });
      // Vehicle Type here is just a preference to pre-highlight on the next
      // screen — the actual choice + real prices are shown there.
      setQuote(res.data.data, selectedCategory);
      onNavigate('vehicle-select');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not fetch fare, please try again');
    } finally {
      setIsSearching(false);
    }
  };

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
    const tempCoords = pickupCoords;
    setPickup(drop);
    setPickupCoords(dropCoords);
    setDrop(temp);
    setDropCoords(tempCoords);
    showToast('Locations swapped');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      
      {/* Main Mobile App Viewport Container */}
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', position: 'relative' }}>
        
        

        {/* Scrollable Main Screen Content */}
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ==========================================
              SCREEN 31: RIDER HOME & SEARCH (31.png)
             ========================================== */}
          {activeScreen === '31' && (
            <View style={{ padding: 12, gap: 10 }}>
              
              {/* Header Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2, paddingBottom: 2 }}>
                <TouchableOpacity onPress={() => onNavigate('36')} style={{ padding: 2 }}>
                  <Menu size={20} color="#0F172A" />
                </TouchableOpacity>

                {/* Brand Logo */}
                <View style={{ alignItems: 'center' }}>
                  <Image source={LOGO_TRANSPARENT} style={{ width: 100, height: 28 }} resizeMode="contain" />
                  <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#64748B', marginTop: -3 }}>
                    powered by musafirbaba
                  </Text>
                </View>

                <TouchableOpacity onPress={() => onNavigate('38')} style={{ padding: 2, position: 'relative' }}>
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
                <View style={{ position: 'relative', zIndex: activeField === 'pickup' ? 20 : 1 }}>
                  <View onLayout={(e) => setPickupFieldHeight(e.nativeEvent.layout.height)}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Pick-up Location</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#10B981', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#10B981' }} />
                        </View>
                        <TextInput
                          value={pickup}
                          onChangeText={(t) => { setPickup(t); setPickupCoords(null); }}
                          onFocus={() => setActiveField('pickup')}
                          placeholder="Enter pick-up location"
                          placeholderTextColor="#94A3B8"
                          style={{ flex: 1, backgroundColor: 'transparent', fontSize: 12, fontWeight: '700', color: '#0F172A', padding: 0 }}
                        />
                      </View>
                      <TouchableOpacity onPress={handleUseCurrentLocation} disabled={isLocating} style={{ padding: 2 }}>
                        {isLocating ? <ActivityIndicator size="small" color="#FF3B00" /> : <LocateFixed size={16} color="#0F172A" />}
                      </TouchableOpacity>
                    </View>
                  </View>
                  {activeField === 'pickup' && pickup.trim().length >= 3 && (
                    <View style={{ position: 'absolute', top: pickupFieldHeight + 4, left: 0, right: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 4 }}>
                      {isSearchingPickup && (
                        <View style={{ padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ActivityIndicator size="small" color="#FF3B00" />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>Searching...</Text>
                        </View>
                      )}
                      {!isSearchingPickup && pickupSuggestions.length === 0 && (
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>No matching locations found</Text>
                        </View>
                      )}
                      {!isSearchingPickup && pickupSuggestions.map((s, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setPickup(s.address);
                            setPickupCoords({ lat: s.lat, lng: s.lng });
                            setActiveField(null);
                            setPickupSuggestions([]);
                          }}
                          style={{ paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#334155' }}>{s.address}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Drop Location */}
                <View style={{ position: 'relative', zIndex: activeField === 'drop' ? 20 : 1 }}>
                  <View onLayout={(e) => setDropFieldHeight(e.nativeEvent.layout.height)}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Drop Location</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <MapPin size={16} color="#FF3B00" />
                        <TextInput
                          value={drop}
                          onChangeText={(t) => { setDrop(t); setDropCoords(null); }}
                          onFocus={() => setActiveField('drop')}
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
                  {activeField === 'drop' && drop.trim().length >= 3 && (
                    <View style={{ position: 'absolute', top: dropFieldHeight + 4, left: 0, right: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 4 }}>
                      {isSearchingDrop && (
                        <View style={{ padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ActivityIndicator size="small" color="#FF3B00" />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>Searching...</Text>
                        </View>
                      )}
                      {!isSearchingDrop && dropSuggestions.length === 0 && (
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>No matching locations found</Text>
                        </View>
                      )}
                      {!isSearchingDrop && dropSuggestions.map((s, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => {
                            setDrop(s.address);
                            setDropCoords({ lat: s.lat, lng: s.lng });
                            setActiveField(null);
                            setDropSuggestions([]);
                          }}
                          style={{ paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#334155' }}>{s.address}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Date & Time Selector Row */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                  <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#F8FAFC', paddingRight: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Date</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Calendar size={15} color="#3B82F6" />
                      {isWeb ? (
                        createElement('input', {
                          type: 'date',
                          value: date,
                          min: formatDate(new Date()),
                          onChange: (e: any) => setDate(e.target.value),
                          className: 'mbgo-native-datetime-input',
                          style: {
                            flex: 1,
                            width: '100%',
                            padding: 0,
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontSize: 11,
                            fontWeight: 'bold',
                            color: date ? '#0F172A' : '#CBD5E1',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                          },
                        })
                      ) : (
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: date ? '#0F172A' : '#CBD5E1' }}>{date || 'Select date'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Time</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Clock size={15} color="#3B82F6" />
                      {isWeb ? (
                        createElement('input', {
                          type: 'time',
                          value: to24Hour(time),
                          onChange: (e: any) => setTime(e.target.value ? to12Hour(e.target.value) : ''),
                          className: 'mbgo-native-datetime-input',
                          style: {
                            flex: 1,
                            width: '100%',
                            padding: 0,
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            fontSize: 11,
                            fontWeight: 'bold',
                            color: time ? '#0F172A' : '#CBD5E1',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                          },
                        })
                      ) : (
                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: time ? '#0F172A' : '#CBD5E1' }}>{time || 'Select time'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>

                {!isWeb && showDatePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (event.type !== 'dismissed' && selectedDate) setDate(formatDate(selectedDate));
                    }}
                  />
                )}
                {!isWeb && showTimePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    onChange={(event, selectedTime) => {
                      setShowTimePicker(Platform.OS === 'ios');
                      if (event.type !== 'dismissed' && selectedTime) setTime(formatTime(selectedTime));
                    }}
                  />
                )}

                {/* Return Date & Time -- only applies to Round Trip */}
                {tripType === 'roundway' && (
                  <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                    <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#F8FAFC', paddingRight: 6 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Return Date</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Calendar size={15} color="#10B981" />
                        {isWeb ? (
                          createElement('input', {
                            type: 'date',
                            value: returnDate,
                            min: date || formatDate(new Date()),
                            onChange: (e: any) => setReturnDate(e.target.value),
                            className: 'mbgo-native-datetime-input',
                            style: {
                              flex: 1,
                              width: '100%',
                              padding: 0,
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: 11,
                              fontWeight: 'bold',
                              color: returnDate ? '#0F172A' : '#CBD5E1',
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                            },
                          })
                        ) : (
                          <TouchableOpacity onPress={() => setShowReturnDatePicker(true)} style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: returnDate ? '#0F172A' : '#CBD5E1' }}>{returnDate || 'Select date'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={{ flex: 1, paddingLeft: 8 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Return Time</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Clock size={15} color="#10B981" />
                        {isWeb ? (
                          createElement('input', {
                            type: 'time',
                            value: to24Hour(returnTime),
                            onChange: (e: any) => setReturnTime(e.target.value ? to12Hour(e.target.value) : ''),
                            className: 'mbgo-native-datetime-input',
                            style: {
                              flex: 1,
                              width: '100%',
                              padding: 0,
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: 11,
                              fontWeight: 'bold',
                              color: returnTime ? '#0F172A' : '#CBD5E1',
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                            },
                          })
                        ) : (
                          <TouchableOpacity onPress={() => setShowReturnTimePicker(true)} style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: returnTime ? '#0F172A' : '#CBD5E1' }}>{returnTime || 'Select time'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {!isWeb && showReturnDatePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    minimumDate={date ? new Date(date) : new Date()}
                    onChange={(event, selectedDate) => {
                      setShowReturnDatePicker(Platform.OS === 'ios');
                      if (event.type !== 'dismissed' && selectedDate) setReturnDate(formatDate(selectedDate));
                    }}
                  />
                )}
                {!isWeb && showReturnTimePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    onChange={(event, selectedTime) => {
                      setShowReturnTimePicker(Platform.OS === 'ios');
                      if (event.type !== 'dismissed' && selectedTime) setReturnTime(formatTime(selectedTime));
                    }}
                  />
                )}

                {/* Vehicle Type Picker */}
                <TouchableOpacity onPress={() => setShowVehiclePicker(true)} style={{ borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 2 }}>Vehicle Type</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Car size={15} color="#6366F1" />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: vehicleType ? '#0F172A' : '#CBD5E1' }}>{vehicleType || 'Select vehicle type'}</Text>
                    </View>
                    <ChevronRight size={14} color="#94A3B8" />
                  </View>
                </TouchableOpacity>

                <Modal visible={showVehiclePicker} transparent animationType="fade" onRequestClose={() => setShowVehiclePicker(false)}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
                    onPress={() => setShowVehiclePicker(false)}
                    activeOpacity={1}
                  >
                    <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A', paddingBottom: 2 }}>Select Vehicle Type</Text>
                      {VEHICLE_CATEGORIES.map((v) => (
                        <TouchableOpacity
                          key={v.category}
                          onPress={() => {
                            setSelectedCategory(v.category);
                            setVehicleType(v.label);
                            setShowVehiclePicker(false);
                          }}
                          style={{ padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: selectedCategory === v.category ? '#FFF5EF' : '#F8FAFC', borderWidth: selectedCategory === v.category ? 1 : 0, borderColor: '#FF3B00' }}
                        >
                          <Car size={16} color="#FF3B00" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>{v.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </TouchableOpacity>
                </Modal>

                {/* Search Cabs Action Button */}
                <TouchableOpacity
                  onPress={handleSearchCabs}
                  disabled={isSearching}
                  style={{ width: '100%', height: 38, backgroundColor: '#FF3B00', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13, textAlign: 'center' }}>
                    {isSearching ? 'Searching...' : 'Search Cabs'}
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
                    { icon: Plane, label: 'Airport\nTransfer', bg: '#ECFDF5', iconColor: '#059669', action: () => showToast('Coming soon') },
                    { icon: Route, label: 'Outstation\nTrips', bg: '#FFF7ED', iconColor: '#EA580C', action: () => showToast('Coming soon') },
                    { icon: RotateCcw, label: 'Hourly\nRental', bg: '#EFF6FF', iconColor: '#2563EB', action: () => showToast('Coming soon') },
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
                    onPress={() => onNavigate('32')}
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
                  <Switch 
                    value={addInsurance}
                    onValueChange={(val) => setAddInsurance(val)}
                    trackColor={{ false: '#cbd5e1', true: '#FF3B00' }}
                    thumbColor={addInsurance ? '#ffffff' : '#f4f3f4'}
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
// FORCE_REBUILD_CACHE_BUST_1786123613905
console.log('CACHE_BUST_1786124057438');

console.log('CACHE_BUST_BARS_1786124237190');

console.log('CACHE_BUST_PROFILE_FIX_1786124506907');

console.log('CACHE_BUST_PROFILE_36_1786124896535');

console.log('CACHE_BUST_HTML_TO_RN_1786128166251');

console.log('CACHE_BUST_AST_FIX_1786128723836');
