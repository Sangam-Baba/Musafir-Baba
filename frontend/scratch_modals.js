const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

const driverEditModal = `
      {/* DRIVER EDIT MODAL */}
      {selectedDriverForEdit && (
        <div className="fixed inset-0 bg-slate-900/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Driver Details</h3>
              <button onClick={() => setSelectedDriverForEdit(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target;
              try {
                const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/partner/driver/\${selectedDriverForEdit._id}\`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json", Authorization: \`Bearer \${getToken()}\` },
                  body: JSON.stringify({
                    name: form.name.value,
                    mobile: form.mobile.value,
                    licenceNumber: form.licenceNumber.value
                  }),
                });
                if (res.ok) {
                  setSelectedDriverForEdit(null);
                  fetchDashboardData();
                  setMessage("Driver updated successfully");
                } else {
                  const data = await res.json();
                  alert(data.message || "Failed to update driver");
                }
              } catch (error) {
                alert("Error updating driver");
              }
            }} className="p-4 overflow-y-auto">
              <fieldset disabled={!isEditable} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Driver Name</label>
                  <input name="name" defaultValue={selectedDriverForEdit.name} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Mobile</label>
                  <input name="mobile" defaultValue={selectedDriverForEdit.mobile} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Licence Number</label>
                  <input name="licenceNumber" defaultValue={selectedDriverForEdit.licenceNumber} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none uppercase" />
                </div>
                {selectedDriverForEdit.licenceImage && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Licence Image</label>
                    <a href={selectedDriverForEdit.licenceImage} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">View Image</a>
                  </div>
                )}
                {isEditable && (
                  <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg uppercase">
                    Save Changes
                  </button>
                )}
              </fieldset>
            </form>
          </div>
        </div>
      )}
`;

const vehicleEditModal = `
      {/* VEHICLE EDIT MODAL */}
      {selectedVehicleForEdit && (
        <div className="fixed inset-0 bg-slate-900/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Vehicle Details</h3>
              <button onClick={() => setSelectedVehicleForEdit(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target;
              try {
                const res = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/partner/vehicle/\${selectedVehicleForEdit._id}\`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json", Authorization: \`Bearer \${getToken()}\` },
                  body: JSON.stringify({
                    vehicleData: {
                      brand: form.brand.value,
                      model: form.model.value,
                      vehicleName: form.vehicleName.value,
                      registrationNumber: form.registrationNumber.value
                    }
                  }),
                });
                if (res.ok) {
                  setSelectedVehicleForEdit(null);
                  fetchDashboardData();
                  setMessage("Vehicle updated successfully");
                } else {
                  const data = await res.json();
                  alert(data.message || "Failed to update vehicle");
                }
              } catch (error) {
                alert("Error updating vehicle");
              }
            }} className="p-4 overflow-y-auto">
              <fieldset disabled={!isEditable} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Brand</label>
                    <input name="brand" defaultValue={selectedVehicleForEdit.brand} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Model</label>
                    <input name="model" defaultValue={selectedVehicleForEdit.model} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle Name / Variant</label>
                  <input name="vehicleName" defaultValue={selectedVehicleForEdit.vehicleName} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Registration Number</label>
                  <input name="registrationNumber" defaultValue={selectedVehicleForEdit.registrationNumber} required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none uppercase" />
                </div>
                {selectedVehicleForEdit.rcBookImage && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">RC Book</label>
                    <a href={selectedVehicleForEdit.rcBookImage} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">View Document</a>
                  </div>
                )}
                {isEditable && (
                  <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg uppercase">
                    Save Changes
                  </button>
                )}
              </fieldset>
            </form>
          </div>
        </div>
      )}
`;

content = content.replace('{/* VERIFICATION HISTORY DRAWER */}', driverEditModal + vehicleEditModal + '\n      {/* VERIFICATION HISTORY DRAWER */}');

content = content.replace(
  /View \/ Edit\n\s*<\/button>/g,
  `{isEditable ? "View / Edit" : "View"}\n                               </button>`
);

content = content.replace(
  /<span className="text-\[9px\] text-blue-500 ml-1 hidden group-hover:inline">\(Edit\)<\/span>/g,
  `<span className="text-[9px] text-blue-500 ml-1 hidden group-hover:inline">({isEditable ? "Edit" : "View"})</span>`
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
