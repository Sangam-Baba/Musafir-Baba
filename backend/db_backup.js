import { execSync } from "child_process";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBackup() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI is missing in .env file");
    process.exit(1);
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  const backupDir = path.join(__dirname, "backup", timestamp);

  console.log(`\n📦 Starting Database Backup [${timestamp}]...`);

  // --- Step 1: Try mongodump ---
  try {
    execSync("mongodump --version", { stdio: "ignore" });
    console.log("✅ mongodump detected. Using BSON dump...");
    
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    execSync(`mongodump --uri="${mongoUri}" --out="${backupDir}"`, { stdio: "inherit" });
    
    console.log(`\n🎉 BSON Backup completed successfully!`);
    console.log(`📍 Location: ${backupDir}\n`);
    return;
  } catch (e) {
    console.log("⚠️  'mongodump' not found. Falling back to JSON export...");
  }

  // --- Step 2: Fallback to JSON Export ---
  try {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const jsonDir = path.join(backupDir, "json_export");
    if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });

    console.log(`📂 Found ${collections.length} collections. Exporting to JSON...`);

    for (const colDef of collections) {
      const colName = colDef.name;
      process.stdout.write(`  ⏳ [${colName}]... `);
      const data = await db.collection(colName).find({}).toArray();
      fs.writeFileSync(path.join(jsonDir, `${colName}.json`), JSON.stringify(data, null, 2));
      console.log(`Done (${data.length})`);
    }

    console.log(`\n🎉 JSON Fallback completed!`);
    console.log(`📍 Location: ${jsonDir}`);
    console.log(`💡 Tip: Install 'MongoDB Database Tools' to get full BSON dumps (including indexes).\n`);

  } catch (error) {
    console.error("\n❌ Backup failed:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runBackup();
