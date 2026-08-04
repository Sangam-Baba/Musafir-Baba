import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  Car,
  TrendingUp,
  Wallet,
  FileText,
  Download,
  Info,
  Phone,
  MessageCircle,
  Copy,
  CheckCircle2,
  XCircle,
  Search,
  SlidersHorizontal,
  Home,
  Mail,
  Grid,
  Check,
  MapPin,
  Share2,
  ExternalLink,
  Signal,
  Wifi,
  Sparkles,
  HelpCircle,
  User,
  Users,
  Briefcase,
  Shield,
  Percent,
  Navigation
} from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('earnings'); // Default to Screen 13
  const [activeTab, setActiveTab] = useState('Earnings');
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
      
      {/* Batch 4 Quick Selector Navigation Bar */}
      <div className="w-full max-w-[430px] mb-3 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl flex items-center justify-between text-xs text-slate-300 shadow-xl border border-slate-800 z-50">
        <span className="font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          Batch 4 Screens:
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'earnings', label: '13. Earnings (13_2.jpeg)' },
            { id: 'bookingDetails', label: '14. Booking Details (14_2.jpeg)' },
            { id: 'bookings', label: '15. Bookings (15_2.jpeg)' },
            { id: 'earningsTrendDetails', label: '16. Earnings Trend (16_2.jpeg)' },
          ].map((screen) => (
            <button 
              key={screen.id}
              onClick={() => {
                setCurrentScreen(screen.id);
                if (screen.id === 'earnings') setActiveTab('Earnings');
                if (screen.id === 'bookings') setActiveTab('Bookings');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap text-[11px] ${
                currentScreen === screen.id 
                  ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {screen.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Device Mobile Frame Wrapper */}
      <div className="w-full max-w-[430px] bg-white min-h-[915px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        {/* Scrollable Screen Content Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
          
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

          {/* Render Active Screen */}
          {currentScreen === 'earnings' && (
            <EarningsScreen 
              showToast={showToast}
              setCurrentScreen={setCurrentScreen}
              activeTab={activeTab}
              handleTabChange={handleTabChange}
            />
          )}

          {currentScreen === 'bookingDetails' && (
            <BookingDetailsScreen 
              onBack={() => setCurrentScreen('bookings')} 
              showToast={showToast}
            />
          )}

          {currentScreen === 'bookings' && (
            <BookingsScreen 
              showToast={showToast}
              setCurrentScreen={setCurrentScreen}
              activeTab={activeTab}
              handleTabChange={handleTabChange}
            />
          )}

          {currentScreen === 'earningsTrendDetails' && (
            <EarningsTrendDetailsScreen 
              onBack={() => setCurrentScreen('earnings')} 
              showToast={showToast}
            />
          )}

        </div>

        {/* Global Floating Toast Alert */}
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

function EarningsScreen({ showToast, setCurrentScreen, activeTab, handleTabChange }) {
  return (
    <div className="bg-white min-h-full flex flex-col justify-between">
      <div>
        {/* Header Bar */}
        <header className="px-5 py-4 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Earnings</h1>
            <p className="text-xs text-slate-400 font-medium">Track your earnings and payments</p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => showToast("Exporting Statement...")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition border border-slate-100"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Statement</span>
            </button>
            <button 
              onClick={() => showToast("Opening Wallet...")}
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition border border-slate-100"
            >
              <Wallet className="w-4 h-4 text-slate-800" />
            </button>
          </div>
        </header>

        <main className="p-4 space-y-4">
          
          {/* Date Selector Range */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => showToast("Select Date Range")}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 flex items-center gap-2 hover:bg-slate-50"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>17 May – 23 May 2025</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-90 text-slate-400" />
            </button>
          </div>

          {/* Earnings & Net Payout Banner Card */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <span>Total Earnings</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">₹28,450</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    ↑ 18.6%
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">vs 10 May – 16 May 2025 (₹23,980)</p>
              </div>

              {/* Net Payout Box */}
              <div className="bg-[#EFF8F3] border border-emerald-100 rounded-xl p-2.5 text-right min-w-[120px]">
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-600 font-medium">
                  <span>Net Payout</span>
                  <Info className="w-2.5 h-2.5 text-slate-400" />
                </div>
                <p className="text-base font-black text-slate-900 mt-0.5">₹25,860</p>
                <p className="text-[9px] text-emerald-600 font-bold mt-0.5">3 Transactions</p>
              </div>
            </div>

            {/* 4 Performance Metrics Grid */}
            <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Briefcase className="w-3 h-3 text-blue-500" />
                  <span>Total Trips</span>
                </div>
                <p className="font-extrabold text-slate-900 text-xs">18</p>
                <p className="text-[9px] text-slate-400">vs 14</p>
              </div>

              <div className="space-y-0.5 border-l border-slate-100 pl-2">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <MapPin className="w-3 h-3 text-purple-500" />
                  <span>Total Distance</span>
                </div>
                <p className="font-extrabold text-slate-900 text-xs">1,254 km</p>
                <p className="text-[9px] text-slate-400">vs 1,002 km</p>
              </div>

              <div className="space-y-0.5 border-l border-slate-100 pl-2">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  <span>Hours Online</span>
                </div>
                <p className="font-extrabold text-slate-900 text-xs">42h 15m</p>
                <p className="text-[9px] text-slate-400">vs 36h 30m</p>
              </div>

              <div className="space-y-0.5 border-l border-slate-100 pl-2">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <TrendingUp className="w-3 h-3 text-amber-500" />
                  <span>Avg Per Trip</span>
                </div>
                <p className="font-extrabold text-slate-900 text-xs">₹1,580</p>
                <p className="text-[9px] text-slate-400">vs ₹1,713</p>
              </div>
            </div>
          </div>

          {/* Earnings Trend Weekly Bar Chart Section */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-900">Earnings Trend</h2>
              <button 
                onClick={() => setCurrentScreen('earningsTrendDetails')}
                className="text-xs text-orange-600 font-extrabold flex items-center gap-0.5 hover:underline"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* SVG Bar Chart Graphic */}
            <div className="pt-2 pb-1 space-y-2">
              <div className="flex justify-between text-[9px] text-slate-400 border-b border-slate-50 pb-1">
                <span>₹20K</span>
                <span>₹15K</span>
                <span>₹10K</span>
                <span>₹5K</span>
                <span>₹0</span>
              </div>

              <div className="h-28 flex items-end justify-between px-2 pt-2 border-b border-slate-100">
                {[
                  { day: '11 May', val: '₹4,520', h: 'h-14', active: false },
                  { day: '12 May', val: '₹6,380', h: 'h-20', active: false },
                  { day: '13 May', val: '₹5,780', h: 'h-16', active: false },
                  { day: '14 May', val: '₹6,920', h: 'h-22', active: false },
                  { day: '15 May', val: '₹4,290', h: 'h-12', active: false },
                  { day: '16 May', val: '₹5,070', h: 'h-16', active: false },
                  { day: '17 May', val: '₹6,980', h: 'h-24', active: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1 group cursor-pointer">
                    <span className="text-[8px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition">{item.val}</span>
                    <div className={`w-6 rounded-t-md transition-all ${item.active ? 'bg-orange-500' : 'bg-orange-200 group-hover:bg-orange-400'} ${item.h}`} />
                    <span className="text-[9px] text-slate-400 font-medium">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Earnings Breakdown Donut Chart Section */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-1 text-xs font-extrabold text-slate-900">
              <span>Earnings Breakdown</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              {/* Donut Visual */}
              <div className="col-span-5 relative flex justify-center items-center">
                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                  <path className="text-blue-500 stroke-current" strokeWidth="4.5" fill="none" strokeDasharray="73, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500 stroke-current" strokeWidth="4.5" fill="none" strokeDasharray="15, 100" strokeDashoffset="-73" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-purple-500 stroke-current" strokeWidth="4.5" fill="none" strokeDasharray="7, 100" strokeDashoffset="-88" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-amber-500 stroke-current" strokeWidth="4.5" fill="none" strokeDasharray="5, 100" strokeDashoffset="-95" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute text-center">
                  <p className="text-xs font-black text-slate-900 leading-none">₹28,450</p>
                  <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Total</p>
                </div>
              </div>

              {/* Legend Breakdown List */}
              <div className="col-span-7 space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span>Base Fare</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">₹20,800</span>
                    <span className="text-[9px] text-slate-400 ml-1">73.1%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>Extra Charges</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">₹4,250</span>
                    <span className="text-[9px] text-slate-400 ml-1">14.9%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span>Surge / Peak Bonus</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">₹1,850</span>
                    <span className="text-[9px] text-slate-400 ml-1">6.5%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>Other Incentives</span>
                    <Info className="w-2.5 h-2.5 text-slate-400" />
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">₹1,550</span>
                    <span className="text-[9px] text-slate-400 ml-1">5.5%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100 font-bold">
                  <span className="text-slate-900 text-xs">Total Earnings</span>
                  <span className="text-slate-900 text-xs">₹28,450</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payout History Snippet */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-900">Payout History</h2>
              <button 
                onClick={() => showToast("Viewing full Payout History...")}
                className="text-xs text-orange-600 font-extrabold flex items-center gap-0.5 hover:underline"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 divide-y divide-slate-50 text-xs">
              <div className="flex justify-between items-center pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-[11px]">20 May 2025, 09:30 AM</p>
                    <p className="text-[9px] text-slate-400">UTR: 512345678901</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-xs">₹8,620</p>
                  <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                    Completed ✓
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-[11px]">13 May 2025, 09:30 AM</p>
                    <p className="text-[9px] text-slate-400">UTR: 412345678901</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-xs">₹7,980</p>
                  <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                    Completed ✓
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-[11px]">06 May 2025, 09:30 AM</p>
                    <p className="text-[9px] text-slate-400">Payout Initiated</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 text-xs">₹9,260</p>
                  <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                    Processing 🕒
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Balance & Method Footer Card */}
          <div className="grid grid-cols-3 gap-2 border border-slate-100 rounded-2xl p-3 bg-white text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Wallet Balance</span>
                <Info className="w-2.5 h-2.5 text-slate-400" />
              </div>
              <p className="font-black text-slate-900 text-xs">₹1,250</p>
              <button onClick={() => showToast("Opening Wallet...")} className="text-[10px] font-bold text-orange-600 flex items-center gap-0.5 hover:underline">
                <span>View Wallet</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-0.5 border-l border-slate-100 pl-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                <span>Next Payout Date</span>
              </div>
              <p className="font-black text-slate-900 text-xs">27 May 2025</p>
              <p className="text-[9px] text-slate-400">Tuesday</p>
            </div>

            <div className="space-y-0.5 border-l border-slate-100 pl-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                <span>Payout Method</span>
              </div>
              <p className="font-black text-slate-900 text-xs">HDFC Bank</p>
              <p className="text-[9px] text-slate-400">**** **** 4567</p>
            </div>
          </div>

        </main>
      </div>

      {/* Floating Offline Status & Bottom Navigation Bar */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 pt-2 pb-6 px-4 z-20">
        
        {/* Offline Status Pill Bar */}
        <div className="bg-red-50/80 border border-red-100 rounded-2xl p-2.5 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 pl-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <div>
              <p className="text-xs font-extrabold text-red-600 leading-none">You are offline</p>
              <p className="text-[9px] text-slate-500 mt-0.5">↑ Go online to start receiving bookings</p>
            </div>
          </div>

          <button 
            onClick={() => showToast("Going online...")}
            className="bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1 shadow-sm hover:bg-orange-600 transition"
          >
            <span>Go Online</span>
          </button>
        </div>

        {/* Global Bottom Navigation Tabs */}
        <nav className="flex justify-around items-center pt-1">
          {[
            { name: 'Home', icon: Home, screen: 'earnings' },
            { name: 'Bookings', icon: Calendar, screen: 'bookings' },
            { name: 'Earnings', icon: Wallet, screen: 'earnings' },
            { name: 'Inbox', icon: Mail, badge: 2, screen: 'earnings' },
            { name: 'Menu', icon: Grid, screen: 'earnings' },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => handleTabChange(tab.name, tab.screen)}
                className={`flex flex-col items-center relative transition ${
                  isActive ? 'text-[#FF4500]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <IconComp className="w-5 h-5" />
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

    </div>
  );
}

function BookingDetailsScreen({ onBack, showToast }) {
  return (
    <div className="bg-white min-h-full pb-10">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900">Booking Details</h1>
        </div>
        <button onClick={() => showToast("Booking Help")} className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900">
          <HelpCircle className="w-4 h-4" /> Help
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Status Tag & Request Time Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-orange-100 text-orange-700 font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider">
              PENDING
            </span>
            <span className="text-slate-400 text-[11px] font-medium">Requested: 10:30 AM, 17 May 2025</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-bold text-[11px]">
            <span>Booking ID: MB2505171001</span>
            <Copy onClick={() => showToast("Booking ID Copied!")} className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
          </div>
        </div>

        {/* Route Card with Map Graphic */}
        <div className="border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-3">
          <div className="grid grid-cols-12 gap-2 items-center">
            
            {/* Timeline Pickup/Drop */}
            <div className="col-span-7 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span>Delhi (IGI Airport)</span>
                </div>
                <p className="text-[10px] text-slate-400 pl-4">Terminal 3, New Delhi</p>
                <span className="inline-block bg-blue-50 text-blue-700 text-[9px] font-extrabold px-1.5 py-0.2 rounded mt-0.5 ml-4">
                  Pickup: 10:30 AM
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Jaipur, Rajasthan</span>
                </div>
                <p className="text-[10px] text-slate-400 pl-4">MI Road, Jaipur</p>
                <span className="inline-block bg-emerald-50 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded mt-0.5 ml-4">
                  Drop: 04:45 PM (Est.)
                </span>
              </div>
            </div>

            {/* Simulated Vector Route Map Box */}
            <div className="col-span-5 h-28 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full text-slate-300" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M10 20 Q 30 70 90 80" fill="none" stroke="#3B82F6" strokeWidth="4" strokeDasharray="4 2" />
              </svg>
              <div className="absolute top-3 left-3 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-xs" />
              <div className="absolute bottom-4 right-4 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-xs" />
            </div>
          </div>

          {/* Distance & Fare Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-2.5 text-center text-xs">
            <div>
              <p className="font-extrabold text-slate-900 text-xs">265 km</p>
              <p className="text-[9px] text-slate-400">Distance</p>
            </div>
            <div className="border-l border-slate-100">
              <p className="font-extrabold text-slate-900 text-xs">6h 15m</p>
              <p className="text-[9px] text-slate-400">Est. Duration</p>
            </div>
            <div className="border-l border-slate-100">
              <p className="font-extrabold text-slate-900 text-xs">One Way</p>
              <p className="text-[9px] text-slate-400">Trip Type</p>
            </div>
            <div className="border-l border-slate-100">
              <p className="font-black text-slate-900 text-xs">₹4,850</p>
              <p className="text-[9px] text-slate-400">Total Fare</p>
            </div>
          </div>
        </div>

        {/* Customer Details Card */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-900">Customer Details</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1">
                  Rahul Sharma <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">+91 98765 43210</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => showToast("Calling Rahul Sharma...")} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition border border-slate-100">
                <Phone className="w-4 h-4 text-emerald-600" />
              </button>
              <button onClick={() => showToast("Opening Chat...")} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition border border-slate-100">
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-50 text-[10px] text-slate-600 font-medium text-center">
            <div className="bg-slate-50 p-1.5 rounded-lg">
              <Users className="w-3.5 h-3.5 text-slate-500 mx-auto mb-0.5" />
              <span>4 Pax</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg">
              <Briefcase className="w-3.5 h-3.5 text-slate-500 mx-auto mb-0.5" />
              <span>2 Bags</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg">
              <Car className="w-3.5 h-3.5 text-slate-500 mx-auto mb-0.5" />
              <span>Innova Crysta</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg">
              <Wallet className="w-3.5 h-3.5 text-slate-500 mx-auto mb-0.5" />
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* Fare Breakup Expandable Card */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-900">Fare Breakup</h2>
            <div className="flex items-center gap-1 font-black text-slate-900 text-xs">
              <span>₹4,850</span>
              <ChevronRight className="w-4 h-4 rotate-90 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Base Fare (265 km)</span>
              <span className="font-bold text-slate-900">₹3,800</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Extra Charges</span>
              <span className="font-bold text-slate-900">₹300</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Platform Service Fee</span>
              <span className="font-bold text-slate-900">₹250</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Discount</span>
              <span>- ₹0</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-100 font-extrabold text-slate-900 text-xs">
              <span>Total Fare</span>
              <span>₹4,850</span>
            </div>
          </div>

          {/* Fare Inclusions Checklist */}
          <div className="space-y-1 pt-2 border-t border-slate-50 text-[11px]">
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1">Taxes <Info className="w-2.5 h-2.5 text-slate-400" /></span>
              <span className="text-emerald-600 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Included</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1">Parking <Info className="w-2.5 h-2.5 text-slate-400" /></span>
              <span className="text-emerald-600 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Included</span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1">Driver Night Allowance <Info className="w-2.5 h-2.5 text-slate-400" /></span>
              <span className="text-rose-500 font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Excluded</span>
            </div>
          </div>

          {/* Policy Note Box */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-2.5 flex items-start gap-2 text-[10px] text-blue-900">
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>All inclusive items (Included) will be reimbursed as per actuals. Excluded items are at your own cost.</span>
          </div>
        </div>

        {/* Trip & Route Details */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-2 text-xs">
          <h2 className="font-bold text-slate-900 text-xs">Trip & Route Details</h2>
          
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div>
              <p className="text-slate-400 font-medium">Trip Type</p>
              <p className="font-bold text-orange-600">One Way</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Route</p>
              <p className="font-bold text-slate-900">Delhi (IGI Airport) → Jaipur, Rajasthan</p>
              <p className="text-[9px] text-slate-400">Via NH 48</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Start Date</p>
              <p className="font-bold text-slate-900">17 May 2025</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Note from Customer</p>
              <p className="italic text-slate-600">"Please contact me 30 mins before pickup."</p>
            </div>
          </div>
        </div>

        {/* Inclusions & Exclusions Grid Cards */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-900">Inclusions & Exclusions</h2>

          <div className="grid grid-cols-5 gap-1.5 text-center text-[9px]">
            <div className="border border-slate-100 rounded-xl p-2 bg-white space-y-0.5">
              <p className="font-bold text-slate-800">Taxes</p>
              <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
              <p className="text-emerald-600 font-extrabold">Included</p>
              <p className="text-[8px] text-slate-400">To be reimbursed</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-2 bg-white space-y-0.5">
              <p className="font-bold text-slate-800">Parking</p>
              <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
              <p className="text-emerald-600 font-extrabold">Included</p>
              <p className="text-[8px] text-slate-400">To be reimbursed</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-2 bg-white space-y-0.5">
              <p className="font-bold text-slate-800 leading-tight">Driver Night Allowance</p>
              <XCircle className="w-3.5 h-3.5 text-rose-500 mx-auto" />
              <p className="text-rose-500 font-extrabold">Excluded</p>
              <p className="text-[8px] text-slate-400">Not reimbursable</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-2 bg-white space-y-0.5">
              <p className="font-bold text-slate-800">Fuel</p>
              <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
              <p className="text-emerald-600 font-extrabold">Included</p>
              <p className="text-[8px] text-slate-400">To be reimbursed</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-2 bg-white space-y-0.5">
              <p className="font-bold text-slate-800">Toll</p>
              <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
              <p className="text-emerald-600 font-extrabold">Included</p>
              <p className="text-[8px] text-slate-400">To be reimbursed</p>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button 
            onClick={() => showToast("Booking Rejected")}
            className="w-full border-2 border-orange-500 text-orange-600 font-extrabold text-xs py-3 rounded-2xl hover:bg-orange-50 transition"
          >
            Reject
          </button>
          <button 
            onClick={() => showToast("Booking Accepted Successfully!")}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs py-3 rounded-2xl shadow-md shadow-orange-500/20 transition active:scale-95"
          >
            Accept Booking
          </button>
        </div>

      </main>
    </div>
  );
}

function BookingsScreen({ showToast, setCurrentScreen, activeTab, handleTabChange }) {
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div className="bg-white min-h-full flex flex-col justify-between">
      <div>
        {/* Header Bar */}
        <header className="px-5 py-4 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bookings</h1>
            <p className="text-xs text-slate-400 font-medium">Manage all your trip requests</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => showToast("Search bookings...")} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition">
              <Search className="w-4 h-4" />
            </button>
            <button onClick={() => showToast("Filter Options")} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="p-4 space-y-4">
          
          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'All', label: 'All', count: 12, activeColor: 'bg-orange-500' },
              { id: 'Pending', label: 'Pending', count: 3, activeColor: 'bg-slate-500' },
              { id: 'Accepted', label: 'Accepted', count: 4, activeColor: 'bg-emerald-500' },
              { id: 'Upcoming', label: 'Upcoming', count: 2, activeColor: 'bg-purple-500' },
              { id: 'Completed', label: 'Completed', count: 5, activeColor: 'bg-blue-500' },
              { id: 'Cancelled', label: 'Cancelled', count: 1, activeColor: 'bg-rose-500' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition ${
                  activeFilter === chip.id
                    ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100'
                }`}
              >
                <span>{chip.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeFilter === chip.id ? chip.activeColor + ' text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {chip.count}
                </span>
              </button>
            ))}
          </div>

          {/* Today Requests Section */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today</h2>

            {/* Pending Booking Card */}
            <div className="border-l-4 border-l-orange-500 border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-orange-100 text-orange-700 font-extrabold text-[9px] px-2 py-0.2 rounded uppercase">
                    PENDING
                  </span>
                  <span className="text-slate-400 text-[10px]">• Requested: 10:30 AM</span>
                </div>
                <span className="text-orange-600 font-extrabold text-[11px] flex items-center gap-1">
                  Outstation
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-8 space-y-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                      <span>Delhi (IGI Airport)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-3.5">Terminal 3, New Delhi</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Jaipur, Rajasthan</span>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-3.5">MI Road, Jaipur</p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-600 pt-1">
                    <span className="flex items-center gap-0.5"><User className="w-3 h-3 text-slate-400" /> Rahul Sharma</span>
                    <span className="flex items-center gap-0.5"><Car className="w-3 h-3 text-slate-400" /> Innova Crysta</span>
                    <span>4 Pax</span>
                  </div>
                </div>

                <div className="col-span-4 text-right space-y-1">
                  <p className="text-[10px] text-slate-400">265 km</p>
                  <p className="text-base font-black text-slate-900">₹4,850</p>

                  <div className="space-y-0.5 text-[9px] text-left pt-1 pl-1">
                    <p className="text-slate-600 flex items-center gap-1">Taxes <span className="text-emerald-600 font-bold ml-auto">✓ Included</span></p>
                    <p className="text-slate-600 flex items-center gap-1">Parking <span className="text-emerald-600 font-bold ml-auto">✓ Included</span></p>
                    <p className="text-slate-600 flex items-center gap-1">Night Allowance <span className="text-rose-500 font-bold ml-auto">✕ Excluded</span></p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                <button 
                  onClick={() => setCurrentScreen('bookingDetails')}
                  className="text-orange-600 font-bold text-[11px] flex items-center gap-0.5 hover:underline"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => showToast("Booking Rejected")}
                    className="border border-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-xl hover:bg-slate-50 transition"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => showToast("Booking Accepted!")}
                    className="bg-orange-500 text-white font-bold text-[11px] px-4 py-1.5 rounded-xl shadow-xs hover:bg-orange-600 transition"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>

            {/* Accepted Booking Card */}
            <div className="border-l-4 border-l-blue-500 border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 font-extrabold text-[9px] px-2 py-0.2 rounded uppercase">
                    ACCEPTED
                  </span>
                  <span className="text-slate-400 text-[10px]">• Accepted: 09:15 AM</span>
                </div>
                <span className="text-blue-600 font-extrabold text-[11px]">
                  Outstation
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-8 space-y-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span>Gurugram</span>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-3.5">DLF Cyber City</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span>Agra, Uttar Pradesh</span>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-3.5">Taj Ganj, Agra</p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-600 pt-1">
                    <span className="flex items-center gap-0.5"><User className="w-3 h-3 text-slate-400" /> Vikram Singh</span>
                    <span className="flex items-center gap-0.5"><Car className="w-3 h-3 text-slate-400" /> Toyota Innova</span>
                    <span>6 Pax</span>
                  </div>
                </div>

                <div className="col-span-4 text-right space-y-1">
                  <p className="text-[10px] text-slate-400">230 km</p>
                  <p className="text-base font-black text-slate-900">₹3,700</p>

                  <div className="space-y-0.5 text-[9px] text-left pt-1 pl-1">
                    <p className="text-slate-600 flex items-center gap-1">Taxes <span className="text-emerald-600 font-bold ml-auto">✓ Included</span></p>
                    <p className="text-slate-600 flex items-center gap-1">Parking <span className="text-rose-500 font-bold ml-auto">✕ Excluded</span></p>
                    <p className="text-slate-600 flex items-center gap-1">Night Allowance <span className="text-emerald-600 font-bold ml-auto">✓ Included</span></p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 pt-2">
                <button 
                  onClick={() => setCurrentScreen('bookingDetails')}
                  className="bg-blue-50 text-blue-700 font-extrabold text-[11px] px-3 py-1.5 rounded-xl hover:bg-blue-100 transition flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Upcoming Section */}
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming</h2>

            <div className="border-l-4 border-l-purple-500 border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[9px] px-2 py-0.2 rounded uppercase">
                    CONFIRMED
                  </span>
                  <span className="text-slate-400 text-[10px]">• 18 May, 2025 • 07:00 AM</span>
                </div>
                <span className="text-purple-600 font-extrabold text-[11px]">
                  Airport Transfer ✈
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-8 space-y-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      <span>Noida Sector 62</span>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-3.5">Noida, Uttar Pradesh</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Delhi (IGI Airport)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-3.5">Terminal 3, New Delhi</p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-600 pt-1">
                    <span className="flex items-center gap-0.5"><User className="w-3 h-3 text-slate-400" /> Ankit Verma</span>
                    <span className="flex items-center gap-0.5"><Car className="w-3 h-3 text-slate-400" /> Maruti Ertiga</span>
                    <span>3 Pax</span>
                  </div>
                </div>

                <div className="col-span-4 text-right space-y-1">
                  <p className="text-[10px] text-slate-400">38 km</p>
                  <p className="text-base font-black text-slate-900">₹950</p>

                  <div className="space-y-0.5 text-[9px] text-left pt-1 pl-1">
                    <p className="text-slate-600 flex items-center gap-1">Taxes <span className="text-rose-500 font-bold ml-auto">✕ Excluded</span></p>
                    <p className="text-slate-600 flex items-center gap-1">Parking <span className="text-emerald-600 font-bold ml-auto">✓ Included</span></p>
                    <p className="text-slate-600 flex items-center gap-1">Night Allowance <span className="text-rose-500 font-bold ml-auto">✕ Excluded</span></p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 pt-2">
                <button 
                  onClick={() => setCurrentScreen('bookingDetails')}
                  className="bg-purple-50 text-purple-700 font-extrabold text-[11px] px-3 py-1.5 rounded-xl hover:bg-purple-100 transition flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Floating Offline Bar & Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-slate-100 pt-2 pb-6 px-4 z-20">
        
        {/* Offline Pill */}
        <div className="bg-red-50/80 border border-red-100 rounded-2xl p-2.5 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 pl-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <div>
              <p className="text-xs font-extrabold text-red-600 leading-none">You are offline</p>
              <p className="text-[9px] text-slate-500 mt-0.5">↑ Go online to start receiving bookings</p>
            </div>
          </div>

          <button 
            onClick={() => showToast("Going online...")}
            className="bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-xl flex items-center gap-1 shadow-sm hover:bg-orange-600 transition"
          >
            <span>Go Online</span>
          </button>
        </div>

        {/* Navigation Bar */}
        <nav className="flex justify-around items-center pt-1">
          {[
            { name: 'Home', icon: Home, screen: 'bookings' },
            { name: 'Bookings', icon: Calendar, screen: 'bookings' },
            { name: 'Earnings', icon: Wallet, screen: 'earnings' },
            { name: 'Inbox', icon: Mail, badge: 2, screen: 'bookings' },
            { name: 'Menu', icon: Grid, screen: 'bookings' },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => handleTabChange(tab.name, tab.screen)}
                className={`flex flex-col items-center relative transition ${
                  isActive ? 'text-[#FF4500]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <IconComp className="w-5 h-5" />
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

    </div>
  );
}

function EarningsTrendDetailsScreen({ onBack, showToast }) {
  const [activePeriod, setActivePeriod] = useState('Day');

  return (
    <div className="bg-white min-h-full pb-10">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900">Earnings Trend Details</h1>
        </div>
        <button onClick={() => showToast("Exporting Trend Report...")} className="flex items-center gap-1 text-slate-700 text-xs font-bold hover:text-slate-900">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Period Selector Tabs */}
        <div className="bg-slate-100/80 p-1 rounded-2xl flex items-center justify-between text-xs font-extrabold text-slate-600">
          {['Day', 'Week', 'Month', 'Year', 'Custom'].map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                activePeriod === period ? 'bg-white text-orange-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Date Selector Navigation Bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => showToast("Previous Date")} className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100">
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button onClick={() => showToast("Select Specific Date")} className="bg-white border border-slate-200 rounded-xl px-4 py-1.5 text-xs font-extrabold text-slate-800 flex items-center gap-2 hover:bg-slate-50">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>11 May 2025</span>
            <ChevronRight className="w-3.5 h-3.5 rotate-90 text-slate-400" />
          </button>

          <button onClick={() => showToast("Next Date")} className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Overview Stat Cards */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Total Earnings</p>
            <p className="font-black text-slate-900 text-xs">₹6,920</p>
            <p className="text-[8px] text-emerald-600 font-bold">↑ 18.6% vs 10 May</p>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Total Distance</p>
            <p className="font-black text-slate-900 text-xs">312 km</p>
            <p className="text-[8px] text-slate-400">vs 287 km</p>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Hours Online</p>
            <p className="font-black text-slate-900 text-xs">9h 45m</p>
            <p className="text-[8px] text-slate-400">vs 8h 20m</p>
          </div>

          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-2.5 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Total Trips</p>
            <p className="font-black text-slate-900 text-xs">7</p>
            <p className="text-[8px] text-slate-400">vs 6 Trips</p>
          </div>
        </div>

        {/* Dual Bar & Line Graph Analytics Box */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-900">Earnings Overview</h2>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-orange-600"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400" /> Earnings (₹)</span>
              <span className="flex items-center gap-1 text-blue-600"><span className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white" /> Trips</span>
            </div>
          </div>

          {/* Interactive Dual Chart Visual with Hover Tooltip */}
          <div className="pt-2 relative space-y-2">
            
            {/* Tooltip Popup */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-xl text-[10px] shadow-xl z-10 space-y-0.5">
              <p className="font-bold border-b border-slate-700 pb-0.5">12:00 PM – 01:00 PM</p>
              <div className="flex justify-between gap-3 text-emerald-400 font-extrabold">
                <span>• Earnings</span>
                <span>₹1,320</span>
              </div>
              <div className="flex justify-between gap-3 text-blue-400 font-extrabold">
                <span>• Trips</span>
                <span>9</span>
              </div>
            </div>

            <div className="h-32 flex items-end justify-between px-1 pt-8 border-b border-slate-100 relative">
              {/* Overlay Polyline Graphic for Trips */}
              <svg className="absolute inset-x-0 bottom-6 h-20 w-full pointer-events-none" viewBox="0 0 100 50" preserveAspectRatio="none">
                <path d="M 5 40 L 20 38 L 35 30 L 50 12 L 65 20 L 80 15 L 95 32" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="3 3" />
              </svg>

              {[
                { time: '12 AM', h: 'h-4' },
                { time: '3 AM', h: 'h-6' },
                { time: '6 AM', h: 'h-12' },
                { time: '9 AM', h: 'h-20' },
                { time: '12 PM', h: 'h-24', active: true },
                { time: '3 PM', h: 'h-10' },
                { time: '6 PM', h: 'h-22' },
                { time: '9 PM', h: 'h-14' },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className={`w-5 rounded-t-md transition-all ${item.active ? 'bg-orange-500 ring-2 ring-orange-300' : 'bg-orange-200'} ${item.h}`} />
                  <span className="text-[9px] text-slate-400 font-medium">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hours Callout Banner */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-blue-950 text-xs">Peak earning time: 11:00 AM – 02:00 PM</p>
              <p className="text-[10px] text-slate-600 mt-0.5">You earned 42% more during this time slot.</p>
            </div>
          </div>
        </div>

        {/* Earnings Breakdown Table & Donut Chart */}
        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
          <h2 className="text-xs font-extrabold text-slate-900">Earnings Breakdown</h2>

          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-7 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Base Fare
                </span>
                <span className="font-black text-slate-900">₹4,750 <span className="text-[9px] text-slate-400 font-normal">68.6%</span></span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Extra Charges
                </span>
                <span className="font-black text-slate-900">₹1,150 <span className="text-[9px] text-slate-400 font-normal">16.6%</span></span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Surge / Peak Bonus
                </span>
                <span className="font-black text-slate-900">₹780 <span className="text-[9px] text-slate-400 font-normal">11.3%</span></span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Other Incentives
                  <Info className="w-2.5 h-2.5 text-slate-400" />
                </span>
                <span className="font-black text-slate-900">₹240 <span className="text-[9px] text-slate-400 font-normal">3.5%</span></span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-black text-xs text-slate-900">
                <span>Total Earnings</span>
                <span>₹6,920 <span className="text-[9px] font-normal text-slate-400">100%</span></span>
              </div>
            </div>

            {/* Donut Chart Visual */}
            <div className="col-span-5 relative flex justify-center items-center">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-blue-500 stroke-current" strokeWidth="4.5" fill="none" strokeDasharray="68.6, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-emerald-500 stroke-current" strokeWidth="4.5" fill="none" strokeDasharray="16.6, 100" strokeDashoffset="-68.6" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-purple-500 stroke-current" strokeWidth="4.5" fill="none" strokeDasharray="11.3, 100" strokeDashoffset="-85.2" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-amber-500 stroke-current" strokeWidth="4.5" fill="none" strokeDasharray="3.5, 100" strokeDashoffset="-96.5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute text-center">
                <p className="text-xs font-black text-slate-900 leading-none">₹6,920</p>
                <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trip-wise Earnings Ledger Table */}
        <div className="border border-slate-100 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="bg-slate-50/80 px-3 py-2 border-b border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">
            <span>Time</span>
            <span className="w-1/2">Trip Details</span>
            <span>Distance</span>
            <span>Earnings</span>
          </div>

          <div className="divide-y divide-slate-50 text-xs">
            {[
              { time: '08:15 AM', route: 'Delhi (Dwarka) → Gurgaon', type: 'One Way', km: '28 km', fare: '₹620' },
              { time: '10:30 AM', route: 'Gurgaon → Delhi (IGI Airport)', type: 'One Way', km: '32 km', fare: '₹780' },
              { time: '12:05 PM', route: 'Delhi → Noida Sector 62', type: 'One Way', km: '18 km', fare: '₹450' },
              { time: '02:45 PM', route: 'Noida → Faridabad', type: 'One Way', km: '35 km', fare: '₹890' },
              { time: '05:20 PM', route: 'Delhi → Gurgaon', type: 'One Way', km: '30 km', fare: '₹710' },
            ].map((trip, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/60 transition">
                <span className="font-extrabold text-slate-900 text-[11px]">{trip.time}</span>
                <div className="w-1/2 space-y-0.5">
                  <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{trip.route}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 pl-2.5">{trip.type}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">{trip.km}</span>
                <div className="flex items-center gap-1 font-black text-slate-900 text-xs">
                  <span>{trip.fare}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </div>
            ))}

            {/* Total Summary Row */}
            <div className="bg-orange-50/50 p-3 flex items-center justify-between font-black text-slate-900 text-xs border-t border-orange-100">
              <span>Total 7 Trips</span>
              <span>312 km</span>
              <span className="text-orange-600">₹6,920</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}