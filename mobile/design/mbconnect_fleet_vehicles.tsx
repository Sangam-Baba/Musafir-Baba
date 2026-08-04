import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Info,
  HelpCircle,
  MoreVertical,
  CheckCircle2,
  Building2,
  User,
  CreditCard,
  Phone,
  Mail,
  FileText,
  Shield,
  Car,
  Fuel,
  Users,
  Wind,
  Calendar,
  Clock,
  Edit3,
  Check,
  AlertCircle,
  Upload,
  Layers,
  Signal,
  Wifi,
  Plus,
  Filter,
  Search,
  MapPin,
  X,
  Sliders,
  DollarSign,
  TrendingUp,
  Tag,
  Menu,
  Bell,
  Wrench,
  Hourglass
} from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('myVehicles'); // 'myVehicles' | 'addVehicleStep1' | 'fleetOverview' | 'serviceAreaPricing' | 'addVehicleStep2'
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-950 sm:py-6 font-sans antialiased text-slate-800 selection:bg-orange-500 selection:text-white">
      
      {/* Quick Screen Selector Navbar */}
      <div className="w-full max-w-[430px] mb-3 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl flex items-center justify-between text-xs text-slate-300 shadow-xl border border-slate-800 z-50">
        <span className="font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          Screens:
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'myVehicles', label: '25. My Vehicles (25.jpeg)' },
            { id: 'addVehicleStep1', label: '26. Add Vehicle - Step 1 (26.jpeg)' },
            { id: 'fleetOverview', label: '27. Fleet Overview (27.jpeg)' },
            { id: 'serviceAreaPricing', label: '28. Service Area & Pricing (28.jpeg)' },
            { id: 'addVehicleStep2', label: '29. Add Vehicle - Step 2 (29.jpeg)' },
          ].map((screen) => (
            <button 
              key={screen.id}
              onClick={() => setCurrentScreen(screen.id)}
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
        
        {/* Scrollable Content Container */}
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

          {/* Screen Switcher */}
          {currentScreen === 'myVehicles' && (
            <MyVehiclesScreen 
              showToast={showToast}
              onAddVehicle={() => setCurrentScreen('addVehicleStep1')}
              onViewDocs={() => setCurrentScreen('addVehicleStep2')}
            />
          )}

          {currentScreen === 'addVehicleStep1' && (
            <AddVehicleStep1Screen 
              showToast={showToast}
              onBack={() => setCurrentScreen('myVehicles')}
              onContinue={() => setCurrentScreen('addVehicleStep2')}
            />
          )}

          {currentScreen === 'fleetOverview' && (
            <FleetOverviewScreen 
              showToast={showToast}
              onAddVehicle={() => setCurrentScreen('addVehicleStep1')}
            />
          )}

          {currentScreen === 'serviceAreaPricing' && (
            <ServiceAreaPricingScreen 
              showToast={showToast}
              onBack={() => setCurrentScreen('fleetOverview')}
            />
          )}

          {currentScreen === 'addVehicleStep2' && (
            <AddVehicleStep2Screen 
              showToast={showToast}
              onBack={() => setCurrentScreen('addVehicleStep1')}
              onContinue={() => showToast("Navigating to Step 3 Review...")}
            />
          )}

        </div>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Home Indicator Line */}
        <div className="w-32 h-1 bg-slate-900 rounded-full mx-auto my-2" />

      </div>
    </div>
  );
}

function MyVehiclesScreen({ showToast, onAddVehicle, onViewDocs }) {
  const [activeTab, setActiveTab] = useState('All Vehicles (3)');

  return (
    <div className="bg-white min-h-full pb-16">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">My Vehicles</h1>
        </div>
        <button 
          onClick={onAddVehicle}
          className="flex items-center gap-1 text-orange-600 border border-orange-500 px-2.5 py-1 rounded-xl text-xs font-bold hover:bg-orange-50 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Vehicle</span>
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Tab Filter Bar */}
        <div className="flex border-b border-slate-100 text-xs font-extrabold text-slate-500 overflow-x-auto no-scrollbar">
          {['All Vehicles (3)', 'Active (2)', 'Inactive (1)', 'Under Review (0)'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 px-3 transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'text-orange-600 border-b-2 border-orange-500 font-black' 
                  : 'hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by vehicle number / model"
              className="bg-transparent w-full text-slate-900 font-medium focus:outline-none placeholder:text-slate-400"
            />
          </div>
          <button 
            onClick={() => showToast("Opening Filter Options")}
            className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
          >
            <Filter className="w-3.5 h-3.5 text-slate-600" />
            <span>Filter</span>
          </button>
        </div>

        {/* Vehicle List */}
        <div className="space-y-3">
          
          {/* Vehicle Card 1 - Toyota Innova Crysta */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs space-y-2 border-l-4 border-l-emerald-500">
            <div className="flex gap-3">
              <div className="w-24 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                <img 
                  src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80" 
                  alt="Toyota Innova Crysta"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-xs text-slate-900">Toyota Innova Crysta</h2>
                  <div className="flex items-center gap-1">
                    <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                      Active
                    </span>
                    <button className="text-slate-400 hover:text-slate-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-600 font-mono">DL 1Z C 1234</p>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 pt-0.5">
                  <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> 2022</span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5"><Fuel className="w-2.5 h-2.5" /> Diesel</span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> 7 Seats</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
                  <span className="flex items-center gap-0.5"><Car className="w-2.5 h-2.5" /> MUV</span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5"><Wind className="w-2.5 h-2.5" /> AC</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-medium pt-1 border-t border-slate-100">
              Insurance valid till 20 May 2026
            </p>
          </div>

          {/* Vehicle Card 2 - Maruti Ertiga */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs space-y-2 border-l-4 border-l-emerald-500">
            <div className="flex gap-3">
              <div className="w-24 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                <img 
                  src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=300&q=80" 
                  alt="Maruti Ertiga"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-xs text-slate-900">Maruti Ertiga</h2>
                  <div className="flex items-center gap-1">
                    <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                      Active
                    </span>
                    <button className="text-slate-400 hover:text-slate-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-600 font-mono">HR 26 AB 5678</p>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 pt-0.5">
                  <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> 2021</span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5"><Fuel className="w-2.5 h-2.5" /> Petrol</span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> 7 Seats</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
                  <span className="flex items-center gap-0.5"><Car className="w-2.5 h-2.5" /> MUV</span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5"><Wind className="w-2.5 h-2.5" /> AC</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-medium pt-1 border-t border-slate-100">
              Insurance valid till 10 Apr 2026
            </p>
          </div>

          {/* Vehicle Card 3 - Tata Sumo Gold */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs space-y-2 border-l-4 border-l-rose-500">
            <div className="flex gap-3">
              <div className="w-24 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                <img 
                  src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=300&q=80" 
                  alt="Tata Sumo Gold"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-xs text-slate-900">Tata Sumo Gold</h2>
                  <div className="flex items-center gap-1">
                    <span className="bg-rose-50 text-rose-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                      Inactive
                    </span>
                    <button className="text-slate-400 hover:text-slate-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-600 font-mono">DL 12 XY 9876</p>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 pt-0.5">
                  <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> 2018</span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5"><Fuel className="w-2.5 h-2.5" /> Diesel</span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> 9+1 Seats</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
                  <span className="flex items-center gap-0.5"><Car className="w-2.5 h-2.5" /> Traveller</span>
                  <span>|</span>
                  <span className="flex items-center gap-0.5"><Wind className="w-2.5 h-2.5" /> AC</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-rose-600 font-extrabold pt-1 border-t border-slate-100">
              Insurance expired on 15 Jan 2025
            </p>
          </div>

        </div>

        {/* Keep Documents Updated Warning Banner */}
        <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
              !
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs">Keep your documents updated</h3>
              <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                Ensure all vehicle documents are valid to continue receiving trip requests.
              </p>
            </div>
          </div>
          <button 
            onClick={onViewDocs}
            className="border border-orange-500 text-orange-600 font-extrabold text-[11px] px-3 py-1.5 rounded-xl hover:bg-orange-100/50 whitespace-nowrap shrink-0"
          >
            View Docs
          </button>
        </div>

        {/* Vehicles Summary Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-900">Vehicles Summary</h2>
            <span className="text-xs font-bold text-slate-500">Total: 3</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className="border border-emerald-200 rounded-2xl p-2.5 bg-emerald-50/40 space-y-0.5">
              <Car className="w-4 h-4 text-emerald-600 mx-auto" />
              <div className="font-extrabold text-sm text-slate-900">2</div>
              <div className="font-extrabold text-emerald-700 text-[9px]">Active</div>
            </div>

            <div className="border border-rose-200 rounded-2xl p-2.5 bg-rose-50/40 space-y-0.5">
              <Car className="w-4 h-4 text-rose-600 mx-auto" />
              <div className="font-extrabold text-sm text-slate-900">1</div>
              <div className="font-extrabold text-rose-700 text-[9px]">Inactive</div>
            </div>

            <div className="border border-blue-200 rounded-2xl p-2.5 bg-blue-50/40 space-y-0.5">
              <Hourglass className="w-4 h-4 text-blue-600 mx-auto" />
              <div className="font-extrabold text-sm text-slate-900">0</div>
              <div className="font-extrabold text-blue-700 text-[9px]">Under Review</div>
            </div>

            <div className="border border-purple-200 rounded-2xl p-2.5 bg-purple-50/40 space-y-0.5">
              <Wrench className="w-4 h-4 text-purple-600 mx-auto" />
              <div className="font-extrabold text-sm text-slate-900">0</div>
              <div className="font-extrabold text-purple-700 text-[9px]">Maintenance</div>
            </div>
          </div>
        </div>

      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 max-w-[420px] w-full bg-white border-t border-slate-100 py-2 px-4 flex justify-around items-center z-30">
        <button className="flex flex-col items-center text-slate-400 hover:text-slate-600">
          <Car className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-slate-600">
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Bookings</span>
        </button>
        <button className="flex flex-col items-center text-orange-500 font-bold">
          <Car className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Vehicles</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-slate-600">
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Earnings</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-slate-600">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Profile</span>
        </button>
      </div>
    </div>
  );
}

function AddVehicleStep1Screen({ showToast, onBack, onContinue }) {
  const [ownership, setOwnership] = useState('Owned');

  return (
    <div className="bg-white min-h-full pb-8">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Add Vehicle</h1>
        </div>
        <button 
          onClick={() => showToast("Add Vehicle Help Guide")}
          className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Step Indicator Bar */}
        <div className="flex items-center justify-between px-6 py-2 relative">
          <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
          
          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold text-xs shadow-md shadow-orange-500/30">
              1
            </div>
            <span className="text-[10px] font-extrabold text-orange-600">Vehicle Details</span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <span className="text-[10px] font-bold text-slate-400">Documents</span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <span className="text-[10px] font-bold text-slate-400">Review</span>
          </div>
        </div>

        {/* Section: Vehicle Information */}
        <div className="space-y-3 pt-1">
          <h2 className="text-xs font-extrabold text-slate-900">Vehicle Information</h2>

          <div className="space-y-2.5 text-xs">
            
            {/* Vehicle Type */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">Vehicle Type</span>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-slate-900">
                <span>Innova Crysta</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Manufacturer */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">Manufacturer</span>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-slate-900">
                <span>Toyota</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Model */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">Model</span>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-slate-900">
                <span>Innova Crysta</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Year of Registration */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">Year of Registration</span>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-slate-900">
                <span>2022</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Registration Number Dual Inputs */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">Registration Number</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900">
                  <span>DL</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  defaultValue="1Z C 1234"
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900 w-24 text-center focus:outline-none uppercase"
                />
              </div>
            </div>

            {/* Color */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">Color</span>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-slate-900">
                <span>White</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Seating Capacity */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">Seating Capacity</span>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-slate-900">
                <span>7 Seats</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Vehicle Class */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">Vehicle Class</span>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-slate-900">
                <span>MUV</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Fuel Type */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Fuel className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">Fuel Type</span>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-slate-900">
                <span>Diesel</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* AC / Non AC Toggle */}
            <div className="flex items-center justify-between bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Wind className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-500 font-medium">AC / Non AC</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="border border-orange-500 text-orange-600 bg-orange-50/50 font-extrabold px-3 py-1 rounded-lg text-xs">
                  AC
                </button>
                <button className="border border-slate-200 text-slate-600 font-semibold px-3 py-1 rounded-lg text-xs hover:bg-slate-100">
                  Non AC
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Section: Vehicle Ownership */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-extrabold text-slate-900">Vehicle Ownership</h2>

          <div className="grid grid-cols-2 gap-3">
            <div 
              onClick={() => setOwnership('Owned')}
              className={`border-2 rounded-2xl p-3 cursor-pointer transition relative space-y-1 ${
                ownership === 'Owned' ? 'border-orange-500 bg-orange-50/10' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  ownership === 'Owned' ? 'bg-orange-500 text-white' : 'border border-slate-300'
                }`}>
                  {ownership === 'Owned' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <h3 className="font-extrabold text-xs text-slate-900">Owned</h3>
              <p className="text-[9px] text-slate-500 leading-tight">Vehicle is owned by you / your company</p>
            </div>

            <div 
              onClick={() => setOwnership('Leased')}
              className={`border-2 rounded-2xl p-3 cursor-pointer transition relative space-y-1 ${
                ownership === 'Leased' ? 'border-orange-500 bg-orange-50/10' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  ownership === 'Leased' ? 'bg-orange-500 text-white' : 'border border-slate-300'
                }`}>
                  {ownership === 'Leased' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <h3 className="font-extrabold text-xs text-slate-900">Leased</h3>
              <p className="text-[9px] text-slate-500 leading-tight">Vehicle is on lease</p>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-amber-900 font-medium">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Ensure vehicle RC is in the name of your company / owner.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button 
            onClick={() => {
              showToast("Details Saved! Proceeding to Documents...");
              onContinue();
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition"
          >
            Continue
          </button>
          <button 
            onClick={() => showToast("Draft saved")}
            className="w-full border border-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-2xl hover:bg-slate-50 transition"
          >
            Save & Add Another Vehicle
          </button>
        </div>

      </main>
    </div>
  );
}

function FleetOverviewScreen({ showToast, onAddVehicle }) {
  const [selectedCategory, setSelectedCategory] = useState('All Vehicles');

  return (
    <div className="bg-white min-h-full pb-16">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <Menu className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Fleet Overview</h1>
        </div>
        <div className="relative">
          <button className="p-1.5 rounded-full hover:bg-slate-100">
            <Bell className="w-5 h-5 text-slate-800" />
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">3</span>
          </button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Fleet Summary Hero Banner */}
        <div className="border border-slate-100 rounded-3xl p-4 bg-white shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-orange-100/80 text-orange-600 flex items-center justify-center shrink-0">
              <Car className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Total Vehicles</p>
              <h2 className="text-2xl font-black text-slate-900 leading-none my-0.5">24</h2>
              <p className="text-[10px] text-slate-500 font-semibold">All Vehicles</p>
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] font-bold border-l border-slate-100 pl-4">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Active
              </span>
              <span className="font-extrabold text-emerald-600">18</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Under Maintenance
              </span>
              <span className="font-extrabold text-orange-600">3</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Pending Approval
              </span>
              <span className="font-extrabold text-blue-600">3</span>
            </div>
          </div>
        </div>

        {/* Vehicle Categories Horizontal Scroll */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-900">Vehicle Categories</h2>
            <button onClick={() => showToast("Viewing All Categories")} className="text-xs text-orange-600 font-extrabold hover:underline">
              View All
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'All Vehicles', count: 24, icon: Car },
              { id: 'SUV', count: 8, icon: Car },
              { id: 'MUV', count: 6, icon: Car },
              { id: 'Sedan', count: 7, icon: Car },
              { id: 'Tempo', count: 3, icon: Car },
            ].map((cat) => (
              <div 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-w-[76px] p-2.5 rounded-2xl border text-center cursor-pointer transition flex flex-col items-center justify-between gap-1 shrink-0 ${
                  selectedCategory === cat.id 
                    ? 'border-orange-500 bg-orange-50/20' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <cat.icon className={`w-5 h-5 ${selectedCategory === cat.id ? 'text-orange-500' : 'text-slate-600'}`} />
                <p className="font-extrabold text-[10px] text-slate-900 leading-tight">{cat.id}</p>
                <p className={`font-black text-xs ${selectedCategory === cat.id ? 'text-orange-600' : 'text-slate-500'}`}>{cat.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search vehicle by name or number"
              className="bg-transparent w-full text-slate-900 font-medium focus:outline-none"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50">
            <Sliders className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Recent Vehicles List */}
        <div className="space-y-2">
          <h2 className="text-xs font-extrabold text-slate-900">Recent Vehicles</h2>

          <div className="space-y-2 text-xs">
            
            {/* Vehicle Item 1 */}
            <div className="border border-slate-100 rounded-2xl p-2.5 bg-white shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  <img src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=200&q=80" alt="Innova Crysta" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-900">Innova Crysta</h3>
                  <p className="text-[10px] font-bold text-slate-500 font-mono">DL 1Z C 1234</p>
                  <p className="text-[9px] text-slate-400 font-medium">📅 2022 • ⛽ Diesel • 👥 7 Seats</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                  Active
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Vehicle Item 2 */}
            <div className="border border-slate-100 rounded-2xl p-2.5 bg-white shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  <img src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=200&q=80" alt="Toyota Fortuner" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-900">Toyota Fortuner</h3>
                  <p className="text-[10px] font-bold text-slate-500 font-mono">HR 26 AB 4321</p>
                  <p className="text-[9px] text-slate-400 font-medium">📅 2021 • ⛽ Diesel • 👥 7 Seats</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                  Active
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Vehicle Item 3 */}
            <div className="border border-slate-100 rounded-2xl p-2.5 bg-white shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  <img src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=200&q=80" alt="Ertiga" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-900">Ertiga</h3>
                  <p className="text-[10px] font-bold text-slate-500 font-mono">DL 8CA 5678</p>
                  <p className="text-[9px] text-slate-400 font-medium">📅 2023 • ⛽ Petrol • 👥 7 Seats</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                  Active
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Vehicle Item 4 */}
            <div className="border border-slate-100 rounded-2xl p-2.5 bg-white shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  <img src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=200&q=80" alt="Tempo Traveller" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-900">Tempo Traveller (17 Seater)</h3>
                  <p className="text-[10px] font-bold text-slate-500 font-mono">HR 55 T 9090</p>
                  <p className="text-[9px] text-slate-400 font-medium">📅 2023 • ⛽ Diesel • 👥 17 Seats</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-50 text-blue-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                  Pending
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Vehicle Item 5 */}
            <div className="border border-slate-100 rounded-2xl p-2.5 bg-white shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  <img src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=200&q=80" alt="Innova Hycross" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-slate-900">Innova Hycross</h3>
                  <p className="text-[10px] font-bold text-slate-500 font-mono">DL 10AA 7890</p>
                  <p className="text-[9px] text-slate-400 font-medium">📅 2022 • ⛽ Petrol • 👥 7 Seats</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-50 text-amber-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                  Maintenance
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

          </div>
        </div>

        {/* Full-width Add Vehicle Action Button */}
        <div className="pt-2">
          <button 
            onClick={onAddVehicle}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>

      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 max-w-[420px] w-full bg-white border-t border-slate-100 py-2 px-4 flex justify-around items-center z-30">
        <button className="flex flex-col items-center text-slate-400 hover:text-slate-600">
          <Car className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-slate-600">
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Bookings</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-slate-600">
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Earnings</span>
        </button>
        <button className="flex flex-col items-center text-orange-500 font-bold">
          <Car className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Fleet</span>
        </button>
        <button className="flex flex-col items-center text-slate-400 hover:text-slate-600">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Profile</span>
        </button>
      </div>
    </div>
  );
}

function ServiceAreaPricingScreen({ showToast, onBack }) {
  const [pricingMethod, setPricingMethod] = useState('Per KM');

  return (
    <div className="bg-white min-h-full pb-16">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Service Area & Pricing</h1>
        </div>
        <button 
          onClick={() => showToast("Service Area Help Guide")}
          className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Top Banner Card */}
        <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-xs text-slate-900">Where do you want bookings?</h2>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                Choose your preferred locations, routes and set your pricing.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Preferred States */}
        <div className="space-y-2">
          <h2 className="text-xs font-extrabold text-slate-900">1. Preferred States</h2>
          <p className="text-[10px] text-slate-400 font-medium">Select the states where you want to operate</p>

          <div className="flex flex-wrap gap-2 text-xs pt-1">
            {['Delhi', 'Haryana', 'Rajasthan', 'Uttar Pradesh'].map((state) => (
              <label key={state} className="flex items-center gap-1.5 bg-orange-50/50 border border-orange-200 text-slate-900 font-bold px-3 py-1.5 rounded-xl cursor-pointer">
                <Check className="w-3.5 h-3.5 text-orange-600 stroke-[3]" />
                <span>{state}</span>
              </label>
            ))}
            <label className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 font-medium px-3 py-1.5 rounded-xl cursor-pointer">
              <span>Punjab</span>
            </label>
            <button className="flex items-center gap-1 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-50">
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Section 2 & 3 Dual Column Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          
          {/* Section 2: Preferred Areas in Delhi */}
          <div className="border border-slate-100 rounded-2xl p-3 bg-white shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold text-slate-900">2. Preferred Areas in Delhi</h3>
              <button className="text-[10px] text-orange-600 font-bold hover:underline">Select All</button>
            </div>

            <div className="space-y-1.5 text-[10px] text-slate-700 font-bold pt-1">
              {['South Delhi', 'West Delhi', 'Dwarka', 'Rohini', 'Najafgarh', 'Pitampura', 'Airport', 'Noida Border', 'Gurugram Border', 'Faridabad'].map((area) => (
                <div key={area} className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-orange-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{area}</span>
                </div>
              ))}
            </div>

            <button className="w-full text-center border border-orange-500 text-orange-600 font-bold text-[10px] py-1.5 rounded-xl hover:bg-orange-50 transition mt-2">
              + More Areas
            </button>
          </div>

          {/* Section 3: Preferred Routes (Outstation) */}
          <div className="border border-slate-100 rounded-2xl p-3 bg-white shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold text-slate-900">3. Preferred Routes (Outstation)</h3>
              <button className="text-[10px] text-orange-600 font-bold hover:underline">Select All</button>
            </div>

            <div className="space-y-2 text-[10px] text-slate-700 font-bold pt-1">
              {['Delhi ↔ Jaipur', 'Delhi ↔ Agra', 'Delhi ↔ Chandigarh', 'Delhi ↔ Dehradun', 'Delhi ↔ Rishikesh', 'Delhi ↔ Manali'].map((route) => (
                <div key={route} className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-orange-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{route}</span>
                </div>
              ))}
            </div>

            <button className="w-full text-center border border-orange-500 text-orange-600 font-bold text-[10px] py-1.5 rounded-xl hover:bg-orange-50 transition mt-2">
              + Add Route
            </button>
          </div>

        </div>

        {/* Section 4: Pricing Method */}
        <div className="border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-3">
          <h2 className="text-xs font-extrabold text-slate-900">4. Pricing Method</h2>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-800">
            {['Per KM', 'Per Day', 'Both (Per KM & Per Day)'].map((method) => (
              <label key={method} className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="radio" 
                  name="pricingMethod" 
                  checked={pricingMethod === method} 
                  onChange={() => setPricingMethod(method)}
                  className="accent-orange-500"
                />
                <span>{method}</span>
              </label>
            ))}
          </div>

          {/* Rate Table */}
          <div className="space-y-2 pt-2 text-xs">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-800">Sedan (4 Seater)</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-extrabold">
                <span className="text-slate-400">₹</span>
                <input type="text" defaultValue="14.00" className="w-12 bg-transparent text-right font-black focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-800">SUV (6 Seater)</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-extrabold">
                <span className="text-slate-400">₹</span>
                <input type="text" defaultValue="18.00" className="w-12 bg-transparent text-right font-black focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-800">Innova / MUV (7 Seater)</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-extrabold">
                <span className="text-slate-400">₹</span>
                <input type="text" defaultValue="22.00" className="w-12 bg-transparent text-right font-black focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-800">Tempo Traveller</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 font-extrabold">
                <span className="text-slate-400">₹</span>
                <input type="text" defaultValue="35.00" className="w-12 bg-transparent text-right font-black focus:outline-none" />
              </div>
            </div>

          </div>

          <p className="text-[9px] text-slate-400 font-medium pt-1">
            Rates should include selected inclusions below.
          </p>
        </div>

        {/* Section 5 & 6 Dual Column Grid */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* Section 5: Rate Includes */}
          <div className="border border-slate-100 rounded-2xl p-3 bg-white shadow-xs space-y-2">
            <h3 className="text-[11px] font-extrabold text-slate-900">5. Rate Includes</h3>

            <div className="space-y-1.5 text-[10px] text-slate-700 font-bold">
              {['Fuel', 'Driver Allowance', 'Toll / Taxes', 'Parking', 'Night Charges', 'GST'].map((inc) => (
                <div key={inc} className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{inc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Extra Charges */}
          <div className="border border-slate-100 rounded-2xl p-3 bg-white shadow-xs space-y-2">
            <h3 className="text-[11px] font-extrabold text-slate-900">6. Extra Charges</h3>

            <div className="space-y-2 text-[10px] text-slate-700 font-bold">
              <div className="flex justify-between items-center">
                <span>Extra KM after 300 KM</span>
                <span className="font-mono font-extrabold">₹ 15</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Extra Hour (Per Hour)</span>
                <span className="font-mono font-extrabold">₹ 250</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Night Charges (After 10 PM)</span>
                <span className="font-mono font-extrabold">₹ 500</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Hill Charges</span>
                <span className="font-mono font-extrabold">₹ 700</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Airport Parking</span>
                <span className="font-mono font-extrabold">₹ 300</span>
              </div>
            </div>
          </div>

        </div>

        {/* Section 7, 8, 9 Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-slate-100 rounded-2xl p-2.5 bg-white space-y-1">
            <h3 className="font-extrabold text-[10px] text-slate-900 leading-tight">7. Accept Bookings</h3>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700">
              <div className="w-3 h-3 rounded bg-orange-500 text-white flex items-center justify-center">
                <Check className="w-2 h-2 stroke-[3]" />
              </div>
              <span>Local</span>
            </div>
          </div>

          <div className="border border-slate-100 rounded-2xl p-2.5 bg-white space-y-1">
            <h3 className="font-extrabold text-[10px] text-slate-900 leading-tight">8. Operating Days</h3>
            <div className="flex items-center gap-0.5 text-[9px] font-bold text-blue-600">
              <span className="bg-blue-50 px-1 py-0.5 rounded">Mon</span>
              <span className="bg-blue-50 px-1 py-0.5 rounded">Tue</span>
              <span className="bg-blue-50 px-1 py-0.5 rounded">Wed</span>
            </div>
          </div>

          <div className="border border-slate-100 rounded-2xl p-2.5 bg-white space-y-1">
            <h3 className="font-extrabold text-[10px] text-slate-900 leading-tight">9. Pickup Radius</h3>
            <span className="text-orange-600 font-extrabold text-xs">30 KM</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button 
            onClick={() => showToast("Service Area & Pricing Saved!")}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>Save Service Area & Pricing</span>
          </button>
        </div>

      </main>
    </div>
  );
}

function AddVehicleStep2Screen({ showToast, onBack, onContinue }) {
  return (
    <div className="bg-white min-h-full pb-8">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Add Vehicle</h1>
        </div>
        <button 
          onClick={() => showToast("Documents Requirements Guide")}
          className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Step Indicator Bar */}
        <div className="flex items-center justify-between px-6 py-2 relative">
          <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
          
          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-[10px] font-bold text-slate-600">Vehicle Details</span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold text-xs shadow-md shadow-orange-500/30">
              2
            </div>
            <span className="text-[10px] font-extrabold text-orange-600">Documents</span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <span className="text-[10px] font-bold text-slate-400">Review</span>
          </div>
        </div>

        {/* Header Section */}
        <div>
          <h2 className="text-xs font-extrabold text-slate-900">Upload Documents</h2>
          <p className="text-[10px] text-slate-500 font-medium">All documents are mandatory</p>
        </div>

        {/* Documents List */}
        <div className="space-y-2.5 text-xs">
          
          {/* Doc 1: RC Certificate */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">RC Certificate</h3>
                <p className="text-[10px] font-bold text-slate-500 font-mono">DL 1Z C 1234</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-extrabold text-xs">Uploaded</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Doc 2: Insurance Certificate */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Insurance Certificate</h3>
                <p className="text-[10px] font-medium text-slate-500">Valid till 20 May 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-extrabold text-xs">Uploaded</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Doc 3: PUC Certificate */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">PUC Certificate</h3>
                <p className="text-[10px] font-medium text-slate-500">Valid till 15 Jun 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-extrabold text-xs">Uploaded</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Doc 4: Fitness Certificate */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Fitness Certificate</h3>
                <p className="text-[10px] font-medium text-slate-500">Valid till 10 Nov 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-orange-600 font-extrabold">
              <span>Upload</span>
              <Upload className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Doc 5: Permit */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Permit (If Applicable)</h3>
                <p className="text-[10px] font-medium text-slate-500">Valid till 10 Nov 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-orange-600 font-extrabold">
              <span>Upload</span>
              <Upload className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Doc 6: Road Tax Receipt */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Road Tax Receipt</h3>
                <p className="text-[10px] font-medium text-slate-500">Valid till 31 Mar 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-orange-600 font-extrabold">
              <span>Upload</span>
              <Upload className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>

        {/* Warning Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-start gap-2 text-[10px] text-slate-600">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>Please ensure all documents are clear and valid. Incorrect or expired documents may lead to rejection.</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button 
            onClick={() => {
              showToast("Documents Verified! Proceeding to Step 3 Review...");
              onContinue();
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition"
          >
            Continue
          </button>
          <button 
            onClick={() => showToast("Draft Saved")}
            className="w-full border border-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-2xl hover:bg-slate-50 transition"
          >
            Save & Add Another Vehicle
          </button>
        </div>

      </main>
    </div>
  );
}