const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

content = content.replace(
  /<input name="mobileNumber" defaultValue=\{profile\?\.mobileNumber \|\| ""\} required className="([^"]*)" \/>/g,
  `<input name="mobileNumber" defaultValue={profile?.mobileNumber || ""} required type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} className="$1" />`
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
