import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controllersDir = path.join(__dirname, "src", "controllers");

const files = fs.readdirSync(controllersDir).filter(f => f.endsWith(".controller.js"));

for (const file of files) {
  const filePath = path.join(controllersDir, file);
  let lines = fs.readFileSync(filePath, "utf-8").split("\n");
  let newLines = [];
  let modified = false;

  let activeUpdate = null;
  let activeDelete = null;
  let activeCreate = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we are starting an Update
    // e.g. const pkg = await Package.findByIdAndUpdate(id, ...
    let updateMatch = line.match(/^(\s*)const\s+([a-zA-Z0-9_]+)\s*=\s*await\s+([a-zA-Z0-9_]+)\.findByIdAndUpdate\(([^,]+)/);
    if (updateMatch) {
      const indent = updateMatch[1];
      const varName = updateMatch[2];
      const modelName = updateMatch[3];
      const idVar = updateMatch[4];
      
      // Inject old value fetch before this line
      if (!lines.slice(Math.max(0, i-5), i).some(l => l.includes(`old_${varName}`))) {
        newLines.push(`${indent}const old_${varName} = await ${modelName}.findById(${idVar}).lean();`);
        activeUpdate = { varName, modelName, idVar, indent };
        modified = true;
      }
    }

    // Check if we are starting a Delete
    // e.g. const pkg = await Package.findByIdAndDelete(id...
    let deleteMatch = line.match(/^(\s*)const\s+([a-zA-Z0-9_]+)\s*=\s*await\s+([a-zA-Z0-9_]+)\.findByIdAndDelete\(([^)]+)/);
    if (deleteMatch) {
      activeDelete = { varName: deleteMatch[2], modelName: deleteMatch[3], idVar: deleteMatch[4], indent: deleteMatch[1] };
      modified = true;
    }

    // Check if we are starting a Create
    // e.g. await pkg.save();
    let saveMatch = line.match(/^(\s*)await\s+([a-zA-Z0-9_]+)\.save\(\);/);
    if (saveMatch && !saveMatch[2].includes(".")) {
      // make sure it's not some nested property
      activeCreate = { varName: saveMatch[2], indent: saveMatch[1] };
      modified = true;
    }
    
    // Also push the current line
    newLines.push(line);

    // If we have an active operation and we hit a success response, inject the logAction right before it.
    if ((activeUpdate || activeDelete || activeCreate) && line.match(/^\s*res\.status\((200|201)\)/)) {
      const indent = line.match(/^\s*/)[0];
      
      if (activeUpdate) {
        newLines.splice(newLines.length - 1, 0, `${indent}if (req.logAction && ${activeUpdate.varName}) {
${indent}  req.logAction({
${indent}    actionType: "UPDATE",
${indent}    moduleName: "${activeUpdate.modelName}",
${indent}    entityId: ${activeUpdate.varName}._id || ${activeUpdate.idVar},
${indent}    oldValue: old_${activeUpdate.varName},
${indent}    newValue: ${activeUpdate.varName}
${indent}  });
${indent}}`);
        activeUpdate = null;
      }
      
      if (activeDelete) {
        newLines.splice(newLines.length - 1, 0, `${indent}if (req.logAction && ${activeDelete.varName}) {
${indent}  req.logAction({
${indent}    actionType: "DELETE",
${indent}    moduleName: "${activeDelete.modelName}",
${indent}    entityId: ${activeDelete.varName}._id || ${activeDelete.idVar},
${indent}    oldValue: ${activeDelete.varName}
${indent}  });
${indent}}`);
        activeDelete = null;
      }
      
      if (activeCreate) {
        newLines.splice(newLines.length - 1, 0, `${indent}if (req.logAction && ${activeCreate.varName}) {
${indent}  req.logAction({
${indent}    actionType: "CREATE",
${indent}    moduleName: ${activeCreate.varName}.constructor?.modelName || "Unknown",
${indent}    entityId: ${activeCreate.varName}._id,
${indent}    newValue: ${activeCreate.varName}
${indent}  });
${indent}}`);
        activeCreate = null;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, newLines.join("\n"), "utf-8");
    console.log(`Processed ${file}`);
  }
}
