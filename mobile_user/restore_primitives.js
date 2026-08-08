const fs = require('fs');
const path = require('path');

function processFile(fullPath) {
  let content = fs.readFileSync(fullPath, 'utf8');

  // Skip files that are not screens
  if (!fullPath.includes('Screen')) return;

  // Reverse Tags
  content = content.replace(/<View/g, '<div');
  content = content.replace(/<\/View>/g, '</div>');
  
  content = content.replace(/<Text/g, '<span');
  content = content.replace(/<\/Text>/g, '</span>');
  
  // We replaced <p> and <label> with <Text>. Now they will all become <span>. That is fine for styling if className was preserved.
  // Actually, some labels had semantic value but structurally span works the same.

  // Buttons
  content = content.replace(/<TouchableOpacity activeOpacity=\{0\.7\}/g, '<button');
  content = content.replace(/<\/TouchableOpacity>/g, '</button>');
  
  // Inputs
  content = content.replace(/<TextInput/g, '<input');
  
  // Images
  content = content.replace(/<Image resizeMode="cover"/g, '<img');
  
  // Attributes
  content = content.replace(/\bonPress={/g, 'onClick={');
  
  // source={{ uri: "..." }} -> src="..."
  content = content.replace(/source=\{\{\s*uri:\s*(["'])(.*?)\1\s*\}\}/g, 'src="$2"');

  // onChangeText={(...)} -> onChange={(e) => $1(e.target.value)}
  content = content.replace(/onChangeText=\{([a-zA-Z0-9_]+)\}/g, 'onChange={(e) => $1(e.target.value)}');

  // new lines in JSX text back to <br/>
  content = content.replace(/\{\s*"\\n"\s*\}/g, '<br/>');

  // We should also remove the injected React Native imports so we don't get unused variable warnings
  content = content.replace(/import \{ View, Text, TouchableOpacity, Image, TextInput, ScrollView, Platform \} from 'react-native';\n/, '');

  fs.writeFileSync(fullPath, content);
  console.log(`Restored DOM primitives in ${path.basename(fullPath)}`);
}

function restoreDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      restoreDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

restoreDir(path.join(__dirname, 'src', 'screens', 'rider'));
