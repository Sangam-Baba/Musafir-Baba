const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We need to restore </Text> before </TouchableOpacity> when it's missing.
  // The pattern is <Text className="[^"]*">\s*[^<]*\s*<\/TouchableOpacity>
  // Actually, some might not have className. The pattern is <Text[^>]*>[^<]*<\/TouchableOpacity>
  
  content = content.replace(/(<Text[^>]*>[^<]*)<\/TouchableOpacity>/g, '$1</Text></TouchableOpacity>');

  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Restored </Text> in ${filePath}`);
  }
}

const dirs = [
  path.join(__dirname, 'src', 'screens', 'rider', 'auth'),
  path.join(__dirname, 'src', 'screens', 'rider', 'main'),
  path.join(__dirname, 'src', 'screens', 'rider', 'profile'),
  path.join(__dirname, 'src', 'screens', 'profile'),
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) return;
  const files = fs.readdirSync(d);
  for (const f of files) {
    const full = path.join(d, f);
    if (full.endsWith('.tsx')) {
      processFile(full);
    }
  }
});
