import React, { useState, useEffect, useRef } from 'react';

const apiKey = ""; 

async function askGeminiAssistant(userMessage, chatHistory, systemStatusContext) {
  const modelName = "gemini-2.5-flash-preview-09-2025";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const systemPrompt = `You are "Baba-AI", the Fleet Co-Pilot & Partner Success Specialist for MusafirBaba. 
The partner is currently interacting with their workspace dashboard.
CURRENT SYSTEM STATE:
- Profile Status: ${systemStatusContext.partnerStatus}
- Profile Progress: ${systemStatusContext.progress}%
- Registered Vehicles: ${systemStatusContext.vehiclesCount}
- Registered Drivers: ${systemStatusContext.driversCount}

Help the partner with:
1. Direct steps to transition from Draft -> Pending -> Active.
2. Explaining document policies (Aadhaar, PAN, Commercial Taxi permits/insurance).
3. Earning strategy on MusafirBaba (weekly Tuesday payouts, 12% standard commission).
4. Answering regulations in states like Delhi, Maharashtra, Rajasthan, etc.
Keep responses compact, encouraging, highly structured, and warm. Use emojis and quick bullet points.`;

  const formattedHistory = chatHistory.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  formattedHistory.push({
    role: "user",
    parts: [{ text: userMessage }]
  });

  const payload = {
    contents: formattedHistory,
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    }
  };

  let delay = 1000;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result = await response.json();
      const botText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (botText) return botText;
      throw new Error("Empty content parts");
    } catch (err) {
      if (attempt === 4) return "My dispatch radio is experiencing signal noise. Let me look up MusafirBaba offline parameters: weekly settlement occurs every Tuesday!";
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
}

export default function App() {
  const [partnerStatus, setPartnerStatus] = useState('DRAFT'); 
  const [activeTab, setActiveTab] = useState('personal');
  const [showAdminConsole, setShowAdminConsole] = useState(true);

  // Forms Database state
  const [personalInfo, setPersonalInfo] = useState({
    fullName: 'Rahul Sharma',
    mobileNumber: '+91 98765 43210',
    email: 'rahul.sharma@safardispatch.com',
    partnerType: 'Individual',
    addressLine: '12, Gopal Nagar Road',
    city: 'New Delhi',
    state: 'Delhi',
    pinCode: '110043'
  });

  const [bankInfo, setBankInfo] = useState({
    accountHolderName: 'RAHUL SHARMA',
    bankName: 'State Bank of India',
    accountNumber: '501002345678',
    ifscCode: 'SBIN0001234',
    branchName: 'Gopal Nagar New Delhi'
  });

  const [documents, setDocuments] = useState({
    aadhaarFileName: 'Aadhaar_Rahul_FrontBack.jpg',
    aadhaarStatus: 'Verified', 
    panFileName: 'PAN_Rahul_Card.pdf',
    panStatus: 'Verified'
  });

  // Fleet Asset Registry arrays
  const [vehicles, setVehicles] = useState([
    { id: 1, brand: 'Toyota', model: '2022', vehicleName: 'Innova Crysta', category: 'SUV', seatingCapacity: '7', registrationNumber: 'DL 01 YB 4521', status: 'Active' },
    { id: 2, brand: 'Maruti Suzuki', model: '2023', vehicleName: 'Ertiga Commercial', category: 'SUV', seatingCapacity: '7', registrationNumber: 'HR 26 CB 9081', status: 'Pending Approval' },
    { id: 3, brand: 'Honda', model: '2021', vehicleName: 'City Comfort', category: 'Sedan', seatingCapacity: '5', registrationNumber: 'MH 12 AB 6732', status: 'Inactive' }
  ]);

  const [drivers, setDrivers] = useState([
    { id: 1, fullName: 'Rahul Sharma (Self)', licenseNumber: 'DL-14202000453', mobile: '+91 98765 43210', status: 'Active' },
    { id: 2, fullName: 'Manoj Kumar', licenseNumber: 'UP-16201800981', mobile: '+91 88261 09812', status: 'Pending' }
  ]);

  // Temporary local form inputs
  const [newVehicle, setNewVehicle] = useState({ brand: '', model: '', vehicleName: '', category: 'SUV', seatingCapacity: '7', registrationNumber: '' });
  const [newDriver, setNewDriver] = useState({ fullName: '', licenseNumber: '', mobile: '', status: 'Pending' });

  // State checkpoint markers
  const [personalSaved, setPersonalSaved] = useState(true);
  const [bankSaved, setBankSaved] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Co-Pilot chatbot variables
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState([
    { sender: "bot", text: "Namaste! 🙏 I am Baba-AI, your digital fleet co-pilot. I can write premium descriptions, explain commercial permits, or help you submit your KYC audit files!" }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatHistory, isAiLoading]);

  const calculateProgress = () => {
    let score = 10; 
    if (personalSaved && personalInfo.fullName) score += 25;
    if (bankSaved && bankInfo.accountNumber) score += 25;
    if (documents.aadhaarStatus === 'Verified') score += 15;
    if (documents.panStatus === 'Verified') score += 15;
    if (vehicles.length > 0) score += 10;
    return Math.min(score, 100);
  };

  const currentProgress = calculateProgress();

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const handleSubmitProfileForReview = () => {
    if (currentProgress < 100) {
      triggerToast("Please complete all sections before submitting for administrative audit.", "error");
      return;
    }
    setPartnerStatus('PENDING_REVIEW');
    triggerToast("Profile successfully submitted for background audit! Review takes under 12 hours.", "success");
  };

  const handleSavePersonal = (e) => {
    e.preventDefault();
    setPersonalSaved(true);
    triggerToast("Personal & Address profile locked successfully.", "success");
    setActiveTab('bank');
  };

  const handleSaveBank = (e) => {
    e.preventDefault();
    setBankSaved(true);
    triggerToast("Primary settlement bank details linked.", "success");
    setActiveTab('documents');
  };

  const handleAddVehicle = (e) => {
    e.preventDefault();
    if (!newVehicle.brand || !newVehicle.vehicleName || !newVehicle.registrationNumber) {
      triggerToast("Please enter brand, model, and registration license ID.", "error");
      return;
    }
    const asset = {
      ...newVehicle,
      id: Date.now(),
      status: partnerStatus === 'ACTIVE' ? 'Active' : 'Pending Approval'
    };
    setVehicles([...vehicles, asset]);
    triggerToast(`Added ${newVehicle.brand} ${newVehicle.vehicleName} to compliance queue.`, "success");
    setNewVehicle({ brand: '', model: '', vehicleName: '', category: 'SUV', seatingCapacity: '7', registrationNumber: '' });
  };

  const toggleVehicleStatus = (id) => {
    setVehicles(vehicles.map(v => {
      if (v.id === id) {
        const nextStatus = v.status === 'Active' ? 'Inactive' : 'Active';
        triggerToast(`Vehicle ${v.registrationNumber} is now ${nextStatus}.`, "info");
        return { ...v, status: nextStatus };
      }
      return v;
    }));
  };

  const deleteVehicle = (id) => {
    setVehicles(vehicles.filter(v => v.id !== id));
    triggerToast("Vehicle deleted from registry.", "info");
  };

  const handleAddDriver = (e) => {
    e.preventDefault();
    if (!newDriver.fullName || !newDriver.licenseNumber || !newDriver.mobile) {
      triggerToast("Complete name, driver license number, and phone.", "error");
      return;
    }
    const asset = {
      ...newDriver,
      id: Date.now(),
      status: 'Active'
    };
    setDrivers([...drivers, asset]);
    triggerToast(`Driver ${newDriver.fullName} successfully registered!`, "success");
    setNewDriver({ fullName: '', licenseNumber: '', mobile: '', status: 'Pending' });
  };

  const toggleDriverStatus = (id) => {
    setDrivers(drivers.map(d => {
      if (d.id === id) {
        const nextStatus = d.status === 'Active' ? 'Inactive' : 'Active';
        triggerToast(`Driver status set to ${nextStatus}.`, "info");
        return { ...d, status: nextStatus };
      }
      return d;
    }));
  };

  const deleteDriver = (id) => {
    setDrivers(drivers.filter(d => d.id !== id));
    triggerToast("Driver removed from registry.", "info");
  };

  const uploadDoc = (type, name) => {
    setDocuments(prev => ({
      ...prev,
      [`${type}FileName`]: name,
      [`${type}Status`]: 'Pending'
    }));
    triggerToast(`Document ${name} uploaded! Admin verification in progress.`, "info");
  };

  const handleSendAi = async (e) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;

    const userText = aiMessage;
    setAiMessage("");
    setAiChatHistory(prev => [...prev, { sender: "user", text: userText }]);
    setIsAiLoading(true);

    try {
      const systemContext = {
        partnerStatus,
        progress: currentProgress,
        vehiclesCount: vehicles.length,
        driversCount: drivers.length
      };
      const response = await askGeminiAssistant(userText, aiChatHistory, systemContext);
      setAiChatHistory(prev => [...prev, { sender: "bot", text: response }]);
    } catch (error) {
      setAiChatHistory(prev => [...prev, { sender: "bot", text: "Dispatch radio offline. Standard Weekly Payouts occur every Tuesday." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F9FAFB] text-slate-900 font-sans overflow-hidden antialiased">
      
      {/* GLOBAL TOAST - Refined typography and minimal aesthetics */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 flex items-center p-3 rounded-lg shadow-md transition-all bg-slate-900 text-white border border-slate-800 text-xs">
          <div className="mr-2 text-orange-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="font-medium tracking-wide">{toast.message}</div>
        </div>
      )}

      {}
      {showAdminConsole && (
        <div className="bg-slate-950 text-slate-300 px-6 py-2 flex flex-wrap items-center justify-between text-[11px] font-medium border-b border-slate-800 z-50 shadow-inner">
          <div className="flex items-center space-x-2">
            <span className="bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded text-[9px] tracking-wider uppercase">SIMULATOR CONTROLS</span>
            <span className="text-slate-400">Test dashboard layouts for specific lifecycle phases:</span>
          </div>
          <div className="flex items-center space-x-1 flex-wrap">
            <button 
              onClick={() => {
                setPartnerStatus('DRAFT');
                setPersonalSaved(false);
                setBankSaved(false);
                setDocuments({ aadhaarFileName: '', aadhaarStatus: 'Not Uploaded', panFileName: '', panStatus: 'Not Uploaded' });
                setVehicles([]);
                setDrivers([]);
                triggerToast("State reset to Initial Profile Draft (10%)", "info");
              }}
              className={`px-2.5 py-1 rounded transition-all text-[10px] font-semibold ${partnerStatus === 'DRAFT' && currentProgress < 100 ? 'bg-[#E25814] text-white shadow-sm' : 'bg-slate-900 hover:bg-slate-800 text-slate-300'}`}
            >
              1. Draft (10%)
            </button>
            <button 
              onClick={() => {
                setPartnerStatus('DRAFT');
                setPersonalSaved(true);
                setBankSaved(true);
                setDocuments({ aadhaarFileName: 'Aadhaar_Rahul.jpg', aadhaarStatus: 'Verified', panFileName: 'PAN_Rahul.pdf', panStatus: 'Verified' });
                if (vehicles.length === 0) {
                  setVehicles([{ id: 1, brand: 'Toyota', model: '2022', vehicleName: 'Innova Crysta', category: 'SUV', seatingCapacity: '7', registrationNumber: 'DL 01 YB 4521', status: 'Pending Approval' }]);
                }
                triggerToast("Forms completed! Ready to submit review.", "success");
              }}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[10px] font-semibold"
            >
              2. Complete (100%)
            </button>
            <button 
              onClick={() => {
                setPartnerStatus('PENDING_REVIEW');
                triggerToast("Simulated audit locking. Status: Pending Review.", "warning");
              }}
              className={`px-2.5 py-1 rounded transition-all text-[10px] font-semibold ${partnerStatus === 'PENDING_REVIEW' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-900 hover:bg-slate-800 text-slate-300'}`}
            >
              3. Pending Review
            </button>
            <button 
              onClick={() => {
                setPartnerStatus('ACTIVE');
                setVehicles(prev => prev.map(v => ({ ...v, status: 'Active' })));
                triggerToast("Partner approved! Live Booking Dispatch stream activated.", "success");
              }}
              className={`px-2.5 py-1 rounded transition-all text-[10px] font-semibold ${partnerStatus === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-900 hover:bg-slate-800 text-slate-300'}`}
            >
              4. Approved & Active
            </button>
            <button 
              onClick={() => {
                setPartnerStatus('SUSPENDED');
                triggerToast("Simulated partner license suspension rule hold.", "error");
              }}
              className={`px-2.5 py-1 rounded transition-all text-[10px] font-semibold ${partnerStatus === 'SUSPENDED' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-900 hover:bg-slate-800 text-slate-300'}`}
            >
              5. Suspended
            </button>
            <button 
              onClick={() => setShowAdminConsole(false)}
              className="text-slate-500 hover:text-slate-300 font-semibold pl-2 text-xs"
              title="Close simulator"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 px-6 h-14 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 p-1.5 rounded text-white flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 15C10.2091 15 12 13.2091 12 11C12 8.79086 10.2091 7 8 7C5.79086 7 4 8.79086 4 11C4 13.2091 5.79086 15 8 15Z" stroke="currentColor" strokeWidth="2.5"/>
              <path d="M16 17C18.2091 17 20 15.2091 20 13C20 10.7909 18.2091 9 16 9C13.7909 9 12 10.7909 12 13C12 15.2091 13.7909 17 16 17Z" stroke="currentColor" strokeWidth="2.5"/>
            </svg>
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-slate-950 uppercase">
              Musafir<span className="text-[#E25814]">Baba</span>
            </span>
            <span className="text-[9px] text-slate-400 font-bold tracking-widest block -mt-1 uppercase">
              FLEET CONTROL HUB
            </span>
          </div>
        </div>

        {/* Global Progress Header Indicator */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-3 bg-slate-50 border border-slate-200/50 px-3 py-1 rounded-full">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Progress:</span>
            <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-900 h-full transition-all duration-300" style={{ width: `${currentProgress}%` }}></div>
            </div>
            <span className="text-[11px] font-bold text-slate-700 font-mono">{currentProgress}%</span>
          </div>

          {/* Quick status pill - Clean pastel borders instead of flat colorful blocks */}
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border flex items-center space-x-1.5
            ${partnerStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60' :
              partnerStatus === 'PENDING_REVIEW' ? 'bg-amber-50 text-amber-800 border-amber-200/60' :
              partnerStatus === 'SUSPENDED' ? 'bg-rose-50 text-rose-800 border-rose-200/60' :
              'bg-slate-50 text-slate-700 border-slate-200/60'}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block
              ${partnerStatus === 'ACTIVE' ? 'bg-emerald-500' :
                partnerStatus === 'PENDING_REVIEW' ? 'bg-amber-500' :
                partnerStatus === 'SUSPENDED' ? 'bg-rose-500' :
                'bg-slate-400'}
            `}></span>
            <span>{partnerStatus === 'DRAFT' ? `Drafting` : partnerStatus.replace('_', ' ')}</span>
          </span>

          <button 
            onClick={() => setIsAiOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold tracking-wide transition-all"
          >
            <span>Co-Pilot</span>
          </button>
        </div>
      </header>

      {}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* DESKTOP SIDEBAR PANEL */}
        <aside className="w-56 bg-white border-r border-slate-200/60 p-4 hidden md:flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block px-2.5 mb-2">Workspace</span>
              <nav className="space-y-0.5">
                <button 
                  onClick={() => setActiveTab('personal')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-all text-left ${activeTab === 'personal' ? 'bg-slate-50 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'personal' ? 'bg-slate-900' : 'bg-transparent'}`}></span>
                  <span>Personal Coordinates</span>
                </button>

                <button 
                  onClick={() => setActiveTab('bank')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-all text-left ${activeTab === 'bank' ? 'bg-slate-50 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'bank' ? 'bg-slate-900' : 'bg-transparent'}`}></span>
                  <span>Bank Settlement</span>
                </button>

                <button 
                  onClick={() => setActiveTab('documents')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-all text-left ${activeTab === 'documents' ? 'bg-slate-50 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'documents' ? 'bg-slate-900' : 'bg-transparent'}`}></span>
                  <span>National KYC Audits</span>
                </button>

                <button 
                  onClick={() => setActiveTab('vehicles')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-all text-left ${activeTab === 'vehicles' ? 'bg-slate-50 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'vehicles' ? 'bg-slate-900' : 'bg-transparent'}`}></span>
                  <span>Fleet & Driver Assets</span>
                </button>
              </nav>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/40 p-3.5 rounded">
            <span className="text-[11px] font-bold text-slate-900 block uppercase tracking-wide">Secure Sandbox</span>
            <span className="text-[10px] text-slate-500 leading-normal block mt-1">All data operations operate strictly under standard secure dispatch audits.</span>
            <button 
              onClick={() => {
                setShowAdminConsole(true);
                triggerToast("Sandbox console active at top bar", "info");
              }}
              className="w-full mt-3 py-1.5 border border-slate-200 bg-white text-slate-700 text-[10px] font-bold rounded hover:bg-slate-50 transition-colors"
            >
              Force Console UI
            </button>
          </div>
        </aside>

        {}
        <main className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl w-full mx-auto space-y-6 pb-24 md:pb-8">
          
          {/* STATS METRIC BLOCK - Replaced loud blocks with elegant minimal cards */}
          <div className="grid grid-cols-3 gap-4">
            
            <div className="bg-white border border-slate-200/70 p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Active Fleet</span>
              <span className="text-2xl font-semibold text-slate-900 block mt-1 tracking-tight">
                {vehicles.filter(v => v.status === 'Active').length}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5 font-medium">Vehicles Online</span>
            </div>

            <div className="bg-white border border-slate-200/70 p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Registered Drivers</span>
              <span className="text-2xl font-semibold text-slate-900 block mt-1 tracking-tight">
                {drivers.filter(d => d.status === 'Active').length}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5 font-medium">Verified Crew</span>
            </div>

            <div className="bg-white border border-slate-200/70 p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Audit Status</span>
              <span className={`text-[12px] font-extrabold uppercase block mt-2.5 truncate tracking-wider
                ${partnerStatus === 'ACTIVE' ? 'text-emerald-700' :
                  partnerStatus === 'PENDING_REVIEW' ? 'text-amber-700' :
                  partnerStatus === 'SUSPENDED' ? 'text-rose-700' :
                  'text-slate-600'}
              `}>
                {partnerStatus === 'DRAFT' ? `${currentProgress}% Complete` : partnerStatus.replace('_', ' ')}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5 font-medium">Live Registry</span>
            </div>
          </div>

          {}
          
          {/* STATE: SUSPENDED NOTICE */}
          {partnerStatus === 'SUSPENDED' && (
            <div className="bg-rose-50/40 border border-rose-200 rounded p-5">
              <div className="flex space-x-3 items-start">
                <div className="p-1 rounded bg-rose-100 text-rose-700 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">Compliance Hold Lock</h3>
                  <p className="text-[11px] text-rose-700 leading-relaxed mt-1">
                    Your partner profile has been temporarily suspended by dispatch auditors. The registered commercial permit files or state taxi certifications require visual audit scans.
                  </p>
                  <div className="mt-3.5 flex space-x-2">
                    <button 
                      onClick={() => {
                        setActiveTab('documents');
                        triggerToast("Opened document panel", "info");
                      }}
                      className="px-3 py-1 bg-rose-900 text-white text-[10px] font-bold rounded hover:bg-rose-950 transition-colors uppercase tracking-wider"
                    >
                      Audit KYC Files
                    </button>
                    <button 
                      onClick={() => triggerToast("Compliance appeal received.", "success")}
                      className="px-3 py-1 bg-white border border-rose-200 text-rose-800 text-[10px] font-bold rounded hover:bg-rose-50 transition-colors uppercase tracking-wider"
                    >
                      File Appeal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATE: PENDING REVIEW NOTICE */}
          {partnerStatus === 'PENDING_REVIEW' && (
            <div className="bg-amber-50/40 border border-amber-200 rounded p-6 text-center space-y-3">
              <div className="w-8 h-8 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">Awaiting Verification Review</h3>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Your profile variables are under evaluation against national tax registries and commercial RTO vehicle licensing records.
                </p>
              </div>
              <span className="inline-block bg-white border border-amber-200/50 px-3 py-1 rounded-full text-[9px] font-bold text-amber-700 tracking-wider uppercase">
                Expected approval in under 12 hours
              </span>
            </div>
          )}

          {/* STATE: ACTIVE BOOKING PIPELINE NOTICE */}
          {partnerStatus === 'ACTIVE' && (
            <div className="bg-emerald-50/40 border border-emerald-200 rounded p-5 relative overflow-hidden">
              <div className="flex space-x-3 items-start">
                <div className="p-1 rounded bg-emerald-100 text-emerald-800 mt-0.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 block"></span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Live Dispatch Pipeline Active</h3>
                  <p className="text-[11px] text-emerald-700 leading-relaxed mt-1">
                    Your profile coordinates are fully verified. MusafirBaba dispatch routing is streaming customer travel requests to your assigned fleet items below.
                  </p>
                  <div className="mt-4 bg-white border border-emerald-100/60 p-2.5 rounded flex items-center justify-between text-[11px] gap-2">
                    <span className="font-mono text-[9px] text-emerald-800 bg-emerald-50 font-bold px-1.5 py-0.5 rounded border border-emerald-100">DISPATCH STREAM ON</span>
                    <button 
                      onClick={() => triggerToast("Dispatch priority updated.", "success")}
                      className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[9px] rounded uppercase tracking-wider transition-colors"
                    >
                      Priority Config
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATE: DRAFT NOT COMPLETE CHECKPOINTS */}
          {partnerStatus === 'DRAFT' && currentProgress < 100 && (
            <div className="bg-slate-50 border border-slate-200/80 rounded p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="space-y-1">
                <span className="bg-slate-200 text-slate-800 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded">PROFILE INCOMPLETE</span>
                <p className="text-[11px] text-slate-600 font-medium">
                  Complete Bank Settlement, upload identity cards, and register at least 1 fleet vehicle to submit your profile.
                </p>
              </div>
              <button 
                onClick={() => {
                  if (!personalSaved) setActiveTab('personal');
                  else if (!bankSaved) setActiveTab('bank');
                  else if (documents.aadhaarStatus !== 'Verified' || documents.panStatus !== 'Verified') setActiveTab('documents');
                  else setActiveTab('vehicles');
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-all shadow-sm"
              >
                Configure Forms
              </button>
            </div>
          )}

          {/* STATE: DRAFT COMPLETED READY FOR REVIEW */}
          {partnerStatus === 'DRAFT' && currentProgress === 100 && (
            <div className="bg-slate-900 text-white rounded p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Ready for Audit Submission</h3>
                <p className="text-[11px] text-slate-300 leading-relaxed max-w-md">
                  Onboarding variables are 100% complete. Please submit your profile files below to launch verification reviews.
                </p>
              </div>
              <button 
                onClick={handleSubmitProfileForReview}
                className="px-4 py-2 bg-[#E25814] hover:bg-[#C8490D] text-white text-[10px] font-bold rounded uppercase tracking-wider transition-all"
              >
                Submit Profile
              </button>
            </div>
          )}

          {}
          <div className="bg-slate-100/80 p-1 rounded-lg flex items-center justify-between space-x-1 border border-slate-200/20">
            <button 
              onClick={() => setActiveTab('personal')}
              className={`flex-1 text-center py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'personal' ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Coordinates
            </button>
            <button 
              onClick={() => setActiveTab('bank')}
              className={`flex-1 text-center py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'bank' ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Bank Setup
            </button>
            <button 
              onClick={() => setActiveTab('documents')}
              className={`flex-1 text-center py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'documents' ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Identity KYC
            </button>
            <button 
              onClick={() => setActiveTab('vehicles')}
              className={`flex-1 text-center py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'vehicles' ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Fleet & Crew ({vehicles.length + drivers.length})
            </button>
          </div>

          {/* ACTIVE CONTENT WORKSPACE BOX */}
          <div className="bg-white rounded border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6 transition-all">
            
            {/* TAB SECTION 1: PERSONAL COORDINATES */}
            {activeTab === 'personal' && (
              <form onSubmit={handleSavePersonal} className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Personal Coordinates</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Define your account parameters. Names must match state-issued legal licenses.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Legal Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={personalInfo.fullName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Contact *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={personalInfo.mobileNumber}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, mobileNumber: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Coordinates</label>
                    <input 
                      type="email" 
                      placeholder="e.g. name@dispatch.com"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Operator Tier Category</label>
                    <select 
                      value={personalInfo.partnerType}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, partnerType: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-800"
                    >
                      <option value="Individual">Individual Driver / Sole Owner</option>
                      <option value="Travel Agency">Local Travel Agency Desk</option>
                      <option value="Corporate Fleet">Corporate Fleet Operator</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3.5 mt-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Street Dispatch Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Flat 104, B-Block, Gopal Nagar"
                    value={personalInfo.addressLine}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, addressLine: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all mb-3 text-slate-800 font-medium"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">City *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="New Delhi"
                        value={personalInfo.city}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                        className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">State</label>
                      <input 
                        type="text" 
                        placeholder="Delhi"
                        value={personalInfo.state}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, state: e.target.value })}
                        className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">PIN Code</label>
                      <input 
                        type="text" 
                        placeholder="110043"
                        value={personalInfo.pinCode}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, pinCode: e.target.value })}
                        className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-medium text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Save & Next ➔
                  </button>
                </div>
              </form>
            )}

            {/* TAB SECTION 2: BANK SETTLEMENT */}
            {activeTab === 'bank' && (
              <form onSubmit={handleSaveBank} className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Bank Account Settlement Coordinates</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Automatic tour payout settlements occur weekly every Tuesday morning.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Holder Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. RAHUL SHARMA"
                      value={bankInfo.accountHolderName}
                      onChange={(e) => setBankInfo({ ...bankInfo, accountHolderName: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-850"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. State Bank of India"
                      value={bankInfo.bankName}
                      onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-850"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Number *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 501002345678"
                      value={bankInfo.accountNumber}
                      onChange={(e) => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-850"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">IFSC Code *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. SBIN0001234"
                      value={bankInfo.ifscCode}
                      onChange={(e) => setBankInfo({ ...bankInfo, ifscCode: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-850"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Save & Next ➔
                  </button>
                </div>
              </form>
            )}

            {/* TAB SECTION 3: KYC IDENTITY CARDS */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">National Identity Verification</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Please provide scanning files of legal state identity credentials.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Aadhaar Combined Upload */}
                  <div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between h-32">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Aadhaar Combined Scan</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                          ${documents.aadhaarStatus === 'Verified' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                            documents.aadhaarStatus === 'Pending' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                            'bg-slate-100 text-slate-600 border border-slate-200'}
                        `}>
                          {documents.aadhaarStatus}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Simulate scanning of both card faces.</p>
                    </div>

                    {documents.aadhaarFileName ? (
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200/60 text-[10px]">
                        <span className="truncate max-w-[130px] font-medium text-slate-600">{documents.aadhaarFileName}</span>
                        <button 
                          onClick={() => setDocuments({ ...documents, aadhaarFileName: '', aadhaarStatus: 'Not Uploaded' })}
                          className="text-rose-600 hover:text-rose-800 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => uploadDoc('aadhaar', 'Aadhaar_Rahul_CombinedScan.jpg')}
                        className="py-1.5 bg-white border border-dashed border-slate-300 hover:border-slate-400 text-[10px] font-bold rounded text-slate-600 transition-colors uppercase tracking-wider"
                      >
                        Simulate File Upload
                      </button>
                    )}
                  </div>

                  {/* PAN Card Upload */}
                  <div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between h-32">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">PAN Identification Scan</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                          ${documents.panStatus === 'Verified' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                            documents.panStatus === 'Pending' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                            'bg-slate-100 text-slate-600 border border-slate-200'}
                        `}>
                          {documents.panStatus}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Upload primary income tax register card.</p>
                    </div>

                    {documents.panFileName ? (
                      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200/60 text-[10px]">
                        <span className="truncate max-w-[130px] font-medium text-slate-600">{documents.panFileName}</span>
                        <button 
                          onClick={() => setDocuments({ ...documents, panFileName: '', panStatus: 'Not Uploaded' })}
                          className="text-rose-600 hover:text-rose-800 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => uploadDoc('pan', 'PAN_Rahul_TaxCard.pdf')}
                        className="py-1.5 bg-white border border-dashed border-slate-300 hover:border-slate-400 text-[10px] font-bold rounded text-slate-600 transition-colors uppercase tracking-wider"
                      >
                        Simulate File Upload
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={() => {
                      if (documents.aadhaarStatus !== 'Verified' || documents.panStatus !== 'Verified') {
                        triggerToast("Both Aadhaar & PAN are mandated to launch administrative audits.", "error");
                      } else {
                        setActiveTab('vehicles');
                        triggerToast("KYC details registered successfully.", "success");
                      }
                    }}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Continue to Assets Setup ➔
                  </button>
                </div>
              </div>
            )}

            {/* TAB SECTION 4: FLEET & DRIVERS MANAGEMENT */}
            {activeTab === 'vehicles' && (
              <div className="space-y-6">
                
                {/* SPLIT CONTAINER: VEHICLE ADDER FORM VS DRIVER ADDER FORM */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Register Fleet Vehicle Asset */}
                  <form onSubmit={handleAddVehicle} className="p-4 bg-slate-50/50 border border-slate-200 rounded space-y-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block border-b border-slate-200/40 pb-1">Register Vehicle Asset</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Maker Brand *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Toyota"
                          value={newVehicle.brand}
                          onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Model Name *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Innova"
                          value={newVehicle.vehicleName}
                          onChange={(e) => setNewVehicle({ ...newVehicle, vehicleName: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Category</label>
                        <select 
                          value={newVehicle.category}
                          onChange={(e) => setNewVehicle({ ...newVehicle, category: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-700 font-semibold"
                        >
                          <option value="SUV">SUV (Premium)</option>
                          <option value="Sedan">Sedan (Comfort)</option>
                          <option value="Hatchback">Hatchback (Eco)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Plate ID *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="DL 01 AB 1234"
                          value={newVehicle.registrationNumber}
                          onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white uppercase text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-1.5 bg-[#E25814] hover:bg-[#C8490D] text-white text-[9px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm"
                    >
                      Register Vehicle
                    </button>
                  </form>

                  {/* Register Fleet Driver Crew Asset */}
                  <form onSubmit={handleAddDriver} className="p-4 bg-slate-50/50 border border-slate-200 rounded space-y-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block border-b border-slate-200/40 pb-1">Register Driver Crew</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Driver Name *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Manoj Kumar"
                          value={newDriver.fullName}
                          onChange={(e) => setNewDriver({ ...newDriver, fullName: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">License Number *</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. DL-1420200"
                          value={newDriver.licenseNumber}
                          onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white uppercase text-slate-800 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Mobile Contact *</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="e.g. +91 98765..."
                        value={newDriver.mobile}
                        onChange={(e) => setNewDriver({ ...newDriver, mobile: e.target.value })}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 font-medium"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-[9px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm"
                    >
                      Register Driver
                    </button>
                  </form>
                </div>

                {}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* Vehicle Registry */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Live Vehicle Registry ({vehicles.length})</span>
                    {vehicles.length === 0 ? (
                      <div className="border border-slate-200 border-dashed rounded p-4 text-center text-[10px] text-slate-400 font-medium">No registered vehicles found. Use form above to register.</div>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {vehicles.map((v) => (
                          <div key={v.id} className="bg-white border border-slate-200/80 p-3 rounded flex items-center justify-between text-xs hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                            <div>
                              <span className="font-bold text-slate-950 block">{v.brand} {v.vehicleName}</span>
                              <span className="text-[10px] text-slate-400 font-semibold block">{v.category} • {v.seatingCapacity} Seater</span>
                              <span className="font-mono bg-slate-50 text-slate-600 text-[9px] px-1.5 py-0.5 rounded border border-slate-200/60 font-bold mt-1 inline-block uppercase tracking-wider">{v.registrationNumber}</span>
                            </div>
                            <div className="text-right space-y-1.5">
                              
                              {/* Thin bordered tag indicators instead of heavy colored pills */}
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block w-max ml-auto border
                                ${v.status === 'Active' ? 'bg-emerald-50/50 text-emerald-800 border-emerald-200/60' :
                                  v.status === 'Pending Approval' ? 'bg-amber-50/50 text-amber-800 border-amber-200/60' :
                                  'bg-slate-50 text-slate-500 border-slate-200/60'}
                              `}>
                                {v.status}
                              </span>
                              
                              <div className="flex items-center space-x-1 justify-end">
                                <button 
                                  onClick={() => toggleVehicleStatus(v.id)}
                                  className="text-[9px] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase tracking-wider"
                                >
                                  Toggle
                                </button>
                                <button 
                                  onClick={() => deleteVehicle(v.id)}
                                  className="text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Driver Crew Registry */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Live Driver Crew Registry ({drivers.length})</span>
                    {drivers.length === 0 ? (
                      <div className="border border-slate-200 border-dashed rounded p-4 text-center text-[10px] text-slate-400 font-medium">No registered drivers found.</div>
                    ) : (
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {drivers.map((d) => (
                          <div key={d.id} className="bg-white border border-slate-200/80 p-3 rounded flex items-center justify-between text-xs hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                            <div>
                              <span className="font-bold text-slate-950 block">{d.fullName}</span>
                              <span className="text-[10px] text-slate-400 block font-semibold">Lic: {d.licenseNumber}</span>
                              <span className="text-[10px] text-slate-500 block">{d.mobile}</span>
                            </div>
                            <div className="text-right space-y-1.5">
                              
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block w-max ml-auto border
                                ${d.status === 'Active' ? 'bg-emerald-50/50 text-emerald-800 border-emerald-200/60' :
                                  d.status === 'Pending' ? 'bg-amber-50/50 text-amber-800 border-amber-200/60' :
                                  'bg-slate-50 text-slate-500 border-slate-200/60'}
                              `}>
                                {d.status}
                              </span>

                              <div className="flex items-center space-x-1 justify-end">
                                <button 
                                  onClick={() => toggleDriverStatus(d.id)}
                                  className="text-[9px] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase tracking-wider"
                                >
                                  Toggle
                                </button>
                                <button 
                                  onClick={() => deleteDriver(d.id)}
                                  className="text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 flex items-center justify-around z-35 px-3 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setActiveTab('personal')}
          className={`flex flex-col items-center justify-center flex-1 ${activeTab === 'personal' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">Coords</span>
        </button>
        <button 
          onClick={() => setActiveTab('bank')}
          className={`flex flex-col items-center justify-center flex-1 ${activeTab === 'bank' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">Bank</span>
        </button>
        <button 
          onClick={() => setActiveTab('documents')}
          className={`flex flex-col items-center justify-center flex-1 ${activeTab === 'documents' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">KYC</span>
        </button>
        <button 
          onClick={() => setActiveTab('vehicles')}
          className={`flex flex-col items-center justify-center flex-1 ${activeTab === 'vehicles' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}
        >
          <div className="relative">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v12m0 0l-4-4m4 4l4-4" /></svg>
            {(vehicles.length + drivers.length) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center font-mono">
                {vehicles.length + drivers.length}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">Assets</span>
        </button>
      </div>

      {}
      <div className="fixed bottom-16 sm:bottom-6 right-4 z-40">
        {!isAiOpen ? (
          <button 
            onClick={() => setIsAiOpen(true)}
            className="bg-slate-950 hover:bg-slate-900 text-white p-3.5 rounded-full shadow-lg flex items-center justify-center space-x-1.5 transition-all border border-slate-800"
          >
            <div className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold tracking-wide pr-0.5 hidden sm:inline uppercase">CO-PILOT</span>
          </button>
        ) : (
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[310px] sm:w-[340px] max-h-[420px] flex flex-col overflow-hidden animate-fade-in">
            
            {/* Chat Head */}
            <div className="bg-slate-950 text-white p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="bg-[#E25814] text-white px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase">
                  BABA
                </div>
                <div>
                  <h4 className="text-[11px] font-bold tracking-wide text-white block leading-none uppercase">CO-PILOT</h4>
                  <p className="text-[9px] text-slate-400 block font-semibold mt-0.5 uppercase tracking-wider">AI Operations Desk</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAiOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Viewport */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 min-h-[200px]">
              {aiChatHistory.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    max-w-[85%] rounded p-2.5 text-[11px] leading-relaxed font-medium shadow-[0_1px_2px_rgba(0,0,0,0.01)]
                    ${msg.sender === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'}
                  `}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-800 border border-slate-200/80 rounded rounded-tl-none p-2 text-[10px] flex items-center space-x-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendAi} className="border-t border-slate-200/80 p-2 bg-white flex items-center space-x-2">
              <input 
                type="text"
                placeholder="Ask about weekly payouts, permits..."
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                className="flex-1 px-2.5 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:border-slate-800 text-slate-800"
              />
              <button 
                type="submit"
                disabled={!aiMessage.trim()}
                className="bg-slate-900 hover:bg-slate-850 disabled:opacity-40 text-white p-1.5 rounded flex items-center justify-center transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}