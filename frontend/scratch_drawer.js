const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

// Update Driver Modal
content = content.replace(
  /<div className="fixed inset-0 bg-slate-900\/50 z-\[70\] flex items-center justify-center p-4">\s*<div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-\[90vh\]">\s*<div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">\s*<h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Driver Details<\/h3>\s*<button onClick=\{\(\) => setSelectedDriverForEdit\(null\)\} className="text-slate-400 hover:text-slate-600"><X size=\{16\} \/><\/button>\s*<\/div>/g,
  `<div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/30 transition-opacity duration-300">
          <button type="button" aria-label="Close drawer" onClick={() => setSelectedDriverForEdit(null)} className="absolute inset-0 cursor-default" />
          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl sm:p-7 border-l border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col">
            <div className="mb-6 flex items-start justify-between gap-4 shrink-0 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Driver Details</h3>
                <p className="mt-1 text-xs text-slate-500">View or edit driver credentials.</p>
              </div>
              <button type="button" onClick={() => setSelectedDriverForEdit(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"><X size={18} /></button>
            </div>`
);

// Close tags for Driver Modal
content = content.replace(
  /<\/form>\s*<\/div>\s*<\/div>\s*\)\}/,
  `</form>
          </aside>
        </div>
      )}`
);

// Update Vehicle Modal
content = content.replace(
  /<div className="fixed inset-0 bg-slate-900\/50 z-\[70\] flex items-center justify-center p-4">\s*<div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-\[90vh\]">\s*<div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">\s*<h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Vehicle Details<\/h3>\s*<button onClick=\{\(\) => setSelectedVehicleForEdit\(null\)\} className="text-slate-400 hover:text-slate-600"><X size=\{16\} \/><\/button>\s*<\/div>/g,
  `<div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/30 transition-opacity duration-300">
          <button type="button" aria-label="Close drawer" onClick={() => setSelectedVehicleForEdit(null)} className="absolute inset-0 cursor-default" />
          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl sm:p-7 border-l border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col">
            <div className="mb-6 flex items-start justify-between gap-4 shrink-0 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Vehicle Details</h3>
                <p className="mt-1 text-xs text-slate-500">View or edit vehicle information.</p>
              </div>
              <button type="button" onClick={() => setSelectedVehicleForEdit(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"><X size={18} /></button>
            </div>`
);

// Close tags for Vehicle Modal (only the one after vehicle modal, not the driver one we just replaced)
// Wait, the regex might replace both if not careful. Let's use a more specific replace for the closing tags.
// Since the structure was exactly `</form> </div> </div> )}` for both, the first one replaces the driver one, but wait, the first replace might only replace the first occurrence if we don't use `/g`.
// Let's just use string replace on the exact text.
