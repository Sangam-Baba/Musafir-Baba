import React, { useState, useEffect } from "react";
import { getStates, getCities } from "@/actions/location";
import { X } from "lucide-react";
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("partner_token") : "";

export default function SettingsTab({ vehicles = [] }: { vehicles?: any[] }) {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [vehicleConfigs, setVehicleConfigs] = useState<any[]>([]);
  const [stateData, setStateData] = useState<any[]>([]);
  const [citiesDataMap, setCitiesDataMap] = useState<Record<string, any[]>>({});
  
  // Side panel state
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState<number | null>(null);

  useEffect(() => {
    // Load India states by default
    getStates("IN").then((states) => setStateData(states));
    fetchSettings();
  }, [vehicles]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/settings`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (data.success && data.settings) {
        const savedConfigs = data.settings.vehicleConfigs || [];
        
        const initializedConfigs = vehicles.map(v => {
          const saved = savedConfigs.find((p: any) => p.vehicleId === v._id);
          return {
            vehicleId: v._id,
            vehicleName: v.vehicleName || "Unknown Vehicle",
            registrationNumber: v.registrationNumber || "Unregistered",
            perKmRate: saved ? saved.perKmRate : 0,
            fullDayRate: saved ? saved.fullDayRate : 0,
            locations: saved && saved.locations ? saved.locations : [],
          };
        });
        
        setVehicleConfigs(initializedConfigs);

        // Pre-fetch cities for all used states
        initializedConfigs.forEach(conf => {
          conf.locations.forEach(async (loc: any) => {
            if (loc.state) {
              const stateObj = stateData.find(s => s.name === loc.state);
              if (stateObj && !citiesDataMap[loc.state]) {
                const cities = await getCities("IN", stateObj.isoCode);
                setCitiesDataMap(prev => ({ ...prev, [loc.state]: cities }));
              }
            }
          });
        });

      } else if (vehicles.length > 0) {
        setVehicleConfigs(vehicles.map(v => ({
          vehicleId: v._id,
          vehicleName: v.vehicleName || "Unknown Vehicle",
          registrationNumber: v.registrationNumber || "Unregistered",
          perKmRate: 0,
          fullDayRate: 0,
          locations: [],
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (vIndex: number, field: string, value: any) => {
    const updated = [...vehicleConfigs];
    updated[vIndex] = { ...updated[vIndex], [field]: value };
    setVehicleConfigs(updated);
  };

  const addLocation = (vIndex: number) => {
    const updated = [...vehicleConfigs];
    updated[vIndex].locations.push({ address: "", city: "", state: "", pincode: "", country: "India" });
    setVehicleConfigs(updated);
  };

  const removeLocation = (vIndex: number, lIndex: number) => {
    const updated = [...vehicleConfigs];
    updated[vIndex].locations = updated[vIndex].locations.filter((_: any, i: number) => i !== lIndex);
    setVehicleConfigs(updated);
  };

  const handleLocationChange = async (vIndex: number, lIndex: number, field: string, value: string) => {
    const updated = [...vehicleConfigs];
    updated[vIndex].locations[lIndex] = { ...updated[vIndex].locations[lIndex], [field]: value };
    
    // If state changes, fetch cities for that state
    if (field === "state") {
      updated[vIndex].locations[lIndex].city = ""; // Reset city
      setVehicleConfigs(updated);
      const stateObj = stateData.find(s => s.name === value);
      if (stateObj && !citiesDataMap[value]) {
        const cities = await getCities("IN", stateObj.isoCode);
        setCitiesDataMap(prev => ({ ...prev, [value]: cities }));
      }
    } else {
      setVehicleConfigs(updated);
    }
  };

  const handleSave = async () => {
    setMessage("Saving settings...");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ vehicleConfigs })
      });
      
      const data = await res.json();
      if (data.success) {
        setMessage("✅ Settings saved successfully!");
        setTimeout(() => setMessage(null), 3000);
        setSelectedVehicleIndex(null); // close drawer on success
      } else {
        setMessage("Failed to save settings.");
      }
    } catch (err) {
      setMessage("Error saving settings.");
    }
  };

  if (loading) return <div className="p-4 text-center text-sm text-slate-500">Loading settings...</div>;

  const selectedConfig = selectedVehicleIndex !== null ? vehicleConfigs[selectedVehicleIndex] : null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-950">Vehicle Settings</h3>
          <p className="text-[11px] text-slate-500 mt-1">Select a vehicle to configure its pricing and duty locations.</p>
        </div>
        <button 
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          Save All Settings
        </button>
      </div>

      {message && (
        <div className="mb-4 px-3 py-2 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-lg border border-blue-200 uppercase tracking-wider">
          {message}
        </div>
      )}

      {vehicleConfigs.length === 0 ? (
        <div className="text-sm text-slate-500 py-10 italic text-center border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl">
          No vehicles registered yet. Add vehicles in the "Vehicle/Driver" tab first.
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4">Registration</th>
                  <th className="px-6 py-4">Pricing Setup</th>
                  <th className="px-6 py-4">Duty Locations</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicleConfigs.map((config, vIndex) => (
                  <tr key={vIndex} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-900 uppercase">{config.vehicleName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 bg-slate-50/50 px-2 py-1 rounded inline-block mt-3 border border-slate-100 uppercase">{config.registrationNumber}</td>
                    <td className="px-6 py-4">
                      {config.perKmRate > 0 || config.fullDayRate > 0 ? (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded text-xs border border-emerald-100">Configured</span>
                      ) : (
                        <span className="text-slate-400 font-medium italic text-xs">Pending Setup</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">{config.locations.length} Assigned</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedVehicleIndex(vIndex)} 
                        className="text-[#FE5300] text-xs font-bold uppercase tracking-wider hover:underline flex items-center justify-end gap-1 w-full"
                      >
                        Configure <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW */}
          <div className="md:hidden space-y-4">
            {vehicleConfigs.map((config, vIndex) => (
              <div key={vIndex} onClick={() => setSelectedVehicleIndex(vIndex)} className="cursor-pointer bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#FE5300]/50 hover:shadow-md transition-all group overflow-hidden">
                <div className="bg-slate-50/80 px-5 py-4 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#FE5300]/10 text-[#FE5300] p-2 rounded-lg group-hover:bg-[#FE5300] group-hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v12m0 0l-4-4m4 4l4-4" /></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">{config.vehicleName}</h4>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">REG: {config.registrationNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Locations</div>
                    <div className="text-sm font-bold text-slate-700">{config.locations.length} Assigned</div>
                  </div>
                  <div className="text-[#FE5300] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    CONFIGURE <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* SIDE PANEL DRAWER */}
      {selectedVehicleIndex !== null && selectedConfig && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/30 backdrop-blur-sm transition-opacity duration-300">
          <button type="button" aria-label="Close drawer" onClick={() => setSelectedVehicleIndex(null)} className="absolute inset-0 cursor-default" />
          
          <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7 border-l border-slate-200 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="mb-6 flex items-start justify-between gap-4 shrink-0 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-950 uppercase">{selectedConfig.vehicleName}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded inline-block border border-slate-200">REG: {selectedConfig.registrationNumber}</p>
              </div>
              <button type="button" onClick={() => setSelectedVehicleIndex(null)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-8 flex-1 pr-2 pb-10">
              
              {/* PRICING */}
              <div>
                <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="bg-[#FE5300]/10 p-1.5 rounded-md text-[#FE5300]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  Pricing Model
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="relative group">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Per Km Rate (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                      <input type="number" value={selectedConfig.perKmRate} onChange={(e) => handleConfigChange(selectedVehicleIndex, 'perKmRate', Number(e.target.value))} className="w-full pl-7 pr-3 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-[#FE5300] focus:ring-4 focus:ring-[#FE5300]/10 transition-all outline-none" />
                    </div>
                  </div>
                  <div className="relative group">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Day Rate (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                      <input type="number" value={selectedConfig.fullDayRate} onChange={(e) => handleConfigChange(selectedVehicleIndex, 'fullDayRate', Number(e.target.value))} className="w-full pl-7 pr-3 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:border-[#FE5300] focus:ring-4 focus:ring-[#FE5300]/10 transition-all outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-slate-200/60" />

              {/* LOCATIONS */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-blue-50 p-1.5 rounded-md text-blue-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </span>
                    Duty Locations
                  </h5>
                  <button onClick={() => addLocation(selectedVehicleIndex)} className="group flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Add Location
                  </button>
                </div>

                {selectedConfig.locations.length === 0 ? (
                  <div className="text-xs text-slate-400 italic bg-white p-6 rounded-lg border border-dashed border-slate-200 text-center">No duty locations set for this vehicle.</div>
                ) : (
                  <div className="space-y-4">
                    {selectedConfig.locations.map((loc: any, lIndex: number) => (
                      <div key={lIndex} className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative group hover:border-slate-300 transition-colors">
                        <button onClick={() => removeLocation(selectedVehicleIndex, lIndex)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Remove Location">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6">
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Specific Address / Hub</label>
                            <input type="text" placeholder="e.g. Terminal 3 Airport" value={loc.address} onChange={(e) => handleLocationChange(selectedVehicleIndex, lIndex, 'address', e.target.value)} className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all outline-none" />
                          </div>
                          
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">State *</label>
                            <select 
                              required 
                              value={loc.state} 
                              onChange={(e) => handleLocationChange(selectedVehicleIndex, lIndex, 'state', e.target.value)} 
                              className="w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all outline-none"
                            >
                              <option value="" className="text-slate-400">Select State</option>
                              {stateData.map(s => <option key={s.isoCode} value={s.name}>{s.name}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">City *</label>
                            <select 
                              required 
                              value={loc.city} 
                              onChange={(e) => handleLocationChange(selectedVehicleIndex, lIndex, 'city', e.target.value)} 
                              disabled={!loc.state}
                              className="w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">Select City</option>
                              {(citiesDataMap[loc.state] || []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                          </div>
                          
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pincode</label>
                            <input type="text" value={loc.pincode} onChange={(e) => handleLocationChange(selectedVehicleIndex, lIndex, 'pincode', e.target.value)} className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all outline-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pt-6 sticky bottom-0 bg-white border-t border-slate-100 p-4 -mx-5 -mb-5">
                <button 
                  onClick={handleSave}
                  className="w-full py-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md hover:bg-slate-800 transition-all"
                >
                  Save Changes
                </button>
              </div>

            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
