const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

// 1. fleetDriverMobile
content = content.replace(
  /<input name="fleetDriverMobile" required placeholder="Mobile number" className="([^"]*)" \/>/g,
  `<input name="fleetDriverMobile" required placeholder="Mobile number" type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="$1" />`
);

// 2. fleetSeatingCapacity
content = content.replace(
  /<input name="fleetSeatingCapacity" type="number" min="1" required placeholder="Seating capacity" className="([^"]*)" \/>/g,
  `<input name="fleetSeatingCapacity" required placeholder="Seating capacity" type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="$1" />`
);

// 3. driverMobile
content = content.replace(
  /<input name="driverMobile" defaultValue=\{selectedFleetRowForEdit\.driver\.mobile\} required className="([^"]*)" \/>/g,
  `<input name="driverMobile" defaultValue={selectedFleetRowForEdit.driver.mobile} required type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="$1" />`
);

// We need to add seatingCapacity and category to the Fleet Row Details modal!
// Let's replace the Vehicle grid in Fleet Row Details to include them.
content = content.replace(
  /<div>\s*<label className="block text-\[9px\] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle Name \/ Variant<\/label>\s*<input name="vehicleName" defaultValue=\{selectedFleetRowForEdit\.vehicle\.vehicleName\} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" \/>\s*<\/div>\s*<div>\s*<label className="block text-\[9px\] font-bold text-slate-500 uppercase tracking-wide mb-1">Registration Number<\/label>\s*<input name="vehicleRegistrationNumber" defaultValue=\{selectedFleetRowForEdit\.vehicle\.registrationNumber\} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 w-full" \/>\s*<\/div>\s*<\/div>\s*<\/section>/,
  `<div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Vehicle Name / Variant</label>
                        <input name="vehicleName" defaultValue={selectedFleetRowForEdit.vehicle.vehicleName} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Category</label>
                        <select name="vehicleCategory" required defaultValue={selectedFleetRowForEdit.vehicle.category || "SUV"} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 w-full">
                          <option value="SUV">SUV</option>
                          <option value="Sedan">Sedan</option>
                          <option value="Hatchback">Hatchback</option>
                          <option value="Bus">Bus</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Seating Capacity</label>
                        <input name="vehicleSeatingCapacity" defaultValue={selectedFleetRowForEdit.vehicle.seatingCapacity} required placeholder="Capacity" type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 w-full" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Registration Number</label>
                        <input name="vehicleRegistrationNumber" defaultValue={selectedFleetRowForEdit.vehicle.registrationNumber} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 w-full" />
                      </div>
                    </div>
                  </section>`
);

// We also need to update the save handler to save category and seatingCapacity.
content = content.replace(
  /vehicleName: form\.vehicleName\.value,\s*registrationNumber: form\.vehicleRegistrationNumber\.value/,
  `vehicleName: form.vehicleName.value,
                        category: form.vehicleCategory.value,
                        seatingCapacity: Number(form.vehicleSeatingCapacity.value),
                        registrationNumber: form.vehicleRegistrationNumber.value`
);

// What about other "mobile" or "seatingCapacity" fields?
// Individual partner form has:
// <input name="seatingCapacity" type="number" placeholder="7" required ... />
content = content.replace(
  /<input name="seatingCapacity" type="number" placeholder="7" required className="([^"]*)" \/>/g,
  `<input name="seatingCapacity" required placeholder="7" type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="$1" />`
);

// Individual partner driver form:
// <input name="mobile" placeholder="Mobile Number" required ... />
content = content.replace(
  /<input name="mobile" placeholder="Mobile Number" required className="([^"]*)" \/>/g,
  `<input name="mobile" placeholder="Mobile Number" required type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="$1" />`
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
