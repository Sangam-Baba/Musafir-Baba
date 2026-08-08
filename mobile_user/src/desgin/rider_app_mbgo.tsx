import React, { useState } from 'react';
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
} from 'lucide-react';

export default function App() {
  // Navigation active screen: '31' | '32' | '33' | '34' | '35'
  const [activeScreen, setActiveScreen] = useState('31');

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
  const showToast = (msg) => {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 font-sans text-slate-900 selection:bg-orange-500 selection:text-white sm:py-6">
      
      {/* Top Test Navigation Switcher Bar */}
      <div className="w-full max-w-[430px] mb-3 px-3 py-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar bg-slate-800/90 rounded-2xl border border-slate-700 shadow-lg text-[11px] font-bold text-slate-300">
        <span className="text-orange-400 font-black shrink-0">MBGO Screens:</span>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => setActiveScreen('31')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '31' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            31. Home
          </button>
          <button 
            onClick={() => setActiveScreen('32')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '32' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            32. Fare
          </button>
          <button 
            onClick={() => setActiveScreen('33')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '33' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            33. Payment
          </button>
          <button 
            onClick={() => setActiveScreen('34')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '34' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            34. Tracking
          </button>
          <button 
            onClick={() => setActiveScreen('35')}
            className={`px-2.5 py-1 rounded-xl transition ${activeScreen === '35' ? 'bg-orange-500 text-white font-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            35. My Trips
          </button>
        </div>
      </div>

      {/* Main Mobile App Viewport Container */}
      <div className="w-full max-w-[430px] bg-[#F8FAFC] min-h-[920px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        {/* iOS Phone Status Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 pt-3 pb-1 flex justify-between items-center text-xs font-bold text-slate-900 border-b border-slate-100/50">
          <span>9:41</span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-extrabold">5G</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          </div>
        </div>

        {/* Scrollable Main Screen Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">

          {/* ==========================================
              SCREEN 31: RIDER HOME & SEARCH (31.png)
             ========================================== */}
          {activeScreen === '31' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pt-1">
                <button className="p-1 hover:bg-slate-100 rounded-full text-slate-800 transition">
                  <Menu className="w-6 h-6 stroke-[2.2]"/>
                </button>

                {/* Brand Logo */}
                <div className="text-center">
                  <div className="text-2xl font-black tracking-tight flex items-center justify-center leading-none">
                    <span className="text-[#002B66]">MB</span>
                    <span className="text-[#FF3B00]">GO</span>
                  </div>
                  <div className="text-[8px] font-bold text-slate-400 tracking-wider uppercase -mt-0.5">
                    powered by musafirbaba
                  </div>
                </div>

                <button className="p-1 hover:bg-slate-100 rounded-full text-slate-800 relative transition">
                  <Bell className="w-6 h-6 stroke-[2.2]"/>
                  <span className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-1 right-1 border border-white"></span>
                </button>
              </div>

              {/* Greeting & Hero Graphic Header */}
              <div className="relative pt-1 pb-1 flex justify-between items-start min-h-[105px]">
                <div className="space-y-0.5 max-w-[58%] z-10 pt-1">
                  <span className="text-xs font-bold text-[#FF3B00]">Hello,</span>
                  <h1 className="text-xl font-black text-slate-900 leading-tight">
                    Where would you like to go today?
                  </h1>
                </div>

                {/* White SUV Car Hero Illustration */}
                <div className="absolute right-0 -top-1 w-44 h-28 pointer-events-none z-0">
                  <svg viewBox="0 0 200 120" className="w-full h-full drop-shadow-md">
                    <path d="M 10 90 Q 60 20 180 80" fill="none" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 4"/>
                    <circle cx="70" cy="50" r="3" fill="#FF3B00"/>
                    <circle cx="150" cy="40" r="3" fill="#FF3B00"/>
                    <g transform="translate(40, 25)">
                      <rect x="10" y="30" width="120" height="35" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5"/>
                      <path d="M 30 30 L 45 12 L 85 12 L 105 30 Z" fill="#002B66"/>
                      <circle cx="35" cy="65" r="12" fill="#1E293B" stroke="#FFFFFF" strokeWidth="3"/>
                      <circle cx="105" cy="65" r="12" fill="#1E293B" stroke="#FFFFFF" strokeWidth="3"/>
                      <rect x="15" y="40" width="15" height="10" rx="2" fill="#FF3B00"/>
                      <rect x="110" y="40" width="15" height="10" rx="2" fill="#002B66"/>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Main Booking Search Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3 relative z-10">
                
                {/* Pick-up Location */}
                <div className="relative">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Pick-up Location</span>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5 flex-1">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      </div>
                      <input 
                        type="text" 
                        value={pickup}
                        onChange={(e) => setPickup(e.target.value)}
                        placeholder="Enter pick-up location"
                        className="w-full bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none placeholder:text-slate-300"
                      />
                    </div>
                    <button onClick={() => showToast("Detecting location...")} className="p-1 text-slate-700 hover:text-slate-900">
                      <LocateFixed className="w-4 h-4"/>
                    </button>
                  </div>
                </div>

                {/* Drop Location */}
                <div className="relative">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Drop Location</span>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5 flex-1">
                      <MapPin className="w-4 h-4 text-[#FF3B00] shrink-0"/>
                      <input 
                        type="text" 
                        value={drop}
                        onChange={(e) => setDrop(e.target.value)}
                        placeholder="Enter drop location"
                        className="w-full bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none placeholder:text-slate-300"
                      />
                    </div>
                    <button onClick={swapLocations} className="p-1 text-slate-700 hover:text-slate-900">
                      <ArrowUpDown className="w-4 h-4"/>
                    </button>
                  </div>
                </div>

                {/* Date & Time Selector Row */}
                <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2.5">
                  <div className="border-r border-slate-100 pr-2">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Date</span>
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0"/>
                      <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent focus:outline-none w-full text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="pl-1">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Time</span>
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0"/>
                      <select 
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="bg-transparent focus:outline-none w-full text-xs font-bold text-slate-800"
                      >
                        <option value="08:00 AM">08:00 AM</option>
                        <option value="10:30 AM">10:30 AM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="06:00 PM">06:00 PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Vehicle Type Picker */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Vehicle Type</span>
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 pt-0.5">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-[#FF3B00] shrink-0"/>
                      <span>{vehicleType}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>
                </div>

                {/* Search Cabs Action Button */}
                <button 
                  onClick={() => setActiveScreen('32')}
                  className="w-full bg-[#FF3B00] hover:bg-orange-600 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition active:scale-98 mt-2"
                >
                  Search Cabs
                </button>

              </div>

              {/* Popular Services Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">Popular Services</h2>
                  <button className="text-xs font-bold text-[#FF3B00] flex items-center gap-0.5">
                    View All <ChevronRight className="w-3.5 h-3.5"/>
                  </button>
                </div>

                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { icon: Plane, label: 'Airport Transfer', color: 'bg-emerald-100 text-emerald-600' },
                    { icon: Navigation, label: 'Outstation Trips', color: 'bg-orange-100 text-orange-600' },
                    { icon: RotateCcw, label: 'Hourly Rental', color: 'bg-blue-100 text-blue-600' },
                    { icon: Building2, label: 'Corporate Travel', color: 'bg-purple-100 text-purple-600' },
                    { icon: Palmtree, label: 'Tour Packages', color: 'bg-amber-100 text-amber-600' },
                  ].map((srv, idx) => {
                    const Icon = srv.icon;
                    return (
                      <div 
                        key={idx}
                        onClick={() => setActiveScreen('32')}
                        className="bg-white border border-slate-200/70 rounded-2xl p-3 flex flex-col items-center justify-center min-w-[76px] text-center space-y-2 cursor-pointer hover:border-orange-300 transition shadow-2xs shrink-0"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${srv.color}`}>
                          <Icon className="w-5 h-5"/>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-800 leading-tight">{srv.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Banner Card */}
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100 border border-orange-200/70 rounded-3xl p-4 flex items-center justify-between relative overflow-hidden shadow-2xs">
                <div className="space-y-1 z-10 max-w-[65%]">
                  <h3 className="text-xs font-black text-slate-900 leading-snug">
                    Travel with comfort at the best prices
                  </h3>
                  <p className="text-[10px] text-slate-600 font-bold">Safe | Reliable | On-time</p>
                  <button 
                    onClick={() => setActiveScreen('32')}
                    className="bg-[#FF3B00] hover:bg-orange-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl shadow-md transition active:scale-95 mt-2 inline-block"
                  >
                    Book Now
                  </button>
                </div>
                <div className="w-24 h-20 bg-orange-200/40 rounded-2xl flex items-center justify-center shrink-0">
                  <Car className="w-12 h-12 text-[#FF3B00]"/>
                </div>
              </div>

              {/* Why Travel With MBGO? Section */}
              <div className="space-y-2 pt-1">
                <h2 className="text-sm font-black text-slate-900 tracking-tight">Why travel with MBGO?</h2>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: ShieldCheck, label: 'Verified Partners', color: 'bg-emerald-100 text-emerald-600' },
                    { icon: Award, label: 'Best Price Guarantee', color: 'bg-orange-100 text-orange-600' },
                    { icon: Headphones, label: '24x7 Support', color: 'bg-blue-100 text-blue-600' },
                    { icon: Lock, label: 'Safe & Secure Ride', color: 'bg-purple-100 text-purple-600' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-2.5 flex flex-col items-center text-center space-y-1.5 shadow-2xs">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.color}`}>
                          <Icon className="w-4 h-4"/>
                        </div>
                        <span className="text-[9px] font-extrabold text-slate-800 leading-tight">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              SCREEN 32: FARE SUMMARY (32.png)
             ========================================== */}
          {activeScreen === '32' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setActiveScreen('31')} className="p-1 hover:bg-slate-100 rounded-full text-slate-800">
                  <ArrowLeft className="w-5 h-5"/>
                </button>
                <h1 className="text-base font-black text-slate-900">Fare Summary</h1>
                <div className="w-5"></div>
              </div>

              {/* Route & Trip Details Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                      <div>
                        <div className="text-xs font-black text-slate-900">{pickup}</div>
                        <div className="text-[10px] text-slate-400 font-bold">Pick-up</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] mt-1 shrink-0"></div>
                      <div>
                        <div className="text-xs font-black text-slate-900">{drop}</div>
                        <div className="text-[10px] text-slate-400 font-bold">Drop</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <button 
                      onClick={() => setActiveScreen('31')}
                      className="text-[10px] font-bold text-[#FF3B00] flex items-center gap-1 justify-end ml-auto"
                    >
                      <Edit2 className="w-3 h-3"/> Edit Trip
                    </button>
                    <div className="text-[10px] font-extrabold text-slate-700 flex items-center justify-end gap-1 pt-1">
                      <Calendar className="w-3 h-3 text-slate-400"/> {date}
                    </div>
                    <div className="text-[10px] font-extrabold text-slate-700 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3 text-slate-400"/> {time}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">One Way</div>
                  </div>
                </div>

                {/* Vehicle Choice Row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 overflow-hidden">
                      <Car className="w-9 h-9 text-slate-700"/>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">Sedan</div>
                      <div className="text-[10px] text-slate-500 font-bold">Dzire, Etios, Amaze or similar</div>
                      <div className="flex items-center gap-2 pt-1 text-[10px] font-extrabold text-slate-600">
                        <span className="flex items-center gap-0.5"><Users className="w-3 h-3 text-slate-400"/> 4 Passengers</span>
                        <span className="flex items-center gap-0.5"><Briefcase className="w-3 h-3 text-slate-400"/> 2 Bags</span>
                        <span className="flex items-center gap-0.5 text-emerald-600"><Snowflake className="w-3 h-3"/> AC Vehicle</span>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setActiveScreen('31')} className="text-[10px] font-bold text-[#FF3B00] flex items-center gap-0.5">
                    <Edit2 className="w-3 h-3"/> Change
                  </button>
                </div>
              </div>

              {/* Itemized Fare Breakdown Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-900">Fare Breakdown</h3>
                  <span className="text-[10px] font-bold text-slate-400">Amount (₹)</span>
                </div>

                <div className="space-y-2.5 text-xs font-bold text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><Car className="w-3.5 h-3.5"/></div>
                      Base Fare (275 km)
                    </span>
                    <span className="font-black text-slate-900">5,200</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><User className="w-3.5 h-3.5"/></div>
                      Driver Allowance
                    </span>
                    <span className="font-black text-slate-900">450</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><Navigation className="w-3.5 h-3.5"/></div>
                      Toll & Taxes
                    </span>
                    <span className="font-black text-slate-900">300</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><Building2 className="w-3.5 h-3.5"/></div>
                      Parking Charges
                    </span>
                    <span className="font-black text-slate-900">300</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-600">
                    <span className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><Gift className="w-3.5 h-3.5"/></div>
                      Discount (WELCOME10)
                    </span>
                    <span className="font-black">-200</span>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-black text-slate-900">Total Amount</div>
                      <div className="text-[9px] text-slate-400 font-medium">All inclusive of taxes</div>
                    </div>
                    <div className="text-lg font-black text-slate-900">₹6,250</div>
                  </div>
                </div>
              </div>

              {/* Savings Banner */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/>
                  <div>
                    <div className="text-xs font-black text-emerald-900">You are saving ₹1,050 on this booking</div>
                    <div className="text-[10px] font-bold text-emerald-700">Best price guaranteed!</div>
                  </div>
                </div>
                <Award className="w-6 h-6 text-emerald-600 shrink-0"/>
              </div>

              {/* Secure Booking Insurance */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#FF3B00] shrink-0"/>
                  <div>
                    <div className="text-xs font-black text-slate-900">Secure your booking</div>
                    <div className="text-[10px] text-slate-500 font-bold">Refundable in case of cancellation</div>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={addInsurance}
                    onChange={(e) => setAddInsurance(e.target.checked)}
                    className="w-4 h-4 accent-[#FF3B00] rounded"
                  />
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 block">Add for ₹200</span>
                    <span className="text-[8px] text-slate-400 font-bold block">(Recommended)</span>
                  </div>
                </label>
              </div>

              {/* Total Payable & Proceed Button Bar */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 space-y-3 shadow-md">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-5 h-5 text-[#FF3B00]"/>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">To be paid</div>
                      <div className="text-base font-black text-slate-900">₹{addInsurance ? '6,450' : '6,250'}</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5"/> 100% Secure Payment
                  </div>
                </div>

                <button 
                  onClick={() => setActiveScreen('33')}
                  className="w-full bg-[#FF3B00] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 transition active:scale-98 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4"/>
                  <span>Proceed to Booking</span>
                </button>
              </div>

              <p className="text-[10px] text-center text-slate-400 font-bold flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500"/>
                Your payment and personal details are 100% secure.
              </p>

            </div>
          )}

          {/* ==========================================
              SCREEN 33: PAYMENT SCREEN (33.png)
             ========================================== */}
          {activeScreen === '33' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setActiveScreen('32')} className="p-1 hover:bg-slate-100 rounded-full text-slate-800">
                  <ArrowLeft className="w-5 h-5"/>
                </button>
                <h1 className="text-base font-black text-slate-900">Payment</h1>
                <span className="text-[10px] font-extrabold text-emerald-600 flex items-center gap-0.5">
                  <ShieldCheck className="w-3.5 h-3.5"/> 100% Secure
                </span>
              </div>

              {/* Confirmation Banner */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/>
                  <div>
                    <div className="text-xs font-black text-emerald-900">Your booking is confirmed!</div>
                    <div className="text-[10px] font-bold text-emerald-700">Complete your payment to confirm your ride.</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[8px] font-bold text-slate-400 uppercase">Booking ID</div>
                  <div className="text-[9px] font-black text-slate-900">MBGO2505200001</div>
                </div>
              </div>

              {/* Trip Details Summary Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>New Delhi, Delhi</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold pl-3">Pick-up</div>

                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 pt-1">
                      <div className="w-2 h-2 rounded-full bg-[#FF3B00]"></div>
                      <span>Jaipur, Rajasthan</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold pl-3">Drop</div>
                  </div>

                  <div className="text-right text-[10px] font-extrabold text-slate-600 space-y-1">
                    <div><Calendar className="w-3 h-3 inline text-slate-400"/> 20 May 2025</div>
                    <div><Clock className="w-3 h-3 inline text-slate-400"/> 08:00 AM</div>
                    <div className="text-slate-500">One Way</div>
                    <div><Users className="w-3 h-3 inline text-slate-400"/> 2 Passengers</div>
                    <div><Briefcase className="w-3 h-3 inline text-slate-400"/> 2 Bags</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900">Sedan</div>
                    <div className="text-[9px] text-slate-400 font-bold">Dzire, Etios</div>
                    <div className="text-[9px] text-emerald-600 font-bold pt-1">4 Seats • AC</div>
                  </div>
                </div>
              </div>

              {/* Fare Summary Accordion snippet */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-900">Fare Summary</span>
                  <div className="text-right">
                    <div className="text-xs font-black text-[#FF3B00]">Total Amount ₹6,250</div>
                    <div className="text-[8px] font-bold text-slate-400">All inclusive of taxes</div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-600">
                  <span>Discount (WELCOME10)</span>
                  <span>-200</span>
                </div>
              </div>

              {/* Choose Payment Method Section */}
              <div className="space-y-2">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Choose Payment Method</h2>

                <div className="space-y-2">
                  
                  {/* UPI / Cards Option */}
                  <div 
                    onClick={() => setPaymentMethod('upi_cards')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'upi_cards' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[#FF3B00]"/>
                      <div>
                        <div className="text-xs font-black text-slate-900">UPI / Cards</div>
                        <div className="text-[10px] text-slate-500 font-semibold">Visa, Mastercard, Rupay, Amex</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[8px] font-black text-slate-600">
                        <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded">VISA</span>
                        <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded">MC</span>
                        <span className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded">RuPay</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'upi_cards' ? 'border-[#FF3B00] bg-[#FF3B00]' : 'border-slate-300'}`}>
                        {paymentMethod === 'upi_cards' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  </div>

                  {/* UPI Direct */}
                  <div 
                    onClick={() => setPaymentMethod('upi')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'upi' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-blue-500"/>
                      <div>
                        <div className="text-xs font-black text-slate-900">UPI</div>
                        <div className="text-[10px] text-slate-500 font-semibold">Pay using any UPI app</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[8px] font-black text-slate-600">
                        <span className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded">Paytm</span>
                        <span className="bg-purple-50 text-purple-700 px-1 py-0.5 rounded">PhonePe</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'upi' ? 'border-[#FF3B00] bg-[#FF3B00]' : 'border-slate-300'}`}>
                        {paymentMethod === 'upi' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  </div>

                  {/* Net Banking */}
                  <div 
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'netbanking' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-purple-600"/>
                      <div>
                        <div className="text-xs font-black text-slate-900">Net Banking</div>
                        <div className="text-[10px] text-slate-500 font-semibold">All major banks supported</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>

                  {/* Wallets */}
                  <div 
                    onClick={() => setPaymentMethod('wallet')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'wallet' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-emerald-600"/>
                      <div>
                        <div className="text-xs font-black text-slate-900">Wallets</div>
                        <div className="text-[10px] text-slate-500 font-semibold">Paytm, PhonePe, Amazon Pay & more</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400"/>
                  </div>

                  {/* Pay Later */}
                  <div 
                    onClick={() => setPaymentMethod('paylater')}
                    className={`border-2 rounded-2xl p-3.5 cursor-pointer transition flex items-center justify-between ${
                      paymentMethod === 'paylater' ? 'border-[#FF3B00] bg-orange-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock3 className="w-5 h-5 text-amber-600"/>
                      <div>
                        <div className="text-xs font-black text-slate-900">Pay Later</div>
                        <div className="text-[10px] text-slate-500 font-semibold">Buy now, pay later options (Simpl)</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-black bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded">Simpl</span>
                  </div>

                </div>
              </div>

              {/* Pay Now Button */}
              <button 
                onClick={() => setActiveScreen('34')}
                className="w-full bg-[#FF3B00] hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-2xl shadow-xl shadow-orange-500/30 transition active:scale-98 flex items-center justify-center gap-2 mt-4"
              >
                <Lock className="w-4 h-4"/>
                <span>Pay Now ₹6,250</span>
                <ChevronRight className="w-4 h-4 ml-1"/>
              </button>

              <p className="text-[10px] text-center text-slate-400 font-bold">
                By proceeding, you agree to our <a href="#" className="text-[#FF3B00] underline">Terms & Conditions</a>
              </p>

            </div>
          )}

          {/* ==========================================
              SCREEN 34: LIVE TRACKING (34.png)
             ========================================== */}
          {activeScreen === '34' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setActiveScreen('31')} className="p-1 hover:bg-slate-100 rounded-full text-slate-800">
                  <ArrowLeft className="w-5 h-5"/>
                </button>
                <h1 className="text-base font-black text-slate-900">Live Tracking</h1>
                <div className="flex items-center gap-2">
                  <button className="p-1 text-slate-700 hover:bg-slate-100 rounded-full"><Headphones className="w-5 h-5"/></button>
                  <button className="p-1 text-slate-700 hover:bg-slate-100 rounded-full relative"><Bell className="w-5 h-5"/><span className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-1 right-1"></span></button>
                </div>
              </div>

              {/* Partner Assigned Status Banner */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0"/>
                  <div>
                    <div className="text-xs font-black text-emerald-900">Partner Assigned!</div>
                    <div className="text-[10px] font-bold text-emerald-700">Your ride partner is on the way.</div>
                  </div>
                </div>
                <button className="text-[10px] font-black text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-xl">
                  View Details
                </button>
              </div>

              {/* Vector Map Graphic Box */}
              <div className="bg-[#E2E8F0] border border-slate-300 rounded-3xl h-52 relative overflow-hidden flex flex-col justify-between p-3 shadow-inner">
                {/* Map Grid Pattern */}
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                {/* Highway Route Curve Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 50 40 Q 180 90 320 170" stroke="#059669" strokeWidth="5" fill="none" strokeDasharray="8 4"/>
                </svg>

                {/* Floating Map Route Info Card */}
                <div className="relative z-10 bg-white/95 backdrop-blur-xs p-2.5 rounded-2xl shadow-md self-start max-w-[210px] text-[10px] font-black space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span>New Delhi, Delhi</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#FF3B00]">
                    <MapPin className="w-3 h-3 text-[#FF3B00]"/>
                    <span>Jaipur, Rajasthan</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-bold border-t border-slate-100 pt-1 mt-1">
                    275 km • 5h 20m remaining
                  </div>
                </div>

                {/* Moving Car Icon on Map */}
                <div className="relative z-10 self-center bg-[#FF3B00] text-white p-2.5 rounded-full shadow-xl animate-bounce">
                  <Car className="w-6 h-6"/>
                </div>

                {/* Map Floating Right Controls */}
                <div className="relative z-10 self-end flex flex-col gap-1">
                  <button className="w-8 h-8 rounded-full bg-white shadow-md text-slate-700 flex items-center justify-center">
                    <LocateFixed className="w-4 h-4"/>
                  </button>
                  <button className="w-8 h-8 rounded-full bg-white shadow-md text-slate-700 flex items-center justify-center">
                    <Navigation className="w-4 h-4"/>
                  </button>
                </div>
              </div>

              {/* Driver Details Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                      RK
                    </div>
                    <div>
                      <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        Ramesh Kumar
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-black">
                          ★ 4.8
                        </span>
                      </h2>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                        DL 1ZD 1234 • White Dzire
                      </div>
                      <div className="text-[9px] font-bold text-slate-400">Z1234567</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => showToast("Calling Driver Ramesh...")} className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl hover:bg-emerald-200 transition">
                      <Phone className="w-4 h-4"/>
                    </button>
                    <button onClick={() => showToast("Opening Chat...")} className="p-2.5 bg-blue-100 text-blue-800 rounded-2xl hover:bg-blue-200 transition">
                      <MessageSquare className="w-4 h-4"/>
                    </button>
                  </div>
                </div>

                {/* ETA Sub-banner */}
                <div className="bg-emerald-50/60 rounded-2xl p-2.5 flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF3B00]"/>
                    <div>
                      <div className="text-xs font-black text-slate-900">Your partner is 15 min away</div>
                      <div className="text-[9px] text-slate-500 font-semibold">from your pickup location</div>
                    </div>
                  </div>
                  <button className="text-[10px] font-black text-emerald-700">View ETA</button>
                </div>

                {/* Ride Progress Stepper Line */}
                <div className="pt-2 flex justify-between items-center text-[9px] font-black text-slate-500 text-center">
                  <div className="space-y-1 text-emerald-600">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto"><Check className="w-3.5 h-3.5"/></div>
                    <div>Partner Assigned</div>
                  </div>
                  <div className="w-6 h-[2px] bg-emerald-500 -mt-3"></div>
                  <div className="space-y-1 text-slate-800">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center mx-auto text-slate-700"><Car className="w-3.5 h-3.5"/></div>
                    <div>On the Way</div>
                  </div>
                  <div className="w-6 h-[2px] bg-slate-200 -mt-3"></div>
                  <div className="space-y-1 text-slate-400">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mx-auto"><MapPin className="w-3 h-3"/></div>
                    <div>Arrived at Pickup</div>
                  </div>
                  <div className="w-6 h-[2px] bg-slate-200 -mt-3"></div>
                  <div className="space-y-1 text-slate-400">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mx-auto"><Check className="w-3.5 h-3.5"/></div>
                    <div>Trip Completed</div>
                  </div>
                </div>
              </div>

              {/* Trip Details Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-3.5 shadow-2xs space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-black text-slate-900">Trip Details</span>
                  <button className="text-[10px] font-bold text-[#FF3B00]">View Details &gt;</button>
                </div>

                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="text-xs font-black text-slate-900">{pickup}</div>
                    <div className="text-[9px] text-slate-400 font-bold">Pick-up</div>
                    <div className="text-xs font-black text-slate-900 pt-1">{drop}</div>
                    <div className="text-[9px] text-slate-400 font-bold">Drop</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-400 font-bold">Total Amount</div>
                    <div className="text-base font-black text-[#FF3B00]">₹6,250</div>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md inline-block mt-1">
                      Paid ✓
                    </span>
                    <div className="text-[9px] text-slate-400 font-bold mt-0.5">UPI / Cards</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={() => showToast("Trip Status Shared!")}
                  className="flex-1 bg-white border border-[#FF3B00] hover:bg-orange-50 text-[#FF3B00] font-black text-xs py-3 rounded-2xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4"/>
                  <span>Share Trip Status</span>
                </button>
                <button className="p-3 border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-700">
                  <MoreHorizontal className="w-5 h-5"/>
                </button>
              </div>

            </div>
          )}

          {/* ==========================================
              SCREEN 35: MY TRIPS (35.png)
             ========================================== */}
          {activeScreen === '35' && (
            <div className="p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Header Bar */}
              <div className="flex items-center justify-between pt-1">
                <h1 className="text-lg font-black text-slate-900">My Trips</h1>
                <button className="p-1 hover:bg-slate-100 rounded-full text-slate-800 relative">
                  <Bell className="w-5 h-5"/>
                  <span className="w-2 h-2 rounded-full bg-[#FF3B00] absolute top-1 right-1"></span>
                </button>
              </div>

              {/* Status Tabs */}
              <div className="flex border-b border-slate-200 text-xs font-black text-slate-500">
                <button 
                  onClick={() => setTripsTab('upcoming')}
                  className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
                    tripsTab === 'upcoming' ? 'text-[#FF3B00] border-b-2 border-[#FF3B00]' : 'hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4"/> Upcoming
                </button>
                <button 
                  onClick={() => setTripsTab('completed')}
                  className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
                    tripsTab === 'completed' ? 'text-[#FF3B00] border-b-2 border-[#FF3B00]' : 'hover:text-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4"/> Completed
                </button>
                <button 
                  onClick={() => setTripsTab('cancelled')}
                  className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 transition ${
                    tripsTab === 'cancelled' ? 'text-[#FF3B00] border-b-2 border-[#FF3B00]' : 'hover:text-slate-800'
                  }`}
                >
                  <XCircle className="w-4 h-4"/> Cancelled
                </button>
              </div>

              {/* Filter Pills Row */}
              <div className="flex justify-between items-center text-[10px] font-black">
                <div className="flex gap-1.5">
                  <button className="bg-[#FF3B00] text-white px-3 py-1.5 rounded-xl shadow-2xs">All Trips</button>
                  <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-xl">Outstation</button>
                  <button className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-xl">Local</button>
                </div>
                <button className="border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl text-slate-700 flex items-center gap-1">
                  <Filter className="w-3 h-3"/> Filter
                </button>
              </div>

              {/* Refer & Earn Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-100 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Gift className="w-5 h-5 text-[#FF3B00] shrink-0"/>
                  <div>
                    <div className="text-xs font-black text-slate-900">Refer & Earn</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Refer your friends and earn exciting rewards.</div>
                  </div>
                </div>
                <button className="text-[10px] font-black text-white bg-[#FF3B00] hover:bg-orange-600 px-3 py-1.5 rounded-xl shadow-xs shrink-0">
                  Refer Now &gt;
                </button>
              </div>

              {/* Completed Trips List */}
              <div className="space-y-3">
                <div className="text-xs font-black text-slate-900">Completed Trips</div>

                {/* Trip Card 1 */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md">
                      ✓ Completed
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1">
                      Booking ID: MBGO2505200001 <Copy className="w-3 h-3 text-slate-400 cursor-pointer"/>
                    </span>
                  </div>

                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0"></div>
                        <div>
                          <div className="text-xs font-black text-slate-900">New Delhi, Delhi</div>
                          <div className="text-[9px] text-slate-400 font-bold">Pick-up</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] mt-0.5 shrink-0"></div>
                        <div>
                          <div className="text-xs font-black text-slate-900">Jaipur, Rajasthan</div>
                          <div className="text-[9px] text-slate-400 font-bold">Drop</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">Sedan</div>
                      <div className="text-[10px] text-slate-400 font-bold">Dzire, Etios, Amaze</div>
                      <div className="text-[10px] text-slate-500 font-bold">4 Seats • AC</div>
                      <div className="text-sm font-black text-[#FF3B00] mt-1">₹6,250</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-2.5 flex items-center justify-between text-[10px] font-extrabold text-slate-600">
                    <span>Driver Ramesh Kumar ★ 4.8</span>
                    <span>20 May 2025, 01:45 PM</span>
                  </div>

                  {/* Actions Row */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button onClick={() => showToast("Downloading Invoice...")} className="border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl text-[10px] font-black text-slate-700 flex items-center justify-center gap-1">
                      <Download className="w-3 h-3 text-slate-500"/> Download Invoice
                    </button>
                    <button onClick={() => showToast("Opening Receipt...")} className="border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl text-[10px] font-black text-slate-700 flex items-center justify-center gap-1">
                      <Receipt className="w-3 h-3 text-slate-500"/> Get Receipt
                    </button>
                    <button onClick={() => setActiveScreen('31')} className="bg-[#FF3B00] hover:bg-orange-600 text-white py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1">
                      <RotateCw className="w-3 h-3"/> Book Again
                    </button>
                  </div>
                </div>

                {/* Trip Card 2 */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-md">
                      ✓ Completed
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1">
                      Booking ID: MBGO1805200002 <Copy className="w-3 h-3 text-slate-400 cursor-pointer"/>
                    </span>
                  </div>

                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-0.5 shrink-0"></div>
                        <div>
                          <div className="text-xs font-black text-slate-900">Gurugram, Haryana</div>
                          <div className="text-[9px] text-slate-400 font-bold">Pick-up</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] mt-0.5 shrink-0"></div>
                        <div>
                          <div className="text-xs font-black text-slate-900">Agra, Uttar Pradesh</div>
                          <div className="text-[9px] text-slate-400 font-bold">Drop</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">SUV</div>
                      <div className="text-[10px] text-slate-400 font-bold">Ertiga, Carens</div>
                      <div className="text-[10px] text-slate-500 font-bold">6 Seats • AC</div>
                      <div className="text-sm font-black text-[#FF3B00] mt-1">₹9,750</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-2.5 flex items-center justify-between text-[10px] font-extrabold text-slate-600">
                    <span>Driver Mahesh Yadav ★ 4.7</span>
                    <span>18 May 2025, 06:30 PM</span>
                  </div>

                  {/* Actions Row */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button onClick={() => showToast("Downloading Invoice...")} className="border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl text-[10px] font-black text-slate-700 flex items-center justify-center gap-1">
                      <Download className="w-3 h-3 text-slate-500"/> Download Invoice
                    </button>
                    <button onClick={() => showToast("Opening Receipt...")} className="border border-slate-200 hover:bg-slate-50 py-1.5 rounded-xl text-[10px] font-black text-slate-700 flex items-center justify-center gap-1">
                      <Receipt className="w-3 h-3 text-slate-500"/> Get Receipt
                    </button>
                    <button onClick={() => setActiveScreen('31')} className="bg-[#FF3B00] hover:bg-orange-600 text-white py-1.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-1">
                      <RotateCw className="w-3 h-3"/> Book Again
                    </button>
                  </div>
                </div>

              </div>

              {/* Support Card Footer */}
              <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Headphones className="w-5 h-5 text-blue-600 shrink-0"/>
                  <div>
                    <div className="text-xs font-black text-blue-900">Need help with your trip?</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Our support team is available 24x7.</div>
                  </div>
                </div>
                <button onClick={() => showToast("Opening Support...")} className="text-[10px] font-black text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-xl shrink-0">
                  Contact Support &gt;
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Global Bottom App Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 py-2.5 px-6 flex justify-between items-center z-30">
          
          <button 
            onClick={() => setActiveScreen('31')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '31' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Car className="w-5 h-5"/>
            <span>Home</span>
          </button>

          <button 
            onClick={() => setActiveScreen('35')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '35' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Calendar className="w-5 h-5"/>
            <span>My Trips</span>
          </button>

          <button 
            onClick={() => setActiveScreen('32')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '32' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Receipt className="w-5 h-5"/>
            <span>Bookings</span>
          </button>

          <button 
            onClick={() => setActiveScreen('34')}
            className={`flex flex-col items-center text-[10px] font-black transition ${activeScreen === '34' ? 'text-[#FF3B00]' : 'text-slate-400 hover:text-slate-600'}`}
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

        {/* iOS Home Indicator Bar */}
        <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto my-1.5 relative z-40" />

      </div>
    </div>
  );
}