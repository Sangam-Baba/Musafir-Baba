const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

// Replace close tags
content = content.replace(
  /<\/form>\n\s*<\/div>\n\s*<\/div>\n\s*\)\}/g,
  `</form>\n          </aside>\n        </div>\n      )}`
);

// We also need to style the forms and inputs inside the modal to match the "Add Fleet Row" look.
// But the user just said "same side drawer". The wrapper replacement I did earlier should have worked.
// Let's verify if the first part of the replace worked correctly by checking the file.
fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
