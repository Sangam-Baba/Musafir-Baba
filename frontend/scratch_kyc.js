const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

// Replace Aadhaar (Front) block
content = content.replace(
  /<div className="border border-slate-200 p-4 rounded bg-slate-50\/50 flex flex-col justify-between">\s*<h4 className="text-\[11px\] font-bold text-slate-900 uppercase tracking-wider mb-2">Aadhaar \(Front\)<\/h4>\s*<input[^>]*"Aadhaar Front"[^>]*\/>\s*\{uploading === "Aadhaar Front" && <p[^>]*>Uploading\.\.\.<\/p>\}\s*<\/div>/s,
  `<div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                    Aadhaar (Front)
                    {dashboardData?.documents?.find((d: any) => d.documentType === "Aadhaar Front")?.fileUrl && (
                      <a href={dashboardData.documents.find((d: any) => d.documentType === "Aadhaar Front").fileUrl} target="_blank" rel="noreferrer" className="text-[9px] text-blue-600 hover:underline">VIEW</a>
                    )}
                  </h4>
                  {isEditable ? (
                    <>
                      <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        onChange={(e) => handleFileUpload(e, "Aadhaar Front", "PartnerProfile", profile._id)}
                        disabled={uploading === "Aadhaar Front"}
                        className="text-[10px] w-full file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800" 
                      />
                      {uploading === "Aadhaar Front" && <p className="text-[10px] text-[#FE5300] mt-2 font-bold uppercase tracking-wider">Uploading...</p>}
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-medium">Locked (Not Editable)</p>
                  )}
                </div>`
);

// Replace Aadhaar (Back) block
content = content.replace(
  /<div className="border border-slate-200 p-4 rounded bg-slate-50\/50 flex flex-col justify-between">\s*<h4 className="text-\[11px\] font-bold text-slate-900 uppercase tracking-wider mb-2">Aadhaar \(Back\)<\/h4>\s*<input[^>]*"Aadhaar Back"[^>]*\/>\s*\{uploading === "Aadhaar Back" && <p[^>]*>Uploading\.\.\.<\/p>\}\s*<\/div>/s,
  `<div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                    Aadhaar (Back)
                    {dashboardData?.documents?.find((d: any) => d.documentType === "Aadhaar Back")?.fileUrl && (
                      <a href={dashboardData.documents.find((d: any) => d.documentType === "Aadhaar Back").fileUrl} target="_blank" rel="noreferrer" className="text-[9px] text-blue-600 hover:underline">VIEW</a>
                    )}
                  </h4>
                  {isEditable ? (
                    <>
                      <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        onChange={(e) => handleFileUpload(e, "Aadhaar Back", "PartnerProfile", profile._id)}
                        disabled={uploading === "Aadhaar Back"}
                        className="text-[10px] w-full file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800" 
                      />
                      {uploading === "Aadhaar Back" && <p className="text-[10px] text-[#FE5300] mt-2 font-bold uppercase tracking-wider">Uploading...</p>}
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-medium">Locked (Not Editable)</p>
                  )}
                </div>`
);

// Replace PAN Card block
content = content.replace(
  /<div className="border border-slate-200 p-4 rounded bg-slate-50\/50 flex flex-col justify-between">\s*<h4 className="text-\[11px\] font-bold text-slate-900 uppercase tracking-wider mb-2">PAN Card<\/h4>\s*<input[^>]*"PAN"[^>]*\/>\s*\{uploading === "PAN" && <p[^>]*>Uploading\.\.\.<\/p>\}\s*<\/div>/s,
  `<div className="border border-slate-200 p-4 rounded bg-slate-50/50 flex flex-col justify-between">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                    PAN Card
                    {dashboardData?.documents?.find((d: any) => d.documentType === "PAN")?.fileUrl && (
                      <a href={dashboardData.documents.find((d: any) => d.documentType === "PAN").fileUrl} target="_blank" rel="noreferrer" className="text-[9px] text-blue-600 hover:underline">VIEW</a>
                    )}
                  </h4>
                  {isEditable ? (
                    <>
                      <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        onChange={(e) => handleFileUpload(e, "PAN", "PartnerProfile", profile._id)}
                        disabled={uploading === "PAN"}
                        className="text-[10px] w-full file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800" 
                      />
                      {uploading === "PAN" && <p className="text-[10px] text-[#FE5300] mt-2 font-bold uppercase tracking-wider">Uploading...</p>}
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-500 font-medium">Locked (Not Editable)</p>
                  )}
                </div>`
);

// Add 'View' button in the registry list
content = content.replace(
  /<span className="text-\[10px\] font-medium text-slate-600">\{doc\.documentType\} Scan<\/span>\s*<span className=\{`text-\[9px\] font-bold px-2 py-0\.5 rounded-full uppercase tracking-wider border/s,
  `<span className="text-[10px] font-medium text-slate-600">{doc.documentType} Scan</span>
                        <div className="flex items-center gap-3">
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-wider">
                              View
                            </a>
                          )}
                          <span className={\`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border`
);

// We need to close the div added above in the registry list mapping
content = content.replace(
  /\{doc\.status\}\s*<\/span>\s*<\/div>/g,
  `{doc.status}
                          </span>
                        </div>
                      </div>`
);


fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
