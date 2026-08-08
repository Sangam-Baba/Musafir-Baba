const fs = require('fs');
const path = require('path');

const filesToConvert = [
  'mbgo_authentication_suite.tsx',
  'rider_app_mbgo.tsx',
  'rider_app_extra_screens.tsx'
];

const designDir = path.join(__dirname, 'src', 'desgin');

filesToConvert.forEach(filename => {
  const filePath = path.join(designDir, filename);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Convert HTML tags to React Native tags
  content = content
    .replace(/<div/g, '<View')
    .replace(/<\/div/g, '</View')
    .replace(/<span/g, '<Text')
    .replace(/<\/span/g, '</Text')
    .replace(/<p/g, '<Text')
    .replace(/<\/p/g, '</Text')
    .replace(/<h1/g, '<Text')
    .replace(/<\/h1/g, '</Text')
    .replace(/<h2/g, '<Text')
    .replace(/<\/h2/g, '</Text')
    .replace(/<h3/g, '<Text')
    .replace(/<\/h3/g, '</Text')
    .replace(/<button/g, '<TouchableOpacity')
    .replace(/<\/button/g, '</TouchableOpacity')
    .replace(/<img/g, '<Image')
    .replace(/<input/g, '<TextInput');

  // Fix image source
  content = content.replace(/src="([^"]+)"/g, 'source={{ uri: "$1" }}');
  
  // Fix lucide-react imports
  content = content.replace(/'lucide-react'/g, "'lucide-react-native'");

  // Add React Native imports
  const importStatement = `import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, SafeAreaView } from 'react-native';\n`;
  content = importStatement + content;

  fs.writeFileSync(path.join(designDir, `converted_${filename}`), content);
  console.log(`Converted ${filename}`);
});
