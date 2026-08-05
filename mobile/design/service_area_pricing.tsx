import React, { useState } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  MapPin,
  Plus,
  X,
  Check,
  Car,
  Shield,
  Info,
  Trash2,
  CheckCircle2,
  Building2,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Settings2,
  DollarSign
} from 'lucide-react';

export default function App() {
  // Toggle to simulate whether the user has saved vehicles in their account
  const [hasVehicles, setHasVehicles] = useState(true);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // 1. SERVICE LOCATIONS STATE (State -> City -> Multiple Locations)
  const [locationsList, setLocationsList] = useState([
    {
      id: 1,
      state: 'Delhi',
      city: 'Delhi NCR',
      color: 'blue',
      locations: [
        'South Delhi', 'West Delhi', 'Dwarka', 'Rohini', 
        'Najafgarh', 'Pitampura', 'Airport (T3)', 'Noida Border', 
        'Gurugram Border', 'Faridabad Border'
      ]
    },
    {
      id: 2,
      state: 'Haryana',
      city: 'Gurugram',
      color: 'purple',
      locations: ['DLF Cyber City', 'Golf Course Road', 'Sohna Road', 'Udyog Vihar', 'Sector 56']
    },
    {
      id: 3,
      state: 'Uttar Pradesh',
      city: 'Noida',
      color: 'emerald',
      locations: ['Sector 62', 'Noida Electronic City', 'Greater Noida West', 'Pari Chowk']
    }
  ]);

  // Modal / Form state for adding new location groups
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newState, setNewState] = useState('Rajasthan');
  const [newCity, setNewCity] = useState('');
  const [newLocationInput, setNewLocationInput] = useState('');
  const [pendingLocations, setPendingLocations] = useState([]);

  // 2. SAVED VEHICLES LIST (User's Fleet)
  const [savedVehicles, setSavedVehicles] = useState([
    {
      id: 'v1',
      name: 'Toyota Innova Crysta',
      regNumber: 'DL 1Z C 1234',
      type: 'MUV (7 Seater)',
      color: 'purple',
      kmRate: '22.00',
      dayRate: '4200.00'
    },
    {
      id: 'v2',
      name: 'Maruti Ertiga',
      regNumber: 'HR 26 AB 5678',
      type: 'SUV (6 Seater)',
      color: 'emerald',
      kmRate: '18.00',
      dayRate: '3500.00'
    },
    {
      id: 'v3',
      name: 'Hyundai Xcent / Dzire',
      regNumber: 'DL 01 AB 9988',
      type: 'Sedan (4 Seater)',
      color: 'blue',
      kmRate: '14.00',
      dayRate: '2500.00'
    }
  ]);

  // Pricing Method state: 'Per KM' | 'Per Day' | 'Both (Per KM & Per Day)'
  const [pricingMethod, setPricingMethod] = useState('Per KM');

  // 3. RATE INCLUDES STATE (Interactive Selection & Deselection)
  const [rateIncludes, setRateIncludes] = useState([
    { id: 'fuel', label: 'Fuel', selected: true },
    { id: 'driver', label: 'Driver Allowance', selected: true },
    { id: 'toll', label: 'Toll / Taxes', selected: true },
    { id: 'parking', label: 'Parking', selected: true },
    { id: 'night', label: 'Night Charges', selected: false },
    { id: 'gst', label: 'GST', selected: true }
  ]);

  // 4. EXTRA CHARGES STATE (Selection/Deselection + Custom Price Input)
  const [extraCharges, setExtraCharges] = useState([
    { id: 'ex_km', label: 'Extra KM (after 300 KM)', price: '15', unit: 'per KM', selected: true },
    { id: 'ex_hr', label: 'Extra Hour', price: '250', unit: 'per Hour', selected: true },
    { id: 'ex_night', label: 'Night Charges (after 10 PM)', price: '500', unit: 'per Night', selected: true },
    { id: 'ex_hill', label: 'Hill Charges', price: '700', unit: 'per Trip', selected: false },
    { id: 'ex_airport', label: 'Airport Parking', price: '300', unit: 'per Entry', selected: false }
  ]);

  const handleAddPendingLocation = () => {
    const trimmed = newLocationInput.trim();
    if (trimmed && !pendingLocations.includes(trimmed)) {
      setPendingLocations([...pendingLocations, trimmed]);
      setNewLocationInput('');
    }
  };

  const handleSaveLocationGroup = () => {
    if (!newCity.trim()) {
      showToast("Please enter a City name.");
      return;
    }

    const existingIndex = locationsList.findIndex(
      loc => loc.state.toLowerCase() === newState.toLowerCase() && loc.city.toLowerCase() === newCity.trim().toLowerCase()
    );

    if (existingIndex !== -1) {
      // Avoid city duplicate: merge location tags into existing city
      const updatedList = [...locationsList];
      const mergedLocations = Array.from(new Set([...updatedList[existingIndex].locations, ...pendingLocations]));
      updatedList[existingIndex].locations = mergedLocations;
      setLocationsList(updatedList);
      showToast(`Updated locations for existing city: ${newCity.trim()}`);
    } else {
      // Create new State -> City location block
      const colors = ['orange', 'emerald', 'blue', 'purple', 'amber'];
      const nextColor = colors[locationsList.length % colors.length];

      setLocationsList([
        ...locationsList,
        {
          id: Date.now(),
          state: newState,
          city: newCity.trim(),
          color: nextColor,
          locations: pendingLocations.length > 0 ? pendingLocations : ['City Center']
        }
      ]);
      showToast(`Added new location group: ${newCity.trim()} (${newState})`);
    }

    setNewCity('');
    setPendingLocations([]);
    setNewLocationInput('');
    setIsAddingLocation(false);
  };

  const handleRemoveLocationTag = (cardId, locName) => {
    setLocationsList(locationsList.map(item => {
      if (item.id === cardId) {
        return {
          ...item,
          locations: item.locations.filter(l => l !== locName)
        };
      }
      return item;
    }));
  };

  const handleDeleteCityCard = (cardId) => {
    setLocationsList(locationsList.filter(item => item.id !== cardId));
    showToast("Location block removed");
  };

  const handleVehicleRateChange = (vehId, field, value) => {
    setSavedVehicles(savedVehicles.map(veh => {
      if (veh.id === vehId) {
        return { ...veh, [field]: value };
      }
      return veh;
    }));
  };

  const toggleInclusion = (incId) => {
    setRateIncludes(rateIncludes.map(item => 
      item.id === incId ? { ...item, selected: !item.selected } : item
    ));
  };

  const toggleExtraCharge = (chargeId) => {
    setExtraCharges(extraCharges.map(item => 
      item.id === chargeId ? { ...item, selected: !item.selected } : item
    ));
  };

  const handleExtraChargePriceChange = (chargeId, newPrice) => {
    setExtraCharges(extraCharges.map(item => 
      item.id === chargeId ? { ...item, price: newPrice } : item
    ));
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-slate-950 sm:py-6 font-sans antialiased text-slate-800 selection:bg-orange-500 selection:text-white">
      
      {/* Top Demo State Bar for Quick Testing */}
      <div className="w-full max-w-[430px] mb-3 px-2 flex justify-between items-center text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Preview Demo Controls:</span>
        <button 
          onClick={() => {
            setHasVehicles(!hasVehicles);
            showToast(hasVehicles ? "Switched to: No Vehicles Saved" : "Switched to: Saved Fleet Available");
          }}
          className="bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold px-3 py-1 rounded-xl border border-slate-700 transition"
        >
          {hasVehicles ? 'Simulate "No Vehicles"' : 'Simulate "Vehicles Added"'}
        </button>
      </div>

      {/* Mobile Device Viewport */}
      <div className="w-full max-w-[430px] bg-slate-50 min-h-[915px] sm:rounded-[44px] shadow-2xl flex flex-col justify-between relative overflow-hidden border-0 sm:border-[8px] sm:border-slate-800">
        
        <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
          
          {/* Header Bar */}
          <header className="px-5 py-3.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-20 shadow-xs">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => showToast("Navigating back...")}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Service Area & Pricing</h1>
            </div>
            <button 
              onClick={() => showToast("Service Area Help Guide")}
              className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
            >
              <HelpCircle className="w-4 h-4 text-orange-500" />
              <span>Help</span>
            </button>
          </header>

          <main className="p-4 space-y-5">
            
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-4 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
              <div className="flex items-start gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-black text-sm text-white tracking-wide">Where do you want bookings?</h2>
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  </div>
                  <p className="text-[11px] text-orange-100 mt-1 leading-snug font-medium">
                    Configure service operating areas by State and City. Set customized pricing cards for every vehicle in your fleet.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 1: SERVICE LOCATIONS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    1. Service Locations
                  </h2>
                  <p className="text-[10px] text-slate-500 font-semibold pl-3.5">
                    State → City → Multiple locations inside cities
                  </p>
                </div>
                <button 
                  onClick={() => setIsAddingLocation(!isAddingLocation)}
                  className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Location</span>
                </button>
              </div>

              {/* Active Location Cards List */}
              <div className="space-y-3">
                {locationsList.map((item) => (
                  <div 
                    key={item.id} 
                    className="border border-slate-200/80 rounded-2xl p-3.5 bg-white shadow-xs space-y-2.5 transition hover:shadow-md"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-orange-100 text-orange-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-orange-200">
                          {item.state}
                        </span>
                        <h3 className="text-xs font-black text-slate-900 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {item.city}
                        </h3>
                      </div>
                      <button 
                        onClick={() => handleDeleteCityCard(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                        title="Delete City Block"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Location Tags Pill Container */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {item.locations.map((loc) => (
                        <span 
                          key={loc} 
                          className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-800 font-bold text-[10px] px-2.5 py-1 rounded-xl shadow-2xs hover:border-orange-300 transition"
                        >
                          <Check className="w-3 h-3 text-orange-500 stroke-[3]" />
                          <span>{loc}</span>
                          <button 
                            onClick={() => handleRemoveLocationTag(item.id, loc)}
                            className="text-slate-400 hover:text-rose-500 transition ml-0.5 p-0.5 hover:bg-slate-200 rounded-full"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Form / Modal to Create New Location Group */}
              {isAddingLocation && (
                <div className="border-2 border-dashed border-orange-400 rounded-2xl p-4 bg-orange-50/40 space-y-3.5 animate-in fade-in slide-in-from-top-2 shadow-sm">
                  <div className="flex items-center justify-between border-b border-orange-200 pb-2">
                    <h3 className="text-xs font-black text-orange-900 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-orange-600" />
                      Create New Location Group
                    </h3>
                    <button onClick={() => setIsAddingLocation(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Select State</label>
                      <select 
                        value={newState} 
                        onChange={(e) => setNewState(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500 shadow-2xs"
                      >
                        <option value="Delhi">Delhi</option>
                        <option value="Haryana">Haryana</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Punjab">Punjab</option>
                        <option value="Himachal Pradesh">Himachal Pradesh</option>
                        <option value="Uttarakhand">Uttarakhand</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 mb-1">City Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Jaipur, Lucknow" 
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-900 focus:outline-none focus:border-orange-500 shadow-2xs placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 mb-1">Add Multiple Locations in City</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. Airport, Railway Station, Sector 18" 
                        value={newLocationInput}
                        onChange={(e) => setNewLocationInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPendingLocation())}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 shadow-2xs placeholder:text-slate-400"
                      />
                      <button 
                        onClick={handleAddPendingLocation}
                        type="button"
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition shrink-0"
                      >
                        + Tag
                      </button>
                    </div>

                    {pendingLocations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {pendingLocations.map((locTag) => (
                          <span key={locTag} className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 border border-orange-200">
                            <span>{locTag}</span>
                            <button onClick={() => setPendingLocations(pendingLocations.filter(t => t !== locTag))}>
                              <X className="w-2.5 h-2.5 text-orange-600" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleSaveLocationGroup}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition"
                  >
                    Save Location Group
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: PRICING METHOD & VEHICLE RATE CARDS */}
            <div className="border border-slate-200/80 rounded-3xl p-4 bg-white shadow-xs space-y-3.5">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  2. Vehicle Pricing Cards
                </h2>
                <p className="text-[10px] text-slate-500 font-semibold pl-3.5">
                  Set rate cards for each saved vehicle in your account
                </p>
              </div>

              {/* Pricing Choice Radio Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-extrabold text-slate-700">
                {['Per KM', 'Per Day', 'Both (Per KM & Per Day)'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPricingMethod(method)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-black transition-all ${
                      pricingMethod === method 
                        ? 'bg-orange-500 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* CONDITIONAL STATE: NO VEHICLES SAVED */}
              {!hasVehicles ? (
                <div className="p-5 border-2 border-dashed border-amber-300 rounded-2xl bg-amber-50/50 text-center space-y-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">No Vehicles Saved</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 max-w-[260px] mx-auto">
                      Please add vehicle information first to set up rate cards for your rides.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setHasVehicles(true);
                      showToast("Loaded demo vehicles fleet!");
                    }}
                    className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-400" />
                    <span>Add Vehicle Information First</span>
                  </button>
                </div>
              ) : (
                /* CONDITIONAL STATE: USER HAS SAVED VEHICLES */
                <div className="space-y-3 pt-1 text-xs">
                  {savedVehicles.map((veh) => (
                    <div 
                      key={veh.id} 
                      className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2 hover:border-orange-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-orange-400 flex items-center justify-center shrink-0 font-bold">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">{veh.name}</span>
                            <span className="text-[9px] font-extrabold text-slate-500">
                              {veh.regNumber} • <span className="text-orange-600">{veh.type}</span>
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Commercial
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {(pricingMethod === 'Per KM' || pricingMethod === 'Both (Per KM & Per Day)') && (
                          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-500">Rate / KM</span>
                            <div className="flex items-center gap-0.5 font-black text-slate-900">
                              <span className="text-slate-400">₹</span>
                              <input 
                                type="text" 
                                value={veh.kmRate}
                                onChange={(e) => handleVehicleRateChange(veh.id, 'kmRate', e.target.value)}
                                className="w-12 text-right focus:outline-none font-black text-slate-900" 
                              />
                            </div>
                          </div>
                        )}

                        {(pricingMethod === 'Per Day' || pricingMethod === 'Both (Per KM & Per Day)') && (
                          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-500">Rate / Day</span>
                            <div className="flex items-center gap-0.5 font-black text-slate-900">
                              <span className="text-slate-400">₹</span>
                              <input 
                                type="text" 
                                value={veh.dayRate}
                                onChange={(e) => handleVehicleRateChange(veh.id, 'dayRate', e.target.value)}
                                className="w-14 text-right focus:outline-none font-black text-slate-900" 
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2 text-[10px] text-slate-600 font-semibold">
                <Info className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Rates should include selected inclusions below.</span>
              </div>
            </div>

            {/* SECTIONS 3 & 4: RATE INCLUDES & EXTRA CHARGES */}
            <div className="space-y-4">
              
              {/* 3. Rate Includes (Interactive Checkbox Selection) */}
              <div className="border border-emerald-200/80 rounded-3xl p-3.5 bg-emerald-50/20 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    3. Rate Includes (Tap to Select / Deselect)
                  </h3>
                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    {rateIncludes.filter(i => i.selected).length} Selected
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-800 font-extrabold">
                  {rateIncludes.map((inc) => (
                    <button
                      key={inc.id}
                      onClick={() => toggleInclusion(inc.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl transition border text-left active:scale-95 ${
                        inc.selected
                          ? 'bg-white border-emerald-300 text-slate-900 shadow-2xs'
                          : 'bg-slate-100/80 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                        inc.selected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-transparent'
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="truncate">{inc.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Extra Charges (Select/Deselect + Write Price) */}
              <div className="border border-amber-200/80 rounded-3xl p-3.5 bg-amber-50/20 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    4. Extra Charges (Select & Enter Price)
                  </h3>
                  <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    {extraCharges.filter(c => c.selected).length} Enabled
                  </span>
                </div>

                <div className="space-y-2 text-[10px] text-slate-800 font-extrabold">
                  {extraCharges.map((charge) => (
                    <div 
                      key={charge.id} 
                      className={`p-2 rounded-xl flex justify-between items-center transition border ${
                        charge.selected 
                          ? 'bg-white border-amber-200 shadow-2xs' 
                          : 'bg-slate-100/60 border-slate-200 opacity-60'
                      }`}
                    >
                      {/* Checkbox Toggle */}
                      <button 
                        onClick={() => toggleExtraCharge(charge.id)}
                        className="flex items-center gap-2 text-left flex-1 mr-2"
                      >
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                          charge.selected ? 'bg-amber-500 text-white' : 'bg-slate-200 text-transparent'
                        }`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className={`truncate ${charge.selected ? 'text-slate-800 font-extrabold' : 'text-slate-400 font-semibold'}`}>
                          {charge.label}
                        </span>
                      </button>

                      {/* Custom Price Input */}
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shrink-0">
                        <span className="text-slate-400 text-[10px]">₹</span>
                        <input 
                          type="text"
                          disabled={!charge.selected}
                          value={charge.price}
                          onChange={(e) => handleExtraChargePriceChange(charge.id, e.target.value)}
                          className="w-12 text-right font-black text-slate-900 bg-transparent focus:outline-none disabled:text-slate-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* SAVE ACTION BUTTON */}
            <div className="pt-2">
              <button 
                onClick={() => showToast("Service Area & Pricing Saved Successfully!")}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-95 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-orange-100" />
                <span>Save Service Area & Pricing</span>
              </button>
            </div>

          </main>
        </div>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-top-2">
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