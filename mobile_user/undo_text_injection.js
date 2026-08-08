const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  let modified = false;

  // Fix onPress={() =><Text> something}
  if (content.includes('={() =><Text> ')) {
    content = content.replace(/=\{\(\) =><Text> /g, '={() => ');
    // We also need to remove the corresponding </Text> before </TouchableOpacity> or </View>
    // Since it's hard with regex, let's just do a blanket removal of </Text></TouchableOpacity>
    content = content.replace(/<\/Text><\/TouchableOpacity>/g, '</TouchableOpacity>');
    modified = true;
  }

  // Fix forgotStep ><Text>= 2
  if (content.includes('><Text>=')) {
    content = content.replace(/><Text>= /g, '>= ');
    content = content.replace(/\}><\/Text><\/View>/g, '}></View>');
    modified = true;
  }

  // Fix other cases where ><Text> was injected inside an attribute or expression
  // For example, if there is a </Text></View> that was wrongly added.
  // Actually, let's just use `npx tsc --noEmit` locally in the script and fix iteratively, 
  // or just replace the known broken patterns.

  // 1. `={() =><Text> setNotificationTab`
  content = content.replace(/=\{\(\) =><Text> setNotificationTab\(tab\)\}/g, '={() => setNotificationTab(tab)}');
  content = content.replace(/\{tab\}\s*<\/Text><\/TouchableOpacity>/g, '{tab}\n                  </TouchableOpacity>');

  // 2. forgotStep >= 2
  content = content.replace(/\$\{forgotStep ><Text>= 2 \? 'bg-\[#FF4500\]' : 'bg-slate-200'\}\`\}><\/Text><\/View>/g, 
    "${forgotStep >= 2 ? 'bg-[#FF4500]' : 'bg-slate-200'}`}></View>");
  content = content.replace(/\$\{forgotStep ><Text>= 3 \? 'bg-\[#FF4500\]' : 'bg-slate-200'\}\`\}><\/Text><\/View>/g, 
    "${forgotStep >= 3 ? 'bg-[#FF4500]' : 'bg-slate-200'}`}></View>");

  // 3. ScreenRiderAuth: `const [otpCode, setOtpCode] = useState(['4', '8', '9', '2']);`
  // Wait, did it break anywhere else? Let's fix the known ones first and see.

  if (modified || content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed corrupted Text nodes in ${filePath}`);
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
