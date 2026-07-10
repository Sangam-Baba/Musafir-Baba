"use client";

import React, { useState, useEffect } from "react";

export default function ProfileCompletionTabs() {
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("partner_token") : "";

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setDashboardData(data.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const handlePersonalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("Saving profile...");
    const formData = new FormData(e.currentTarget);
    const profileData = {
      fullName: formData.get("fullName"),
      mobileNumber: formData.get("mobileNumber"),
      partnerType: formData.get("partnerType"),
    };
    const addressData = {
      addressLine: formData.get("addressLine"),
      city: formData.get("city"),
      state: formData.get("state"),
      pincode: formData.get("pincode"),
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profileData, addressData }),
      });
      if (res.ok) {
        setMessage("✅ Profile saved successfully!");
        fetchDashboardData();
      } else setMessage("Failed to save profile.");
    } catch (error) {
      setMessage("Error saving profile.");
    }
  };

  const handleBankSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("Saving bank details...");
    const formData = new FormData(e.currentTarget);
    const bankData = {
      accountHolderName: formData.get("accountHolderName"),
      bankName: formData.get("bankName"),
      accountNumber: formData.get("accountNumber"),
      ifsc: formData.get("ifsc"),
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/bank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bankData }),
      });
      if (res.ok) {
        setMessage("✅ Bank details saved successfully!");
        fetchDashboardData();
      } else setMessage("Failed to save bank details.");
    } catch (error) {
      setMessage("Error saving bank details.");
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("Adding vehicle...");
    const formData = new FormData(e.currentTarget);
    const vehicleData = {
      brand: formData.get("brand"),
      model: formData.get("model"),
      vehicleName: formData.get("vehicleName"),
      category: formData.get("category"),
      seatingCapacity: Number(formData.get("seatingCapacity")),
      registrationNumber: formData.get("registrationNumber"),
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/vehicle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vehicleData }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Vehicle added successfully!");
        (e.target as HTMLFormElement).reset();
        fetchDashboardData();
      } else setMessage(data.message || "Failed to add vehicle.");
    } catch (error) {
      setMessage("Error adding vehicle.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string, ownerType: string, ownerId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(docType);
    setMessage(`Uploading ${docType}...`);

    try {
      // 1. Get Presigned URL
      const presignRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: "partner-documents",
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, fileUrl } = await presignRes.json();

      // 2. Upload to R2
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // 3. Save to Partner DB
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ownerType, ownerId, documentType: docType, fileUrl }),
      });

      if (res.ok) {
        setMessage(`✅ ${docType} uploaded successfully!`);
        fetchDashboardData();
      } else {
        setMessage(`Failed to save ${docType} to profile.`);
      }
    } catch (error) {
      setMessage(`Error uploading ${docType}.`);
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Profile Data...</div>;

  const { profile, address, bank, completionPercentage } = dashboardData || {};

  return (
    <div className="w-full flex flex-col space-y-6">
      
      {/* STATS METRIC BLOCK - Replaced loud blocks with elegant minimal cards */}
      <div className="grid grid-cols-3 gap-4">
        
        <div className="bg-white border border-slate-200/70 p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Active Fleet</span>
          <span className="text-2xl font-semibold text-slate-900 block mt-1 tracking-tight">
            {dashboardData?.vehicles?.filter((v: any) => v.status === 'Active').length || 0}
          </span>
          <span className="text-[9px] text-slate-500 block mt-0.5 font-medium">Vehicles Online</span>
        </div>

        <div className="bg-white border border-slate-200/70 p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Total Fleet</span>
          <span className="text-2xl font-semibold text-slate-900 block mt-1 tracking-tight">
            {dashboardData?.vehicles?.length || 0}
          </span>
          <span className="text-[9px] text-slate-500 block mt-0.5 font-medium">Registered Vehicles</span>
        </div>

        <div className="bg-white border border-slate-200/70 p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Audit Status</span>
          <span className={`text-[12px] font-extrabold uppercase block mt-2.5 truncate tracking-wider
            ${completionPercentage === 100 ? 'text-emerald-700' : 'text-slate-600'}
          `}>
            {completionPercentage < 100 ? `${completionPercentage}% Complete` : 'PENDING REVIEW'}
          </span>
          <span className="text-[9px] text-slate-500 block mt-0.5 font-medium">Live Registry</span>
        </div>
      </div>

      {/* STATE: DRAFT NOT COMPLETE CHECKPOINTS */}
      {completionPercentage < 100 && (
        <div className="bg-slate-50 border border-slate-200/80 rounded p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <span className="bg-slate-200 text-slate-800 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded">PROFILE INCOMPLETE</span>
            <p className="text-[11px] text-slate-600 font-medium">
              Complete Bank Settlement, upload identity cards, and register at least 1 fleet vehicle to submit your profile.
            </p>
          </div>
          <button 
            onClick={() => {
              if (!profile?.fullName) setActiveTab('personal');
              else if (!bank?.accountNumber) setActiveTab('bank');
              else if (dashboardData?.documents?.length < 2) setActiveTab('documents');
              else setActiveTab('vehicles');
            }}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-all shadow-sm"
          >
            Configure Forms
          </button>
        </div>
      )}

      {/* STATE: DRAFT COMPLETED READY FOR REVIEW */}
      {completionPercentage === 100 && (
        <div className="bg-emerald-50/40 border border-emerald-200 rounded p-5 relative overflow-hidden">
          <div className="flex space-x-3 items-start">
            <div className="p-1 rounded bg-emerald-100 text-emerald-800 mt-0.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-600 block"></span>
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Awaiting Verification Review</h3>
              <p className="text-[11px] text-emerald-700 leading-relaxed mt-1">
                Your profile variables are under evaluation. Expected approval in under 12 hours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compact Tabs Switcher */}
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
          Fleet ({dashboardData?.vehicles?.length || 0})
        </button>
      </div>

      {/* ACTIVE CONTENT WORKSPACE BOX */}
      <div className="bg-white rounded border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6 transition-all mb-16 md:mb-0">
        
        {message && (
          <div className="mb-4 px-3 py-2 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-lg border border-blue-200 uppercase tracking-wider">
            {message}
          </div>
        )}

        {/* TAB SECTION 1: PERSONAL COORDINATES */}
        {activeTab === "personal" && (
          <form onSubmit={handlePersonalSubmit} className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Personal Coordinates</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Define your account parameters. Names must match state-issued legal licenses.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name *</label>
                <input name="fullName" defaultValue={profile?.fullName || ""} required className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-800" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number *</label>
                <input name="mobileNumber" defaultValue={profile?.mobileNumber || ""} required className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-800" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Partner Type</label>
                <select name="partnerType" defaultValue={profile?.partnerType || "Individual"} className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-800">
                  <option value="Individual">Individual</option>
                  <option value="Fleet Owner">Fleet Owner</option>
                  <option value="Travel Agency">Travel Agency</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3.5 mt-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Address Line</label>
              <input name="addressLine" defaultValue={address?.addressLine || ""} required className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all mb-3 text-slate-800 font-medium" />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">City *</label>
                  <input name="city" defaultValue={address?.city || ""} required className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-medium text-slate-800" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">State</label>
                  <input name="state" defaultValue={address?.state || ""} required className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-medium text-slate-800" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">PIN Code</label>
                  <input name="pincode" defaultValue={address?.pincode || ""} required className="w-full px-2.5 py-1 border border-slate-200 rounded text-xs font-medium text-slate-800" />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-3">
              <button type="submit" className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm">Save Personal Info</button>
            </div>
          </form>
        )}

        {/* TAB SECTION 2: BANK SETTLEMENT */}
        {activeTab === "bank" && (
          <form onSubmit={handleBankSubmit} className="space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Bank Account Settlement Coordinates</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Automatic tour payout settlements occur weekly.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Holder Name *</label>
                <input name="accountHolderName" defaultValue={bank?.accountHolderName || ""} required className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-850" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Name *</label>
                <input name="bankName" defaultValue={bank?.bankName || ""} required className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-850" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Number *</label>
                <input name="accountNumber" defaultValue={bank?.accountNumber || ""} required className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-850" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">IFSC Code *</label>
                <input name="ifsc" defaultValue={bank?.ifsc || ""} required className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all font-medium text-slate-850" />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button type="submit" className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm">Save Bank Details</button>
            </div>
          </form>
        )}

        {/* TAB SECTION 3: KYC IDENTITY CARDS */}
        {activeTab === "documents" && (
           <div className="space-y-4">
             <div>
               <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">National Identity Verification</h3>
               <p className="text-[11px] text-slate-500 mt-0.5">Please provide scanning files of legal state identity credentials.</p>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2">Aadhaar Card</h4>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={(e) => handleFileUpload(e, "Aadhaar", "PartnerProfile", profile._id)}
                    disabled={uploading === "Aadhaar"}
                    className="text-[10px] w-full file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800" 
                  />
                  {uploading === "Aadhaar" && <p className="text-[10px] text-[#FE5300] mt-2 font-bold uppercase tracking-wider">Uploading...</p>}
                </div>
                
                <div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2">PAN Card</h4>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={(e) => handleFileUpload(e, "PAN", "PartnerProfile", profile._id)}
                    disabled={uploading === "PAN"}
                    className="text-[10px] w-full file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800" 
                  />
                  {uploading === "PAN" && <p className="text-[10px] text-[#FE5300] mt-2 font-bold uppercase tracking-wider">Uploading...</p>}
                </div>
             </div>

             <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Uploaded Documents Registry</h4>
                <div className="space-y-2">
                  {dashboardData?.documents?.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-medium">No documents uploaded yet.</p>
                  ) : (
                    dashboardData?.documents?.map((doc: any) => (
                      <div key={doc._id} className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded border border-slate-200/60">
                        <span className="text-[10px] font-medium text-slate-600">{doc.documentType} Scan</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border
                          ${doc.status === "Approved" ? "bg-emerald-50 text-emerald-800 border-emerald-100" :
                          doc.status === "Pending" ? "bg-amber-50 text-amber-800 border-amber-100" :
                          "bg-rose-50 text-rose-800 border-rose-100"}
                        `}>
                          {doc.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
             </div>
           </div>
        )}
        
        {/* TAB SECTION 4: FLEET MANAGEMENT */}
        {activeTab === "vehicles" && (
           <div className="space-y-6">
             <form onSubmit={handleVehicleSubmit} className="p-4 bg-slate-50/50 border border-slate-200 rounded space-y-3">
               <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block border-b border-slate-200/40 pb-1">Register Vehicle Asset</span>
               
               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Maker Brand *</label>
                   <input name="brand" placeholder="e.g. Toyota" required className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 font-medium" />
                 </div>
                 <div>
                   <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Model *</label>
                   <input name="model" placeholder="e.g. 2022" required className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 font-medium" />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Vehicle Name *</label>
                   <input name="vehicleName" placeholder="e.g. Innova" required className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 font-medium" />
                 </div>
                 <div>
                   <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Category *</label>
                   <select name="category" required className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-700 font-semibold">
                     <option value="SUV">SUV</option>
                     <option value="Sedan">Sedan</option>
                     <option value="Hatchback">Hatchback</option>
                     <option value="Bus">Bus</option>
                   </select>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-2">
                 <div>
                   <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Seating *</label>
                   <input name="seatingCapacity" type="number" placeholder="7" required className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-800 font-medium" />
                 </div>
                 <div>
                   <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Plate ID *</label>
                   <input name="registrationNumber" placeholder="DL 01 AB 1234" required className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white uppercase text-slate-800 font-medium" />
                 </div>
               </div>

               <button type="submit" className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-[9px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm">
                 Register Vehicle
               </button>
             </form>

             <div className="pt-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">Live Vehicle Registry ({dashboardData?.vehicles?.length || 0})</span>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {dashboardData?.vehicles?.length === 0 ? (
                    <div className="border border-slate-200 border-dashed rounded p-4 text-center text-[10px] text-slate-400 font-medium">No registered vehicles found. Use form above to register.</div>
                  ) : (
                    dashboardData?.vehicles?.map((vehicle: any) => (
                      <div key={vehicle._id} className="bg-white border border-slate-200/80 p-3 rounded flex items-center justify-between text-xs hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                        <div>
                          <span className="font-bold text-slate-950 block">{vehicle.brand} {vehicle.vehicleName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block">{vehicle.category} • {vehicle.seatingCapacity} Seater</span>
                          <span className="font-mono bg-slate-50 text-slate-600 text-[9px] px-1.5 py-0.5 rounded border border-slate-200/60 font-bold mt-1 inline-block uppercase tracking-wider">{vehicle.registrationNumber}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider block w-max ml-auto border
                            ${vehicle.status === "Active" ? "bg-emerald-50/50 text-emerald-800 border-emerald-200/60" :
                            "bg-amber-50/50 text-amber-800 border-amber-200/60"}
                          `}>
                            {vehicle.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
           </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 flex items-center justify-around z-35 px-3 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        <button onClick={() => setActiveTab('personal')} className={`flex flex-col items-center justify-center flex-1 ${activeTab === 'personal' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">Coords</span>
        </button>
        <button onClick={() => setActiveTab('bank')} className={`flex flex-col items-center justify-center flex-1 ${activeTab === 'bank' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">Bank</span>
        </button>
        <button onClick={() => setActiveTab('documents')} className={`flex flex-col items-center justify-center flex-1 ${activeTab === 'documents' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">KYC</span>
        </button>
        <button onClick={() => setActiveTab('vehicles')} className={`flex flex-col items-center justify-center flex-1 ${activeTab === 'vehicles' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          <div className="relative">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{width: 18, height: 18}}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v12m0 0l-4-4m4 4l4-4" /></svg>
            {(dashboardData?.vehicles?.length || 0) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center font-mono">
                {dashboardData?.vehicles?.length}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold mt-0.5 tracking-wider uppercase">Assets</span>
        </button>
      </div>
    </div>
  );
}
