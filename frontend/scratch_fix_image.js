const fs = require('fs');
let content = fs.readFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', 'utf8');

content = content.replace(
  /\{selectedFleetRowForEdit\.driver\.licenceImage && \(/g,
  '{selectedFleetRowForEdit.driver.licenceImageUrl && ('
);

content = content.replace(
  /href=\{selectedFleetRowForEdit\.driver\.licenceImage\}/g,
  'href={selectedFleetRowForEdit.driver.licenceImageUrl}'
);

fs.writeFileSync('/Users/jauhari01/Desktop/personal/Musafir-Baba/frontend/src/components/partner/ProfileCompletionTabs.tsx', content);
