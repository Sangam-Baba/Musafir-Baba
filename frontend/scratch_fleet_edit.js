const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

// Replace state
content = content.replace(
  /const \[selectedDriverForEdit, setSelectedDriverForEdit\] = useState<any>\(null\);\n\s*const \[selectedVehicleForEdit, setSelectedVehicleForEdit\] = useState<any>\(null\);/,
  `const [selectedFleetRowForEdit, setSelectedFleetRowForEdit] = useState<{driver: any, vehicle: any} | null>(null);`
);

// Replace onClick in table row
content = content.replace(
  /onClick=\{\(\) => setSelectedVehicleForEdit\(vehicle\)\}/g,
  `onClick={() => setSelectedFleetRowForEdit({ driver, vehicle })}`
);

content = content.replace(
  /onClick=\{\(e\) => \{ e\.stopPropagation\(\); if\(driver\) setSelectedDriverForEdit\(driver\); \}\}/g,
  `onClick={(e) => { e.stopPropagation(); setSelectedFleetRowForEdit({ driver, vehicle }); }}`
);

// We need to replace the two existing modals with the new unified one.
// Let's match from {/* DRIVER EDIT MODAL */} to the end of VEHICLE EDIT MODAL
// Since the file has them one after another, we can do this with regex or string replacement.

const fleetRowEditModal = `
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
              const form = e.target;
              try {
                let success = true;
                
                // Update Driver if driver exists
                if (selectedFleetRowForEdit.driver) {
                  const driverRes = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/partner/driver/\${selectedFleetRowForEdit.driver._id}\`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: \`Bearer \${getToken()}\` },
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
                  const vehicleRes = await fetch(\`\${process.env.NEXT_PUBLIC_BASE_URL}/partner/vehicle/\${selectedFleetRowForEdit.vehicle._id}\`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: \`Bearer \${getToken()}\` },
                    body: JSON.stringify({
                      vehicleData: {
                        brand: form.vehicleBrand.value,
                        model: form.vehicleModel.value,
                        vehicleName: form.vehicleName.value,
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
                        <input name="driverMobile" defaultValue={selectedFleetRowForEdit.driver.mobile} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 w-full" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Licence Number</label>
                        <input name="driverLicenceNumber" defaultValue={selectedFleetRowForEdit.driver.licenceNumber} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-emerald-500 w-full" />
                      </div>
                      {selectedFleetRowForEdit.driver.licenceImage && (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Licence Document</label>
                          <div className="h-full flex items-center">
                            <a href={selectedFleetRowForEdit.driver.licenceImage} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:text-emerald-800 underline uppercase tracking-wider">View Uploaded Scan</a>
                          </div>
                        </div>
                      )}
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
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Registration Number</label>
                        <input name="vehicleRegistrationNumber" defaultValue={selectedFleetRowForEdit.vehicle.registrationNumber} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 w-full" />
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
`;

// Now we extract everything from {/* DRIVER EDIT MODAL */} to just before {/* VERIFICATION HISTORY DRAWER */}
const startIndex = content.indexOf('{/* DRIVER EDIT MODAL */}');
const endIndex = content.indexOf('{/* VERIFICATION HISTORY DRAWER */}');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + fleetRowEditModal + '\n      ' + content.substring(endIndex);
}

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
