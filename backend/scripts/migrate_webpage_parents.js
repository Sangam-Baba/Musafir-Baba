import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const runMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/musafirbaba");
    console.log("Connected to database...");
    
    const db = mongoose.connection.db;
    
    const result = await db.collection("webpages").updateMany(
      { parent: { $exists: true, $ne: null }, parentModel: { $exists: false } },
      { $set: { parentModel: "WebPage" } }
    );
    
    console.log(`Migration complete. Modified ${result.modifiedCount} pages.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
