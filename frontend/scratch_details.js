const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

// Replace tab name
content = content.replace(
  />\s*Coordinates\s*<\/button>/g,
  `>
          Personal Details
        </button>`
);

// Replace headings
content = content.replace(
  /Personal Coordinates/g,
  `Personal Details`
);

content = content.replace(
  /PERSONAL COORDINATES/g,
  `PERSONAL DETAILS`
);

content = content.replace(
  /Bank Account Settlement Coordinates/g,
  `Bank Account Details`
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
