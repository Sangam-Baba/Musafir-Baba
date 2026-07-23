const fs = require('fs');
const path = '/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                              <span className={\`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider \${vehicle.status === "Active" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}\`}>
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
              </div>`;

const replacement = `              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
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
                                <span className={\`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider \${vehicle.status === "Active" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}\`}>
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
                            <span className={\`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider \${vehicle.status === "Active" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}\`}>
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
              </div>`;

if (!content.includes('Mobile Cards View')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
}
