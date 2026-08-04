import React, { useState } from 'react';
import {
  Menu as MenuIcon,
  Bell,
  MessageSquare,
  Target,
  TrendingUp,
  Car,
  FileText,
  Landmark,
  User,
  Headphones,
  MoreHorizontal,
  ChevronRight,
  Clock,
  Calendar,
  Percent,
  Power,
  Home,
  Wallet,
  Mail,
  Grid,
  X,
  CheckCircle2,
  Signal,
  Wifi,
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  Check,
  Download,
  Eye,
  Building2,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  Lock,
  Fuel,
  Armchair,
  Maximize2,
  Gavel,
  ShieldAlert,
  CalendarDays,
  Hash,
  Scan,
  Info,
  Star,
  Upload
} from 'lucide-react';

export default function App() {
  // Navigation state for the 4 core screens
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleTabChange = (tabName, screenId) => {
    setActiveTab(tabName);
    setCurrentScreen(screenId);
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-950 sm:py-6 font-sans antialiased text-slate-800 selection:bg-orange-500 selection:text-white">
      
      {/* Top 4-Screen Selector Bar */}
      <div className="w-full max-w-[430px] mb-3 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl flex items-center justify-between text-xs text-slate-300 shadow-xl border border-slate-800">
        <span className="font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Active Screen:
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'dashboard', label: '1. Dashboard (1_2.jpeg)' },
            { id: 'backgroundCheck', label: '2. BG Check (2_2.jpeg)' },
            { id: 'bankAccount', label: '3. Bank Account (3_2.jpeg)' },
            { id: 'vehicleDetails', label: '4. Vehicle Details (4_2.jpeg)' },
          ].map((screen) => (
            <button 
              key={screen.id}
              onClick={() => {
                setCurrentScreen(screen.id);
                if (screen.id === 'dashboard') setActiveTab('Home');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap text-[11px] ${
                currentScreen === screen.id 
                  ? 'bg-[#FF4500] text-white font-bold shadow-md shadow-orange-500/20' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {screen.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Mobile Device Viewport Frame */}
      <div className="w-full max-w-[430px] bg-white min-h-[915px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          
          {/* iOS OS Status Bar */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 pt-3 pb-1 flex justify-between items-center text-xs font-semibold text-slate-900">
            <span className="font-bold">9:41</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <div className="flex items-center gap-1 border border-slate-900/40 rounded px-1 py-0.2">
                <span className="text-[10px] font-extrabold">100</span>
              </div>
            </div>
          </div>

          {/* Screen Router */}
          {currentScreen === 'dashboard' && (
            <DashboardScreen 
              showToast={showToast} 
              setShowDetailsModal={setShowDetailsModal}
              setCurrentScreen={setCurrentScreen}
            />
          )}

          {currentScreen === 'backgroundCheck' && (
            <BackgroundCheckScreen 
              onBack={() => setCurrentScreen('dashboard')} 
              showToast={showToast}
            />
          )}

          {currentScreen === 'bankAccount' && (
            <BankAccountScreen 
              onBack={() => setCurrentScreen('dashboard')} 
              showToast={showToast}
            />
          )}

          {currentScreen === 'vehicleDetails' && (
            <VehicleDetailsScreen 
              onBack={() => setCurrentScreen('dashboard')} 
              showToast={showToast}
            />
          )}

        </div>

        {/* Floating Bottom Navigation & Go Online Switch Bar (Main Dashboard Only) */}
        {currentScreen === 'dashboard' && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 pt-2 pb-6 px-4 z-20">
            
            {/* Online / Offline Status Toggle Bar */}
            <div className="bg-[#060D1A] text-white rounded-full p-1.5 flex items-center justify-between mb-2 shadow-xl shadow-slate-900/20 border border-slate-800/60">
              <div className="flex items-center gap-2.5 pl-3">
                <div className="relative flex items-center justify-center">
                  <div className={`w-3 h-3 rounded-full transition-colors ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
                  <div className={`absolute w-3 h-3 rounded-full transition-colors ${isOnline ? 'bg-emerald-400' : 'bg-red-500'}`} />
                </div>
                <div>
                  <div className="text-xs font-bold leading-none">
                    {isOnline ? 'You are online' : 'You are offline'}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight mt-0.5">
                    {isOnline ? 'Searching for high-demand trips nearby...' : 'Go online to start receiving bookings'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="w-7 h-7 rounded-full bg-slate-800/80 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                <button 
                  onClick={() => {
                    const newState = !isOnline;
                    setIsOnline(newState);
                    showToast(newState ? "You are now ONLINE!" : "You are now OFFLINE");
                  }}
                  className={`text-white text-xs font-extrabold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-md transition active:scale-95 ${
                    isOnline ? 'bg-slate-700 hover:bg-slate-600' : 'bg-[#FF4500] hover:bg-orange-600'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isOnline ? 'Go Offline' : 'Go Online'}</span>
                </button>
              </div>
            </div>

            {/* Bottom Tab Bar */}
            <nav className="flex justify-around items-center pt-1.5">
              {[
                { name: 'Home', icon: Home, screen: 'dashboard' },
                { name: 'Bookings', icon: Calendar, screen: 'dashboard' },
                { name: 'Earnings', icon: Wallet, screen: 'dashboard' },
                { name: 'Inbox', icon: Mail, badge: 3, screen: 'dashboard' },
                { name: 'Menu', icon: Grid, screen: 'dashboard' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.name;
                return (
                  <button
                    key={tab.name}
                    onClick={() => handleTabChange(tab.name, tab.screen)}
                    className={`flex flex-col items-center relative transition ${
                      isActive ? 'text-[#FF4500]' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.badge && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white">
                        {tab.badge}
                      </span>
                    )}
                    <span className={`text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                      {tab.name}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto mt-3" />
          </div>
        )}

        {/* Trip Details Modal Sheet */}
        {showDetailsModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center transition-opacity">
            <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200 shadow-2xl">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-1" />
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">Trip Details</h3>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl space-y-3 text-xs text-slate-700 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Route Type</span>
                  <span className="font-bold text-slate-900">Outstation One-Way</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pickup Date & Time</span>
                  <span className="font-bold text-slate-900">Today, 03:30 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle Category</span>
                  <span className="font-bold text-slate-900">Sedan (Dzire / Etios)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Base Fare Breakdown</span>
                  <span className="font-bold text-emerald-600">₹5,850 Inclusive of Tolls</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowDetailsModal(false);
                  showToast("Trip Accepted Successfully!");
                }}
                className="w-full bg-[#FF4500] hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-orange-500/20"
              >
                Confirm & Accept Trip
              </button>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
}

/* ==========================================================================
   SCREEN 1: DASHBOARD SCREEN (1_2.jpeg)
   ========================================================================== */
function DashboardScreen({ showToast, setShowDetailsModal, setCurrentScreen }) {
  return (
    <>
      {/* Header Bar */}
      <header className="px-5 py-3 flex items-center justify-between bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button onClick={() => showToast("Menu Drawer")} className="p-1 text-slate-800 hover:text-orange-500 transition active:scale-95">
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-0.5">
              <span className="text-xl font-black text-slate-900 tracking-tight">mb</span>
              <span className="text-xl font-black text-[#FF4500] flex items-center tracking-tight">
                c<span className="relative flex items-center justify-center mx-[1px]">
                  <Target className="w-4 h-4 text-[#FF4500]" />
                </span>nnect
              </span>
            </div>
            <span className="text-[8px] font-bold tracking-widest text-slate-400 uppercase -mt-1">
              — CONNECT. DRIVE. GROW. —
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => showToast("Notifications")} className="relative p-1.5 rounded-full hover:bg-slate-100 transition active:scale-95">
            <Bell className="w-6 h-6 text-slate-800" />
            <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">3</span>
          </button>
          <button onClick={() => showToast("Support Messages")} className="p-1.5 rounded-full hover:bg-slate-100 transition active:scale-95">
            <MessageSquare className="w-6 h-6 text-slate-800" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-4 pt-3 space-y-5">
        
        {/* Today's Overview Section */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-base font-bold text-slate-900">Today's Overview</h2>
            <button onClick={() => showToast("View All Overview")} className="text-xs font-bold text-[#FF4500] hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-[#081122] rounded-2xl p-4 grid grid-cols-4 gap-2 text-white shadow-xl shadow-slate-900/10">
            {/* Today's Earnings */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 font-bold text-base">
                  ₹
                </div>
                <div className="text-xl font-black tracking-tight">₹0</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">Today's Earnings</div>
              </div>
              <div className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-3">
                <ArrowUpRight className="w-3 h-3" /> 0%
                <span className="text-slate-400 font-normal ml-0.5">vs yesterday</span>
              </div>
            </div>

            {/* Trips Today */}
            <div className="flex flex-col justify-between border-l border-slate-800/80 pl-2">
              <div>
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                  <Car className="w-4 h-4" />
                </div>
                <div className="text-xl font-black tracking-tight">0</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">Trips Today</div>
              </div>
              <div className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-3">
                <ArrowUpRight className="w-3 h-3" /> 0%
                <span className="text-slate-400 font-normal ml-0.5">vs yesterday</span>
              </div>
            </div>

            {/* Acceptance Rate */}
            <div className="flex flex-col justify-between border-l border-slate-800/80 pl-2">
              <div>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-xl font-black tracking-tight">98%</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">Acceptance Rate</div>
              </div>
              <div className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-3">
                <ArrowUpRight className="w-3 h-3" /> 2%
                <span className="text-slate-400 font-normal ml-0.5">vs last 7 days</span>
              </div>
            </div>

            {/* Rating */}
            <div className="flex flex-col justify-between border-l border-slate-800/80 pl-2">
              <div>
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
                <div className="text-xl font-black tracking-tight flex items-center gap-1">
                  4.9 <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">Your Rating</div>
              </div>
              <div className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-3">
                <ArrowUpRight className="w-3 h-3" /> 0.1
                <span className="text-slate-400 font-normal ml-0.5">vs last 7 days</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions Grid Section */}
        <section>
          <h2 className="text-base font-bold text-slate-900 mb-2.5">Quick Actions</h2>
          <div className="grid grid-cols-6 gap-2">
            
            <button 
              onClick={() => setCurrentScreen('vehicleDetails')}
              className="bg-white border border-slate-100 shadow-xs hover:shadow-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Car className="w-5 h-5 text-emerald-500" />
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Add Vehicle</span>
            </button>

            <button 
              onClick={() => setCurrentScreen('backgroundCheck')}
              className="bg-white border border-slate-100 shadow-xs hover:shadow-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
            >
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Documents</span>
            </button>

            <button 
              onClick={() => setCurrentScreen('bankAccount')}
              className="bg-white border border-slate-100 shadow-xs hover:shadow-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Landmark className="w-5 h-5 text-purple-600" />
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Bank Details</span>
            </button>

            <button 
              onClick={() => showToast("Drivers Screen")}
              className="bg-white border border-slate-100 shadow-xs hover:shadow-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
            >
              <User className="w-5 h-5 text-[#FF4500]" />
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Drivers</span>
            </button>

            <button 
              onClick={() => showToast("Support Center")}
              className="bg-white border border-slate-100 shadow-xs hover:shadow-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Headphones className="w-5 h-5 text-red-500" />
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">Support</span>
            </button>

            <button 
              onClick={() => showToast("More Actions")}
              className="bg-white border border-slate-100 shadow-xs hover:shadow-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition active:scale-95"
            >
              <MoreHorizontal className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-800 text-center leading-tight">More</span>
            </button>

          </div>
        </section>

        {/* Live Opportunities Section */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-base font-bold text-slate-900">Live Opportunities</h2>
            <button onClick={() => showToast("View Live Opportunities")} className="text-xs font-bold text-[#FF4500] hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-emerald-100/60">
                Outstation
              </span>
            </div>

            <div className="flex justify-between items-stretch gap-2">
              <div className="flex gap-2.5 flex-1">
                <div className="flex flex-col items-center py-1">
                  <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                  </div>
                  <div className="w-[2px] flex-1 bg-slate-200 my-1" />
                  <div className="w-3 h-3 rounded-full border-2 border-[#FF4500] bg-white flex items-center justify-center">
                    <div className="w-1 h-1 bg-[#FF4500] rounded-full" />
                  </div>
                </div>

                <div className="flex flex-col justify-between py-0.5">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">Delhi (Indira Gandhi Airport)</h3>
                    <p className="text-[10px] text-slate-400">T3, New Delhi</p>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">Jaipur, Rajasthan</h3>
                    <p className="text-[10px] text-slate-400">Mansarovar, Jaipur</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between text-left py-0.5 px-2 border-l border-slate-100">
                <div>
                  <div className="text-xs font-black text-slate-900">275 KM</div>
                  <div className="text-[10px] text-slate-400">Distance</div>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> 6h 15m
                  </div>
                  <div className="text-[10px] text-slate-400">Est. Time</div>
                </div>
              </div>

              <div className="bg-[#EEF7F2] rounded-2xl p-2.5 flex flex-col justify-between items-center text-center min-w-[105px]">
                <div>
                  <div className="text-slate-900 font-black text-base">₹5,850</div>
                  <div className="text-[9px] text-slate-500 font-medium -mt-0.5">Estimated Fare</div>
                </div>
                
                <div className="w-full space-y-1.5 mt-2">
                  <button 
                    onClick={() => showToast("Trip Accepted! Navigating...")}
                    className="w-full bg-[#FF4500] hover:bg-orange-600 active:scale-95 text-white font-bold text-xs py-1.5 rounded-xl shadow-sm transition"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => setShowDetailsModal(true)}
                    className="w-full border border-blue-400 text-blue-600 hover:bg-blue-50 active:scale-95 font-bold text-[10px] py-1 rounded-xl transition bg-white"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Bookings Section */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-base font-bold text-slate-900">Upcoming Bookings</h2>
            <button onClick={() => showToast("View All Bookings")} className="text-xs font-bold text-[#FF4500] hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-[#F4F7FF] border border-blue-100/80 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-md">
                    Round Trip
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Today, 02:00 PM
                  </span>
                </div>
                
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Gurugram, Haryana</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500]" />
                    <span>Agra, Uttar Pradesh</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div>
                <div className="text-xs font-black text-slate-900">230 KM</div>
                <div className="text-[9px] text-slate-400">Distance</div>
              </div>
              <div className="ml-1">
                <div className="text-xs font-black text-slate-900">₹4,950</div>
                <div className="text-[9px] text-slate-400">Fare</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
            </div>
          </div>
        </section>

        {/* 0% Commission Pass Banner */}
        <section className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-2xl p-3.5 border border-orange-200/60 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF4500] text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-orange-500/20 shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs">Unlock 0% Commission!</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Complete a trip to activate 24-hour pass for ₹0</p>
            </div>
          </div>
          <button onClick={() => showToast("Commission Passes")} className="text-[#FF4500] font-black text-xs flex items-center whitespace-nowrap hover:underline">
            View Passes <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </section>

        {/* Recent Notifications */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-base font-bold text-slate-900">Recent Notifications</h2>
            <button onClick={() => showToast("Notifications")} className="text-xs font-bold text-[#FF4500] hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs leading-snug">Update: New toll guidelines for outstation trips</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </section>

      </main>
    </>
  );
}

/* ==========================================================================
   SCREEN 2: BACKGROUND CHECK SCREEN (2_2.jpeg)
   ========================================================================== */
function BackgroundCheckScreen({ onBack, showToast }) {
  return (
    <div className="bg-white min-h-full pb-10">
      {/* Top App Header */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900">Background Check</h1>
        </div>
        <button onClick={() => showToast("Background Check Support")} className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900">
          <HelpCircle className="w-4 h-4" /> Help
        </button>
      </header>

      <main className="p-4 space-y-4">
        {/* Verified Status Green Hero Banner */}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="font-extrabold text-emerald-800 text-sm">Verified</span>
              <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                Your background check has been completed and verified on 18 May 2025
              </p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center shrink-0 ml-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
          </div>
        </div>

        {/* Overview Details Section */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Overview</h2>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
                <span>Verification Date</span>
              </div>
              <span className="font-bold text-slate-900">18 May 2025</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span>Status</span>
              </div>
              <div className="flex items-center gap-1 font-bold text-emerald-600">
                <span>Verified</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>Checked For</span>
              </div>
              <span className="font-bold text-slate-900">Ashutosh Kumar</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Hash className="w-3.5 h-3.5" />
                </div>
                <span>Reference ID</span>
              </div>
              <span className="font-bold text-slate-900">BGV25051812345</span>
            </div>

            <div className="flex justify-between items-center pb-1">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Valid Till</span>
              </div>
              <span className="font-bold text-slate-900">18 May 2026</span>
            </div>
          </div>

          {/* Eligibility Notice Box */}
          <div className="bg-[#EFF8F3] border border-emerald-100 rounded-xl p-3 flex items-start gap-2.5 mt-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <p className="text-[11px] font-medium text-slate-700 leading-snug">
              No adverse records found. You are eligible to receive rides and use all platform features.
            </p>
          </div>
        </div>

        {/* Detailed Checks Section */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Detailed Checks</h2>

          <div className="space-y-1 text-xs">
            {[
              { icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-50', title: 'Identity Verification', sub: 'Aadhaar & PAN Verified' },
              { icon: Gavel, color: 'text-purple-500 bg-purple-50', title: 'Criminal Record Check', sub: 'No Criminal Records Found' },
              { icon: Car, color: 'text-blue-500 bg-blue-50', title: 'Traffic Violations Check', sub: 'No Pending Violations' },
              { icon: FileText, color: 'text-orange-500 bg-orange-50', title: 'Court Record Check', sub: 'No Adverse Records Found' },
              { icon: User, color: 'text-teal-500 bg-teal-50', title: 'Address Verification', sub: 'Address Matched' },
            ].map((check, idx) => {
              const IconComp = check.icon;
              return (
                <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-1 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${check.color} flex items-center justify-center shrink-0`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900">{check.title}</h3>
                      <p className="text-[10px] text-slate-400">{check.sub}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                    <span>Clear</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <ChevronRight className="w-4 h-4 text-slate-400 ml-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Documents Used Section */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Documents Used</h2>

          <div className="grid grid-cols-4 gap-2">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col justify-between items-start h-16">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="w-full flex justify-between items-end">
                <span className="text-[9px] font-bold text-slate-800">Aadhaar</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col justify-between items-start h-16">
              <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="w-full flex justify-between items-end">
                <span className="text-[9px] font-bold text-slate-800">PAN Card</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 flex flex-col justify-between items-start h-16">
              <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center">
                <Car className="w-3.5 h-3.5" />
              </div>
              <div className="w-full flex justify-between items-end">
                <span className="text-[9px] font-bold text-slate-800">License</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center text-center h-16 cursor-pointer hover:bg-slate-200 transition">
              <span className="text-xs font-black text-slate-700">+2</span>
              <span className="text-[9px] font-medium text-slate-500">More</span>
            </div>
          </div>
        </div>

        {/* Support & Download Footer Buttons */}
        <div className="pt-2 text-center space-y-3">
          <button onClick={() => showToast("Contacting Support...")} className="text-xs text-slate-500 font-medium hover:underline block mx-auto">
            Facing an issue? <span className="text-emerald-600 font-bold">Contact Support</span>
          </button>

          <button 
            onClick={() => showToast("Downloading Background Check Report...")}
            className="w-full border-2 border-emerald-600 text-emerald-700 font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Background Check Report</span>
          </button>
        </div>

      </main>
    </div>
  );
}

/* ==========================================================================
   SCREEN 3: BANK ACCOUNT SCREEN (3_2.jpeg)
   ========================================================================== */
function BankAccountScreen({ onBack, showToast }) {
  return (
    <div className="bg-white min-h-full pb-10">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900">Bank Account</h1>
        </div>
        <button onClick={() => showToast("Bank Help")} className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900">
          <HelpCircle className="w-4 h-4" /> Help
        </button>
      </header>

      <main className="p-4 space-y-4">
        {/* Verified Green Status Hero Banner */}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="font-extrabold text-emerald-800 text-sm">Verified</span>
              <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                Your bank account has been verified on 18 May 2025
              </p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center shrink-0 ml-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
          </div>
        </div>

        {/* HDFC Bank Primary Card */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
            <div className="w-10 h-10 rounded-xl bg-[#004B8D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-900">HDFC Bank</h2>
              <p className="text-[11px] text-slate-500 font-medium">Savings Account</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <p className="text-[10px] text-slate-400">Account Number</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-black text-slate-900">XXXX XXXX 1234</span>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded">Primary</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">IFSC Code</p>
              <p className="font-black text-slate-900 mt-0.5">HDFC0001234</p>
            </div>
          </div>
        </div>

        {/* Account Details Breakdown Table */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Account Details</h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>Account Holder Name</span>
              </div>
              <span className="font-bold text-slate-900">Ashutosh Kumar</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span>Account Type</span>
              </div>
              <span className="font-bold text-slate-900">Savings Account</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span>Bank Name</span>
              </div>
              <span className="font-bold text-slate-900">HDFC Bank</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Hash className="w-3.5 h-3.5" />
                </div>
                <span>Account Number</span>
              </div>
              <span className="font-bold text-slate-900">XXXX XXXX 1234</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Scan className="w-3.5 h-3.5" />
                </div>
                <span>IFSC Code</span>
              </div>
              <span className="font-bold text-slate-900">HDFC0001234</span>
            </div>

            <div className="flex justify-between items-center pb-1">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
                <span>Date of Verification</span>
              </div>
              <span className="font-bold text-slate-900">18 May 2025</span>
            </div>
          </div>
        </div>

        {/* Uploaded Cheque / Passbook Document Preview */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Uploaded Document</h2>

          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Cheque Graphic */}
            <div className="col-span-8 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] space-y-1 relative overflow-hidden">
              <div className="flex items-center gap-1 text-[#004B8D] font-extrabold text-[11px] mb-1">
                <Building2 className="w-3.5 h-3.5" /> HDFC BANK
              </div>
              <p className="text-slate-500 text-[8px]">We understand your world</p>
              <div className="space-y-0.5 pt-1 text-slate-700 font-semibold">
                <div className="flex justify-between"><span className="text-slate-400">Name:</span> <span>Ashutosh Kumar</span></div>
                <div className="flex justify-between"><span className="text-slate-400">A/C No:</span> <span>XXXX XXXX 1234</span></div>
                <div className="flex justify-between"><span className="text-slate-400">IFSC Code:</span> <span>HDFC0001234</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Branch:</span> <span>Najafgarh, New Delhi</span></div>
              </div>
            </div>

            {/* View Fullscreen button */}
            <button 
              onClick={() => showToast("Viewing Document Fullscreen...")}
              className="col-span-4 h-full border border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition text-emerald-600"
            >
              <Maximize2 className="w-5 h-5 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 text-center leading-tight">View Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Guidelines Box */}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Guidelines</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-700 font-medium pl-1">
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Bank account must be in your name</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Cancelled cheque / Passbook first page accepted</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> All details must be clearly visible</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Accepted formats: JPG, PNG, PDF</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Maximum file size: 5MB</p>
          </div>
        </div>

        {/* Support & Update Buttons */}
        <div className="pt-2 text-center space-y-3">
          <button onClick={() => showToast("Contact Support...")} className="text-xs text-slate-500 font-medium hover:underline block mx-auto">
            Facing an issue? <span className="text-emerald-600 font-bold">Contact Support</span>
          </button>

          <button 
            onClick={() => showToast("Update Bank Details Form...")}
            className="w-full border-2 border-emerald-600 text-emerald-700 font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Update Bank Details</span>
          </button>
        </div>

      </main>
    </div>
  );
}

/* ==========================================================================
   SCREEN 4: VEHICLE DETAILS SCREEN (4_2.jpeg)
   ========================================================================== */
function VehicleDetailsScreen({ onBack, showToast }) {
  return (
    <div className="bg-white min-h-full pb-10">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900">Vehicle Details</h1>
        </div>
        <button onClick={() => showToast("Vehicle Details Support")} className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900">
          <HelpCircle className="w-4 h-4" /> Help
        </button>
      </header>

      <main className="p-4 space-y-4">
        {/* Verified Green Status Hero Banner */}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="font-extrabold text-emerald-800 text-sm">Verified</span>
              <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                Your vehicle details have been verified on 18 May 2025
              </p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center shrink-0 ml-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
          </div>
        </div>

        {/* Toyota Innova Crysta Hero Card */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-24 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <Car className="w-10 h-10 text-slate-500" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-sm text-slate-900">DL01AB1234</h2>
                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                  Verified <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800">Toyota Innova Crysta</p>
              <p className="text-[10px] text-slate-500">White · 2019 · Diesel</p>
              <span className="inline-block bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.2 rounded mt-0.5">
                Commercial
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Information Specification Table */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Vehicle Information</h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span>Registration Number</span>
              </div>
              <span className="font-bold text-slate-900">DL01AB1234</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <span>Vehicle Make</span>
              </div>
              <span className="font-bold text-slate-900">Toyota</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <span>Vehicle Model</span>
              </div>
              <span className="font-bold text-slate-900">Innova Crysta</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
                <span>Year of Manufacture</span>
              </div>
              <span className="font-bold text-slate-900">2019</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Fuel className="w-3.5 h-3.5" />
                </div>
                <span>Fuel Type</span>
              </div>
              <span className="font-bold text-slate-900">Diesel</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Armchair className="w-3.5 h-3.5" />
                </div>
                <span>Seating Capacity</span>
              </div>
              <span className="font-bold text-slate-900">7 Seater</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <span>Vehicle Type</span>
              </div>
              <span className="font-bold text-slate-900">Commercial</span>
            </div>

            <div className="flex justify-between items-center pb-1">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
                <span>Registration Date</span>
              </div>
              <span className="font-bold text-slate-900">20 Jun 2019</span>
            </div>
          </div>
        </div>

        {/* Documents Cards List */}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Documents</h2>

          <div className="space-y-3">
            {/* Insurance Certificate */}
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900">Insurance Certificate</h3>
                  <p className="text-[10px] text-slate-400">Bajaj Allianz General Insurance</p>
                  <p className="text-[9px] text-slate-400">Policy No: OG-19-87654321</p>
                  <p className="text-[9px] text-emerald-600 font-bold mt-0.5">Valid Till: 18 May 2026</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                  Verified <CheckCircle2 className="w-3 h-3" />
                </span>
                <button 
                  onClick={() => showToast("Viewing Insurance Certificate...")}
                  className="border border-emerald-600 text-emerald-700 font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-50 bg-white"
                >
                  <Eye className="w-3 h-3" /> View
                </button>
              </div>
            </div>

            {/* PUC Certificate */}
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900">PUC Certificate</h3>
                  <p className="text-[10px] text-slate-400">Certificate No: UP14GT5678</p>
                  <p className="text-[9px] text-emerald-600 font-bold mt-0.5">Valid Till: 10 Jun 2025</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                  Verified <CheckCircle2 className="w-3 h-3" />
                </span>
                <button 
                  onClick={() => showToast("Viewing PUC Certificate...")}
                  className="border border-emerald-600 text-emerald-700 font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-50 bg-white"
                >
                  <Eye className="w-3 h-3" /> View
                </button>
              </div>
            </div>

            {/* RC Certificate */}
            <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900">RC Certificate (Registration)</h3>
                  <p className="text-[10px] text-slate-400">RC No: DL01AB1234</p>
                  <p className="text-[9px] text-slate-500">Issued On: 20 Jun 2019</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                  Verified <CheckCircle2 className="w-3 h-3" />
                </span>
                <button 
                  onClick={() => showToast("Viewing RC Certificate...")}
                  className="border border-emerald-600 text-emerald-700 font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-emerald-50 bg-white"
                >
                  <Eye className="w-3 h-3" /> View
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Guidelines Box */}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Guidelines</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-700 font-medium pl-1">
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Ensure all documents are original and valid</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> All details must match with the vehicle</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Accepted formats: JPG, PNG, PDF</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Maximum file size: 5MB per document</p>
          </div>
        </div>

        {/* Update Vehicle Details Action Button */}
        <button 
          onClick={() => showToast("Update Vehicle Details Form...")}
          className="w-full border-2 border-emerald-600 text-emerald-700 font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
        >
          <Upload className="w-4 h-4" />
          <span>Update Vehicle Details</span>
        </button>

      </main>
    </div>
  );
}