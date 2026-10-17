"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Plus, Trash2 } from "lucide-react";

// Admin editor for every part of a partner account. Talks only to the
// /admin/partner-edit endpoints. Every save is validated server-side, logged
// in the partner's Activity, and (optionally) notified to the partner.

export type EditKind =
  | { kind: "profile" }
  | { kind: "bank" }
  | { kind: "vehicle"; item?: any }
  | { kind: "driver"; item?: any }
  | { kind: "removeVehicle"; item: any }
  | { kind: "removeDriver"; item: any }
  | { kind: "document"; preset?: { ownerType: string; ownerId: string; documentType?: string } }
  | { kind: "docExpiry"; item: any }
  | { kind: "login" }
  | { kind: "settings" };

const API = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-edit`;
const inputCls = "h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-[#FE5300] focus:ring-2 focus:ring-orange-100";
const DOC_TYPES = ["Aadhaar", "PAN", "Profile Photo", "RC", "Insurance", "PUC", "Permit", "Fitness Certificate", "Driving Licence", "Police Verification", "Cancelled Cheque", "GST Certificate", "Other"];
const CATEGORIES = ["Hatchback", "Sedan", "SUV", "MUV", "Tempo Traveller", "Mini Bus", "Bus", "Luxury"];
const toDate = (d?: string | Date) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-2 text-[12px] text-slate-600">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function PartnerEditDialog({ partner, edit, onClose, onSaved }: { partner: any; edit: EditKind | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [notifyPartner, setNotifyPartner] = useState(true);
  const [keepVerified, setKeepVerified] = useState(false);
  const set = (p: any) => setForm((f: any) => ({ ...f, ...p }));
  const authId = partner?.auth?._id;

  // Fill the form for the thing being edited.
  useEffect(() => {
    if (!edit || !partner) return;
    setNotifyPartner(true);
    setKeepVerified(false);
    const p = partner.profile || {};
    const a = partner.address || {};
    const b = partner.bank || {};
    if (edit.kind === "profile")
      setForm({
        fullName: p.fullName || "", fatherName: p.fatherName || "", dob: toDate(p.dob), gender: p.gender || "", partnerType: p.partnerType || "Individual", agencyName: p.agencyName || "",
        mobileNumber: p.mobileNumber && p.mobileNumber !== "Not Provided" ? p.mobileNumber : "", alternateMobileNumber: p.alternateMobileNumber || "", whatsappNumber: p.whatsappNumber || "",
        emergencyContactName: p.emergencyContactName || "", emergencyContactNumber: p.emergencyContactNumber || "", preferredLanguage: p.preferredLanguage || "",
        addressLine: a.addressLine || "", city: a.city || "", district: a.district || "", state: a.state || "", pincode: a.pincode || "", profilePicture: undefined,
      });
    else if (edit.kind === "bank") setForm({ accountHolderName: b.accountHolderName || "", bankName: b.bankName || "", branchName: b.branchName || "", accountNumber: b.accountNumber || "", ifsc: b.ifsc || b.ifscCode || "", upiId: b.upiId || "", cancelledChequeUrl: undefined });
    else if (edit.kind === "vehicle") {
      const v = edit.item || {};
      setForm({ category: v.category || "SUV", seatingCapacity: v.seatingCapacity || "", brand: v.brand || "", model: v.model || "", vehicleName: v.vehicleName || "", registrationNumber: v.registrationNumber || "", chassisNumber: v.chassisNumber || "", engineNumber: v.engineNumber || "", manufacturingYear: v.manufacturingYear || "", color: v.color || "", features: (v.features || []).join(", "), assignedDriverId: v.assignedDriverId || "", markVerified: false });
    } else if (edit.kind === "driver") {
      const d = edit.item || {};
      setForm({ name: d.name || "", mobile: d.mobile || "", alternateMobile: d.alternateMobile || "", aadhaarNumber: d.aadhaarNumber || "", licenceNumber: d.licenceNumber || "", licenceExpiry: toDate(d.licenceExpiry), experienceYears: d.experienceYears ?? "", languagesKnown: (d.languagesKnown || []).join(", "), markVerified: false });
    } else if (edit.kind === "removeVehicle" || edit.kind === "removeDriver") setForm({ reason: "" });
    else if (edit.kind === "document") setForm({ ownerType: edit.preset?.ownerType || "PartnerProfile", ownerId: edit.preset?.ownerId || partner.profile?._id || "", documentType: edit.preset?.documentType || "Aadhaar", customType: "", fileUrl: "", fileUrlBack: "", expiryDate: "", markVerified: true });
    else if (edit.kind === "docExpiry") setForm({ expiryDate: toDate(edit.item.expiryDate) });
    else if (edit.kind === "login") setForm({ email: partner.auth?.email || "" });
    else if (edit.kind === "settings") {
      const existing = new Map((partner.settings?.vehicleConfigs || []).map((c: any) => [String(c.vehicleId), c]));
      setForm({
        configs: (partner.vehicles || []).map((v: any) => {
          const c: any = existing.get(String(v._id)) || {};
          return { vehicleId: v._id, label: `${v.brand || ""} ${v.vehicleName || ""} · ${v.registrationNumber}`, perKmRate: c.perKmRate ?? "", fullDayRate: c.fullDayRate ?? "", locations: (c.locations || []).map((l: any) => ({ city: l.city || "", state: l.state || "", address: l.address || "", pincode: l.pincode || "" })) };
        }),
      });
    }
  }, [edit, partner]);

  if (!edit || !partner) return null;

  const call = async (path: string, method: string, body?: any) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${useAdminAuthStore.getState().accessToken}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || "Save failed");
    return json;
  };
  const run = async (fn: () => Promise<any>, close = true) => {
    setBusy(true);
    try {
      const r = await fn();
      toast.success(r?.message || "Saved");
      onSaved();
      if (close) onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const fileInput = (key: string, accept = "image/*,application/pdf") => (
    <input
      type="file"
      accept={accept}
      className="block w-full text-[12px] file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1"
      onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return set({ [key]: "" });
        if (f.size > 8 * 1024 * 1024) {
          toast.error("File is larger than 8 MB");
          return;
        }
        set({ [key]: await readFile(f) });
      }}
    />
  );
  const common = { notifyPartner };

  let title = "";
  let body: React.ReactNode = null;
  let save: (() => void) | null = null;
  let verifiedNote = "";

  if (edit.kind === "profile") {
    title = "Edit profile & address";
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <F label="Full name *"><input className={inputCls} value={form.fullName || ""} onChange={(e) => set({ fullName: e.target.value })} /></F>
        <F label="Father's name"><input className={inputCls} value={form.fatherName || ""} onChange={(e) => set({ fatherName: e.target.value })} /></F>
        <F label="Partner type *">
          <select className={inputCls} value={form.partnerType} onChange={(e) => set({ partnerType: e.target.value })}>
            {["Individual", "Fleet Owner", "Travel Agency", "Company"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </F>
        <F label={`Agency / company name${form.partnerType && form.partnerType !== "Individual" ? " *" : ""}`}><input className={inputCls} value={form.agencyName || ""} onChange={(e) => set({ agencyName: e.target.value })} /></F>
        <F label="Mobile number (10 digits)"><input className={inputCls} inputMode="numeric" value={form.mobileNumber || ""} onChange={(e) => set({ mobileNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></F>
        <F label="Alternate mobile"><input className={inputCls} inputMode="numeric" value={form.alternateMobileNumber || ""} onChange={(e) => set({ alternateMobileNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></F>
        <F label="WhatsApp number"><input className={inputCls} inputMode="numeric" value={form.whatsappNumber || ""} onChange={(e) => set({ whatsappNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></F>
        <F label="Date of birth"><input type="date" className={inputCls} value={form.dob || ""} onChange={(e) => set({ dob: e.target.value })} /></F>
        <F label="Gender">
          <select className={inputCls} value={form.gender || ""} onChange={(e) => set({ gender: e.target.value })}>
            <option value="">—</option>
            {["Male", "Female", "Other"].map((g) => <option key={g}>{g}</option>)}
          </select>
        </F>
        <F label="Preferred language"><input className={inputCls} value={form.preferredLanguage || ""} onChange={(e) => set({ preferredLanguage: e.target.value })} /></F>
        <F label="Emergency contact name"><input className={inputCls} value={form.emergencyContactName || ""} onChange={(e) => set({ emergencyContactName: e.target.value })} /></F>
        <F label="Emergency contact number"><input className={inputCls} inputMode="numeric" value={form.emergencyContactNumber || ""} onChange={(e) => set({ emergencyContactNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></F>
        <F label="Profile photo (replace)" wide>{fileInput("profilePicture", "image/*")}</F>
        <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:col-span-2">Address</p>
        <F label="Address line" wide><input className={inputCls} value={form.addressLine || ""} onChange={(e) => set({ addressLine: e.target.value })} /></F>
        <F label="City"><input className={inputCls} value={form.city || ""} onChange={(e) => set({ city: e.target.value })} /></F>
        <F label="District"><input className={inputCls} value={form.district || ""} onChange={(e) => set({ district: e.target.value })} /></F>
        <F label="State"><input className={inputCls} value={form.state || ""} onChange={(e) => set({ state: e.target.value })} /></F>
        <F label="PIN code"><input className={inputCls} inputMode="numeric" value={form.pincode || ""} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></F>
      </div>
    );
    save = () => {
      const { addressLine, city, district, state, pincode, profilePicture, ...rest } = form;
      const hasAddress = partner.address || addressLine || city || state || pincode;
      return run(() => call(`/${authId}/profile`, "PUT", { ...rest, ...(profilePicture ? { profilePicture } : {}), ...(hasAddress ? { address: { addressLine, city, district, state, pincode } } : {}), expectedUpdatedAt: partner.profile?.updatedAt, ...common }));
    };
  } else if (edit.kind === "bank") {
    title = partner.bank ? "Edit bank details" : "Add bank details";
    verifiedNote = partner.bank?.status === "Verified" ? "Changing account number, IFSC or holder name sends the bank back to Pending verification." : "";
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <F label="Account holder name *"><input className={inputCls} value={form.accountHolderName || ""} onChange={(e) => set({ accountHolderName: e.target.value })} /></F>
        <F label="Bank name *"><input className={inputCls} value={form.bankName || ""} onChange={(e) => set({ bankName: e.target.value })} /></F>
        <F label="Account number *"><input className={inputCls} inputMode="numeric" value={form.accountNumber || ""} onChange={(e) => set({ accountNumber: e.target.value.replace(/\D/g, "").slice(0, 18) })} /></F>
        <F label="IFSC *"><input className={`${inputCls} uppercase`} value={form.ifsc || ""} onChange={(e) => set({ ifsc: e.target.value.toUpperCase().slice(0, 11) })} /></F>
        <F label="Branch"><input className={inputCls} value={form.branchName || ""} onChange={(e) => set({ branchName: e.target.value })} /></F>
        <F label="UPI ID"><input className={inputCls} value={form.upiId || ""} onChange={(e) => set({ upiId: e.target.value })} /></F>
        <F label="Cancelled cheque (replace)" wide>{fileInput("cancelledChequeUrl")}</F>
      </div>
    );
    save = () => {
      const { cancelledChequeUrl, ...rest } = form;
      return run(() => call(`/${authId}/bank`, "PUT", { ...rest, ...(cancelledChequeUrl ? { cancelledChequeUrl } : {}), expectedUpdatedAt: partner.bank?.updatedAt, keepVerified, ...common }));
    };
  } else if (edit.kind === "vehicle") {
    const v = edit.item;
    title = v ? `Edit vehicle ${v.registrationNumber}` : "Add vehicle";
    verifiedNote = v?.status === "Active" ? "Changing registration number or category sends the vehicle back to Pending verification." : "";
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <F label="Registration number *"><input className={`${inputCls} uppercase`} value={form.registrationNumber || ""} onChange={(e) => set({ registrationNumber: e.target.value.toUpperCase().replace(/\s/g, "") })} /></F>
        <F label="Category *">
          <select className={inputCls} value={form.category} onChange={(e) => set({ category: e.target.value })}>
            {[...new Set([form.category, ...CATEGORIES].filter(Boolean))].map((c) => <option key={c}>{c}</option>)}
          </select>
        </F>
        <F label="Brand *"><input className={inputCls} value={form.brand || ""} onChange={(e) => set({ brand: e.target.value })} /></F>
        <F label="Model *"><input className={inputCls} value={form.model || ""} onChange={(e) => set({ model: e.target.value })} /></F>
        <F label="Vehicle name *"><input className={inputCls} value={form.vehicleName || ""} onChange={(e) => set({ vehicleName: e.target.value })} /></F>
        <F label="Seats *"><input type="number" min={1} className={inputCls} value={form.seatingCapacity} onChange={(e) => set({ seatingCapacity: e.target.value })} /></F>
        <F label="Manufacturing year"><input type="number" className={inputCls} value={form.manufacturingYear} onChange={(e) => set({ manufacturingYear: e.target.value })} /></F>
        <F label="Colour"><input className={inputCls} value={form.color || ""} onChange={(e) => set({ color: e.target.value })} /></F>
        <F label="Chassis number"><input className={inputCls} value={form.chassisNumber || ""} onChange={(e) => set({ chassisNumber: e.target.value })} /></F>
        <F label="Engine number"><input className={inputCls} value={form.engineNumber || ""} onChange={(e) => set({ engineNumber: e.target.value })} /></F>
        <F label="Assigned driver">
          <select className={inputCls} value={form.assignedDriverId || ""} onChange={(e) => set({ assignedDriverId: e.target.value })}>
            <option value="">— None —</option>
            {(partner.drivers || []).map((d: any) => <option key={d._id} value={d._id}>{d.name} ({d.licenceNumber})</option>)}
          </select>
        </F>
        <F label="Features (comma separated)"><input className={inputCls} value={form.features || ""} onChange={(e) => set({ features: e.target.value })} /></F>
        {!v && <div className="sm:col-span-2"><Check checked={!!form.markVerified} onChange={(x) => set({ markVerified: x })} label="Mark as verified now (I've checked the RC)" /></div>}
      </div>
    );
    save = () => run(() => (v ? call(`/vehicles/${v._id}`, "PUT", { ...form, expectedUpdatedAt: v.updatedAt, keepVerified, ...common }) : call(`/${authId}/vehicles`, "POST", { ...form, ...common })));
  } else if (edit.kind === "driver") {
    const d = edit.item;
    title = d ? `Edit driver ${d.name}` : "Add driver";
    verifiedNote = d?.status === "Active" ? "Changing the licence number sends the driver back to Pending verification." : "";
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <F label="Name *"><input className={inputCls} value={form.name || ""} onChange={(e) => set({ name: e.target.value })} /></F>
        <F label="Mobile *"><input className={inputCls} inputMode="numeric" value={form.mobile || ""} onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></F>
        <F label="Licence number *"><input className={`${inputCls} uppercase`} value={form.licenceNumber || ""} onChange={(e) => set({ licenceNumber: e.target.value.toUpperCase().replace(/\s/g, "") })} /></F>
        <F label="Licence expiry"><input type="date" className={inputCls} value={form.licenceExpiry || ""} onChange={(e) => set({ licenceExpiry: e.target.value })} /></F>
        <F label="Alternate mobile"><input className={inputCls} inputMode="numeric" value={form.alternateMobile || ""} onChange={(e) => set({ alternateMobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></F>
        <F label="Aadhaar number"><input className={inputCls} inputMode="numeric" value={form.aadhaarNumber || ""} onChange={(e) => set({ aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })} /></F>
        <F label="Experience (years)"><input type="number" min={0} className={inputCls} value={form.experienceYears} onChange={(e) => set({ experienceYears: e.target.value })} /></F>
        <F label="Languages (comma separated)"><input className={inputCls} value={form.languagesKnown || ""} onChange={(e) => set({ languagesKnown: e.target.value })} /></F>
        {!d && <div className="sm:col-span-2"><Check checked={!!form.markVerified} onChange={(x) => set({ markVerified: x })} label="Mark as verified now (I've checked the licence)" /></div>}
      </div>
    );
    save = () => run(() => (d ? call(`/drivers/${d._id}`, "PUT", { ...form, expectedUpdatedAt: d.updatedAt, keepVerified, ...common }) : call(`/${authId}/drivers`, "POST", { ...form, ...common })));
  } else if (edit.kind === "removeVehicle" || edit.kind === "removeDriver") {
    const isV = edit.kind === "removeVehicle";
    title = isV ? `Remove vehicle ${edit.item.registrationNumber}?` : `Remove driver ${edit.item.name}?`;
    body = (
      <div className="space-y-2">
        <p className="text-[12px] text-slate-600">It's removed from the partner's account (history is kept). The partner sees the reason.</p>
        <F label="Reason *"><textarea className={`${inputCls} h-20 py-2`} value={form.reason || ""} onChange={(e) => set({ reason: e.target.value })} /></F>
      </div>
    );
    save = () => run(() => call(isV ? `/vehicles/${edit.item._id}` : `/drivers/${edit.item._id}`, "DELETE", { reason: form.reason, ...common }));
  } else if (edit.kind === "document") {
    title = "Upload / replace document";
    const owners = [
      { value: `PartnerProfile:${partner.profile?._id}`, label: "Partner (profile)" },
      ...(partner.vehicles || []).map((v: any) => ({ value: `PartnerVehicle:${v._id}`, label: `Vehicle ${v.registrationNumber}` })),
      ...(partner.drivers || []).map((d: any) => ({ value: `PartnerDriver:${d._id}`, label: `Driver ${d.name}` })),
    ];
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <F label="Belongs to *">
          <select className={inputCls} value={`${form.ownerType}:${form.ownerId}`} onChange={(e) => { const [ownerType, ownerId] = e.target.value.split(":"); set({ ownerType, ownerId }); }}>
            {owners.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </F>
        <F label="Document type *">
          <select className={inputCls} value={DOC_TYPES.includes(form.documentType) ? form.documentType : "Other"} onChange={(e) => set({ documentType: e.target.value })}>
            {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </F>
        {(form.documentType === "Other" || !DOC_TYPES.includes(form.documentType)) && (
          <F label="Type name *" wide><input className={inputCls} value={form.customType || (DOC_TYPES.includes(form.documentType) ? "" : form.documentType)} onChange={(e) => set({ customType: e.target.value })} /></F>
        )}
        <F label="File (front) *">{fileInput("fileUrl")}</F>
        <F label="File (back, optional)">{fileInput("fileUrlBack")}</F>
        <F label="Expiry date (optional)"><input type="date" className={inputCls} value={form.expiryDate || ""} onChange={(e) => set({ expiryDate: e.target.value })} /></F>
        <div className="flex items-end pb-1"><Check checked={!!form.markVerified} onChange={(x) => set({ markVerified: x })} label="Mark as verified (Approved)" /></div>
        <p className="text-[11px] text-slate-500 sm:col-span-2">If this document type already exists for the same owner, the old one is archived (kept) and replaced.</p>
      </div>
    );
    save = () => {
      const documentType = form.documentType === "Other" ? form.customType : form.documentType;
      return run(() => call(`/${authId}/documents`, "POST", { ownerType: form.ownerType, ownerId: form.ownerId, documentType, fileUrl: form.fileUrl, fileUrlBack: form.fileUrlBack || undefined, expiryDate: form.expiryDate || undefined, markVerified: form.markVerified, ...common }));
    };
  } else if (edit.kind === "docExpiry") {
    title = `${edit.item.documentType} — expiry date`;
    body = <F label="Expiry date"><input type="date" className={inputCls} value={form.expiryDate || ""} onChange={(e) => set({ expiryDate: e.target.value })} /></F>;
    save = () => run(() => call(`/documents/${edit.item._id}`, "PUT", { expiryDate: form.expiryDate || null }));
  } else if (edit.kind === "login") {
    title = "Login & access";
    body = (
      <div className="space-y-4">
        <div className="space-y-2">
          <F label="Login email"><input type="email" className={inputCls} value={form.email || ""} onChange={(e) => set({ email: e.target.value })} /></F>
          <Button size="sm" disabled={busy} onClick={() => run(() => call(`/${authId}/email`, "PUT", { email: form.email, ...common }), false)}>Save email</Button>
        </div>
        <div className="space-y-1 border-t border-slate-100 pt-3">
          <p className="text-[12px] text-slate-600">Send a password reset code to <b>{partner.auth?.email}</b>. The partner enters it in the app&apos;s Forgot Password.</p>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => call(`/${authId}/password-reset`, "POST", {}), false)}>Send reset code</Button>
        </div>
        {partner.auth?.googleId && (
          <div className="space-y-1 border-t border-slate-100 pt-3">
            <p className="text-[12px] text-slate-600">This account signs in with Google. Unlink it if the Google account is wrong or lost (the partner then uses email + Forgot Password).</p>
            <Button size="sm" variant="outline" className="text-red-600" disabled={busy} onClick={() => confirm("Unlink Google sign-in for this partner?") && run(() => call(`/${authId}/unlink-google`, "POST", {}), false)}>Unlink Google</Button>
          </div>
        )}
      </div>
    );
  } else if (edit.kind === "settings") {
    title = "Work locations & rates";
    const cfgs: any[] = form.configs || [];
    const upd = (i: number, p: any) => set({ configs: cfgs.map((c, j) => (j === i ? { ...c, ...p } : c)) });
    body = !cfgs.length ? (
      <p className="text-[12px] text-slate-500">Add a vehicle first.</p>
    ) : (
      <div className="space-y-4">
        {cfgs.map((c, i) => (
          <div key={c.vehicleId} className="rounded-md border border-slate-200 p-3">
            <p className="mb-2 text-[12px] font-semibold text-slate-800">{c.label}</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Per km rate (₹)"><input type="number" min={0} className={inputCls} value={c.perKmRate} onChange={(e) => upd(i, { perKmRate: e.target.value })} /></F>
              <F label="Full day rate (₹)"><input type="number" min={0} className={inputCls} value={c.fullDayRate} onChange={(e) => upd(i, { fullDayRate: e.target.value })} /></F>
            </div>
            <p className="mb-1 mt-3 text-[11px] font-medium text-slate-500">Work locations (rides are offered for these cities)</p>
            {c.locations.map((l: any, k: number) => (
              <div key={k} className="mb-1.5 grid grid-cols-[1fr_1fr_90px_28px] gap-1.5">
                <input className={inputCls} placeholder="City *" value={l.city} onChange={(e) => upd(i, { locations: c.locations.map((x: any, y: number) => (y === k ? { ...x, city: e.target.value } : x)) })} />
                <input className={inputCls} placeholder="State *" value={l.state} onChange={(e) => upd(i, { locations: c.locations.map((x: any, y: number) => (y === k ? { ...x, state: e.target.value } : x)) })} />
                <input className={inputCls} placeholder="PIN" value={l.pincode} onChange={(e) => upd(i, { locations: c.locations.map((x: any, y: number) => (y === k ? { ...x, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) } : x)) })} />
                <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => upd(i, { locations: c.locations.filter((_: any, y: number) => y !== k) })} title="Remove"><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[#FE5300]" onClick={() => upd(i, { locations: [...c.locations, { city: "", state: "", address: "", pincode: "" }] })}><Plus size={12} /> Add city</button>
          </div>
        ))}
      </div>
    );
    save = () => run(() => call(`/${authId}/settings`, "PUT", { vehicleConfigs: cfgs.map((c) => ({ vehicleId: c.vehicleId, perKmRate: Number(c.perKmRate || 0), fullDayRate: Number(c.fullDayRate || 0), locations: c.locations })), ...common }));
  }

  const showKeep = !!verifiedNote;
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {partner.profile?.fullName || partner.auth?.email} · every change is recorded in Activity
          </DialogDescription>
        </DialogHeader>
        {body}
        {(save || edit.kind === "login") && (
          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            {showKeep && (
              <>
                <p className="text-[11px] text-amber-700">⚠ {verifiedNote}</p>
                <Check checked={keepVerified} onChange={setKeepVerified} label="Keep it verified — I've already checked the new details" />
              </>
            )}
            {!["docExpiry"].includes(edit.kind) && <Check checked={notifyPartner} onChange={setNotifyPartner} label="Notify the partner about this change" />}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>{edit.kind === "login" ? "Close" : "Cancel"}</Button>
          {save && (
            <Button disabled={busy} className={edit.kind.startsWith("remove") ? "bg-red-600 hover:bg-red-700" : "bg-[#FE5300] hover:bg-[#e54b00]"} onClick={save}>
              {busy ? "Saving..." : edit.kind.startsWith("remove") ? "Remove" : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
