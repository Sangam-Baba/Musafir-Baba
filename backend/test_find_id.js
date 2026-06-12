import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    const pkg = await db.collection('customizedtourpackages').findOne({ _id: new mongoose.Types.ObjectId("68fc80f576bdc9e38b6e3a08") });
    if (pkg) {
      console.log("Package Found! Slug:", pkg.slug);
    } else {
      console.log("Package NOT found for that ID!");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
