import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    const result = await db.collection('customizedtourpackages').updateOne(
      { slug: 'raj-ghat' },
      {
        $set: {
          experienceAtAGlance: '<p>A quick glance at this serene experience in Delhi...</p>',
          aboutThisExperience: '<p>Raj Ghat is a memorial dedicated to Mahatma Gandhi...</p>',
          placesCovered: '<p>Raj Ghat, Gandhi Smriti, National Museum</p>',
          whoIsThisExperienceFor: '<p>History enthusiasts, peace seekers</p>',
          customizationOptions: '<p>Can include transportation or extended tour hours.</p>',
          inclusions: ['Guide', 'Entrance Fees'],
          exclusions: ['Meals', 'Transport'],
          helpfulResources: [{ title: 'Gandhi Smriti Website', url: 'https://gandhismriti.gov.in' }]
        }
      }
    );
    console.log("Updated:", result.modifiedCount);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
