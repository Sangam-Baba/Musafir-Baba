// Runs automatically before `npm run build:playstore` (npm "pre" script).
// Bumps the version NAME users see (app.json "version"): 1.2.0 -> 1.3.0.
// The Play Store version CODE (7 -> 8 -> 9) is raised by EAS itself
// (eas.json: appVersionSource "remote" + autoIncrement), so it isn't touched here.
//
// Usage: node scripts/bump-version.js [major|minor|patch]   (default: minor)
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "app.json");
const part = (process.argv[2] || "minor").toLowerCase();
const text = fs.readFileSync(file, "utf8");
const current = JSON.parse(text).expo.version;
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current || "");
if (!m) {
  console.error(`app.json "version" is "${current}" — expected something like 1.2.0. Not changing it.`);
  process.exit(1);
}
let [major, minor, patch] = m.slice(1).map(Number);
if (part === "major") [major, minor, patch] = [major + 1, 0, 0];
else if (part === "patch") patch += 1;
else [minor, patch] = [minor + 1, 0];
const next = `${major}.${minor}.${patch}`;

// Replace only the expo "version" value, keeping the file's formatting.
const updated = text.replace(`"version": "${current}"`, `"version": "${next}"`);
if (updated === text) {
  console.error('Could not find the "version" line in app.json. Not changing it.');
  process.exit(1);
}
fs.writeFileSync(file, updated);
console.log(`\n📦 App version: ${current} → ${next}  (Play version code is raised by EAS)\n`);
