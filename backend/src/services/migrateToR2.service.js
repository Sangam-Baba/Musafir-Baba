// // scripts/migrateToR2.js
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import fs from "fs";
// import dotenv from "dotenv";

// dotenv.config();

// const assets = JSON.parse(fs.readFileSync("cloudinary-assets.json", "utf-8"));
// console.log(assets.length);

// const s3 = new S3Client({
//   region: "auto",
//   endpoint: process.env.R2_ENDPOINT,
//   credentials: {
//     accessKeyId: process.env.R2_ACCESS_KEY,
//     secretAccessKey: process.env.R2_SECRET_KEY,
//   },
// });

// // Decide folder based on resource type
// function getFolder(asset) {
//   if (asset.resource_type === "image") return "images";
//   if (asset.resource_type === "video") return "videos";
//   return "documents"; // raw (pdf, doc, etc.)
// }

// // Decide content-type
// function getContentType(asset) {
//   if (asset.resource_type === "image") {
//     return `image/${asset.format}`;
//   }
//   if (asset.resource_type === "video") {
//     return `video/${asset.format}`;
//   }
//   if (asset.format === "pdf") {
//     return "application/pdf";
//   }
//   return "application/octet-stream";
// }

// async function migrate() {
//   for (const asset of assets) {
//     try {
//       const response = await fetch(asset.secure_url);

//       if (!response.ok) {
//         console.error("Failed to fetch:", asset.secure_url);
//         continue;
//       }

//       const buffer = Buffer.from(await response.arrayBuffer());

//       const folder = getFolder(asset);
//       const filename = `${asset.public_id}.${asset.format}`;
//       const key = `${folder}/${filename}`;

//       await s3.send(
//         new PutObjectCommand({
//           Bucket: process.env.R2_BUCKET || "musafirmedia",
//           Key: key,
//           Body: buffer,
//           ContentType: getContentType(asset),
//         })
//       );

//       console.log("✅ Uploaded:", key);
//     } catch (err) {
//       console.error("❌ Error uploading:", asset.secure_url);
//       console.error(err.message);
//     }
//   }
// }

// migrate()
//   .then(() => console.log("🎉 Migration completed"))
//   .catch(console.error);
