const fs = require('fs');
const frontendPath = '/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx';
let content = fs.readFileSync(frontendPath, 'utf8');

const target = `                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle No.</label>
                        <input name="vehicleRegistrationNumber" defaultValue={selectedFleetRowForEdit.vehicle.registrationNumber} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 w-full" />
                      </div>
                    </div>`;

const replacement = target + `
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
                    </div>`;

if (!content.includes('Vehicle Documents')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(frontendPath, content);
}
