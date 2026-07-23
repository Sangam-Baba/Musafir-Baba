const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

// Add branchName to handleBankSubmit
content = content.replace(
  /bankName: formData\.get\("bankName"\),/g,
  `bankName: formData.get("bankName"),
      branchName: formData.get("branchName"),`
);

// Add Branch Name input field after Bank Name field
content = content.replace(
  /<input name="bankName" defaultValue=\{bank\?\.bankName \|\| ""\} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-emerald-50\/40 focus:bg-white focus:ring-2 focus:ring-emerald-500\/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-850" \/>\s*<\/div>\s*<\/div>/,
  `<input name="bankName" defaultValue={bank?.bankName || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-emerald-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-850" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Branch Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600/70">
                    <Building size={14} />
                  </div>
                  <input name="branchName" defaultValue={bank?.branchName || ""} required className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-emerald-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-850" />
                </div>
              </div>`
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
