import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    const pkg = await db.collection('customizedtourpackages').findOne({ slug: 'raj-ghat' });
    console.log("Package found:", pkg ? "Yes" : "No");
    if (pkg) {
      console.log("Keys in package:", Object.keys(pkg));
      console.log("experienceAtAGlance:", pkg.experienceAtAGlance);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
