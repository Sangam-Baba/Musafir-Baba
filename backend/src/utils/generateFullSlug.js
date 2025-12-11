// import mongoose from "mongoose";
// import { WebPage } from "../models/WebPage.js";
// // Rebuild fullSlug recursively
// async function updateFullSlug(page, parentFullSlug = "") {
//   const newFullSlug = parentFullSlug
//     ? `${parentFullSlug}/${page.slug}`
//     : page.slug;

//   // Update ONLY if needed
//   if (page.fullSlug !== newFullSlug) {
//     page.fullSlug = newFullSlug;
//     await page.save({ validateBeforeSave: false });
//   }

//   // Process children
//   const children = await WebPage.find({ parent: page._id });

//   for (const child of children) {
//     await updateFullSlug(child, newFullSlug);
//   }
// }

// async function runMigration() {
//   await mongoose.connect(
//     "xyz"
//   );

//   console.log("🔄 Fetching root pages...");
//   const rootPages = await WebPage.find({ parent: null });

//   for (const root of rootPages) {
//     console.log("➡ Updating:", root.title);
//     await updateFullSlug(root);
//   }

//   console.log("✅ Migration complete!");
//   process.exit();
// }

// runMigration().catch((err) => {
//   console.error("❌ Migration failed:", err);
//   process.exit(1);
// });
