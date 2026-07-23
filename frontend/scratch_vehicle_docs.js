const fs = require('fs');

// 1. Update Backend Model
const modelPath = '/Users/jauhari01/Desktop/personal/Musafir-Baba/backend/src/models/partner/PartnerVehicle.js';
let modelContent = fs.readFileSync(modelPath, 'utf8');
if (!modelContent.includes('rcImageUrl')) {
  modelContent = modelContent.replace(
    /features: \[/,
    `rcImageUrl: { type: String },
    pucImageUrl: { type: String },
    insuranceFileUrl: { type: String },
    permitFileUrl: { type: String },
    features: [`
  );
  fs.writeFileSync(modelPath, modelContent);
}

// 2. Update Frontend UI
const frontendPath = '/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx';
let frontendContent = fs.readFileSync(frontendPath, 'utf8');

// A. Replace "Plate ID *" and "Registration Number" with "Vehicle No."
frontendContent = frontendContent.replace(/Plate ID \*/g, 'Vehicle No. *');
frontendContent = frontendContent.replace(/REGISTRATION NUMBER/g, 'VEHICLE NO.');
frontendContent = frontendContent.replace(/Registration Number/g, 'Vehicle No.');

// B. Add handleVehicleFileUpload function
if (!frontendContent.includes('handleVehicleFileUpload')) {
  const uploadFn = `
  const handleVehicleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, vehicleId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(fieldName);
      const presignRes = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url\`, {
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
      const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/partner/vehicle/\${vehicleId}\`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: \`Bearer \${currentToken}\`,
        },
        body: JSON.stringify({ vehicleData: { [fieldName]: fileUrl } }),
      });

      if (res.ok) {
        setMessage(\`✅ Document uploaded successfully!\`);
        const updatedVehicle = await res.json();
        if (selectedFleetRowForEdit) {
           setSelectedFleetRowForEdit(prev => ({ ...prev, vehicle: updatedVehicle.data }));
        }
        fetchDashboardData();
      } else {
        setMessage(\`Failed to save document.\`);
      }
    } catch (error) {
      setMessage(\`Error uploading document.\`);
    } finally {
      setUploading(null);
    }
  };

  const handleFileUpload =`;

  frontendContent = frontendContent.replace(/const handleFileUpload =/, uploadFn);
}

// C. Add File UI to Edit Modal
const fileFieldsUI = `
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle No. *</label>
                        <input name="vehicleRegistrationNumber" defaultValue={selectedFleetRowForEdit.vehicle.registrationNumber} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-emerald-500 w-full" />
                      </div>
                    </div>

                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-6 mb-3 border-b border-emerald-100 pb-2">Vehicle Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* RC Image */}
                      <div className="border border-emerald-100 p-3 rounded bg-white flex flex-col justify-between">
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
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-emerald-900 file:text-white hover:file:bg-emerald-800" 
                        />
                        {uploading === "rcImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>

                      {/* PUC Image */}
                      <div className="border border-emerald-100 p-3 rounded bg-white flex flex-col justify-between">
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
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-emerald-900 file:text-white hover:file:bg-emerald-800" 
                        />
                        {uploading === "pucImageUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>

                      {/* Insurance File */}
                      <div className="border border-emerald-100 p-3 rounded bg-white flex flex-col justify-between">
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
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-emerald-900 file:text-white hover:file:bg-emerald-800" 
                        />
                        {uploading === "insuranceFileUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>

                      {/* Permit File */}
                      <div className="border border-emerald-100 p-3 rounded bg-white flex flex-col justify-between">
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
                          className="text-[10px] w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-emerald-900 file:text-white hover:file:bg-emerald-800" 
                        />
                        {uploading === "permitFileUrl" && <p className="text-[9px] text-[#FE5300] mt-1 font-bold uppercase tracking-wider">Uploading...</p>}
                      </div>
`;

// Only replace once
if (!frontendContent.includes('Vehicle Documents')) {
  frontendContent = frontendContent.replace(
    /<div>\s*<label className="block text-\[9px\] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle No\. \*\*<\/label>\s*<input name="vehicleRegistrationNumber" defaultValue=\{selectedFleetRowForEdit\.vehicle\.registrationNumber\} required className="[^"]+" \/>\s*<\/div>\s*<\/div>/,
    fileFieldsUI
  );
}

fs.writeFileSync(frontendPath, frontendContent);
