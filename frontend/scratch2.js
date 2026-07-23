const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

// Replace table row with clickable row or add an Edit button
content = content.replace(
  /<tr key=\{vehicle\._id\} className="hover:bg-slate-50\/70">/g,
  `<tr key={vehicle._id} className="hover:bg-slate-50/70 cursor-pointer group" onClick={() => setSelectedVehicleForEdit(vehicle)}>`
);

// Add an Edit button cell in the table header and body
content = content.replace(
  /<th className="px-4 py-3 text-right">Status<\/th>/g,
  `<th className="px-4 py-3 text-right">Status</th>\n                      <th className="px-4 py-3 text-right">Action</th>`
);

content = content.replace(
  /<td className="px-4 py-3 text-right">\s*<span className={`inline-flex rounded-full border px-2 py-0\.5 text-\[9px\] font-bold uppercase tracking-wider \$\{vehicle\.status === "Active" \? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"\}`}>/g,
  `<td className="px-4 py-3 text-right">
                              <span className={\`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider \${vehicle.status === "Active" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}\`}>`
);

content = content.replace(
  /<\/span>\s*<\/td>\s*<\/tr>/g,
  `</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setSelectedVehicleForEdit(vehicle);
                                 }}
                                 className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800"
                               >
                                 View / Edit
                               </button>
                            </td>
                          </tr>`
);

// We need to make sure the table colspan for "No fleet rows yet" is updated to 6
content = content.replace(
  /<td colSpan=\{5\} className="px-4 py-10 text-center text-slate-400">/g,
  `<td colSpan={6} className="px-4 py-10 text-center text-slate-400">`
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
