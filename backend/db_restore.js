import { execSync } from "child_process";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to restore a database backup using 'mongorestore'
 * Usage: npm run restore -- <timestamp_folder_name>
 */
function runRestore() {
  try {
    const backupFolderName = process.argv[2];
    
    if (!backupFolderName) {
      console.log("\n❌ Error: Please provide the backup folder name.");
      console.log("Usage: npm run restore -- YYYY-MM-DD_HH-mm-ss\n");
      process.exit(1);
    }

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env file");
    }

    // Check if mongorestore is available
    try {
      execSync("mongorestore --version", { stdio: "ignore" });
    } catch (e) {
      console.error("\n❌ Error: 'mongorestore' command not found.");
      console.log("Please install 'MongoDB Database Tools' to use this script.");
      process.exit(1);
    }

    const backupPath = path.join(__dirname, "backup", backupFolderName);
    
    if (!fs.existsSync(backupPath)) {
      console.error(`\n❌ Error: Backup folder not found at ${backupPath}\n`);
      process.exit(1);
    }

    console.log(`\n🔄 Starting Database Restore from: ${backupFolderName}...`);
    console.log("⚠️  WARNING: This will overwrite existing data in the target database.");
    
    // Execute mongorestore
    // --uri handles the connection
    // --nsInclude="*" restores all namespaces (databases/collections)
    // --drop drops existing collections before restoring (optional, but safer for full restore)
    execSync(`mongorestore --uri="${mongoUri}" --drop "${backupPath}"`, { stdio: "inherit" });

    console.log(`\n🎉 Restore completed successfully!\n`);

  } catch (error) {
    console.error("\n❌ Restore failed:", error.message);
    process.exit(1);
  }
}

runRestore();
