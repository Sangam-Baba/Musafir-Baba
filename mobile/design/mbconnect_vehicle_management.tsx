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
  Wifi
} from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('notIndividual'); // 'notIndividual' | 'vehicleOwnership' | 'vehicleDetailsTabbed' | 'addVehicleReview'
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-950 sm:py-6 font-sans antialiased text-slate-800 selection:bg-orange-500 selection:text-white">
      
      {/* Batch 5 Quick Screen Selector Navbar */}
      <div className="w-full max-w-[430px] mb-3 px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl flex items-center justify-between text-xs text-slate-300 shadow-xl border border-slate-800 z-50">
        <span className="font-bold text-slate-400 flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          Batch 5 Screens:
        </span>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'notIndividual', label: '21. Not Individual (21.jpeg)' },
            { id: 'vehicleOwnership', label: '22. Vehicle Ownership (22.jpeg)' },
            { id: 'vehicleDetailsTabbed', label: '23. Vehicle Details (23.jpeg)' },
            { id: 'addVehicleReview', label: '24. Add Vehicle Review (24.jpeg)' },
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
          {currentScreen === 'notIndividual' && (
            <NotIndividualScreen 
              showToast={showToast}
              onContinue={() => setCurrentScreen('vehicleOwnership')}
            />
          )}

          {currentScreen === 'vehicleOwnership' && (
            <VehicleOwnershipScreen 
              showToast={showToast}
              onBack={() => setCurrentScreen('notIndividual')}
              onContinue={() => setCurrentScreen('vehicleDetailsTabbed')}
            />
          )}

          {currentScreen === 'vehicleDetailsTabbed' && (
            <VehicleDetailsTabbedScreen 
              showToast={showToast}
              onBack={() => setCurrentScreen('vehicleOwnership')}
              onNext={() => setCurrentScreen('addVehicleReview')}
            />
          )}

          {currentScreen === 'addVehicleReview' && (
            <AddVehicleReviewScreen 
              showToast={showToast}
              onBack={() => setCurrentScreen('vehicleDetailsTabbed')}
            />
          )}

        </div>

        {/* Global Toast Message Notification */}
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

function NotIndividualScreen({ showToast, onContinue }) {
  const [entityType, setEntityType] = useState('Private Limited Company');

  return (
    <div className="bg-white min-h-full pb-8">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Not Individual (Company/Other)</h1>
        </div>
        <button 
          onClick={() => showToast("Opening Entity Help Guide...")}
          className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Helper Instructions Disclaimer Box */}
        <p className="text-xs text-slate-500 font-medium">Enter company / entity details as per the RC.</p>

        <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-indigo-900">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <span>All details must match the documents. Incorrect information may lead to rejection.</span>
        </div>

        {/* Entity Information Section */}
        <div className="space-y-3 pt-1">
          <h2 className="text-xs font-extrabold text-slate-900">Entity Information</h2>

          <div className="space-y-3 text-xs">
            
            {/* Entity Type Dropdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Entity Type</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-orange-500 focus-within:bg-white transition">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <select 
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="bg-transparent w-full text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Private Limited Company">Private Limited Company</option>
                  <option value="Partnership Firm">Partnership Firm</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="LLP">Limited Liability Partnership (LLP)</option>
                  <option value="Trust/Society">Trust / Society / NGO</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Company / Entity Name */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Company / Entity Name</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="text" 
                  defaultValue="Musafirbaba Travels Private Limited"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* CIN Number */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">CIN Number</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="text" 
                  defaultValue="U63040DL2022PTC415786"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 uppercase focus:outline-none"
                />
              </div>
            </div>

            {/* GSTIN */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">GSTIN (If Applicable)</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="text" 
                  defaultValue="07AANCM1234C1Z5"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 uppercase focus:outline-none"
                />
              </div>
            </div>

            {/* Registered Address */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Registered Address</label>
              <div className="flex items-start gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5 relative">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <textarea 
                  rows={2}
                  defaultValue="B-128, 2nd Floor, Najafgarh, New Delhi, Delhi - 110043, India"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 focus:outline-none resize-none pr-8"
                />
                <span className="absolute bottom-1.5 right-2.5 text-[9px] font-medium text-slate-400">45/200</span>
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Contact Number</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="text" 
                  defaultValue="+91 98765 43210"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Email ID */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Email ID</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="email" 
                  defaultValue="info@musafirbaba.com"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Authorized Person Details Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h2 className="text-xs font-extrabold text-slate-900">Authorized Person Details</h2>

          <div className="space-y-3 text-xs">
            {/* Name */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Authorized Person Name</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="text" 
                  defaultValue="Ashutosh Kumar Rai"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Designation */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Designation</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="text" 
                  defaultValue="Director"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Contact Number */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Contact Number</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="text" 
                  defaultValue="+91 98765 43210"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Email ID */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Email ID</label>
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2.5">
                <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input 
                  type="email" 
                  defaultValue="ashutosh@musafirbaba.com"
                  className="bg-transparent w-full text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Documents Grid Section */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-900">Upload Documents</h2>
            <button 
              onClick={() => showToast("Documents requirements list")}
              className="text-xs text-orange-600 font-extrabold flex items-center gap-1 hover:underline"
            >
              <span>What is required?</span>
              <Info className="w-3.5 h-3.5 text-orange-500" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            {/* Document Card 1 */}
            <div className="border border-slate-200 rounded-2xl p-2.5 bg-white space-y-1 shadow-xs flex flex-col justify-between items-center">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <p className="font-extrabold text-slate-900 text-[9px] leading-tight mt-1">RC Certificate</p>
              <p className="text-[8px] text-slate-400 font-medium">(In Company Name)</p>
              <span className="text-emerald-600 font-extrabold text-[9px] flex items-center gap-0.5 mt-1 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                <Check className="w-2.5 h-2.5" /> Uploaded
              </span>
            </div>

            {/* Document Card 2 */}
            <div className="border border-slate-200 rounded-2xl p-2.5 bg-white space-y-1 shadow-xs flex flex-col justify-between items-center">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <p className="font-extrabold text-slate-900 text-[9px] leading-tight mt-1">Authorization Letter</p>
              <p className="text-[8px] text-slate-400 font-medium">(On Company Letterhead)</p>
              <span className="text-emerald-600 font-extrabold text-[9px] flex items-center gap-0.5 mt-1 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                <Check className="w-2.5 h-2.5" /> Uploaded
              </span>
            </div>

            {/* Document Card 3 */}
            <div className="border border-slate-200 rounded-2xl p-2.5 bg-white space-y-1 shadow-xs flex flex-col justify-between items-center">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <p className="font-extrabold text-slate-900 text-[9px] leading-tight mt-1">Authorized Person ID</p>
              <p className="text-[8px] text-slate-400 font-medium">(PAN / Aadhar)</p>
              <span className="text-emerald-600 font-extrabold text-[9px] flex items-center gap-0.5 mt-1 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                <Check className="w-2.5 h-2.5" /> Uploaded
              </span>
            </div>

            {/* Document Card 4 */}
            <div className="border border-slate-200 rounded-2xl p-2.5 bg-white space-y-1 shadow-xs flex flex-col justify-between items-center">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <p className="font-extrabold text-slate-900 text-[9px] leading-tight mt-1">Company PAN Card</p>
              <p className="text-[8px] opacity-0 font-medium">-</p>
              <span className="text-emerald-600 font-extrabold text-[9px] flex items-center gap-0.5 mt-1 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                <Check className="w-2.5 h-2.5" /> Uploaded
              </span>
            </div>
          </div>
        </div>

        {/* Save & Continue Solid Action Button */}
        <div className="pt-3">
          <button 
            onClick={() => {
              showToast("Company Details Saved Successfully!");
              onContinue();
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition"
          >
            Save & Continue
          </button>
        </div>

      </main>
    </div>
  );
}

function VehicleOwnershipScreen({ showToast, onBack, onContinue }) {
  const [ownershipType, setOwnershipType] = useState('Individual'); // 'Individual' | 'Company'

  return (
    <div className="bg-white min-h-full pb-8">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Vehicle Ownership</h1>
        </div>
        <button 
          onClick={() => showToast("Ownership Help Guide")}
          className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        <p className="text-xs text-slate-500 font-medium">Please select the ownership type of this vehicle.</p>

        {/* Ownership Selection Radio Cards */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* Option 1: Individual */}
          <div 
            onClick={() => setOwnershipType('Individual')}
            className={`border-2 rounded-2xl p-3.5 relative cursor-pointer transition-all space-y-2 ${
              ownershipType === 'Individual' 
                ? 'border-orange-500 bg-orange-50/20 shadow-sm' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-orange-500 text-white flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                ownershipType === 'Individual' ? 'bg-orange-500 text-white' : 'border-2 border-slate-300'
              }`}>
                {ownershipType === 'Individual' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <div>
              <h3 className="font-black text-xs text-slate-900">Individual</h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">Vehicle is owned by you personally.</p>
            </div>
          </div>

          {/* Option 2: Not Individual (Company / Other) */}
          <div 
            onClick={() => setOwnershipType('Company')}
            className={`border-2 rounded-2xl p-3.5 relative cursor-pointer transition-all space-y-2 ${
              ownershipType === 'Company' 
                ? 'border-orange-500 bg-orange-50/20 shadow-sm' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                ownershipType === 'Company' ? 'bg-orange-500 text-white' : 'border-2 border-slate-300'
              }`}>
                {ownershipType === 'Company' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <div>
              <h3 className="font-black text-xs text-slate-900">Not Individual (Company / Other)</h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">Vehicle is owned by a company, firm, trust or other entity.</p>
            </div>
          </div>

        </div>

        {/* Dynamic Section: If Individual */}
        {ownershipType === 'Individual' && (
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-extrabold text-slate-900">If Individual</h2>

            <div className="border border-slate-100 rounded-2xl p-3 bg-white shadow-xs space-y-3 divide-y divide-slate-100 text-xs">
              
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Owner Name</p>
                    <p className="font-extrabold text-slate-900">Ashutosh Kumar Rai</p>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-100">
                  <Check className="w-2.5 h-2.5" /> Verified
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">PAN Number</p>
                    <p className="font-extrabold text-slate-900">ABCDE1234F</p>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-100">
                  <Check className="w-2.5 h-2.5" /> Verified
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">Date of Birth</p>
                    <p className="font-extrabold text-slate-900">30 Apr 1997</p>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-100">
                  <Check className="w-2.5 h-2.5" /> Verified
                </span>
              </div>

            </div>
          </div>
        )}

        {/* Dynamic Section: If Not Individual (Company / Other) */}
        {ownershipType === 'Company' && (
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-extrabold text-slate-900">If Not Individual (Company / Other)</h2>

            <div className="border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-3 text-xs">
              
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Entity Type</label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Private Limited Company</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Company / Entity Name</label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Musafirbaba Travels Private Limited</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">CIN Number</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>U63040DL2022PTC415786</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">GSTIN (If Applicable)</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <span>07AANCM1234C1Z5</span>
                </div>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 flex items-start gap-2 text-[10px] text-indigo-900">
                <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>Please ensure all details are correct. Incorrect information may lead to rejection of your vehicle.</span>
              </div>

            </div>
          </div>
        )}

        {/* Bottom Continue Action Button */}
        <div className="pt-2">
          <button 
            onClick={() => {
              showToast("Vehicle Ownership Saved!");
              onContinue();
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition"
          >
            Continue
          </button>
        </div>

      </main>
    </div>
  );
}

function VehicleDetailsTabbedScreen({ showToast, onBack, onNext }) {
  const [activeTab, setActiveTab] = useState('Vehicle Information');

  return (
    <div className="bg-white min-h-full pb-8">
      {/* Header Bar */}
      <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-7 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-full hover:bg-slate-100 transition active:scale-95">
            <ArrowLeft className="w-5 h-5 text-slate-800" />
          </button>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Vehicle Details</h1>
        </div>
        <button onClick={() => showToast("More vehicle options...")} className="p-1 rounded-full hover:bg-slate-100">
          <MoreVertical className="w-5 h-5 text-slate-800" />
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Top Hero Vehicle Card */}
        <div className="border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-3">
          <div className="grid grid-cols-12 gap-3 items-center">
            
            {/* Vehicle Image Preview */}
            <div className="col-span-5 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative">
              <img 
                src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80" 
                alt="Toyota Innova Crysta"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Badges */}
            <div className="col-span-7 space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-sm text-slate-900 leading-snug">Toyota Innova Crysta</h2>
                <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] px-2 py-0.5 rounded-full border border-emerald-100">
                  Active
                </span>
              </div>
              <p className="text-xs font-black text-slate-700 tracking-wider">DL 1Z C 1234</p>

              {/* Specs Pills */}
              <div className="grid grid-cols-3 gap-1 pt-1.5 text-[9px] font-bold text-slate-600">
                <span className="flex items-center gap-1 bg-slate-50 p-1 rounded-md"><Calendar className="w-2.5 h-2.5 text-slate-400" /> 2022</span>
                <span className="flex items-center gap-1 bg-slate-50 p-1 rounded-md"><Fuel className="w-2.5 h-2.5 text-slate-400" /> Diesel</span>
                <span className="flex items-center gap-1 bg-slate-50 p-1 rounded-md"><Users className="w-2.5 h-2.5 text-slate-400" /> 7 Seats</span>
                <span className="flex items-center gap-1 bg-slate-50 p-1 rounded-md"><Car className="w-2.5 h-2.5 text-slate-400" /> MUV</span>
                <span className="flex items-center gap-1 bg-slate-50 p-1 rounded-md"><Wind className="w-2.5 h-2.5 text-slate-400" /> AC</span>
              </div>
            </div>

          </div>
        </div>

        {/* Tab Switcher Bar */}
        <div className="flex border-b border-slate-100 text-xs font-extrabold text-slate-500">
          {['Vehicle Information', 'Documents', 'History'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 pb-2.5 text-center transition-all ${
                activeTab === tab 
                  ? 'text-orange-600 border-b-2 border-orange-500 font-black' 
                  : 'hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1 Content: Vehicle Information Specs Table */}
        {activeTab === 'Vehicle Information' && (
          <div className="space-y-4">
            <div className="border border-slate-100 rounded-2xl bg-white shadow-xs overflow-hidden text-xs divide-y divide-slate-100">
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Manufacturer</span><span className="font-bold text-slate-900">Toyota</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Model</span><span className="font-bold text-slate-900">Innova Crysta</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Color</span><span className="font-bold text-slate-900">White</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Year of Registration</span><span className="font-bold text-slate-900">2022</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Registration Number</span><span className="font-bold text-slate-900 font-mono">DL 1Z C 1234</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Fuel Type</span><span className="font-bold text-slate-900">Diesel</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">AC / Non AC</span><span className="font-bold text-slate-900">AC</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Vehicle Class</span><span className="font-bold text-slate-900">MUV</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Seating Capacity</span><span className="font-bold text-slate-900">7 Seats</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Vehicle Ownership</span><span className="font-bold text-slate-900">Owned</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Insurance Valid Till</span><span className="font-bold text-slate-900">20 May 2026</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">PUC Valid Till</span><span className="font-bold text-slate-900">15 Jun 2026</span></div>
              <div className="p-3 flex justify-between"><span className="text-slate-500 font-medium">Fitness Valid Till</span><span className="font-bold text-slate-900">10 Nov 2025</span></div>
            </div>

            {/* Documents Horizontal Cards Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-slate-900">Documents</h3>
                <button onClick={() => showToast("Viewing All Documents")} className="text-xs text-orange-600 font-extrabold hover:underline">
                  View All
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1.5 text-center text-[9px]">
                <div className="border border-slate-200 rounded-xl p-2 bg-white space-y-1">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <p className="font-extrabold text-slate-800 leading-tight">RC Certificate</p>
                  <p className="text-emerald-600 font-extrabold">Uploaded</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-2 bg-white space-y-1">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <p className="font-extrabold text-slate-800 leading-tight">Insurance Certificate</p>
                  <p className="text-emerald-600 font-extrabold">Uploaded</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-2 bg-white space-y-1">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <p className="font-extrabold text-slate-800 leading-tight">PUC Certificate</p>
                  <p className="text-emerald-600 font-extrabold">Uploaded</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-2 bg-white space-y-1">
                  <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <p className="font-extrabold text-slate-800 leading-tight">Fitness Certificate</p>
                  <p className="text-emerald-600 font-extrabold">Uploaded</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-2 bg-white space-y-1 flex flex-col justify-center items-center">
                  <p className="font-black text-slate-400 text-sm">•••</p>
                  <p className="font-bold text-slate-700 leading-tight">3 More Documents</p>
                </div>
              </div>
            </div>

            {/* Bottom Dual Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={() => showToast("Marked for Maintenance")}
                className="border-2 border-orange-500 text-orange-600 font-extrabold text-xs py-3 rounded-2xl hover:bg-orange-50 transition"
              >
                Mark as Maintenance
              </button>
              <button 
                onClick={() => {
                  showToast("Proceeding to Review...");
                  onNext();
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs py-3 rounded-2xl shadow-md shadow-orange-500/20 transition active:scale-95"
              >
                Remove Vehicle
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function AddVehicleReviewScreen({ showToast, onBack }) {
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
          onClick={() => showToast("Add Vehicle Assistance")}
          className="flex items-center gap-1 text-slate-600 text-xs font-semibold hover:text-slate-900"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>
      </header>

      <main className="p-4 space-y-4">
        
        {/* Step Indicator Stepper Bar */}
        <div className="flex items-center justify-between px-4 py-2 relative">
          <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
          
          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-[10px] font-bold text-slate-600">Vehicle Details</span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-[10px] font-bold text-slate-600">Documents</span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10">
            <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold text-xs shadow-md shadow-orange-500/30">
              3
            </div>
            <span className="text-[10px] font-extrabold text-orange-600">Review</span>
          </div>
        </div>

        {/* Almost Done Green Alert Box */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 flex items-start gap-2.5 text-xs">
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-950 text-xs">Almost Done!</h3>
            <p className="text-[10px] text-slate-600 mt-0.5">Please review all details before submitting.</p>
          </div>
        </div>

        {/* Card 1: Vehicle Summary */}
        <div className="border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-2">
          <h2 className="text-xs font-extrabold text-slate-900">Vehicle Summary</h2>

          <div className="grid grid-cols-12 gap-3 items-center pt-1">
            <div className="col-span-5 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img 
                src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80" 
                alt="Toyota Innova Crysta"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="col-span-7 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-slate-900">Toyota Innova Crysta</h3>
                <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md">
                  Owned
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 font-mono">DL 1Z C 1234</p>

              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 pt-1">
                <span>📅 2022</span>
                <span>⛽ Diesel</span>
                <span>👥 7 Seats</span>
                <span>🚘 MUV</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Vehicle Details Specs Table with Edit */}
        <div className="border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-extrabold text-slate-900">Vehicle Details</h2>
            <button onClick={() => showToast("Editing Vehicle Details...")} className="text-xs text-orange-600 font-extrabold flex items-center gap-0.5 hover:underline">
              <span>Edit</span>
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 pt-1">
            <div className="flex justify-between"><span>Manufacturer</span><span className="font-bold text-slate-900">Toyota</span></div>
            <div className="flex justify-between"><span>Model</span><span className="font-bold text-slate-900">Innova Crysta</span></div>
            <div className="flex justify-between"><span>Color</span><span className="font-bold text-slate-900">White</span></div>
            <div className="flex justify-between"><span>Year of Registration</span><span className="font-bold text-slate-900">2022</span></div>
            <div className="flex justify-between"><span>Registration Number</span><span className="font-bold text-slate-900 font-mono">DL 1Z C 1234</span></div>
            <div className="flex justify-between"><span>Fuel Type</span><span className="font-bold text-slate-900">Diesel</span></div>
            <div className="flex justify-between"><span>AC / Non AC</span><span className="font-bold text-slate-900">AC</span></div>
            <div className="flex justify-between"><span>Vehicle Class</span><span className="font-bold text-slate-900">MUV</span></div>
            <div className="flex justify-between"><span>Seating Capacity</span><span className="font-bold text-slate-900">7 Seats</span></div>
          </div>
        </div>

        {/* Card 3: Ownership Section with Edit */}
        <div className="border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-extrabold text-slate-900">Ownership</h2>
            <button onClick={() => showToast("Editing Ownership...")} className="text-xs text-orange-600 font-extrabold flex items-center gap-0.5 hover:underline">
              <span>Edit</span>
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="font-black text-xs text-slate-900">Owned</p>
              <p className="text-[10px] text-slate-400 font-medium">Vehicle is owned by you / your company</p>
            </div>
          </div>
        </div>

        {/* Card 4: Documents Section Grid with Edit */}
        <div className="border border-slate-100 rounded-2xl p-3.5 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-extrabold text-slate-900">Documents</h2>
            <button onClick={() => showToast("Editing Documents...")} className="text-xs text-orange-600 font-extrabold flex items-center gap-0.5 hover:underline">
              <span>Edit</span>
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center text-[9px] pt-1">
            <div className="border border-emerald-200 rounded-xl p-2 bg-emerald-50/30 space-y-1 relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 text-white absolute top-1 right-1 flex items-center justify-center">
                <Check className="w-2 h-2 stroke-[3]" />
              </div>
              <FileText className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="font-extrabold text-slate-800 leading-tight">RC Certificate</p>
              <p className="text-emerald-600 font-extrabold">Uploaded</p>
            </div>

            <div className="border border-emerald-200 rounded-xl p-2 bg-emerald-50/30 space-y-1 relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 text-white absolute top-1 right-1 flex items-center justify-center">
                <Check className="w-2 h-2 stroke-[3]" />
              </div>
              <Shield className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="font-extrabold text-slate-800 leading-tight">Insurance Certificate</p>
              <p className="text-emerald-600 font-extrabold">Uploaded</p>
            </div>

            <div className="border border-emerald-200 rounded-xl p-2 bg-emerald-50/30 space-y-1 relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 text-white absolute top-1 right-1 flex items-center justify-center">
                <Check className="w-2 h-2 stroke-[3]" />
              </div>
              <FileText className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="font-extrabold text-slate-800 leading-tight">PUC Certificate</p>
              <p className="text-emerald-600 font-extrabold">Uploaded</p>
            </div>

            <div className="border border-emerald-200 rounded-xl p-2 bg-emerald-50/30 space-y-1 relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 text-white absolute top-1 right-1 flex items-center justify-center">
                <Check className="w-2 h-2 stroke-[3]" />
              </div>
              <Shield className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="font-extrabold text-slate-800 leading-tight">Fitness Certificate</p>
              <p className="text-emerald-600 font-extrabold">Uploaded</p>
            </div>

            <div className="border border-emerald-200 rounded-xl p-2 bg-emerald-50/30 space-y-1 relative">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white absolute top-1 right-1 flex items-center justify-center text-[8px] font-bold">
                +1
              </div>
              <FileText className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="font-extrabold text-slate-800 leading-tight">2 More Documents</p>
              <p className="text-emerald-600 font-extrabold">Uploaded</p>
            </div>
          </div>
        </div>

        {/* Bottom Submission Action Buttons */}
        <div className="space-y-2 pt-2">
          <button 
            onClick={() => showToast("Vehicle Submitted for Approval!")}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition"
          >
            Submit for Approval
          </button>

          <button 
            onClick={() => showToast("Saved! Opening Add Vehicle form...")}
            className="w-full border-2 border-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-2xl hover:bg-slate-50 transition"
          >
            Save & Add Another Vehicle
          </button>
        </div>

      </main>
    </div>
  );
}