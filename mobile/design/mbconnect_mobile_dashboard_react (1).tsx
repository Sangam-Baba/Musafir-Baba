import React, { useState } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  Check,
  CheckCircle2,
  Car,
  FileText,
  CalendarDays,
  Fuel,
  Armchair,
  Eye,
  Upload,
  Maximize2,
  User,
  Hash,
  Award,
  Download,
  ChevronRight,
  Wallet,
  Headphones,
  MessageSquare,
  Gift,
  Info,
  LogOut,
  Bell,
  Home,
  Calendar,
  Mail,
  Grid,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldAlert,
  CreditCard,
  Building2,
  Signal,
  Wifi,
  X
} from 'lucide-react';

export default function App() {
  // Screen Router state explicitly set to Screen 5 (vehicleDetails) for this batch
  const [currentScreen, setCurrentScreen] = useState('vehicleDetails');
  const [activeTab, setActiveTab] = useState('Menu');
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
      
      {}
      <div className="w-full max-w-[430px] mb-3 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl flex items-center justify-between text-xs text-slate-300 shadow-xl border border-slate-800">
        <span className="font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Batch 2 Screens:
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'vehicleDetails', label: '5. Vehicle Details (5_3.jpeg)' },
            { id: 'identityProof', label: '6. Identity Proof (6_3.jpeg)' },
            { id: 'verifiedPartner', label: '7. Verified Partner (7_4.jpeg)' },
            { id: 'menu', label: '8. Menu (8_4.jpeg)' },
          ].map((screen) => (
            <button 
              key={screen.id}
              onClick={() => {
                setCurrentScreen(screen.id);
                if (screen.id === 'menu') setActiveTab('Menu');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap text-[11px] ${
                currentScreen === screen.id 
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20' 
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              {screen.label}
            </button>
          ))}
        </div>
      </div>

      {}
      <div className="w-full max-w-[430px] bg-white min-h-[915px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
          
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

          {}
          {currentScreen === 'vehicleDetails' && (
            <VehicleDetailsScreen 
              onBack={() => setCurrentScreen('menu')} 
              showToast={showToast}
            />
          )}

          {currentScreen === 'identityProof' && (
            <IdentityProofScreen 
              onBack={() => setCurrentScreen('menu')} 
              showToast={showToast}
            />
          )}

          {currentScreen === 'verifiedPartner' && (
            <VerifiedPartnerScreen 
              onBack={() => setCurrentScreen('menu')} 
              showToast={showToast}
              setCurrentScreen={setCurrentScreen}
            />
          )}

          {currentScreen === 'menu' && (
            <MenuScreen 
              showToast={showToast}
              setCurrentScreen={setCurrentScreen}
              activeTab={activeTab}
              handleTabChange={handleTabChange}
            />
          )}

        </div>

        {/* Global Toast Message */}
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
        {/* Verified Green Banner */}
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

        {}
        <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-24 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden relative">
              <Car className="w-10 h-10 text-slate-400" />
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

        {}
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

        {}
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

        {}
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

function IdentityProofScreen({ onBack, showToast }) {
  return (
    <div className="bg-white min-h-full pb-10">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900">Identity Proof</h1>
        </div>
        <button onClick={() => showToast("Identity Proof Support")} className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900">
          <HelpCircle className="w-4 h-4" /> Help
        </button>
      </header>

      <main className="p-4 space-y-4">
        {/* Verified Green Hero Banner */}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="font-extrabold text-emerald-800 text-sm">Verified</span>
              <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                Your identity proof has been verified on 18 May 2025
              </p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center shrink-0 ml-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
          </div>
        </div>

        {}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Document Details</h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span>Document Type</span>
              </div>
              <span className="font-bold text-slate-900">Aadhaar Card</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>Name</span>
              </div>
              <span className="font-bold text-slate-900">Ashutosh Kumar</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
                <span>Date of Birth</span>
              </div>
              <span className="font-bold text-slate-900">30 Apr 1997</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Hash className="w-3.5 h-3.5" />
                </div>
                <span>Aadhaar Number</span>
              </div>
              <span className="font-bold text-slate-900">xxxx xxxx 1234</span>
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

        {}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Uploaded Document</h2>

          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Aadhaar Card Graphic */}
            <div className="col-span-8 bg-white border border-slate-200 rounded-xl p-2.5 text-[9px] space-y-1 relative shadow-xs overflow-hidden">
              <div className="border-b border-orange-200 pb-1 flex justify-between items-center">
                <div className="font-black text-slate-900 text-[10px] tracking-tight">भारत सरकार / GOVERNMENT OF INDIA</div>
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
              </div>
              <div className="flex gap-2 pt-1">
                <div className="w-10 h-12 bg-slate-200 rounded border border-slate-300 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-slate-500" />
                </div>
                <div className="space-y-0.5 text-slate-800 font-bold">
                  <div>अशुतोष कुमार</div>
                  <div>Ashutosh Kumar</div>
                  <div className="text-[8px] text-slate-500 font-normal">जन्म तिथि / DOB: 30/04/1997</div>
                  <div className="text-[8px] text-slate-500 font-normal">पुरुष / Male</div>
                </div>
              </div>
              <div className="text-center font-black text-xs text-slate-900 pt-1 tracking-wider border-t border-slate-100 mt-1">
                XXXX XXXX 1234
              </div>
              <div className="bg-red-600 text-white text-[8px] font-bold text-center py-0.5 -mx-2.5 -mb-2 mt-1">
                मेरा आधार, मेरी पहचान
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

        {}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Guidelines</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-700 font-medium pl-1">
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Document should be original and valid</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> All details must be clearly visible</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Accepted formats: JPG, PNG, PDF</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Maximum file size: 5MB</p>
          </div>
        </div>

        <div className="pt-1 text-center space-y-3">
          <button onClick={() => showToast("Contacting Support...")} className="text-xs text-slate-500 font-medium hover:underline block mx-auto">
            Facing an issue? <span className="text-emerald-600 font-bold">Contact Support</span>
          </button>

          <button 
            onClick={() => showToast("Re-upload Identity Proof Form...")}
            className="w-full border-2 border-emerald-600 text-emerald-700 font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Re-upload Document</span>
          </button>
        </div>

      </main>
    </div>
  );
}

function VerifiedPartnerScreen({ onBack, showToast, setCurrentScreen }) {
  return (
    <div className="bg-white min-h-full pb-10">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900">Verified Partner</h1>
        </div>
        <button onClick={() => showToast("Partner Support")} className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900">
          <HelpCircle className="w-4 h-4" /> Need Help?
        </button>
      </header>

      <main className="p-4 space-y-4">
        {}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1 flex-1 pr-2">
            <h2 className="font-extrabold text-slate-900 text-sm">You are a Verified Partner</h2>
            <p className="text-[11px] text-slate-600 font-medium leading-snug">
              Thank you for completing the verification process. All systems are good to go!
            </p>
            <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full mt-1">
              Verified on 18 May 2025
            </span>
          </div>

          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border-2 border-emerald-500 relative">
            <User className="w-9 h-9 text-emerald-700" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          </div>
        </div>

        {}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Verification Status</p>
            <p className="font-black text-emerald-600 text-xs">Verified</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Verified On</p>
            <p className="font-black text-slate-900 text-xs">18 May 2025</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1">
            <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <p className="text-[9px] text-slate-400 font-medium">Next Review On</p>
            <p className="font-black text-slate-900 text-xs">18 May 2026</p>
          </div>
        </div>

        {}
        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
          <h2 className="text-xs font-bold text-slate-900">Verification Checklist</h2>

          <div className="space-y-1 text-xs">
            {[
              { icon: User, color: 'text-emerald-500 bg-emerald-50', title: 'Identity Proof', sub: 'Aadhaar Card', target: 'identityProof' },
              { icon: Car, color: 'text-blue-500 bg-blue-50', title: 'Vehicle Details', sub: 'Vehicle RC Verified', target: 'vehicleDetails' },
              { icon: FileText, color: 'text-amber-500 bg-amber-50', title: 'Driving License', sub: 'DL Verified', target: 'identityProof' },
              { icon: ShieldCheck, color: 'text-purple-500 bg-purple-50', title: 'Insurance', sub: 'Valid till 18 May 2026', target: 'vehicleDetails' },
              { icon: ShieldCheck, color: 'text-rose-500 bg-rose-50', title: 'PUC Certificate', sub: 'Valid till 18 May 2026', target: 'vehicleDetails' },
              { icon: Building2, color: 'text-teal-500 bg-teal-50', title: 'Bank Account', sub: 'Account Verified', target: 'menu' },
              { icon: FileText, color: 'text-orange-500 bg-orange-50', title: 'Profile Photo', sub: 'Profile photo verified', target: 'menu' },
              { icon: CalendarDays, color: 'text-indigo-500 bg-indigo-50', title: 'Background Check', sub: 'Completed', target: 'menu' },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div 
                  key={idx}
                  onClick={() => setCurrentScreen(item.target)}
                  className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-1 rounded-xl cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-900">{item.title}</h3>
                      <p className="text-[10px] text-slate-400">{item.sub}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                    <span>Verified</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <ChevronRight className="w-4 h-4 text-slate-400 ml-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {}
        <div className="bg-[#EFF8F3] border border-emerald-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-xs">Why Verification Matters?</h3>
          </div>
          <div className="space-y-1 text-[11px] text-slate-700 font-medium pl-1 pt-1">
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Builds trust with customers</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Access to more rides and features</p>
            <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Higher earnings and priority support</p>
          </div>
        </div>

        <button 
          onClick={() => showToast("Downloading Verification Certificate...")}
          className="w-full border-2 border-emerald-600 text-emerald-700 font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
        >
          <Download className="w-4 h-4" />
          <span>Download Verification Certificate</span>
        </button>

      </main>
    </div>
  );
}

function MenuScreen({ showToast, setCurrentScreen, activeTab, handleTabChange }) {
  return (
    <div className="bg-white min-h-full flex flex-col justify-between">
      <div>
        {/* Header Bar */}
        <header className="px-5 py-4 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Menu</h1>
            <p className="text-xs text-slate-400 font-medium">Manage your account and app settings</p>
          </div>
          
          <button onClick={() => showToast("Notifications")} className="relative p-2 rounded-full hover:bg-slate-100 transition active:scale-95">
            <Bell className="w-6 h-6 text-slate-800" />
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
              3
            </span>
          </button>
        </header>

        <main className="p-4 space-y-4">
          
          {}
          <div 
            onClick={() => setCurrentScreen('verifiedPartner')}
            className="border border-slate-100 rounded-2xl p-4 bg-white shadow-xs space-y-3 cursor-pointer hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg border-2 border-emerald-500 shrink-0">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-sm text-slate-900">Ashutosh Kumar</h2>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">MB-DRV-12568</p>
                  <span className="inline-block bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.2 rounded mt-0.5 border border-emerald-100">
                    Verified Partner
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>

            {/* Nested Wallet Card */}
            <div className="bg-[#EFF8F3] border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-800 font-medium">Wallet Balance</p>
                  <p className="font-black text-slate-900 text-sm">₹1,250</p>
                </div>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showToast("Opening Wallet Balance...");
                }}
                className="border border-emerald-600 text-emerald-700 font-extrabold text-[10px] px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 transition flex items-center gap-1"
              >
                <span>View Wallet</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {}
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-400 px-1 mb-1.5">Account & Settings</h3>
            <div className="border border-slate-100 rounded-2xl bg-white shadow-xs divide-y divide-slate-50">
              
              <div onClick={() => setCurrentScreen('identityProof')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">My Profile</h4>
                    <p className="text-[10px] text-slate-400">View and update your profile</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => setCurrentScreen('identityProof')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Documents</h4>
                    <p className="text-[10px] text-slate-400">Manage your documents</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => setCurrentScreen('vehicleDetails')} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">My Vehicles</h4>
                    <p className="text-[10px] text-slate-400">Manage your vehicles</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => showToast("Opening Payout & Bank Details...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Payout & Bank Details</h4>
                    <p className="text-[10px] text-slate-400">Manage bank accounts and payouts</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => showToast("Opening Subscription Plans...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Subscription</h4>
                    <p className="text-[10px] text-slate-400">View plan, renewal and history</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => showToast("Opening Referrals & Rewards...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Referrals & Rewards</h4>
                    <p className="text-[10px] text-slate-400">Invite partners and earn rewards</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

            </div>
          </div>

          {}
          <div className="space-y-1 pt-1">
            <h3 className="text-xs font-bold text-slate-400 px-1 mb-1.5">Support & Information</h3>
            <div className="border border-slate-100 rounded-2xl bg-white shadow-xs divide-y divide-slate-50">
              
              <div onClick={() => showToast("Opening Help Center...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Help Center</h4>
                    <p className="text-[10px] text-slate-400">Get help and view FAQs</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => showToast("Opening Support Chat...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Contact Support</h4>
                    <p className="text-[10px] text-slate-400">Chat with our support team</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => showToast("Opening Terms & Conditions...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Terms & Conditions</h4>
                    <p className="text-[10px] text-slate-400">Read our terms and conditions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => showToast("Opening Privacy Policy...")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Privacy Policy</h4>
                    <p className="text-[10px] text-slate-400">Read our privacy policy</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div onClick={() => showToast("MBconnect App v1.0.0")} className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">About MBconnect</h4>
                    <p className="text-[10px] text-slate-400">App version 1.0.0</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

            </div>
          </div>

          {}
          <div 
            onClick={() => showToast("Safely logging out...")}
            className="bg-red-50/50 border border-red-100 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-red-50 transition mt-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-red-600">Logout</h4>
                <p className="text-[10px] text-slate-400">Safely logout from your account</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-500" />
          </div>

        </main>
      </div>

      {}
      <div className="bg-white border-t border-slate-100 pt-2 pb-6 px-4">
        <nav className="flex justify-around items-center pt-1.5">
          {[
            { name: 'Home', icon: Home, screen: 'menu' },
            { name: 'Bookings', icon: Calendar, screen: 'menu' },
            { name: 'Earnings', icon: Wallet, screen: 'menu' },
            { name: 'Inbox', icon: Mail, badge: 2, screen: 'menu' },
            { name: 'Menu', icon: Grid, screen: 'menu' },
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