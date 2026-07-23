const fs = require('fs');

// 1. Backend Model
const modelPath = '/Users/jauhari01/Desktop/personal/Musafir-Baba/backend/src/models/partner/PartnerVehicle.js';
let modelContent = fs.readFileSync(modelPath, 'utf8');
if (!modelContent.includes('frontImageUrl')) {
  modelContent = modelContent.replace(
    /permitFileUrl: \{ type: String \},/,
    `permitFileUrl: { type: String },
    frontImageUrl: { type: String },
    rearImageUrl: { type: String },
    leftSideImageUrl: { type: String },
    rightSideImageUrl: { type: String },
    interiorImageUrl: { type: String },
    otherImageUrl: { type: String },`
  );
  fs.writeFileSync(modelPath, modelContent);
}

// 2. Frontend Partner UI
const frontendPath = '/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx';
let frontendContent = fs.readFileSync(frontendPath, 'utf8');

const imageFieldsUI = `
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
                  </section>`;

if (!frontendContent.includes('Vehicle Images')) {
  frontendContent = frontendContent.replace(
    /<\/div>\n\s*<\/section>\n\s*\)}/,
    `</div>\n${imageFieldsUI}\n                  </section>\n                )}`
  );
  fs.writeFileSync(frontendPath, frontendContent);
}

// 3. Admin UI
const adminPath = '/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/admin/fleet-verification/FleetVerificationClient.tsx';
let adminContent = fs.readFileSync(adminPath, 'utf8');

if (!adminContent.includes('frontImageUrl')) {
  adminContent = adminContent.replace(
    /permitFileUrl\?: string;\n  }>;/,
    `permitFileUrl?: string;\n    frontImageUrl?: string;\n    rearImageUrl?: string;\n    leftSideImageUrl?: string;\n    rightSideImageUrl?: string;\n    interiorImageUrl?: string;\n    otherImageUrl?: string;\n  }>;`
  );
  
  adminContent = adminContent.replace(
    /\{\(v\.rcImageUrl \|\| v\.pucImageUrl \|\| v\.insuranceFileUrl \|\| v\.permitFileUrl\) && \(\n\s*<div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-3">/,
    `{(v.rcImageUrl || v.pucImageUrl || v.insuranceFileUrl || v.permitFileUrl || v.frontImageUrl || v.rearImageUrl || v.leftSideImageUrl || v.rightSideImageUrl || v.interiorImageUrl || v.otherImageUrl) && (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-3">`
  );

  adminContent = adminContent.replace(
    /\{v\.permitFileUrl && <a href=\{v\.permitFileUrl\} target="_blank" className="text-\[9px\] font-bold text-blue-600 hover:underline flex items-center gap-1"><FileText size=\{10\} \/> Permit<\/a>\}/,
    `{v.permitFileUrl && <a href={v.permitFileUrl} target="_blank" className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"><FileText size={10} /> Permit</a>}
                                {v.frontImageUrl && <a href={v.frontImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> Front</a>}
                                {v.rearImageUrl && <a href={v.rearImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> Rear</a>}
                                {v.leftSideImageUrl && <a href={v.leftSideImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> L-Side</a>}
                                {v.rightSideImageUrl && <a href={v.rightSideImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> R-Side</a>}
                                {v.interiorImageUrl && <a href={v.interiorImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> Interior</a>}
                                {v.otherImageUrl && <a href={v.otherImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> Other</a>}`
  );

  fs.writeFileSync(adminPath, adminContent);
}

