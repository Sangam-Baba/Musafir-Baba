const fs = require('fs');
const path = '/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Find the start of vehicles tab
const vehiclesStart = content.indexOf('{activeTab === "vehicles" && (');
if (vehiclesStart === -1) {
    console.log("Could not find vehicles tab start");
    process.exit(1);
}

// 2. Find the condition
const conditionStr = 'isIndividualPartner ? (';
const conditionStart = content.indexOf(conditionStr, vehiclesStart);

// 3. Find the ' : (' that separates the two layouts
// We know it's around line 1170
const elseBlockStartStr = `) : (\n            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">`;
const elseBlockStart = content.indexOf(elseBlockStartStr, conditionStart);

if (conditionStart === -1 || elseBlockStart === -1) {
    console.log("Could not find condition or else block", conditionStart, elseBlockStart);
    process.exit(1);
}

// Delete everything from `isIndividualPartner ? (` to `) : (`
const beforeCondition = content.slice(0, conditionStart);
const afterElseBlock = content.slice(elseBlockStart + 5); // +5 to remove `) : (`
let modifiedContent = beforeCondition + afterElseBlock;

// 4. Also remove the closing `)` at the end of the vehicles tab
// It looks like:
//             </div>
//           )
//         )}
//       </div>
const closingStr = `            </div>\n          )\n        )}`;
const newClosingStr = `            </div>\n        )}`;
modifiedContent = modifiedContent.replace(closingStr, newClosingStr);

// 5. Add the "self driver" checkbox to the side drawer
const drawerDriverHeader = `<h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700"><User size={14} /> Driver</h4>`;
const selfDriverCheckbox = `
                        {selectedPartnerType === "Individual" && (
                          <div className="mt-2 flex items-center gap-2 bg-emerald-100/50 p-2 rounded-lg">
                            <input type="checkbox" id="selfDriverFleet" className="w-3 h-3 text-emerald-600 rounded" onChange={(e) => {
                              const form = e.target.form;
                              if (form && e.target.checked) {
                                (form.elements.namedItem("fleetDriverName")).value = profile?.fullName || "";
                                (form.elements.namedItem("fleetDriverMobile")).value = profile?.mobileNumber || "";
                              } else if (form) {
                                (form.elements.namedItem("fleetDriverName")).value = "";
                                (form.elements.namedItem("fleetDriverMobile")).value = "";
                              }
                            }} />
                            <label htmlFor="selfDriverFleet" className="text-[10px] font-bold text-emerald-800 uppercase cursor-pointer">I am driving the vehicle (Self)</label>
                          </div>
                        )}`;
modifiedContent = modifiedContent.replace(drawerDriverHeader, drawerDriverHeader + selfDriverCheckbox);

fs.writeFileSync(path, modifiedContent);
console.log("Successfully removed individual-specific inline fleet forms.");
