const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'backend/src/models');
const filesToUpdate = [
  'CustomizedTourPackage.js',
  'About-us.js',
  'VehicleType.js',
  'VehiclePickUpDestination.js',
  'News.js',
  'Category.js',
  'Visa.js',
  'Destination.js',
  'WebPage.js',
  'Destination-Seo.js',
  'Package.js',
  'Vehicle.js'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(modelsDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if seoSchema is already imported
    if (!content.includes('import { seoSchema }')) {
      // Add import after the last import statement
      const importRegex = /^import.*$/gm;
      let match;
      let lastImportIndex = 0;
      while ((match = importRegex.exec(content)) !== null) {
        lastImportIndex = match.index + match[0].length;
      }
      
      const insertImportStr = '\nimport { seoSchema } from "./seoSchema.js";';
      content = content.slice(0, lastImportIndex) + insertImportStr + content.slice(lastImportIndex);
      
      // Inject seo: seoSchema before the timestamps option
      // Find where schema options start. Usually the end of the schema definition looks like:
      //   },
      //   { timestamps: true }
      // );
      
      // We can look for `{ timestamps: true }` and insert before the closing brace of the schema fields
      const timestampsIndex = content.lastIndexOf('{ timestamps: true }');
      if (timestampsIndex !== -1) {
        // Find the closing brace of the schema fields before timestampsIndex
        const fieldsClosingBraceIndex = content.lastIndexOf('}', timestampsIndex - 1);
        if (fieldsClosingBraceIndex !== -1) {
            // Need to insert `seo: seoSchema,` inside the fields object.
            // Since it's a mongoose schema, it might end like:
            //   },
            //   { timestamps: true }
            // Let's replace `  },\n  { timestamps: true }` with `    seo: seoSchema,\n  },\n  { timestamps: true }`
            // Instead of regex, let's do this safely:
            
            content = content.replace(/(  \},[\s\n]*\{[\s\n]*timestamps:\s*true[\s\n]*\})/g, '    seo: seoSchema,\n$1');
            fs.writeFileSync(filePath, content);
            console.log(`Updated ${file}`);
        }
      } else {
        console.log(`Could not find { timestamps: true } in ${file}`);
      }
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
