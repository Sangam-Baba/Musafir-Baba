const fs = require('fs');
const path = '/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add file inputs to the Fleet Drawer
const vehicleSectionEnd = `                          <input name="fleetRegistrationNumber" required placeholder="Registration number" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-blue-500" />
                        </div>
                      </section>`;

const newUploadSections = `
                      <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">Vehicle Documents</h4>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">RC Image</label><input name="fleetRcImage" type="file" accept="image/*,.pdf" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">PUC Image</label><input name="fleetPucImage" type="file" accept="image/*,.pdf" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Insurance</label><input name="fleetInsuranceImage" type="file" accept="image/*,.pdf" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Permit</label><input name="fleetPermitImage" type="file" accept="image/*,.pdf" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                        </div>
                      </section>

                      <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">Vehicle Images</h4>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Front View</label><input name="fleetFrontImage" type="file" accept="image/*" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Rear View</label><input name="fleetRearImage" type="file" accept="image/*" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Left Side</label><input name="fleetLeftImage" type="file" accept="image/*" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Right Side</label><input name="fleetRightImage" type="file" accept="image/*" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Interior</label><input name="fleetInteriorImage" type="file" accept="image/*" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                          <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Other / Boot</label><input name="fleetOtherImage" type="file" accept="image/*" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" /></div>
                        </div>
                      </section>`;

if (!content.includes('fleetRcImage')) {
  content = content.replace(vehicleSectionEnd, vehicleSectionEnd + "\n" + newUploadSections);
}

// 2. Update handleFleetEntrySubmit
// We need to inject a helper function to upload files, and gather all the URLs before POSTing to /partner/vehicle
const submitFunctionStart = `const currentToken = getToken();`;
const submitFunctionInjected = `
      const uploadHelper = async (fileObj: File) => {
        if (!fileObj || fileObj.size === 0) return "";
        const presignRes = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: fileObj.name, fileType: fileObj.type, folder: "partner-documents" }),
        });
        if (!presignRes.ok) return "";
        const { uploadUrl, fileUrl } = await presignRes.json();
        const uploadRes = await fetch(uploadUrl, { method: "PUT", body: fileObj, headers: { "Content-Type": fileObj.type } });
        return uploadRes.ok ? fileUrl : "";
      };

      setUploading("Vehicle Documents");
      const [
        rcImageUrl, pucImageUrl, insuranceFileUrl, permitFileUrl,
        frontImageUrl, rearImageUrl, leftSideImageUrl, rightSideImageUrl, interiorImageUrl, otherImageUrl
      ] = await Promise.all([
        uploadHelper(formData.get("fleetRcImage") as File),
        uploadHelper(formData.get("fleetPucImage") as File),
        uploadHelper(formData.get("fleetInsuranceImage") as File),
        uploadHelper(formData.get("fleetPermitImage") as File),
        uploadHelper(formData.get("fleetFrontImage") as File),
        uploadHelper(formData.get("fleetRearImage") as File),
        uploadHelper(formData.get("fleetLeftImage") as File),
        uploadHelper(formData.get("fleetRightImage") as File),
        uploadHelper(formData.get("fleetInteriorImage") as File),
        uploadHelper(formData.get("fleetOtherImage") as File)
      ]);

      const currentToken = getToken();`;

if (!content.includes('uploadHelper')) {
  content = content.replace(submitFunctionStart, submitFunctionInjected);
}

// Now we need to pass these URLs into the vehicle POST request
const vehicleDataPayload = `          vehicleData: {
            brand: formData.get("fleetBrand"),
            model: formData.get("fleetModel"),
            vehicleName: formData.get("fleetVehicleName"),
            category: formData.get("fleetCategory"),
            seatingCapacity: Number(formData.get("fleetSeatingCapacity")),
            registrationNumber: formData.get("fleetRegistrationNumber"),
            assignedDriverId: driverResult.data._id,
          },`;

const vehicleDataPayloadInjected = `          vehicleData: {
            brand: formData.get("fleetBrand"),
            model: formData.get("fleetModel"),
            vehicleName: formData.get("fleetVehicleName"),
            category: formData.get("fleetCategory"),
            seatingCapacity: Number(formData.get("fleetSeatingCapacity")),
            registrationNumber: formData.get("fleetRegistrationNumber"),
            assignedDriverId: driverResult.data._id,
            rcImageUrl, pucImageUrl, insuranceFileUrl, permitFileUrl,
            frontImageUrl, rearImageUrl, leftSideImageUrl, rightSideImageUrl, interiorImageUrl, otherImageUrl
          },`;

if (!content.includes('rcImageUrl, pucImageUrl')) {
  content = content.replace(vehicleDataPayload, vehicleDataPayloadInjected);
}

// Update the save button text
const saveButtonCode = `{uploading === "Fleet Licence Image" ? "Saving fleet row..." : "Save driver and vehicle"}`;
const newSaveButtonCode = `{(uploading === "Fleet Licence Image" || uploading === "Vehicle Documents") ? "Saving fleet row and uploading files..." : "Save driver and vehicle"}`;
content = content.replace(saveButtonCode, newSaveButtonCode);
content = content.replace(`disabled={uploading === "Fleet Licence Image"}`, `disabled={uploading === "Fleet Licence Image" || uploading === "Vehicle Documents"}`);

fs.writeFileSync(path, content);
console.log("Successfully added document inputs to Drawer");
