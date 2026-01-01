// // scripts/exportCloudinary.js
// import cloudinary from "cloudinary";
// import fs from "fs";

// cloudinary.v2.config({
//   cloud_name: "dmmsemrty",
//   api_key: "681955362677326",
//   api_secret: "PVjwJ34cU4J2evFF4PC65AOoyL4",
// });

// async function exportAssets() {
//   let resources = [];
//   let nextCursor = null;

//   do {
//     const res = await cloudinary.v2.api.resources({
//       type: "upload",
//       max_results: 3,
//       next_cursor: nextCursor,
//       resource_type: "image", // images, videos, pdf
//     });

//     resources.push(...res.resources);
//     nextCursor = res.next_cursor;
//   } while (nextCursor);

//   fs.writeFileSync(
//     "cloudinary-assets.json",
//     JSON.stringify(resources, null, 2)
//   );
// }

// exportAssets()
//   .then(() => console.log("Success Export"))
//   .catch((err) => console.log("Failed Export ", err));
