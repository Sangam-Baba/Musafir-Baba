"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, MapPin, Building, Briefcase, Navigation, Banknote, CreditCard, Hash, FileText, FileBadge, Car, Type, Hash as HashIcon, Plus, X, History } from "lucide-react";
import { getStates, getCities } from "@/actions/location";

export default function ProfileCompletionTabs() {
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const [stateData, setStateData] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any[]>([]);
  const [selectedStateName, setSelectedStateName] = useState("");
  const [selectedPartnerType, setSelectedPartnerType] = useState("Individual");
  const [fleetSubTab, setFleetSubTab] = useState("vehicles");
  const [isFleetDrawerOpen, setIsFleetDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [selectedFleetRowForEdit, setSelectedFleetRowForEdit] = useState<{driver: any, vehicle: any} | null>(null);

  useEffect(() => {
    getStates("IN").then(setStateData).catch(console.error);
  }, []);

  useEffect(() => {
    if (dashboardData?.address?.state) {
      setSelectedStateName(dashboardData.address.state);
    }
    if (dashboardData?.profile?.partnerType) {
      setSelectedPartnerType(dashboardData.profile.partnerType);
    }
  }, [dashboardData]);

  useEffect(() => {
    if (selectedStateName && stateData.length > 0) {
      const iso = stateData.find((s) => s.name === selectedStateName)?.isoCode;
      if (iso) {
        getCities("IN", iso).then(setCityData).catch(console.error);
      } else {
        setCityData([]);
      }
    } else {
      setCityData([]);
    }
  }, [selectedStateName, stateData]);

  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("partner_token") : "";

  const fetchDashboardData = async () => {
    const currentToken = getToken();
    if (!currentToken) {
      window.location.href = "/partner/login";
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/profile/dashboard`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await res.json();
      if (res.status === 401 || (data.message && data.message.includes("token"))) {
        localStorage.removeItem("partner_token");
        window.location.href = "/partner/login";
        return;
      }
      if (data.success) setDashboardData(data.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getToken()) {
      fetchDashboardData();
    }
  }, []);

  const handlePersonalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("Saving profile...");
    const formData = new FormData(e.currentTarget);
    const profileData = {
      fullName: formData.get("fullName"),
      mobileNumber: formData.get("mobileNumber"),
      partnerType: formData.get("partnerType"),
      agencyName: formData.get("agencyName") || "",
    };
    const addressData = {
      addressLine: formData.get("addressLine"),
      city: formData.get("city"),
      state: formData.get("state"),
      pincode: formData.get("pincode"),
    };

    try {
      const currentToken = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ profileData, addressData }),
      });
      
      if (res.status === 401) {
        localStorage.removeItem("partner_token");
        window.location.href = "/partner/login";
        return;
      }
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
      branchName: formData.get("branchName"),
      accountNumber: formData.get("accountNumber"),
      ifsc: formData.get("ifsc"),
    };

    try {
      const currentToken = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/bank`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ bankData }),
      });
      
      if (res.status === 401) {
        localStorage.removeItem("partner_token");
        window.location.href = "/partner/login";
        return;
      }
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
      assignedDriverId: formData.get("assignedDriverId"),
    };

    try {
      const currentToken = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/vehicle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ vehicleData }),
      });

      if (res.status === 401) {
        localStorage.removeItem("partner_token");
        window.location.href = "/partner/login";
        return;
      }
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

  const handleDriverSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("Adding driver...");
    const formData = new FormData(e.currentTarget);
    const licenceImageFile = formData.get("licenceImage") as File;
    let licenceImageUrl = "";

    try {
      if (licenceImageFile && licenceImageFile.size > 0) {
        setUploading("Licence Image");
        const presignRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: licenceImageFile.name,
            fileType: licenceImageFile.type,
            folder: "partner-documents",
          }),
        });
        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, fileUrl } = await presignRes.json();
        
        await fetch(uploadUrl, {
          method: "PUT",
          body: licenceImageFile,
          headers: { "Content-Type": licenceImageFile.type },
        });
        licenceImageUrl = fileUrl;
        setUploading(null);
      }

      const driverData = {
        name: formData.get("name"),
        mobile: formData.get("mobile"),
        licenceNumber: formData.get("licenceNumber"),
        licenceImageUrl,
      };

      const currentToken = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/driver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify(driverData),
      });

      if (res.status === 401) {
        localStorage.removeItem("partner_token");
        window.location.href = "/partner/login";
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Driver added successfully!");
        (e.target as HTMLFormElement).reset();
        fetchDashboardData();
      } else setMessage(data.message || "Failed to add driver.");
    } catch (error) {
      setMessage("Error adding driver.");
    }
  };

  const handleFleetEntrySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("Adding driver and vehicle...");
    const formData = new FormData(e.currentTarget);
    const licenceImageFile = formData.get("fleetLicenceImage") as File;
    let licenceImageUrl = "";

    try {
      setUploading("Fleet Licence Image");
      const presignRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: licenceImageFile.name,
          fileType: licenceImageFile.type,
          folder: "partner-documents",
        }),
      });
      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, fileUrl } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: licenceImageFile,
        headers: { "Content-Type": licenceImageFile.type },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload licence image");
      licenceImageUrl = fileUrl;

      const currentToken = getToken();
      const driverRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({
          name: formData.get("fleetDriverName"),
          mobile: formData.get("fleetDriverMobile"),
          licenceNumber: formData.get("fleetLicenceNumber"),
          licenceImageUrl,
        }),
      });
      const driverResult = await driverRes.json();
      if (!driverRes.ok) {
        setMessage(driverResult.message || "Failed to add driver.");
        return;
      }

      const vehicleRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/vehicle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({
          vehicleData: {
            brand: formData.get("fleetBrand"),
            model: formData.get("fleetModel"),
            vehicleName: formData.get("fleetVehicleName"),
            category: formData.get("fleetCategory"),
            seatingCapacity: Number(formData.get("fleetSeatingCapacity")),
            registrationNumber: formData.get("fleetRegistrationNumber"),
            assignedDriverId: driverResult.data._id,
          },
        }),
      });
      const vehicleResult = await vehicleRes.json();
      if (!vehicleRes.ok) {
        setMessage(vehicleResult.message || "Driver was added, but the vehicle could not be added.");
        await fetchDashboardData();
        return;
      }

      setMessage("✅ Driver and vehicle added successfully!");
      setIsFleetDrawerOpen(false);
      await fetchDashboardData();
    } catch (error) {
      setMessage("Error adding driver and vehicle.");
    } finally {
      setUploading(null);
    }
  };

  
  const handleVehicleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, vehicleId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(fieldName);
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

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      const currentToken = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/vehicle/${vehicleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ vehicleData: { [fieldName]: fileUrl } }),
      });

      if (res.ok) {
        setMessage(`✅ Document uploaded successfully!`);
        const updatedVehicle = await res.json();
        if (selectedFleetRowForEdit) {
           setSelectedFleetRowForEdit(prev => ({ ...prev, vehicle: updatedVehicle.data }));
        }
        fetchDashboardData();
      } else {
        setMessage(`Failed to save document.`);
      }
    } catch (error) {
      setMessage(`Error uploading document.`);
    } finally {
      setUploading(null);
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
      const currentToken = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ ownerType, ownerId, documentType: docType, fileUrl }),
      });

      if (res.status === 401) {
        localStorage.removeItem("partner_token");
        window.location.href = "/partner/login";
        return;
      }

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

  const handleSubmitForApproval = async () => {
    setMessage("Submitting profile for approval...");
    try {
      const currentToken = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/profile/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("partner_token");
        window.location.href = "/partner/login";
        return;
      }

      if (res.ok) {
        setMessage("✅ Profile successfully submitted for approval!");
        fetchDashboardData();
      } else {
        const data = await res.json();
        setMessage(data.message || "Failed to submit profile.");
      }
    } catch (error) {
      setMessage("Error submitting profile.");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Profile Data...</div>;

  const { profile, address, bank, completionPercentage, auth, logs } = dashboardData || {};
  const partnerStatus = auth?.status || profile?.status || "";
  const verificationHistory = Array.isArray(logs) ? logs : [];
  const isPendingReview = partnerStatus === "PendingVerification";
  const isEditable = partnerStatus !== "Approved" && partnerStatus !== "PendingVerification";
  const canSubmitForReview = completionPercentage === 100 && ["", "Draft", "Active", "Rejected", "Hold"].includes(partnerStatus);
  const isIndividualPartner = selectedPartnerType === "Individual";
  const activeDrivers = dashboardData?.drivers || [];
  const activeVehicles = dashboardData?.vehicles || [];
  const availableDrivers = activeDrivers.filter((driver: any) =>
    !activeVehicles.some((vehicle: any) => vehicle.assignedDriverId === driver._id)
  );
  const canAddDriver = !isIndividualPartner || activeDrivers.length < 1;
  const canAddVehicle = availableDrivers.length > 0 && (!isIndividualPartner || activeVehicles.length < 1);
  const dashboardStatusLabel = isPendingReview
    ? "Pending Review"
    : partnerStatus === "Rejected"
      ? "Rejected"
      : partnerStatus === "Hold"
        ? "On Hold"
        : partnerStatus === "Approved"
          ? "Approved"
          : partnerStatus === "Blacklisted" || partnerStatus === "In-Active" || partnerStatus === "Suspended"
            ? "Restricted"
            : canSubmitForReview
              ? "Ready to Submit"
              : `${completionPercentage}% Complete`;

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

        <div className="bg-white border border-slate-200/70 p-4 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Audit Status</span>
            <span className={`text-[12px] font-extrabold uppercase block mt-2.5 truncate tracking-wider
              ${isPendingReview ? 'text-amber-600' : (partnerStatus === 'Rejected' ? 'text-red-700' : (canSubmitForReview ? 'text-emerald-700' : 'text-slate-600'))}
            `}>
              {dashboardStatusLabel}
            </span>
          </div>
          {canSubmitForReview && (
            <button 
              onClick={handleSubmitForApproval}
              className="mt-3 w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-bold uppercase tracking-wider rounded transition-colors shadow-sm"
            >
              {partnerStatus === 'Rejected' ? 'Resubmit for Review' : 'Send for Approval'}
            </button>
          )}
        </div>
      </div>

      {(partnerStatus === "Rejected" || partnerStatus === "Hold" || partnerStatus === "Blacklisted") && (
        <div className={`rounded border p-4 shadow-sm ${
          partnerStatus === "Rejected"
            ? "bg-red-50 border-red-200"
            : partnerStatus === "Hold"
              ? "bg-amber-50 border-amber-200"
              : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${
                partnerStatus === "Rejected"
                  ? "text-red-700"
                  : partnerStatus === "Hold"
                    ? "text-amber-700"
                    : "text-slate-700"
              }`}>
                {partnerStatus || "Status Update"}
              </div>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {partnerStatus === "Rejected"
                  ? "Your profile was rejected. Update the required details, then resubmit it for review."
                  : partnerStatus === "Hold"
                    ? "Your partner account is on hold. Review the verification history for the next steps."
                    : "Your partner account has been restricted. Review the verification history for details."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STATE: DRAFT NOT COMPLETE CHECKPOINTS */}
      {completionPercentage < 100 && !isPendingReview && (
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
      {isPendingReview && (
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

      {verificationHistory.length > 0 && (
        <div className="bg-white border border-slate-200/70 rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <History size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Verification History</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{verificationHistory.length} update{verificationHistory.length === 1 ? "" : "s"} available</p>
            </div>
          </div>
          <button 
            onClick={() => setIsHistoryDrawerOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm"
          >
            View History
          </button>
        </div>
      )}

      {/* Compact Tabs Switcher */}
      <div className="bg-slate-100/80 p-1 rounded-lg flex items-center justify-between space-x-1 border border-slate-200/20">
        <button 
          onClick={() => setActiveTab('personal')}
          className={`flex-1 text-center py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${activeTab === 'personal' ? 'bg-white text-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Personal Details
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

        {/* TAB SECTION 1: PERSONAL DETAILS */}
        {activeTab === "personal" && (
          <form onSubmit={handlePersonalSubmit} className="space-y-4">
            <fieldset disabled={!isEditable}>
            <div>
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Personal Details</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Define your account parameters. Names must match state-issued legal licenses.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={14} />
                  </div>
                  <input name="fullName" defaultValue={profile?.fullName || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-orange-50/30 focus:bg-white focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] outline-none transition-all font-medium text-slate-800" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={14} />
                  </div>
                  <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-slate-600 font-bold text-xs">
                    +91
                  </div>
                  <input name="mobileNumber" defaultValue={profile?.mobileNumber || ""} required type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="w-full pl-16 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-orange-50/30 focus:bg-white focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] outline-none transition-all font-medium text-slate-800" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Partner Type</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Briefcase size={14} />
                  </div>
                  <select name="partnerType" value={selectedPartnerType} onChange={(e) => setSelectedPartnerType(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-orange-50/30 focus:bg-white focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] outline-none transition-all font-medium text-slate-800">
                    <option value="Individual">Individual</option>
                    <option value="Fleet Owner">Fleet Owner</option>
                    <option value="Travel Agency">Travel Agency</option>
                  </select>
                </div>
              </div>
            </div>

            {selectedPartnerType === "Travel Agency" && (
              <div className="mt-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Agency Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building size={14} />
                  </div>
                  <input name="agencyName" defaultValue={profile?.agencyName || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-orange-50/30 focus:bg-white focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] outline-none transition-all font-medium text-slate-800" />
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-5 mt-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Address Line</label>
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin size={14} />
                </div>
                <input name="addressLine" defaultValue={address?.addressLine || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-orange-50/30 focus:bg-white focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] outline-none transition-all text-slate-800 font-medium" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">State *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Navigation size={13} />
                    </div>
                    <select name="state" value={selectedStateName} onChange={(e) => setSelectedStateName(e.target.value)} required className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-orange-50/30 focus:bg-white focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] outline-none transition-all">
                      <option value="">Select State</option>
                      {stateData.map((s) => (
                        <option key={s.isoCode} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">City *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Building size={13} />
                    </div>
                    <select name="city" defaultValue={address?.city || ""} required className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-orange-50/30 focus:bg-white focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] outline-none transition-all">
                      <option value="">Select City</option>
                      {cityData.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">PIN Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Hash size={13} />
                    </div>
                    <input name="pincode" defaultValue={address?.pincode || ""} required className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-orange-50/30 focus:bg-white focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] outline-none transition-all" placeholder="110001" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-3">
              <button type="submit" className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm">Save Personal Info</button>
            </div>
            </fieldset>
          </form>
        )}

        {/* TAB SECTION 2: BANK SETTLEMENT */}
        {activeTab === "bank" && (
          <form onSubmit={handleBankSubmit} className="space-y-4">
            <fieldset disabled={!isEditable}>
            <div>
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">Bank Account Details</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Automatic tour payout settlements occur weekly.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Holder Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600/70">
                    <User size={14} />
                  </div>
                  <input name="accountHolderName" defaultValue={bank?.accountHolderName || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-emerald-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-850" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600/70">
                    <Building size={14} />
                  </div>
                  <input name="bankName" defaultValue={bank?.bankName || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-emerald-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-850" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Branch Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600/70">
                    <Building size={14} />
                  </div>
                  <input name="branchName" defaultValue={bank?.branchName || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-emerald-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-850" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600/70">
                    <CreditCard size={14} />
                  </div>
                  <input name="accountNumber" defaultValue={bank?.accountNumber || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-emerald-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-850" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">IFSC Code *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600/70">
                    <Banknote size={14} />
                  </div>
                  <input name="ifsc" defaultValue={bank?.ifsc || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-emerald-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-850" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button type="submit" className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded uppercase tracking-wider transition-colors shadow-sm">Save Bank Details</button>
            </div>
            </fieldset>
          </form>
        )}

        {/* TAB SECTION 3: KYC IDENTITY CARDS */}
        {activeTab === "documents" && (
           <div className="space-y-4">
             <div>
               <h3 className="text-xs font-bold text-slate-950 uppercase tracking-widest">National Identity Verification</h3>
               <p className="text-[11px] text-slate-500 mt-0.5">Please provide scanning files of legal state identity credentials.</p>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2">Aadhaar (Front)</h4>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={(e) => handleFileUpload(e, "Aadhaar Front", "PartnerProfile", profile._id)}
                    disabled={uploading === "Aadhaar Front" || !isEditable}
                    className="text-[10px] w-full file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800" 
                  />
                  {uploading === "Aadhaar Front" && <p className="text-[10px] text-[#FE5300] mt-2 font-bold uppercase tracking-wider">Uploading...</p>}
                </div>

                <div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2">Aadhaar (Back)</h4>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={(e) => handleFileUpload(e, "Aadhaar Back", "PartnerProfile", profile._id)}
                    disabled={uploading === "Aadhaar Back" || !isEditable}
                    className="text-[10px] w-full file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800" 
                  />
                  {uploading === "Aadhaar Back" && <p className="text-[10px] text-[#FE5300] mt-2 font-bold uppercase tracking-wider">Uploading...</p>}
                </div>
                
                <div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2">PAN Card</h4>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={(e) => handleFileUpload(e, "PAN", "PartnerProfile", profile._id)}
                    disabled={uploading === "PAN" || !isEditable}
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
                        <div className="flex items-center gap-3">
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">
                              View
                            </a>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border
                          ${doc.status === "Approved" ? "bg-emerald-50 text-emerald-800 border-emerald-100" :
                          doc.status === "Pending" ? "bg-amber-50 text-amber-800 border-amber-100" :
                          "bg-rose-50 text-rose-800 border-rose-100"}
                        `}>
                          {doc.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
           </div>
        )}
        
        {/* TAB SECTION 4: FLEET MANAGEMENT */}
        {activeTab === "vehicles" && (
          isIndividualPartner ? (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             
             {/* DRIVERS COLUMN */}
             <div className="space-y-6">
                <form onSubmit={handleDriverSubmit} className="p-5 bg-emerald-50/30 border border-emerald-100 rounded-xl space-y-4 shadow-sm">
                  <fieldset disabled={!isEditable}>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider block border-b border-emerald-200/50 pb-2 flex items-center gap-2">
                    <User size={14} /> 1. Register Driver
                  </span>

                  {selectedPartnerType === "Individual" && (
                    <div className="flex items-center gap-2 bg-emerald-100/50 p-2 rounded-lg mb-2">
                      <input type="checkbox" id="selfDriver" className="w-3 h-3 text-emerald-600 rounded" onChange={(e) => {
                        const form = e.target.form;
                        if (form && e.target.checked) {
                          (form.elements.namedItem("name") as HTMLInputElement).value = profile?.fullName || "";
                          (form.elements.namedItem("mobile") as HTMLInputElement).value = profile?.mobileNumber || "";
                        } else if (form) {
                          (form.elements.namedItem("name") as HTMLInputElement).value = "";
                          (form.elements.namedItem("mobile") as HTMLInputElement).value = "";
                        }
                      }} />
                      <label htmlFor="selfDriver" className="text-[10px] font-bold text-emerald-800 uppercase cursor-pointer">I am driving the vehicle (Self)</label>
                    </div>
                  )}

                  {!canAddDriver && (
                    <p className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      Individual partners can keep one driver only.
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Driver Name *</label>
                      <input name="name" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Mobile *</label>
                      <input name="mobile" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Licence Number *</label>
                      <input name="licenceNumber" required className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all uppercase" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Licence Image *</label>
                      <input type="file" name="licenceImage" accept="image/*,.pdf" required className="text-[10px] w-full file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800" />
                    </div>
                  </div>

                  {uploading === "Licence Image" && <p className="text-[10px] text-[#FE5300] mt-2 font-bold uppercase tracking-wider">Uploading Licence Image...</p>}

                  <button type="submit" disabled={uploading === "Licence Image" || !canAddDriver} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors shadow-sm mt-2">
                    Add Driver
                  </button>
                  </fieldset>
                </form>

                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">Driver Roster ({dashboardData?.drivers?.length || 0})</span>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {dashboardData?.drivers?.length === 0 || !dashboardData?.drivers ? (
                      <div className="border border-slate-200 border-dashed rounded p-4 text-center text-[10px] text-slate-400 font-medium">No drivers found. Use form above to register.</div>
                    ) : (
                      dashboardData?.drivers?.map((d: any) => {
                        const assignedVehicle = dashboardData?.vehicles?.find((v: any) => v.assignedDriverId === d._id);
                        return (
                        <div key={d._id} onClick={() => setSelectedFleetRowForEdit({ driver: d, vehicle: null })} className="cursor-pointer bg-white border border-slate-200/80 p-3 rounded flex justify-between items-center text-xs hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                          <div>
                            <span className="font-bold text-slate-950 block">{d.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium block">{d.mobile}</span>
                            {assignedVehicle && (
                              <span className="text-[9px] text-blue-600 font-bold bg-blue-50/80 border border-blue-100 px-1.5 py-0.5 rounded inline-block mt-1">
                                <Car size={10} className="inline mr-1" />
                                Assigned to: {assignedVehicle.brand} {assignedVehicle.vehicleName}
                              </span>
                            )}
                          </div>
                          <span className="font-mono bg-slate-50 text-slate-600 text-[9px] px-1.5 py-0.5 rounded border border-slate-200/60 font-bold uppercase tracking-wider">{d.licenceNumber}</span>
                        </div>
                      )})
                    )}
                  </div>
                </div>
             </div>

             {/* VEHICLES COLUMN */}
             <div className="space-y-6">
                <form onSubmit={handleVehicleSubmit} className="p-5 bg-blue-50/30 border border-blue-100 rounded-xl space-y-4 shadow-sm">
                  <fieldset disabled={!isEditable}>
                  <span className="text-[10px] font-bold uppercase text-blue-500 tracking-wider block border-b border-blue-200/50 pb-2 flex items-center gap-2">
                    <Car size={14} /> 2. Register Vehicle Asset
                  </span>

                  <div className="mb-2">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Assign Available Driver *</label>
                    <select name="assignedDriverId" required disabled={!canAddVehicle} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400">
                      <option value="">{availableDrivers.length ? "Select an available driver" : "Register an available driver first"}</option>
                      {availableDrivers.map((d: any) => (
                        <option key={d._id} value={d._id}>{d.name} ({d.licenceNumber})</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 mt-1">Each driver can be assigned to one vehicle at a time.</p>
                  </div>

                  {!canAddVehicle && (
                    <p className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      {isIndividualPartner && activeVehicles.length >= 1
                        ? "Individual partners can keep one vehicle only."
                        : "Register a new driver before adding another vehicle."}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Maker Brand *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-blue-400">
                          <Building size={12} />
                        </div>
                        <input name="brand" placeholder="e.g. Toyota" required className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Model *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-blue-400">
                          <HashIcon size={12} />
                        </div>
                        <input name="model" placeholder="e.g. 2022" required className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle Name *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-blue-400">
                          <Type size={12} />
                        </div>
                        <input name="vehicleName" placeholder="e.g. Innova" required className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Category *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-blue-400">
                          <Car size={12} />
                        </div>
                        <select name="category" required className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-semibold outline-none transition-all">
                          <option value="SUV">SUV</option>
                          <option value="Sedan">Sedan</option>
                          <option value="Hatchback">Hatchback</option>
                          <option value="Bus">Bus</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Seating *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-blue-400">
                          <User size={12} />
                        </div>
                        <input name="seatingCapacity" required placeholder="7" type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle No. *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-blue-400">
                          <FileText size={12} />
                        </div>
                        <input name="registrationNumber" placeholder="DL 01 AB 1234" required className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase text-slate-800 font-medium outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={!canAddVehicle} className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors shadow-sm mt-2">
                    Add Vehicle
                  </button>
                  </fieldset>
                </form>

                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">Live Vehicle Registry ({dashboardData?.vehicles?.length || 0})</span>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {dashboardData?.vehicles?.length === 0 || !dashboardData?.vehicles ? (
                      <div className="border border-slate-200 border-dashed rounded p-4 text-center text-[10px] text-slate-400 font-medium">No registered vehicles found. Use form above to register.</div>
                    ) : (
                      dashboardData?.vehicles?.map((vehicle: any) => {
                        const driver = dashboardData?.drivers?.find((d: any) => d._id === vehicle.assignedDriverId);
                        return (
                        <div key={vehicle._id} className="bg-white border border-slate-200/80 p-3 rounded flex items-center justify-between text-xs hover:border-slate-300 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                          <div>
                            <span className="font-bold text-slate-950 block">{vehicle.brand} {vehicle.vehicleName}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block">{vehicle.category} • {vehicle.seatingCapacity} Seater</span>
                            <span className="font-mono bg-slate-50 text-slate-600 text-[9px] px-1.5 py-0.5 rounded border border-slate-200/60 font-bold mt-1 mr-2 inline-block uppercase tracking-wider">{vehicle.registrationNumber}</span>
                            {driver && (
                              <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50/80 border border-emerald-100 px-1.5 py-0.5 rounded inline-block mt-1">
                                <User size={10} className="inline mr-1" />
                                Driven by: {driver.name}
                              </span>
                            )}
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
                      )})
                    )}
                  </div>
                </div>
             </div>
           </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-950">Fleet Registry</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Add one linked driver and vehicle per row. Drivers stay assigned to one vehicle at a time.</p>
                </div>
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => setIsFleetDrawerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slate-800"
                  >
                    <Plus size={14} /> Add vehicle row
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Registration</th>
                        <th className="px-4 py-3">Driver</th>
                        <th className="px-4 py-3">Licence</th>
                        <th className="px-4 py-3 text-right">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeVehicles.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-slate-400">No fleet rows yet. Add your first driver and vehicle.</td>
                        </tr>
                      ) : (
                        activeVehicles.map((vehicle: any) => {
                          const driver = activeDrivers.find((item: any) => item._id === vehicle.assignedDriverId);
                          return (
                            <tr key={vehicle._id} className="hover:bg-slate-50/70 cursor-pointer group" onClick={() => setSelectedFleetRowForEdit({ driver, vehicle })}>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">{vehicle.brand} {vehicle.vehicleName}</div>
                                <div className="mt-0.5 text-[10px] text-slate-500">{vehicle.category} · {vehicle.seatingCapacity} seats · {vehicle.model}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-600">{vehicle.registrationNumber}</td>
                              <td className="px-4 py-3 group-hover:bg-slate-100/50 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedFleetRowForEdit({ driver, vehicle }); }}>
                                <div className="font-medium text-slate-700 hover:text-blue-600 transition-colors">{driver?.name || "Unassigned"} <span className="text-[9px] text-blue-500 ml-1 hidden group-hover:inline">({isEditable ? "Edit" : "View"})</span></div>
                                <div className="mt-0.5 text-[10px] text-slate-500">{driver?.mobile || "Requires assignment"}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{driver?.licenceNumber || "—"}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${vehicle.status === "Active" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                                  {vehicle.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setSelectedFleetRowForEdit({ driver, vehicle });
                                   }}
                                   className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800"
                                 >
                                   {isEditable ? "View / Edit" : "View"}
                                 </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {activeVehicles.length === 0 ? (
                    <div className="px-4 py-10 text-center text-xs text-slate-400">No fleet rows yet. Add your first driver and vehicle.</div>
                  ) : (
                    activeVehicles.map((vehicle: any) => {
                      const driver = activeDrivers.find((item: any) => item._id === vehicle.assignedDriverId);
                      return (
                        <div 
                          key={vehicle._id} 
                          className="p-4 flex flex-col gap-3 hover:bg-slate-50/70 cursor-pointer active:bg-slate-100 transition-colors"
                          onClick={() => setSelectedFleetRowForEdit({ driver, vehicle })}
                        >
                          {/* Header: Vehicle Name & Status */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-sm text-slate-900">{vehicle.brand} {vehicle.vehicleName}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{vehicle.category} · {vehicle.seatingCapacity} seats · {vehicle.model}</div>
                            </div>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${vehicle.status === "Active" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                              {vehicle.status}
                            </span>
                          </div>

                          {/* Grid Details */}
                          <div className="grid grid-cols-2 gap-3 mt-2 bg-slate-50/50 p-3 rounded border border-slate-100">
                            <div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Registration</div>
                              <div className="font-mono text-xs font-bold text-slate-700">{vehicle.registrationNumber}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Driver</div>
                              <div className="text-xs font-semibold text-slate-800">{driver?.name || "Unassigned"}</div>
                              <div className="text-[9px] text-slate-500 mt-0.5">{driver?.mobile || "Requires assignment"}</div>
                            </div>
                          </div>

                          <div className="mt-1 flex justify-end">
                             <button className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800">
                               {isEditable ? "View Details & Edit" : "View Details"}
                             </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {isFleetDrawerOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
                  <button type="button" aria-label="Close fleet entry drawer" onClick={() => setIsFleetDrawerOpen(false)} className="absolute inset-0 cursor-default" />
                  <aside className="relative z-10 h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950">Add Fleet Row</h3>
                        <p className="mt-1 text-xs text-slate-500">Create a driver and the vehicle assigned to that driver.</p>
                      </div>
                      <button type="button" onClick={() => setIsFleetDrawerOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X size={18} /></button>
                    </div>

                    <form onSubmit={handleFleetEntrySubmit} className="space-y-5">
                      <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700"><User size={14} /> Driver</h4>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <input name="fleetDriverName" required placeholder="Driver name" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                          <input name="fleetDriverMobile" required placeholder="Mobile number" type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                          <input name="fleetLicenceNumber" required placeholder="Licence number" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-emerald-500" />
                          <input name="fleetLicenceImage" type="file" required accept="image/*,.pdf" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
                        </div>
                      </section>

                      <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700"><Car size={14} /> Vehicle</h4>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <input name="fleetBrand" required placeholder="Maker brand" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                          <input name="fleetModel" required placeholder="Model / year" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                          <input name="fleetVehicleName" required placeholder="Vehicle name" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                          <select name="fleetCategory" required defaultValue="SUV" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="SUV">SUV</option><option value="Sedan">Sedan</option><option value="Hatchback">Hatchback</option><option value="Bus">Bus</option></select>
                          <input name="fleetSeatingCapacity" required placeholder="Seating capacity" type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
                          <input name="fleetRegistrationNumber" required placeholder="Registration number" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-blue-500" />
                        </div>
                      </section>

                      <button type="submit" disabled={uploading === "Fleet Licence Image"} className="w-full rounded-lg bg-slate-900 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 disabled:opacity-50">
                        {uploading === "Fleet Licence Image" ? "Saving fleet row..." : "Save driver and vehicle"}
                      </button>
                    </form>
                  </aside>
                </div>
              )}
            </div>
          )
        )}
      </div>

      
      
      {/* FLEET ROW EDIT MODAL */}
      {selectedFleetRowForEdit && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/30 transition-opacity duration-300">
          <button type="button" aria-label="Close drawer" onClick={() => setSelectedFleetRowForEdit(null)} className="absolute inset-0 cursor-default" />
          <aside className="relative z-10 h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7 border-l border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col">
            <div className="mb-6 flex items-start justify-between gap-4 shrink-0 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Fleet Row Details</h3>
                <p className="mt-1 text-xs text-slate-500">View or edit driver and vehicle information.</p>
              </div>
              <button type="button" onClick={() => setSelectedFleetRowForEdit(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              try {
                let success = true;
                
                // Update Driver if driver exists
                if (selectedFleetRowForEdit.driver) {
                  const driverRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/driver/${selectedFleetRowForEdit.driver._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                    body: JSON.stringify({
                      name: form.driverName.value,
                      mobile: form.driverMobile.value,
                      licenceNumber: form.driverLicenceNumber.value
                    }),
                  });
                  if (!driverRes.ok) success = false;
                }

                // Update Vehicle
                if (selectedFleetRowForEdit.vehicle) {
                  const vehicleRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/partner/vehicle/${selectedFleetRowForEdit.vehicle._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                    body: JSON.stringify({
                      vehicleData: {
                        brand: form.vehicleBrand.value,
                        model: form.vehicleModel.value,
                        vehicleName: form.vehicleName.value,
                        category: form.vehicleCategory.value,
                        seatingCapacity: Number(form.vehicleSeatingCapacity.value),
                        registrationNumber: form.vehicleRegistrationNumber.value
                      }
                    }),
                  });
                  if (!vehicleRes.ok) success = false;
                }

                if (success) {
                  setSelectedFleetRowForEdit(null);
                  fetchDashboardData();
                  setMessage("Fleet row updated successfully");
                } else {
                  alert("Failed to update driver or vehicle details");
                }
              } catch (error) {
                alert("Error updating fleet row");
              }
            }} className="space-y-5 flex-1 pr-2">
              <fieldset disabled={!isEditable} className="space-y-5">
                
                {selectedFleetRowForEdit.driver && (
                  <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700"><User size={14} /> Driver</h4>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Driver Name</label>
                        <input name="driverName" defaultValue={selectedFleetRowForEdit.driver.name} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 w-full" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Mobile</label>
                        <input name="driverMobile" defaultValue={selectedFleetRowForEdit.driver.mobile} required type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 w-full" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Licence Number</label>
                        <input name="driverLicenceNumber" defaultValue={selectedFleetRowForEdit.driver.licenceNumber} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-emerald-500 w-full" />
                      </div>
                      {selectedFleetRowForEdit.driver.licenceImageUrl && (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Licence Document</label>
                          <div className="h-full flex items-center">
                            <a href={selectedFleetRowForEdit.driver.licenceImageUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 underline uppercase tracking-wider">View Uploaded Scan</a>
                          </div>
                        </div>
                      )}
                    </div>

                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-6 mb-3 border-b border-blue-100 pb-2">Vehicle Images</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Front Image */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Front View</label>
                          {selectedFleetRowForEdit.vehicle.frontImageUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.frontImageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleVehicleFileUpload(e, "frontImageUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "frontImageUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "frontImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>
                      
                      {/* Rear Image */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Rear View</label>
                          {selectedFleetRowForEdit.vehicle.rearImageUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.rearImageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleVehicleFileUpload(e, "rearImageUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "rearImageUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "rearImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>
                      
                      {/* Left Side Image */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Left Side</label>
                          {selectedFleetRowForEdit.vehicle.leftSideImageUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.leftSideImageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleVehicleFileUpload(e, "leftSideImageUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "leftSideImageUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "leftSideImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>
                      
                      {/* Right Side Image */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Right Side</label>
                          {selectedFleetRowForEdit.vehicle.rightSideImageUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.rightSideImageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleVehicleFileUpload(e, "rightSideImageUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "rightSideImageUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "rightSideImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>
                      
                      {/* Interior Image */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Interior</label>
                          {selectedFleetRowForEdit.vehicle.interiorImageUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.interiorImageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleVehicleFileUpload(e, "interiorImageUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "interiorImageUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "interiorImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>

                      {/* Other Image */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Other / Boot</label>
                          {selectedFleetRowForEdit.vehicle.otherImageUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.otherImageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleVehicleFileUpload(e, "otherImageUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "otherImageUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "otherImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>
                    </div>
                  </section>
                )}

                {selectedFleetRowForEdit.vehicle && (
                  <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700"><Car size={14} /> Vehicle</h4>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Brand</label>
                        <input name="vehicleBrand" defaultValue={selectedFleetRowForEdit.vehicle.brand} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Model</label>
                        <input name="vehicleModel" defaultValue={selectedFleetRowForEdit.vehicle.model} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle Name / Variant</label>
                        <input name="vehicleName" defaultValue={selectedFleetRowForEdit.vehicle.vehicleName} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Category</label>
                        <select name="vehicleCategory" required defaultValue={selectedFleetRowForEdit.vehicle.category || "SUV"} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 w-full">
                          <option value="SUV">SUV</option>
                          <option value="Sedan">Sedan</option>
                          <option value="Hatchback">Hatchback</option>
                          <option value="Bus">Bus</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Seating Capacity</label>
                        <input name="vehicleSeatingCapacity" defaultValue={selectedFleetRowForEdit.vehicle.seatingCapacity} required placeholder="Capacity" type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle No.</label>
                        <input name="vehicleRegistrationNumber" defaultValue={selectedFleetRowForEdit.vehicle.registrationNumber} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 w-full" />
                      </div>
                    </div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-6 mb-3 border-b border-blue-100 pb-2">Vehicle Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* RC Image */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">RC Image</label>
                          {selectedFleetRowForEdit.vehicle.rcImageUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.rcImageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={(e) => handleVehicleFileUpload(e, "rcImageUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "rcImageUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "rcImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>

                      {/* PUC Image */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">PUC Image</label>
                          {selectedFleetRowForEdit.vehicle.pucImageUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.pucImageUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={(e) => handleVehicleFileUpload(e, "pucImageUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "pucImageUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "pucImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>

                      {/* Insurance File */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Insurance File</label>
                          {selectedFleetRowForEdit.vehicle.insuranceFileUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.insuranceFileUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={(e) => handleVehicleFileUpload(e, "insuranceFileUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "insuranceFileUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "insuranceFileUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>

                      {/* Permit File */}
                      <div className="border border-blue-100 p-3 rounded bg-white flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Permit File</label>
                          {selectedFleetRowForEdit.vehicle.permitFileUrl && (
                            <a href={selectedFleetRowForEdit.vehicle.permitFileUrl} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">VIEW</a>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={(e) => handleVehicleFileUpload(e, "permitFileUrl", selectedFleetRowForEdit.vehicle._id)}
                          disabled={uploading === "permitFileUrl" || !isEditable}
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800" 
                        />
                        {uploading === "permitFileUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>
                    </div>
                  </section>
                )}

                {isEditable && (
                  <button type="submit" className="w-full rounded-lg bg-slate-900 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800">
                    Save Changes
                  </button>
                )}
              </fieldset>
            </form>
          </aside>
        </div>
      )}

      {/* VERIFICATION HISTORY DRAWER */}
      {isHistoryDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/30 transition-opacity duration-300">
          <button type="button" aria-label="Close history drawer" onClick={() => setIsHistoryDrawerOpen(false)} className="absolute inset-0 cursor-default" />
          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl sm:p-7 border-l border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col">
            <div className="mb-6 flex items-start justify-between gap-4 shrink-0 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Verification History</h3>
                <p className="mt-1 text-xs text-slate-500">Status updates and messages.</p>
              </div>
              <button type="button" onClick={() => setIsHistoryDrawerOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 pb-10">
              {verificationHistory.map((log: any) => (
                <div key={log._id} className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Recently"}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {log.actionType === "StatusChange" ? "Status Update" : "Admin Message"}
                    </span>
                  </div>
                  {log.actionType === "StatusChange" && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-semibold text-slate-500 line-through">{log.oldStatus || "Draft"}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-sm font-bold text-slate-800">{log.newStatus}</span>
                    </div>
                  )}
                  {log.reasons?.length > 0 && (
                    <div className="mt-3 p-2.5 bg-red-50/50 border border-red-100 rounded-lg">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block mb-1">Reasons:</span>
                      <ul className="list-disc list-inside text-xs text-red-700 space-y-0.5">
                        {log.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {log.comment && (
                    <div className="mt-3 p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">"{log.comment}"</p>
                    </div>
                  )}
                </div>
              ))}
              {verificationHistory.length === 0 && (
                 <div className="text-center py-10 text-slate-400 text-sm">No verification history available.</div>
              )}
            </div>
          </aside>
        </div>
      )}

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
