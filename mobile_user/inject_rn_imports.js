const fs = require('fs');
const path = require('path');

function injectImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      injectImports(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Check if View is imported from react-native
      if (!content.includes("from 'react-native'") && !content.includes('from "react-native"')) {
        // Inject right after the first import React
        content = content.replace(
          /(import React.*?;\n)/,
          `$1import { View, Text, TouchableOpacity, Image, TextInput, ScrollView, Platform } from 'react-native';\n`
        );
        fs.writeFileSync(fullPath, content);
        console.log(`Injected imports in ${file}`);
      }
    }
  }
}

injectImports(path.join(__dirname, 'src', 'screens', 'rider'));
