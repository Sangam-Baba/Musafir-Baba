import fs from 'fs';
const file = 'src/routes/reviews.routes.js';
let content = fs.readFileSync(file, 'utf8');

// Replace ["user", "admin", "superadmin"] with ["user", "admin", "superadmin", "staff"]
content = content.replace(/\["user", "admin", "superadmin"\]/g, '["user", "admin", "superadmin", "staff"]');

// Replace ["admin", "superadmin"] with ["admin", "superadmin", "staff"]
content = content.replace(/\["admin", "superadmin"\]/g, '["admin", "superadmin", "staff"]');

fs.writeFileSync(file, content);
console.log("Fixed reviews.routes.js permissions!");
