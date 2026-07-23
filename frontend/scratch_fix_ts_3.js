const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

// For the Individual Partner cards, we also need to change it to use selectedFleetRowForEdit.
// In Individual Partner cards, it sets setSelectedDriverForEdit(d) or setSelectedVehicleForEdit(v).
// But for individual, maybe they don't have a linked fleet row? They do: dashboardData.drivers and dashboardData.vehicles.
// The easiest fix is to just replace the calls.

content = content.replace(
  /setSelectedDriverForEdit\((.*?)\)/g,
  'setSelectedFleetRowForEdit({ driver: $1, vehicle: null })'
);

content = content.replace(
  /setSelectedVehicleForEdit\((.*?)\)/g,
  'setSelectedFleetRowForEdit({ driver: null, vehicle: $1 })'
);

// We need to make sure the form properties have the right TS types, but wait, 'form as any' is easier.
content = content.replace(/const form = e\.target as HTMLFormElement;/g, 'const form = e.target as any;');

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
