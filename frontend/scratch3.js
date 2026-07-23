const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

content = content.replace(
  /<td className="px-4 py-3">\s*<div className="font-medium text-slate-700">\{driver\?\.name \|\| "Unassigned"\}<\/div>/,
  `<td className="px-4 py-3 group-hover:bg-slate-100/50 cursor-pointer" onClick={(e) => { e.stopPropagation(); if(driver) setSelectedDriverForEdit(driver); }}>
                              <div className="font-medium text-slate-700 hover:text-blue-600 transition-colors">{driver?.name || "Unassigned"} <span className="text-[9px] text-blue-500 ml-1 hidden group-hover:inline">(Edit)</span></div>`
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
